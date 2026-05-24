// 插画生成API云函数
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 已移除所有文心一格相关代码，只使用阿里云通义万相

/**
 * 调用阿里云通义万相多模态对话API生成图片
 * 参考Python代码：使用 MultiModalConversation API
 * 模型：qwen-image-plus
 * API端点：https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
 */
async function callTongyiWanxiangAPI(prompt, options) {
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.ALIYUN_API_KEY
  
  console.log('========================================')
  console.log('🔑 使用云函数环境变量中的API Key')
  console.log('========================================')
  
  if (!apiKey) {
    console.error('❌ API Key为空')
    throw new Error('API Key未配置，请在云函数环境变量中设置 DASHSCOPE_API_KEY 或 ALIYUN_API_KEY')
  }
  
  try {
    // 多模态对话API端点（根据Python代码）
    const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
    
    // 解析尺寸（格式：1328*1328 或 1024x1024）
    // Python代码中使用的是 1328*1328，但也可以使用其他尺寸
    let size = '1024*1024' // 默认尺寸
    if (options.size) {
      const sizeMatch = options.size.match(/(\d+)x(\d+)/)
      if (sizeMatch) {
        // 将 1024x1024 转换为 1024*1024（API要求使用*分隔）
        size = `${sizeMatch[1]}*${sizeMatch[2]}`
      }
    }
    
    // 构建messages格式（参考Python代码）
    const messages = [
      {
        "role": "user",
        "content": [
          {
            "text": prompt // 用户的描述文本（对应Python代码中的text）
          }
        ]
      }
    ]
    
    // 构建请求数据（参考Python代码的参数）
    const requestData = {
      model: 'qwen-image-plus', // 使用Python代码中的模型名称
      messages: messages,
      result_format: 'message', // 返回消息格式
      stream: false, // 非流式
      watermark: false, // 不添加水印
      prompt_extend: true, // 扩展提示词
      negative_prompt: options.negativePrompt || '', // 负面提示词
      size: size // 图片尺寸，格式：1024*1024
    }
    
    console.log('调用阿里云通义万相多模态API:', {
      url: apiUrl,
      model: requestData.model,
      prompt: prompt.substring(0, 50) + '...',
      size: size
    })
    console.log('请求数据:', JSON.stringify(requestData).substring(0, 200) + '...')
    
    // 阿里云API使用Bearer Token认证
    const response = await axios.post(apiUrl, requestData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 120秒超时（图片生成需要较长时间）
    })
    
    console.log('API响应状态:', response.status)
    console.log('API响应数据:', JSON.stringify(response.data).substring(0, 500) + '...')
    
    // 处理响应（MultiModalConversation返回格式）
    if (response.status === 200) {
      // 检查响应格式
      if (response.data.output && response.data.output.choices) {
        // 多模态对话API返回格式：output.choices[0].message.content
        const choices = response.data.output.choices
        if (choices && choices[0] && choices[0].message) {
          const message = choices[0].message
          
          // 查找图片URL
          if (message.content) {
            // content可能是数组或对象
            let imageUrl = null
            
            if (Array.isArray(message.content)) {
              // content是数组，查找image_url
              for (const item of message.content) {
                if (item.image_url) {
                  imageUrl = item.image_url
                  break
                } else if (item.url) {
                  imageUrl = item.url
                  break
                } else if (typeof item === 'string' && item.startsWith('http')) {
                  imageUrl = item
                  break
                }
              }
            } else if (typeof message.content === 'string') {
              // content是字符串（可能是URL）
              if (message.content.startsWith('http')) {
                imageUrl = message.content
              }
            } else if (message.content.image_url) {
              imageUrl = message.content.image_url
            } else if (message.content.url) {
              imageUrl = message.content.url
            }
            
            if (imageUrl) {
              console.log('获取到图片URL:', imageUrl.substring(0, 100) + '...')
              
              // 下载图片并转换为base64（小程序需要base64格式）
              try {
                const imageResponse = await axios.get(imageUrl, {
                  responseType: 'arraybuffer',
                  timeout: 30000
                })
                const imageBuffer = Buffer.from(imageResponse.data)
                const base64Image = imageBuffer.toString('base64')
                
                // 根据图片格式确定MIME类型
                const contentType = imageResponse.headers['content-type'] || 'image/png'
                console.log('✅ 图片下载并转换为base64成功，类型:', contentType)
                return `data:${contentType};base64,${base64Image}`
              } catch (downloadError) {
                console.warn('⚠️ 下载图片失败，直接返回URL:', downloadError.message)
                // 降级：直接返回URL（需要在小程序配置域名白名单）
                return imageUrl
              }
            }
          }
        }
      }
      
      // 如果响应格式不同，尝试其他可能的格式
      if (response.data.output && response.data.output.image_url) {
        const imageUrl = response.data.output.image_url
        console.log('获取到图片URL（备用格式）:', imageUrl.substring(0, 100) + '...')
        
        try {
          const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
          })
          const imageBuffer = Buffer.from(imageResponse.data)
          const base64Image = imageBuffer.toString('base64')
          const contentType = imageResponse.headers['content-type'] || 'image/png'
          return `data:${contentType};base64,${base64Image}`
        } catch (downloadError) {
          return imageUrl
        }
      }
      
      // 如果都没有找到，输出完整响应用于调试
      console.error('❌ 未找到图片URL，完整响应:', JSON.stringify(response.data, null, 2))
      throw new Error('API返回成功，但未找到图片URL。请查看云函数日志获取完整响应')
    } else {
      // 检查错误
      if (response.data.code) {
        throw new Error(`通义万相API错误: ${response.data.message || '未知错误'} (错误码: ${response.data.code})`)
      }
      throw new Error(`API返回状态码: ${response.status}`)
    }
  } catch (error) {
    console.error('========================================')
    console.error('❌ 阿里云通义万相API调用失败')
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)
    
    if (error.response) {
      console.error('响应状态码:', error.response.status)
      console.error('响应状态文本:', error.response.statusText)
      console.error('响应头:', JSON.stringify(error.response.headers))
      console.error('响应数据:', JSON.stringify(error.response.data))
      
      // 根据状态码提供更详细的错误信息
      if (error.response.status === 401) {
        console.error('❌ 认证失败：API Key无效或过期')
        throw new Error('API Key无效或过期，请检查API Key是否正确')
      } else if (error.response.status === 403) {
        console.error('❌ 权限不足：403 Forbidden')
        console.error('可能原因：')
        console.error('  1. API Key无效或已过期')
        console.error('  2. API Key没有访问该服务的权限')
        console.error('  3. 服务未开通或未授权')
        console.error('  4. API Key格式不正确')
        const errorMsg = error.response.data?.message || error.response.data?.error?.message || '权限不足'
        throw new Error(`API调用被拒绝(403): ${errorMsg}。请检查：1. API Key是否正确 2. 是否已开通通义万相服务 3. API Key是否有图片生成权限`)
      } else if (error.response.status === 400) {
        console.error('❌ 请求参数错误')
        const errorMsg = error.response.data?.message || error.response.data?.error?.message || '请检查请求参数格式'
        throw new Error(`请求参数错误: ${errorMsg}`)
      } else if (error.response.status === 429) {
        console.error('❌ API调用频率超限')
        throw new Error('API调用频率超限，请稍后再试')
      } else if (error.response.status === 500) {
        console.error('❌ 服务器内部错误')
        throw new Error('阿里云服务器错误，请稍后再试')
      } else {
        // 其他HTTP错误
        const errorMsg = error.response.data?.message || error.response.data?.error?.message || `HTTP ${error.response.status} 错误`
        throw new Error(`API调用失败(${error.response.status}): ${errorMsg}`)
      }
    } else if (error.request) {
      console.error('❌ 请求发送失败，未收到响应')
      console.error('请求配置:', JSON.stringify(error.config))
      throw new Error('网络请求失败，请检查网络连接或API地址是否正确')
    } else {
      console.error('❌ 请求配置错误')
      throw new Error(`请求配置错误: ${error.message}`)
    }
    
    console.error('========================================')
    throw error
  }
}

/**
 * 调用插画生成API（主函数）
 * 只使用阿里云通义万相
 */
async function callImageAPI(prompt, options) {
  console.log('========================================')
  console.log('🎨 开始调用图片生成API（通义万相）')
  console.log('提示词:', prompt.substring(0, 100) + '...')
  console.log('========================================')
  
  // 只使用阿里云通义万相
  try {
    console.log('📞 调用阿里云通义万相 API...')
    const result = await callTongyiWanxiangAPI(prompt, options)
    
    if (!result) {
      throw new Error('API返回结果为空')
    }
    
    console.log('✅ 阿里云通义万相调用成功')
    console.log('返回数据类型:', typeof result)
    console.log('返回数据长度:', result.length)
    return result
  } catch (error) {
    console.error('❌ 阿里云通义万相调用失败:', error.message)
    console.error('错误详情:', error.stack)
    
    // 重新抛出错误，让调用方处理
    throw error
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { prompt, ...options } = event
  
  console.log('========================================')
  console.log('🚀 imageAPI 云函数被调用')
  console.log('提示词长度:', prompt ? prompt.length : 0)
  console.log('选项:', JSON.stringify(options))
  console.log('========================================')
  
  if (!prompt) {
    console.error('❌ 缺少prompt参数')
    return {
      success: false,
      error: '缺少prompt参数'
    }
  }
  
  try {
    const result = await callImageAPI(prompt, options || {})
    
    // 检查结果是否有效
    if (!result) {
      console.error('❌ API返回结果为空')
      return {
        success: false,
        error: 'API返回结果为空'
      }
    }
    
    console.log('✅ 图片生成成功')
    console.log('返回数据类型:', typeof result)
    console.log('返回数据长度:', typeof result === 'string' ? result.length : 'N/A')
    console.log('========================================')
    
    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('❌ 云函数执行失败:', error)
    console.error('错误堆栈:', error.stack)
    return {
      success: false,
      error: error.message || '生成失败'
    }
  }
}
