/**
 * API服务模块
 * 用于调用豆包API和插画生成API
 * 版本: 2.0 - 使用官方 AI API (wx.cloud.extend.AI)
 */

const app = getApp()
const jsonParser = require('./jsonParser')

// 版本标记，用于确认代码已更新
// 重要：如果看到这个日志，说明新代码已加载
console.log('========================================')
console.log('🚀 API模块已加载 - 版本 4.0.0')
console.log('📅 更新时间: ' + new Date().toISOString())
console.log('✨ 特性: 直接使用官方 AI API，完全绕过云函数')
console.log('   - callDoubaoAPI: 仅使用 wx.cloud.extend.AI')
console.log('   - callImageAPI: 使用本地模拟（图片生成需集成第三方API）')
console.log('⚠️  说明: 不再调用任何云函数 callFunction')
console.log('🔧 模型配置: DeepSeek模型（deepseek 分组，deepseek-v3 模型）')
console.log('📌 Base URL: https://api.lkeap.cloud.tencent.com/v1（需在微信开发者工具中配置）')
console.log('📌 模型分组: deepseek')
console.log('📌 模型名称: deepseek-v3（优先），deepseek（备用）')
console.log('🔄 改进: 代码重构，大幅简化逻辑，移除冗余代码，按照官方文档优化')
console.log('   - 简化模型创建逻辑')
console.log('   - 简化响应解析（按照官方文档格式）')
console.log('   - 统一错误处理')
console.log('   - 移除重复代码和注释')
console.log('========================================')
console.log('🔍 如果看到云函数调用错误，说明代码未更新，请清除缓存重新编译')
console.log('========================================')

/**
 * 从描述中提取关键词
 */
function extractKeywords(text) {
  const keywords = {
    gender: '',
    age: '',
    identity: '',
    style: ''
  }
  
  // 提取性别
  if (text.includes('男') || text.includes('男性')) keywords.gender = '男'
  else if (text.includes('女') || text.includes('女性')) keywords.gender = '女'
  
  // 提取年龄
  const ageMatch = text.match(/(\d+)岁/)
  if (ageMatch) keywords.age = parseInt(ageMatch[1])
  
  // 提取身份/风格
  if (text.includes('侠客') || text.includes('剑客')) keywords.identity = '侠客'
  else if (text.includes('魔法') || text.includes('法师')) keywords.identity = '魔法师'
  else if (text.includes('机器人') || text.includes('AI')) keywords.identity = '机器人'
  else if (text.includes('仙侠') || text.includes('修仙')) keywords.style = '仙侠'
  else if (text.includes('赛博') || text.includes('未来')) keywords.style = '赛博朋克'
  else if (text.includes('古风')) keywords.style = '古风'
  
  return keywords
}

/**
 * 获取默认响应（当所有方法都失败时使用）
 */
function getDefaultResponse(type, prompt) {
  if (type === 'extractBasicInfo') {
    return JSON.stringify({
      name: '',
      age: '',
      gender: '',
      identity: ''
    })
  } else if (type === 'character') {
    return JSON.stringify({
      basicInfo: {
        name: '未命名',
        age: '',
        gender: '',
        identity: ''
      },
      personality: prompt || '',
      behavior: '',
      catchphrases: [],
      taboos: []
    })
  } else if (type === 'worldview') {
    return JSON.stringify({
      era: '',
      geography: '',
      socialRules: '',
      conflicts: '',
      techLevel: ''
    })
  } else {
    return prompt || ''
  }
}

/**
 * 本地模拟API响应（当云函数不可用时使用）
 */
function mockDoubaoAPI(prompt, type, context = {}) {
  return new Promise((resolve) => {
    // 模拟延迟
    setTimeout(() => {
      const keywords = extractKeywords(prompt)
      
      if (type === 'extractBasicInfo') {
        // 模拟实体提取结果 - 使用更智能的提取逻辑
        let name = ''
        let age = ''
        let gender = ''
        let identity = ''
        
        // 提取年龄
        const ageMatch = prompt.match(/(\d+)岁/)
        if (ageMatch) {
          age = ageMatch[1]
        }
        
        // 提取性别 - 优先匹配女性（因为"少女"等词可能包含"男"字）
        if (prompt.includes('少女') || prompt.includes('女孩') || prompt.includes('女性') || 
            prompt.includes('女') && !prompt.includes('男性')) {
          gender = '女'
        } else if (prompt.includes('少年') || prompt.includes('男孩') || prompt.includes('男性') || 
                   prompt.includes('男') && !prompt.includes('女性')) {
          gender = '男'
        }
        
        // 提取身份
        if (prompt.includes('魔法师') || prompt.includes('法师') || prompt.includes('魔法使')) {
          identity = '魔法师'
        } else if (prompt.includes('侠客') || prompt.includes('剑客') || prompt.includes('剑士')) {
          identity = '侠客'
        } else if (prompt.includes('机器人') || prompt.includes('AI') || prompt.includes('人工智能')) {
          identity = '机器人'
        }
        
        resolve(JSON.stringify({
          name: name,
          age: age,
          gender: gender,
          identity: identity
        }))
      } else if (type === 'character') {
        const name = keywords.identity ? `模拟${keywords.identity}` : '模拟角色'
        resolve(JSON.stringify({
          basicInfo: {
            name: name,
            age: keywords.age || 25,
            gender: keywords.gender || '未知',
            identity: keywords.identity || '角色'
          },
          personality: `根据您的描述"${prompt.substring(0, 80)}..."生成的角色性格特点。这是一个模拟结果，展示了基本的人设结构。请配置API后获取更详细的真实生成内容。`,
          behavior: `基于角色设定"${prompt.substring(0, 50)}..."的行为逻辑和处事方式。角色会根据这个逻辑做出决策和行动。`,
          catchphrases: ['口头禅示例1', '口头禅示例2', '口头禅示例3'],
          taboos: ['禁忌示例1', '禁忌示例2']
        }))
      } else if (type === 'worldview') {
        resolve(JSON.stringify({
          era: `根据您的描述"${prompt.substring(0, 80)}..."生成的时代背景设定。这是一个模拟结果，展示了世界观的基本结构。`,
          geography: `基于世界观描述"${prompt.substring(0, 50)}..."的地理环境特征，包括主要地区、地形、气候等设定。`,
          socialRules: `根据世界观描述生成的社会规则和制度，包括法律、道德、习俗等。`,
          conflicts: `基于世界观描述生成的核心冲突和矛盾，包括主要势力对抗、利益冲突等。`,
          techLevel: `根据世界观描述生成的科技或魔法发展水平，包括技术发展阶段、能力体系等。`
        }))
      } else {
        // 对话生成
        let dialog = `根据场景"${prompt.substring(0, 100)}..."生成的对话内容：\n\n`
        if (context.character) {
          dialog += `[${(context.character && context.character.basicInfo && context.character.basicInfo.name) || '角色'}]：`
        }
        dialog += `这是基于您输入的场景生成的对话示例。对话内容会符合角色的人设和世界观背景。\n\n`
        dialog += `[提示] 这是模拟结果，请配置API后获取真实的AI生成对话。`
        resolve(dialog)
      }
    }, 1000)
  })
}

/**
 * 辅助函数：检测内容是否为错误消息
 */
function isErrorMessage(content) {
  if (!content || typeof content !== 'string') return false
  const errorKeywords = [
    'error', 'timeout', 'upstream', 'connection', 'disconnect', 'reset',
    '503', 'Service Unavailable', '502', 'Bad Gateway', '504', 'Gateway Timeout',
    'failed', '失败', '错误', 'invalid model', '20033'
  ]
  const lowerContent = content.toLowerCase()
  return errorKeywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))
}

/**
 * 辅助函数：安全地提取错误消息
 */
function getErrorMessage(error) {
  if (!error) return '未知错误'
  
  // 如果是字符串，直接返回
  if (typeof error === 'string') return error
  
  // 尝试从错误对象中提取消息
  if (error.message) {
    if (typeof error.message === 'string') return error.message
    if (typeof error.message === 'object') {
      return JSON.stringify(error.message)
    }
  }
  
  // 尝试 errMsg
  if (error.errMsg) {
    if (typeof error.errMsg === 'string') return error.errMsg
    if (typeof error.errMsg === 'object') {
      return JSON.stringify(error.errMsg)
    }
  }
  
  // 尝试 error 字段（嵌套错误对象）
  if (error.error) {
    if (typeof error.error === 'string') return error.error
    if (error.error.message) {
      if (typeof error.error.message === 'string') return error.error.message
      if (typeof error.error.message === 'object') {
        return JSON.stringify(error.error.message)
      }
    }
    if (error.error.code) {
      return `错误码: ${error.error.code}, 消息: ${getErrorMessage(error.error)}`
    }
  }
  
  // 尝试序列化整个错误对象
  try {
    const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error))
    if (serialized !== '{}') return serialized
  } catch (e) {
    // 序列化失败，忽略
  }
  
  // 最后尝试 toString
  try {
    return String(error)
  } catch (e) {
    return '无法提取错误信息'
  }
}

/**
 * 辅助函数：检测错误类型
 */
function detectErrorType(error) {
  const errorMessage = getErrorMessage(error)
  
  // 检查错误代码
  const errorCode = error?.error?.code || error?.errCode || error?.code
  
  return {
    message: errorMessage,
    code: errorCode,
    isModelGroupNotFound: errorMessage && (
      errorMessage.includes('not found in definitions') || 
      errorMessage.includes('model group not found') ||
      errorMessage.includes('未找到模型定义')
    ),
    isConnectionError: errorMessage && (
      errorMessage.includes('upstream') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('disconnect') ||
      errorMessage.includes('reset') ||
      errorMessage.includes('503') ||
      errorMessage.includes('Service Unavailable') ||
      errorMessage.includes('502') ||
      errorMessage.includes('504') ||
      errorMessage.includes('Gateway Timeout') ||
      errorMessage.includes('Bad Request') && errorMessage.includes('400')
    ),
    isInvalidModel: errorMessage && (
      errorMessage.includes('invalid model') || 
      errorMessage.includes('20033') ||
      errorCode === 20033 ||
      (error?.error && (error.error.code === 20033 || error.error.message?.includes('invalid model')))
    ),
    isBadRequest: errorMessage && (
      errorMessage.includes('400') ||
      errorMessage.includes('Bad Request') ||
      errorCode === 400
    )
  }
}

/**
 * 使用官方 AI API 调用大模型
 * @param {string} prompt - 用户输入的提示词
 * @param {string} type - 生成类型：extractBasicInfo/character/worldview/dialog
 * @param {object} context - 上下文信息（角色、世界观等）
 */
async function callAIAPI(prompt, type, context = {}) {
  console.log('callAIAPI 被调用，类型:', type, 'prompt长度:', prompt.length)
  
  try {
    // 微信小程序 AI API 配置说明：
    // 1. Base URL 需要在微信开发者工具的"配置大模型"界面中配置：https://api.lkeap.cloud.tencent.com/v1
    // 2. 模型分组名称：deepseek（在"配置大模型"界面中配置）
    // 3. 模型名称：deepseek-v3（在 API 调用的 data 中指定）
    
    // 模型配置：优先使用自定义模型，失败后回退到官方模型
    const modelGroup = 'deepseek'  // 模型分组名称
    const modelNames = [
      'deepseek-v3',    // 自定义模型（优先）
      'deepseek',       // 官方模型（备用）
      'hunyuan-exp',    // 混元体验模型（备用）
      'deepseek-chat',  // DeepSeek 对话模型（备用）
    ]
    
    // 创建模型实例（按照官方文档，直接创建即可）
    console.log(`[callAIAPI] 创建模型分组: ${modelGroup}`)
    const model = wx.cloud.extend.AI.createModel(modelGroup)
    
    // 获取环境信息用于调试
    try {
      const envId = wx.cloud.getCloudEnvId?.() || app.globalData?.envId || '未知'
      console.log(`[callAIAPI] 📌 当前云开发环境 ID: ${envId}`)
    } catch (e) {
      console.warn(`[callAIAPI] ⚠️ 无法获取环境 ID:`, e)
    }
    
    // 根据类型设置 system prompt 和参数
    let systemPrompt = ''
    let temperature = 0.7
    let maxTokens = 2000
    
    if (type === 'extractBasicInfo') {
      systemPrompt = '你是一个专业的实体识别系统。请严格按照JSON格式返回结果，不要添加任何解释文字、markdown代码块标记或其他内容。只返回纯JSON。'
      temperature = 0.1
      maxTokens = 500
    } else if (type === 'character') {
      systemPrompt = '你是一个专业的角色创作助手。请严格按照JSON格式返回结果，不要添加任何解释文字、markdown代码块标记或其他内容。只返回纯JSON。'
      temperature = 0.7
      maxTokens = 2000
    } else if (type === 'worldview') {
      systemPrompt = '你是一个专业的世界观创作助手。请严格按照JSON格式返回结果，不要添加任何解释文字、markdown代码块标记或其他内容。只返回纯JSON。'
      temperature = 0.7
      maxTokens = 2000
    } else {
      systemPrompt = '你是一个专业的对话生成助手。'
      temperature = 0.7
      maxTokens = 2000
    }
    
    console.log(`[callAIAPI] 参数配置 - 类型: ${type}, 温度: ${temperature}, 最大Tokens: ${maxTokens}`)
    console.log(`[callAIAPI] 将尝试的模型: ${modelNames.join(', ')}`)
    
    // 构建请求参数
    const requestData = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: temperature,
      max_tokens: maxTokens
    }
    
    // 尝试不同的模型名称
    let lastError = null
    for (let i = 0; i < modelNames.length; i++) {
      const modelName = modelNames[i]
      console.log(`[callAIAPI] ========== 尝试模型 ${i + 1}/${modelNames.length}: ${modelName} ==========`)
      
      try {
        // 优先使用 generateText（非流式，适合JSON输出）
        if (type === 'extractBasicInfo' || type === 'character' || type === 'worldview') {
          console.log(`[callAIAPI] 使用 generateText，模型: ${modelName}...`)
          console.log(`[callAIAPI] 请求参数:`, JSON.stringify({
            model: modelName,
            messages: requestData.messages.map(m => ({ role: m.role, content: m.content.substring(0, 50) + '...' })),
            temperature: requestData.temperature,
            max_tokens: requestData.max_tokens
          }, null, 2))
          
          try {
            // 按照官方文档，generateText 不需要 data 包装
            const res = await model.generateText({
              model: modelName,
              messages: requestData.messages,
              temperature: requestData.temperature,
              max_tokens: requestData.max_tokens
            })
            
            console.log(`[callAIAPI] generateText 响应:`, res)
            
            // 检查错误
            if (res?.error) {
              const errorInfo = detectErrorType(res)
              console.error(`[callAIAPI] generateText 返回错误:`, errorInfo)
              console.error(`[callAIAPI] 错误详情:`, JSON.stringify(res, null, 2))
              
              // 400 错误通常是参数错误，不应该继续尝试其他模型
              if (errorInfo.isBadRequest) {
                throw new Error(`请求参数错误: ${errorInfo.message}`)
              }
              
              if (errorInfo.isInvalidModel && i < modelNames.length - 1) {
                console.warn(`[callAIAPI] 模型 ${modelName} 无效，将尝试下一个模型...`)
                lastError = new Error(`AI模型调用失败: ${errorInfo.message}`)
                continue
              }
              throw new Error(`AI模型调用失败: ${errorInfo.message}`)
            }
            
            // 提取内容（按照官方文档，响应格式应该是标准的）
            let content = ''
            if (typeof res === 'string') {
              content = res
            } else if (res?.text) {
              content = res.text
            } else if (res?.response?.choices?.[0]?.message?.content) {
              content = res.response.choices[0].message.content
            } else if (res?.choices?.[0]?.message?.content) {
              content = res.choices[0].message.content
            } else if (res?.content) {
              content = res.content
            }
            
            // 验证内容
            if (isErrorMessage(content)) {
              throw new Error(`AI模型调用失败: ${content}`)
            }
            
            if (content && content.trim().length > 0) {
              console.log(`[callAIAPI] ✅ 模型 ${modelName} 调用成功！`)
              console.log(`[callAIAPI] 内容长度: ${content.length}, 预览: ${content.substring(0, 200)}`)
              return content
            }
          } catch (generateError) {
            // generateText 抛出异常
            const errorInfo = detectErrorType(generateError)
            console.error(`[callAIAPI] generateText 抛出异常:`, errorInfo)
            console.error(`[callAIAPI] 异常详情:`, generateError)
            
            // 400 错误通常是参数错误，不应该继续尝试其他模型
            if (errorInfo.isBadRequest) {
              throw new Error(`请求参数错误: ${errorInfo.message}`)
            }
            
            // 如果是 invalid model 错误，继续尝试下一个模型
            if (errorInfo.isInvalidModel && i < modelNames.length - 1) {
              console.warn(`[callAIAPI] 模型 ${modelName} 无效，将尝试下一个模型...`)
              lastError = generateError
              continue
            }
            
            // 其他错误，继续到 catch 块处理
            throw generateError
          }
        }
        
        // 使用 streamText（流式输出）
        console.log(`[callAIAPI] 使用 streamText，模型: ${modelName}...`)
        
        const res = await model.streamText({
          data: {
            ...requestData,
            model: modelName
          }
        })
        
        // 检查错误
        if (res?.error) {
          const errorInfo = detectErrorType(res)
          if (errorInfo.isInvalidModel && i < modelNames.length - 1) {
            console.warn(`[callAIAPI] 模型 ${modelName} 无效，将尝试下一个模型...`)
            lastError = new Error(`AI模型调用失败: ${errorInfo.message}`)
            continue
          }
          throw new Error(`AI模型调用失败: ${errorInfo.message}`)
        }
        
        // 使用 eventStream 收集流式响应（按照官方文档）
        if (!res?.eventStream) {
          throw new Error('streamText 响应中没有 eventStream')
        }
        
        let content = ''
        const startTime = Date.now()
        const timeout = 60000 // 60秒超时
        let eventCount = 0
        
        for await (let event of res.eventStream) {
          // 检查超时
          if (Date.now() - startTime > timeout) {
            throw new Error('AI API 响应超时，请稍后重试')
          }
          
          // 检查是否结束
          if (event.data === '[DONE]') {
            break
          }
          
          // 解析事件数据
          let data
          if (typeof event.data === 'string') {
            try {
              data = JSON.parse(event.data)
            } catch (e) {
              // 如果不是JSON，跳过
              continue
            }
          } else {
            data = event.data
          }
          
          // 检查错误
          if (data?.error) {
            const errorInfo = detectErrorType(data)
            if (errorInfo.isInvalidModel && i < modelNames.length - 1) {
              console.warn(`[callAIAPI] 模型 ${modelName} 无效，将尝试下一个模型...`)
              lastError = new Error(`AI模型调用失败: ${errorInfo.message}`)
              break
            }
            throw new Error(`AI模型调用失败: ${errorInfo.message}`)
          }
          
          // 提取文本内容（按照官方文档格式）
          const text = data?.choices?.[0]?.delta?.content
          if (text && typeof text === 'string') {
            content += text
            eventCount++
            if (eventCount % 10 === 0 || eventCount <= 5) {
              console.log(`[callAIAPI] 事件 ${eventCount}，内容长度: ${content.length}`)
            }
          }
        }
        
        if (content && content.trim().length > 0) {
          console.log(`[callAIAPI] ✅ 模型 ${modelName} 调用成功（streamText）！`)
          console.log(`[callAIAPI] 内容长度: ${content.length}, 预览: ${content.substring(0, 200)}`)
          return content
        }
        
        // 如果内容为空，继续尝试下一个模型
        if (i < modelNames.length - 1) {
          console.warn(`[callAIAPI] 模型 ${modelName} 返回内容为空，将尝试下一个模型...`)
          continue
        }
        
      } catch (modelError) {
        const errorInfo = detectErrorType(modelError)
        console.error(`[callAIAPI] 模型 ${modelName} 调用异常:`, errorInfo)
        console.error(`[callAIAPI] 异常对象:`, modelError)
        
        // 400 错误通常是参数错误，所有模型都会失败，直接抛出
        if (errorInfo.isBadRequest) {
          console.error(`[callAIAPI] ⚠️ 请求参数错误 (400): ${errorInfo.message}`)
          console.error(`[callAIAPI] 💡 这可能是因为：`)
          console.error(`[callAIAPI] 💡 1. API 参数格式不正确`)
          console.error(`[callAIAPI] 💡 2. 模型名称不正确`)
          console.error(`[callAIAPI] 💡 3. Base URL 配置错误`)
          throw new Error(`请求参数错误: ${errorInfo.message}`)
        }
        
        // 如果是 invalid model 错误，且还有更多模型可以尝试，继续下一个模型
        if (errorInfo.isInvalidModel && i < modelNames.length - 1) {
          console.warn(`[callAIAPI] 模型 ${modelName} 无效，将尝试下一个模型...`)
          lastError = modelError
          continue
        }
        
        // 如果是连接错误或模型分组不存在，且是第一个模型（自定义模型），记录警告但继续尝试
        if ((errorInfo.isConnectionError || errorInfo.isModelGroupNotFound) && i === 0) {
          console.warn(`[callAIAPI] ⚠️ 自定义模型 ${modelName} 不可用: ${errorInfo.message}`)
          console.warn(`[callAIAPI] 💡 将自动尝试官方模型...`)
          lastError = modelError
          continue
        }
        
        // 其他错误，如果是最后一个模型，直接抛出；否则继续尝试
        if (i < modelNames.length - 1) {
          console.warn(`[callAIAPI] 模型 ${modelName} 调用失败: ${errorInfo.message}，将尝试下一个模型...`)
          lastError = modelError
          continue
        }
        
        // 最后一个模型也失败，抛出错误
        throw modelError
      }
    }
    
    // 所有模型都尝试完毕
    if (lastError) {
      const errorMsg = getErrorMessage(lastError)
      console.error(`[callAIAPI] ❌ 所有模型都尝试完毕，最后一个错误: ${errorMsg}`)
      console.error(`[callAIAPI] 错误详情:`, lastError)
      throw new Error(`所有模型调用失败: ${errorMsg}`)
    }
    
    throw new Error('所有模型都未能返回有效内容')
      
  } catch (error) {
    const errorMsg = getErrorMessage(error)
    console.error('❌ AI API调用失败:', errorMsg)
    console.error('错误类型:', error?.constructor?.name)
    console.error('错误代码:', error?.errCode || error?.error?.code || error?.code)
    console.error('错误对象:', error)
    
    // 检查是否是环境不存在错误
    if (error?.errCode === -501000 && error?.errMsg?.includes('env not exists')) {
      const envError = new Error(
        '云开发环境不存在或未正确配置。\n\n' +
        '解决方案：\n' +
        '1. 在微信开发者工具中，点击"云开发"按钮\n' +
        '2. 创建或选择正确的云开发环境\n' +
        '3. 确保环境已开通 AI 能力\n' +
        '4. 检查 app.js 中的环境 ID 是否正确\n' +
        '5. 重新编译小程序\n\n' +
        '当前环境 ID: ' + (getApp().globalData?.envId || '未知')
      )
      console.error('❌ 环境配置错误:', envError.message)
      throw envError
    }
    
    // 直接抛出错误，不使用本地模拟
    throw error
  }
}

/**
 * 调用豆包API生成文本内容（保持向后兼容，实际使用官方AI API）
 * @param {string} prompt - 用户输入的提示词
 * @param {string} type - 生成类型：character/worldview/dialog/extractBasicInfo
 * @param {object} context - 上下文信息（角色、世界观等）
 */
async function callDoubaoAPI(prompt, type, context = {}) {
  // ⚠️ 重要：此函数不再调用云函数，直接使用官方 AI API
  // 如果看到云函数调用错误，说明代码未更新，请清除缓存重新编译
  console.log('========================================')
  console.log('🔵 callDoubaoAPI 被调用（版本 2.3.0 - 直接使用 AI API）')
  console.log('📝 类型:', type)
  console.log('📏 prompt长度:', prompt.length)
  console.log('⏰ 时间戳:', new Date().toISOString())
  console.log('⚠️  注意：此函数不再调用云函数 callFunction')
  console.log('========================================')
  
  // 检查 AI API 是否可用
  if (!wx.cloud) {
    const error = new Error('云开发未初始化，请检查 app.js 中的云开发配置')
    console.error('callDoubaoAPI 错误:', error)
    throw error
  }
  
  if (!wx.cloud.extend) {
    const error = new Error('wx.cloud.extend 不可用，请更新基础库版本或开通 AI 能力')
    console.error('callDoubaoAPI 错误:', error)
    throw error
  }
  
  if (!wx.cloud.extend.AI) {
    const error = new Error('wx.cloud.extend.AI 不可用，请开通云开发 AI 能力')
    console.error('callDoubaoAPI 错误:', error)
    throw error
  }
  
  if (typeof wx.cloud.extend.AI.createModel !== 'function') {
    const error = new Error('wx.cloud.extend.AI.createModel 不是函数，请检查基础库版本')
    console.error('callDoubaoAPI 错误:', error)
    throw error
  }
  
  // 直接调用 AI API，不使用本地模拟，也不使用云函数
  console.log('✅ AI API 可用，开始调用 callAIAPI...')
  console.log('⚠️  重要：不会调用云函数 callFunction')
  
  try {
    const result = await callAIAPI(prompt, type, context)
    console.log('✅ callAIAPI 调用成功')
    console.log('📊 返回结果长度:', result ? result.length : 0)
    console.log('📝 返回结果预览:', result ? result.substring(0, 100) + '...' : 'null')
    return result
  } catch (aiError) {
    console.error('❌ callAIAPI 调用失败')
    console.error('错误类型:', aiError?.constructor?.name)
    console.error('错误消息:', aiError?.message)
    console.error('错误堆栈:', aiError?.stack)
    // 直接抛出错误，不使用本地模拟，也不使用云函数
    throw aiError
  }
}

// 已移除云函数调用，直接使用 wx.request 调用API

/**
 * 调用插画生成API（直接调用，跳过云函数）
 * @param {string} prompt - 图片描述提示词
 * @param {object} options - 选项（风格、尺寸等）
 */
async function callImageAPI(prompt, options = {}) {
  console.log('callImageAPI 被调用 - 直接调用API（跳过云函数）')
  console.log('prompt:', prompt.substring(0, 50) + '...')
  console.log('options:', options)
  
  const apiConfig = require('./storage').getAPIConfig()
  const apiKey = apiConfig?.imageApiKey || apiConfig?.tongyiApiKey

  if (!apiKey) {
    throw new Error('图片生成API Key未配置，请先在“我的 -> API配置”中填写图片API Key')
  }
  
  try {
    // ✅ 修正1：使用正确的API端点（注意是text2image不是text-to-image）
    const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis'
    
    // ✅ 解析尺寸（官方格式：'1024*1024'）
    let size = '1024*1024'
    if (options.size) {
      const sizeMatch = options.size.match(/(\d+)x(\d+)/i)
      if (sizeMatch) {
        size = `${sizeMatch[1]}*${sizeMatch[2]}`
      }
    }
    
    // ✅ 修正2：使用官方文档的请求格式（input.prompt和parameters结构）
    const requestData = {
      model: 'wan2.5-t2i-preview',
      input: {
        prompt: String(prompt).trim()  // ✅ prompt在input对象中
      },
      parameters: {
        size: size,  // ✅ size在parameters中
        n: 1         // ✅ n在parameters中
      }
    }
    
    console.log('📞 直接调用阿里云通义万相图片生成API...')
    console.log('URL:', apiUrl)
    console.log('模型:', requestData.model)
    console.log('提示词长度:', prompt.length)
    console.log('请求数据:', JSON.stringify(requestData))
    
    // ✅ 修正3：添加必需的X-DashScope-Async请求头
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: apiUrl,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'  // ✅ 必须添加此请求头（官方文档要求）
        },
        data: requestData, // 传递对象，微信会自动序列化为 JSON
        dataType: 'json', // 明确指定响应数据类型
        timeout: 120000, // 120秒超时
        success: (res) => {
          console.log('API响应状态码:', res.statusCode)
          console.log('API响应数据:', typeof res.data === 'string' ? res.data.substring(0, 500) : JSON.stringify(res.data).substring(0, 500))
          
          if (res.statusCode === 200) {
            resolve(res)
          } else {
            // 尝试解析错误信息
            let errorMsg = `HTTP ${res.statusCode} 错误`
            if (typeof res.data === 'string') {
              try {
                const errorData = JSON.parse(res.data)
                errorMsg = errorData.message || errorData.error?.message || errorMsg
              } catch (e) {
                errorMsg = res.data.substring(0, 200)
              }
            } else if (res.data) {
              errorMsg = res.data.message || res.data.error?.message || errorMsg
            }
            reject(new Error(`API调用失败(${res.statusCode}): ${errorMsg}`))
          }
        },
        fail: (err) => {
          console.error('wx.request 失败:', err)
          if (err.errMsg) {
            if (err.errMsg.includes('request:fail')) {
              reject(new Error('网络请求失败，请检查网络连接或域名白名单配置'))
            } else {
              reject(new Error(err.errMsg))
            }
          } else {
            reject(new Error('请求失败，未知错误'))
          }
        }
      })
    })
    
    console.log('✅ API调用成功')
    
    // 处理响应数据：可能是字符串或对象
    let responseData = response.data
    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData)
      } catch (e) {
        console.error('无法解析响应数据为JSON:', e)
        throw new Error('API返回的数据格式错误')
      }
    }
    
    console.log('响应数据类型:', typeof responseData)
    console.log('响应数据:', JSON.stringify(responseData).substring(0, 500) + '...')
    
    // ✅ 检查响应状态（根据官方示例，需要检查status_code或code字段）
    if (responseData.code && responseData.code !== 200) {
      const errorMsg = responseData.message || '未知错误'
      throw new Error(`API调用失败，错误码: ${responseData.code}，消息: ${errorMsg}`)
    }
    
    // ✅ 修正4：处理异步响应（获取task_id并轮询结果）
    if (responseData.output && responseData.output.task_id) {
      const taskId = responseData.output.task_id
      console.log('获取到任务ID:', taskId)
      
      // 轮询获取结果
      const maxAttempts = 60 // 最多尝试60次
      const pollInterval = 2000 // 每2秒轮询一次
      
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        
        console.log(`轮询 ${i + 1}/${maxAttempts}，查询任务状态...`)
        
        try {
          // 查询任务状态
          const statusResponse = await new Promise((resolve, reject) => {
            wx.request({
              url: `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
              method: 'GET',
              header: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              dataType: 'json',
              timeout: 10000,
              success: (res) => {
                if (res.statusCode === 200) {
                  resolve(res)
                } else {
                  reject(new Error(`查询任务状态失败: HTTP ${res.statusCode}`))
                }
              },
              fail: (err) => {
                reject(new Error('网络请求失败：' + (err.errMsg || '未知错误')))
              }
            })
          })
        
          const statusData = statusResponse.data
          console.log(`任务状态:`, statusData.output?.task_status)
          
          if (statusData.output?.task_status === 'SUCCEEDED') {
            // 任务成功，获取图片URL
            const results = statusData.output.results
            if (results && results.length > 0 && results[0].url) {
              const imageUrl = results[0].url
              console.log('获取到图片URL:', imageUrl.substring(0, 100) + '...')
              
              // ✅ 修复：立即尝试下载，增加重试机制
              let downloadAttempts = 0
              const maxDownloadAttempts = 3
              
              while (downloadAttempts < maxDownloadAttempts) {
                try {
                  const imageResponse = await new Promise((resolve, reject) => {
                    wx.request({
                      url: imageUrl,
                      method: 'GET',
                      responseType: 'arraybuffer',
                      timeout: 30000,
                      success: (res) => {
                        if (res.statusCode === 200) {
                          resolve(res)
                        } else if (res.statusCode === 403) {
                          reject(new Error('图片URL已过期或无权访问（403），无法下载'))
                        } else {
                          reject(new Error(`下载图片失败: HTTP ${res.statusCode}`))
                        }
                      },
                      fail: (err) => {
                        if (err.errMsg && err.errMsg.includes('403')) {
                          reject(new Error('图片URL已过期或无权访问（403）'))
                        } else {
                          reject(new Error('下载图片失败：' + (err.errMsg || '未知错误')))
                        }
                      }
                    })
                  })
                  
                  const base64 = wx.arrayBufferToBase64(imageResponse.data)
                  const contentType = 'image/png'
                  
                  console.log('✅ 图片下载并转换为base64成功')
                  console.log('base64长度:', base64.length)
                  return `data:${contentType};base64,${base64}`
                } catch (downloadError) {
                  downloadAttempts++
                  console.error(`❌ 下载图片失败 (尝试 ${downloadAttempts}/${maxDownloadAttempts}):`, downloadError)
                  
                  if (downloadAttempts < maxDownloadAttempts) {
                    // 等待1秒后重试
                    console.log(`等待1秒后重试下载...`)
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    continue
                  } else {
                    // 所有重试都失败，降级为返回URL
                    console.warn('⚠️ 所有下载尝试都失败，降级方案：直接返回图片URL')
                    console.warn('⚠️ 注意：URL可能会过期，建议尽快查看或重新生成')
                    return imageUrl
                  }
                }
              }
            }
          } else if (statusData.output?.task_status === 'FAILED') {
            throw new Error('图片生成任务失败: ' + (statusData.output.message || '未知错误'))
          } else if (statusData.output?.task_status === 'PENDING' || statusData.output?.task_status === 'RUNNING') {
            // 继续轮询
            continue
          }
        } catch (error) {
          console.error('轮询失败:', error)
          // 继续尝试
          continue
        }
      }
      
      throw new Error('图片生成超时，请稍后重试')
    }
    
    // 如果都没有找到，输出完整响应用于调试
    console.error('❌ 未找到任务ID或图片URL，完整响应:', JSON.stringify(responseData, null, 2))
    throw new Error('API返回成功，但未找到任务ID。请查看控制台日志获取完整响应')
  } catch (error) {
    console.error('========================================')
    console.error('❌ API调用失败')
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)
    console.error('========================================')
    
    // 提供用户友好的错误提示
    if (error.message.includes('网络请求失败') || error.message.includes('域名白名单')) {
      wx.showModal({
        title: '网络请求失败',
        content: '请检查：\n\n1. 网络连接是否正常\n2. 在微信开发者工具中，点击"详情"→"本地设置"，勾选"不校验合法域名"\n3. 正式发布前需要在微信公众平台配置域名白名单',
        showCancel: false,
        confirmText: '我知道了'
      })
    } else if (error.message.includes('403')) {
      wx.showModal({
        title: 'API调用被拒绝',
        content: '可能原因：\n\n1. API Key无效或过期\n2. 未开通通义万相服务\n3. API Key没有图片生成权限\n\n请检查API Key配置',
        showCancel: false,
        confirmText: '我知道了'
      })
    }
    
    throw error
  }
}

/**
 * 从文本中提取基础信息（实体识别）
 * @param {string} description - 角色描述文本
 * @returns {Promise<string>} JSON格式的基础信息字符串
 */
function extractBasicInfoFromText(description) {
  // 优化后的提示词：更加结构化和明确
  const prompt = `你是一个专业的实体识别系统。请从以下角色描述文本中，准确提取角色的基础信息。

## 任务说明
从用户提供的角色描述中，提取以下四个字段的信息：
1. 姓名（name）
2. 年龄（age）
3. 性别（gender）
4. 身份（identity）

## 角色描述
${description}

## 提取规则

### 1. 姓名（name）
- 如果文本中明确提到了角色姓名（如"张三"、"Alice"等），请提取
- 如果文本中没有提到姓名，返回空字符串 ""
- 不要从描述中猜测或生成姓名

### 2. 年龄（age）
- 提取文本中提到的年龄数字（如"16岁"、"28岁"等）
- 年龄必须是数字字符串格式（如"16"、"28"），不是数字类型
- 如果文本中没有提到年龄，返回空字符串 ""
- 年龄范围应在1-200之间

### 3. 性别（gender）
- 根据文本内容判断性别，只能是以下三种值之一："男"、"女"、""
- 判断规则：
  * "少女"、"女孩"、"女性"、"女"等词汇 → "女"
  * "少年"、"男孩"、"男性"、"男"等词汇 → "男"
  * 注意上下文理解，例如"二次元少女"中的"少女"表示女性
  * 如果无法从文本中确定性别，返回空字符串 ""

### 4. 身份（identity）
- 提取角色的身份、职业或角色类型
- 常见身份：魔法师、法师、侠客、剑客、机器人、AI、骑士、武士、学生、老师等
- 如果文本中没有提到身份，返回空字符串 ""
- 身份应该是简洁的名词，不超过10个字符

## 输出要求
- **必须**只返回JSON格式，不要添加任何解释、说明或markdown代码块标记
- **必须**严格按照以下JSON格式返回，不要有多余的字段
- 如果某个字段无法确定，返回空字符串 ""，不要猜测
- 不要返回代码块标记（如 \`\`\`json 或 \`\`\`）

## JSON格式
{
  "name": "角色姓名或空字符串",
  "age": "年龄数字或空字符串",
  "gender": "男/女/空字符串",
  "identity": "身份或空字符串"
}

## 开始提取
请直接返回JSON，不要添加任何其他内容。`

  console.log('[extractBasicInfoFromText] 构建的提示词长度:', prompt.length)
  return callDoubaoAPI(prompt, 'extractBasicInfo')
}

/**
 * 生成人物角色定义
 * @param {string} description - 角色描述
 * @returns {Promise<string>} JSON格式的角色定义字符串
 */
function generateCharacter(description) {
  // 优化后的提示词：更加详细和结构化
  const prompt = `你是一个专业的角色创作助手。请根据以下描述生成一个结构化的人物角色定义卡片。

## 任务说明
根据用户提供的角色描述，生成一个完整的人物角色定义，包含基础信息、性格特点、行为逻辑、口头禅和禁忌。

## 角色描述
${description}

## 生成要求

### 1. 基础信息（basicInfo）
- **name**: 角色姓名。如果描述中没有提到，可以生成一个符合角色特点的姓名，或使用"未命名"
- **age**: 角色年龄。可以是数字（如16）或数字字符串（如"16"），如果描述中没有提到，可以合理推断或留空
- **gender**: 角色性别。必须是"男"、"女"或空字符串
- **identity**: 角色身份。如"魔法师"、"侠客"、"机器人"等，如果描述中没有提到，可以合理推断或留空

### 2. 性格特点（personality）
- 详细描述角色的性格特征
- 长度建议在50-200字之间
- 要结合角色描述，展现角色的独特个性
- 可以包含性格的多面性，避免单一化

### 3. 行为逻辑（behavior）
- 描述角色的处事方式、决策原则和行为习惯
- 长度建议在50-200字之间
- 要体现角色在特定情境下的反应和选择
- 可以与性格特点相呼应，展现角色的内在逻辑

### 4. 口头禅（catchphrases）
- 生成3-5个符合角色特点的口头禅
- 每个口头禅应该是简短的短语或句子（5-15字）
- 口头禅应该与角色的性格和身份相符
- 如果描述中提到了口头禅，优先使用描述中的内容

### 5. 禁忌（taboos）
- 列出角色不能接受或不会做的事情
- 建议2-4个禁忌
- 每个禁忌应该是简洁的描述（10-20字）
- 禁忌应该与角色的性格、身份和价值观相关

## 输出要求
- **必须**只返回JSON格式，不要添加任何解释、说明或markdown代码块标记
- **必须**严格按照以下JSON格式返回
- 不要返回代码块标记（如 \`\`\`json 或 \`\`\`）
- JSON中的字符串值不要包含换行符，使用空格代替

## JSON格式
{
  "basicInfo": {
    "name": "角色姓名",
    "age": "年龄（数字字符串）",
    "gender": "性别（男/女）",
    "identity": "身份"
  },
  "personality": "性格特点详细描述（50-200字）",
  "behavior": "行为逻辑描述（50-200字）",
  "catchphrases": ["口头禅1", "口头禅2", "口头禅3"],
  "taboos": ["禁忌1", "禁忌2"]
}

## 开始生成
请直接返回JSON，不要添加任何其他内容。`

  console.log('[generateCharacter] 构建的提示词长度:', prompt.length)
  return callDoubaoAPI(prompt, 'character')
}

/**
 * 生成世界观设定
 * @param {string} description - 世界观描述
 */
function generateWorldview(description) {
  const prompt = `请根据以下描述生成一个结构化的世界观设定集，包含以下部分：
1. 时代背景（时间、历史阶段）
2. 地理环境（主要地区、地形特征）
3. 社会规则（法律、道德、习俗）
4. 核心冲突（主要矛盾、势力对抗）
5. 科技/魔法水平（技术发展程度）

世界观描述：${description}

请以JSON格式返回，格式如下：
{
  "era": "时代背景描述",
  "geography": "地理环境描述",
  "socialRules": "社会规则描述",
  "conflicts": "核心冲突描述",
  "techLevel": "科技/魔法水平描述"
}`

  return callDoubaoAPI(prompt, 'worldview')
}

/**
 * 生成人物对话
 * @param {string} scene - 对话场景描述
 * @param {object} character - 角色信息
 * @param {object} worldview - 世界观信息
 */
function generateDialog(scene, character, worldview) {
  let prompt = `请生成符合以下条件的对话内容：\n\n`
  
  if (character) {
    prompt += `角色设定：\n`
    prompt += `- 姓名：${(character.basicInfo && character.basicInfo.name) || '未命名'}\n`
    prompt += `- 性格：${character.personality || ''}\n`
    prompt += `- 口头禅：${(character.catchphrases && character.catchphrases.join('、')) || ''}\n`
    prompt += `- 行为逻辑：${character.behavior || ''}\n\n`
  }
  
  if (worldview) {
    prompt += `世界观背景：\n`
    prompt += `- 时代：${worldview.era || ''}\n`
    prompt += `- 环境：${worldview.geography || ''}\n`
    prompt += `- 规则：${worldview.socialRules || ''}\n\n`
  }
  
  prompt += `对话场景：${scene}\n\n`
  prompt += `请生成符合角色人设和世界观背景的对话内容，可以是多角色对话或单角色独白。`

  return callDoubaoAPI(prompt, 'dialog', { character, worldview })
}

/**
 * 从文本中提取对话部分
 * @param {string} text - 故事文本
 * @returns {Promise<string>} 提取的对话内容
 */
async function extractDialogFromText(text) {
  const prompt = `请从以下故事文本中提取所有对话内容。

## 任务说明
识别并提取文本中的所有对话，保持对话的完整性和上下文。

## 故事文本
${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}

## 输出要求
- 只返回对话内容，不要其他叙述
- 保持对话的原始格式
- 如果有多段对话，用空行分隔
- 如果文本中没有对话，返回"未找到对话内容"

请直接输出对话内容：`
  
  return await callDoubaoAPI(prompt, 'dialog')
}

/**
 * 优化对话，使其更符合角色人设
 * @param {string} dialogText - 原始对话文本
 * @param {object} character - 角色信息
 * @param {object} worldview - 世界观信息
 * @returns {Promise<string>} 优化后的对话
 */
async function optimizeDialog(dialogText, character, worldview) {
  const prompt = `你是一个专业的对话优化助手。请优化以下对话，使其更符合角色人设和世界观。

## 任务说明
根据角色设定和世界观，优化对话内容，使其：
1. 更符合角色的性格特点
2. 更符合角色的口头禅和说话习惯
3. 更符合世界观背景
4. 保持对话的自然流畅

## 角色设定
${character ? `
姓名：${character.basicInfo?.name || ''}
性格：${character.personality || ''}
口头禅：${(character.catchphrases && character.catchphrases.join('、')) || ''}
行为逻辑：${character.behavior || ''}
` : '未指定角色'}

## 世界观背景
${worldview ? `
时代：${worldview.era || ''}
环境：${worldview.geography || ''}
规则：${worldview.socialRules || ''}
` : '未指定世界观'}

## 原始对话
${dialogText}

## 优化要求
- 保持对话的核心意思不变
- 让对话更符合角色性格
- 适当加入角色的口头禅
- 让对话更符合世界观背景
- 保持自然流畅
- 如果对话已经很符合人设，可以只做微调

请直接输出优化后的对话：`
  
  return await callDoubaoAPI(prompt, 'dialog', { character, worldview })
}

/**
 * 生成插画
 * 根据创作经验优化提示词构建：
 * 1. 风格关键词优先（世界观）
 * 2. 角色核心特征（姓名、身份、外貌）
 * 3. 场景描述（用户输入）
 * 4. 质量提升词
 * 
 * @param {string} description - 图片描述
 * @param {object} character - 角色信息（可选）
 * @param {object} worldview - 世界观信息（可选）
 */
async function generateIllustration(description, character = null, worldview = null, existingImages = []) {
  console.log('[generateIllustration] ========== 开始构建提示词 ==========')
  console.log('[generateIllustration] 描述:', description)
  console.log('[generateIllustration] 角色:', character)
  console.log('[generateIllustration] 世界观:', worldview)
  
  // 详细检查世界观数据
  if (worldview) {
    console.log('[generateIllustration] 世界观类型:', typeof worldview)
    console.log('[generateIllustration] 世界观ID:', worldview.id)
    console.log('[generateIllustration] 世界观era:', worldview.era, '类型:', typeof worldview.era)
    console.log('[generateIllustration] 世界观geography:', worldview.geography)
    console.log('[generateIllustration] 世界观完整结构:', JSON.stringify(worldview, null, 2))
  }
  
  const promptParts = []
  
  // ========== 第一部分：风格关键词（从世界观提取） ==========
  if (worldview) {
    // 提取时代背景，确定整体风格
    // 支持多种数据格式：era字段、originalInput字段、甚至从geography推断
    let eraText = ''
    
    // 优先级1：era字段（时代背景）
    if (worldview.era && typeof worldview.era === 'string' && worldview.era.trim()) {
      eraText = worldview.era.trim()
      console.log('[generateIllustration] 从era字段提取:', eraText)
    } 
    // 优先级2：originalInput字段（原始输入）
    else if (worldview.originalInput && typeof worldview.originalInput === 'string' && worldview.originalInput.trim()) {
      eraText = worldview.originalInput.trim()
      console.log('[generateIllustration] 从originalInput字段提取:', eraText)
    }
    // 优先级3：尝试从geography推断（如果era为空）
    else if (worldview.geography && typeof worldview.geography === 'string' && worldview.geography.trim()) {
      // 如果geography中有风格关键词，也可以使用
      const geo = worldview.geography.trim()
      if (geo.includes('仙侠') || geo.includes('古风') || geo.includes('修仙')) {
        eraText = '古风仙侠'
      } else if (geo.includes('赛博') || geo.includes('未来') || geo.includes('科幻')) {
        eraText = '赛博朋克'
      }
      console.log('[generateIllustration] 从geography推断:', eraText)
    }
    
    console.log('[generateIllustration] 最终提取的era文本:', eraText)
    
    if (eraText && eraText.trim()) {
      const era = eraText.trim()
      if (era.includes('仙侠') || era.includes('古风') || era.includes('修仙') || era.includes('武侠')) {
        promptParts.push('古风仙侠风格', '水墨画风格', '中国风')
        // ✅ 新增：强制风格一致性
        promptParts.push('必须使用古风仙侠画风', '禁止现代风格', '禁止写实风格', '禁止现代人脸')
        promptParts.push('人物面部必须符合古风仙侠风格', '不能出现现代人脸特征')
        console.log('[generateIllustration] ✅ 识别为古风仙侠风格，已加强一致性要求')
      } else if (era.includes('赛博') || era.includes('未来') || era.includes('科幻') || era.includes('科技')) {
        promptParts.push('赛博朋克风格', '未来科技感', '霓虹灯', '机械感')
        console.log('[generateIllustration] ✅ 识别为赛博朋克风格')
      } else if (era.includes('现代') || era.includes('都市')) {
        promptParts.push('现代风格', '写实风格')
        console.log('[generateIllustration] ✅ 识别为现代风格')
      } else if (era.includes('魔幻') || era.includes('奇幻') || era.includes('魔法')) {
        promptParts.push('魔幻风格', '奇幻风格', '魔法元素')
        console.log('[generateIllustration] ✅ 识别为魔幻风格')
      } else if (era.includes('中世纪') || era.includes('欧洲')) {
        promptParts.push('中世纪风格', '欧式风格')
        console.log('[generateIllustration] ✅ 识别为中世纪风格')
      } else {
        // 如果无法识别具体风格，至少提取一些关键词
        console.log('[generateIllustration] ⚠️ 无法识别具体风格，使用通用处理')
        // 尝试提取一些通用关键词
        if (era.length > 0) {
          // 提取前30个字符作为风格描述
          const styleDesc = era.substring(0, 30)
          promptParts.push(styleDesc + '风格')
        }
      }
    } else {
      console.warn('[generateIllustration] ⚠️ 世界观没有有效的era、originalInput或geography字段')
      console.warn('[generateIllustration] 世界观数据结构:', JSON.stringify(worldview, null, 2))
    }
    
    // 提取地理环境，作为场景背景参考
    if (worldview.geography && typeof worldview.geography === 'string' && worldview.geography.trim()) {
      const geo = worldview.geography.trim()
      if (geo.includes('山') || geo.includes('峰')) {
        promptParts.push('山景', '山峰')
      }
      if (geo.includes('海') || geo.includes('洋')) {
        promptParts.push('海洋', '海岸')
      }
      if (geo.includes('城') || geo.includes('市')) {
        promptParts.push('城市', '都市')
      }
      if (geo.includes('森林') || geo.includes('林')) {
        promptParts.push('森林', '自然')
      }
    }
  } else {
    console.log('[generateIllustration] 未提供世界观')
  }
  
  // ✅ 修复：如果没有世界观，但有已有插画，从插画推断风格
  if (promptParts.length === 0 && existingImages && existingImages.length > 0) {
    // 尝试从已有插画描述中推断风格
    const existingDesc = existingImages
      .map(img => img.description || img.title || '')
      .join(' ')
    
    if (existingDesc.includes('仙侠') || existingDesc.includes('古风') || existingDesc.includes('武侠')) {
      promptParts.push('古风仙侠风格', '水墨画风格', '中国风')
      promptParts.push('必须使用古风仙侠画风', '禁止现代风格', '禁止写实风格')
      console.log('[generateIllustration] ✅ 从已有插画推断为古风仙侠风格')
    } else {
      promptParts.push('动漫风格', '二次元')
    }
  } else if (promptParts.length === 0) {
    promptParts.push('动漫风格', '二次元')
  }
  
  // ========== 第二部分：角色核心特征 ==========
  if (character) {
    const charParts = []
    
    // 基础信息
    if (character.basicInfo) {
      const info = character.basicInfo
      
      // 姓名（如果有，可以作为角色标识）
      if (info.name && info.name !== '未命名') {
        charParts.push(info.name)
      }
      
      // 身份/职业（重要，影响服装和道具）
      if (info.identity) {
        charParts.push(info.identity)
        // 根据身份推断服装
        const identity = info.identity
        if (identity.includes('剑客') || identity.includes('侠客') || identity.includes('剑士')) {
          charParts.push('持剑', '古装')
        } else if (identity.includes('魔法') || identity.includes('法师')) {
          charParts.push('法杖', '魔法袍')
        } else if (identity.includes('骑士')) {
          charParts.push('盔甲', '骑士装')
        } else if (identity.includes('机器人') || identity.includes('AI')) {
          charParts.push('机械', '科技感')
        }
      }
      
      // 性别和年龄（影响外貌特征）
      if (info.gender) {
        if (info.gender === '男') {
          charParts.push('男性角色')
        } else if (info.gender === '女') {
          charParts.push('女性角色')
        }
      }
      
      // ✅ 修复：完善年龄处理，包括老者
      if (info.age) {
        const age = parseInt(info.age)
        if (age <= 18) {
          charParts.push('年轻', '少年/少女', '稚嫩面容')
        } else if (age <= 30) {
          charParts.push('青年', '年轻面容')
        } else if (age <= 50) {
          charParts.push('中年', '成熟', '稳重面容')
        } else if (age <= 70) {
          charParts.push('中老年', '成熟面容', '有皱纹', '沉稳')
        } else {
          // ✅ 新增：老者处理
          charParts.push('老者', '老年', '白发', '皱纹明显', '沧桑面容', '长须', '仙风道骨')
        }
      }
    }
    
    // 性格特征（影响表情和姿态）
    if (character.personality) {
      const personality = character.personality
      if (personality.includes('傲娇')) {
        charParts.push('傲娇表情', '双手抱胸', '侧脸')
      } else if (personality.includes('温柔')) {
        charParts.push('温柔表情', '微笑', '柔和')
      } else if (personality.includes('冷酷') || personality.includes('冷漠')) {
        charParts.push('冷酷表情', '严肃', '冷峻')
      } else if (personality.includes('活泼') || personality.includes('开朗')) {
        charParts.push('活泼表情', '笑容', '活力')
      } else if (personality.includes('沉稳') || personality.includes('冷静')) {
        charParts.push('沉稳表情', '平静', '内敛')
      }
    }
    
    // 行为逻辑（可能影响动作）
    if (character.behavior) {
      const behavior = character.behavior
      if (behavior.includes('战斗') || behavior.includes('战斗')) {
        charParts.push('战斗姿态', '动态')
      } else if (behavior.includes('守护') || behavior.includes('保护')) {
        charParts.push('守护姿态', '防御')
      }
    }
    
    if (charParts.length > 0) {
      promptParts.push(...charParts)
    }
  }
  
  // ========== 第三部分：一致性要求（增强版，如果有已有插画） ==========
  if (existingImages && existingImages.length > 0) {
    if (character) {
      // 1. 尝试从已有插画中提取外观特征
      let appearance = null
      try {
        appearance = await extractCharacterAppearance(existingImages, character)
        console.log('[generateIllustration] 提取的外观特征:', appearance)
      } catch (error) {
        console.warn('[generateIllustration] 提取外观特征失败:', error)
      }
      
      // 2. 如果角色已有外观特征，优先使用
      if (character.appearance) {
        appearance = { ...(appearance || {}), ...character.appearance }
      }
      
      // 3. 构建一致性提示词
      if (appearance) {
        const consistencyPrompt = buildConsistencyPrompt(appearance, existingImages)
        promptParts.push(consistencyPrompt)
        promptParts.push('人物外观必须完全一致，不能有任何变化')
        promptParts.push('服装、发型、配饰必须保持一致')
      } else {
        // 降级方案：使用通用一致性要求
        promptParts.push('保持与已有插画的一致性')
        promptParts.push('人物外观保持一致')
        promptParts.push('服装风格统一')
      }
      
      // 4. 参考已有插画描述
      const existingDescriptions = existingImages
        .filter(img => img && img.description)
        .map(img => img.description)
        .slice(0, 2)
      
      if (existingDescriptions.length > 0) {
        console.log('[generateIllustration] 参考已有插画描述:', existingDescriptions)
        promptParts.push(`参考以下已有插画的人物设定：${existingDescriptions.join('；')}`)
      }
    } else {
      // 没有角色信息，使用基础一致性要求
      promptParts.push('保持与已有插画的一致性')
      promptParts.push('人物外观保持一致')
      promptParts.push('服装风格统一')
    }
    promptParts.push('画风统一')
  }
  
  // ========== 新增：场景情绪和表情分析 ==========
  if (description && description.trim()) {
    const desc = description.trim().toLowerCase()
    const emotionParts = []
    const actionParts = []
    
    // 战斗场景：严肃、紧张、专注
    if (desc.includes('战斗') || desc.includes('对决') || desc.includes('对峙') || 
        desc.includes('攻击') || desc.includes('战斗') || desc.includes('厮杀') ||
        desc.includes('破') || desc.includes('救') || desc.includes('潜入')) {
      emotionParts.push('严肃表情', '紧张', '专注', '眼神锐利', '不笑')
      actionParts.push('战斗姿态', '动态', '准备攻击', '防御姿态')
      console.log('[generateIllustration] ✅ 识别为战斗场景，添加严肃表情')
    }
    
    // 对话/交流场景：根据内容决定
    if (desc.includes('对话') || desc.includes('交谈') || desc.includes('讨论') ||
        desc.includes('说') || desc.includes('告诉') || desc.includes('询问')) {
      // 检查是否有负面情绪关键词
      if (desc.includes('愤怒') || desc.includes('生气') || desc.includes('不满')) {
        emotionParts.push('严肃表情', '不满', '皱眉')
      } else if (desc.includes('悲伤') || desc.includes('难过') || desc.includes('痛苦')) {
        emotionParts.push('悲伤表情', '忧郁', '眼神暗淡')
      } else if (desc.includes('开心') || desc.includes('高兴') || desc.includes('笑')) {
        emotionParts.push('微笑', '开心', '愉悦')
      } else {
        // 默认对话场景：平静、自然
        emotionParts.push('自然表情', '平静', '专注倾听')
      }
      actionParts.push('对话姿态', '自然站立', '手势自然')
      console.log('[generateIllustration] ✅ 识别为对话场景')
    }
    
    // 庆祝/欢乐场景：微笑、开心
    if (desc.includes('庆祝') || desc.includes('胜利') || desc.includes('成功') ||
        desc.includes('开心') || desc.includes('高兴') || desc.includes('喜悦')) {
      emotionParts.push('微笑', '开心', '愉悦', '眼神明亮')
      actionParts.push('庆祝姿态', '举手', '拥抱')
      console.log('[generateIllustration] ✅ 识别为庆祝场景，添加开心表情')
    }
    
    // 悲伤/痛苦场景：严肃、悲伤
    if (desc.includes('悲伤') || desc.includes('痛苦') || desc.includes('失去') ||
        desc.includes('死亡') || desc.includes('牺牲') || desc.includes('离别')) {
      emotionParts.push('悲伤表情', '严肃', '眼神暗淡', '不笑')
      actionParts.push('悲伤姿态', '低头', '握拳')
      console.log('[generateIllustration] ✅ 识别为悲伤场景，添加悲伤表情')
    }
    
    // 训练/修炼场景：专注、认真
    if (desc.includes('修炼') || desc.includes('训练') || desc.includes('练习') ||
        desc.includes('修行') || desc.includes('练功')) {
      emotionParts.push('专注表情', '认真', '严肃', '不笑')
      actionParts.push('修炼姿态', '盘坐', '专注')
      console.log('[generateIllustration] ✅ 识别为修炼场景，添加专注表情')
    }
    
    // 如果检测到场景类型，添加相应的表情和动作
    if (emotionParts.length > 0) {
      promptParts.push(...emotionParts)
      console.log('[generateIllustration] 添加表情关键词:', emotionParts)
    }
    
    if (actionParts.length > 0) {
      promptParts.push(...actionParts)
      console.log('[generateIllustration] 添加动作关键词:', actionParts)
    }
    
    // ✅ 重要：如果检测到战斗场景，强制覆盖性格特征中的表情
    if (desc.includes('战斗') || desc.includes('对决') || desc.includes('对峙') ||
        desc.includes('攻击') || desc.includes('战斗') || desc.includes('厮杀')) {
      // 移除可能冲突的开心表情关键词
      const conflictKeywords = ['微笑', '笑容', '开心', '愉悦', '活泼表情']
      promptParts.forEach((part, index) => {
        if (conflictKeywords.some(keyword => part.includes(keyword))) {
          console.log(`[generateIllustration] ⚠️ 移除冲突的表情关键词: ${part}`)
          promptParts[index] = part.replace(/微笑|笑容|开心|愉悦|活泼/g, '严肃')
        }
      })
      // 确保战斗场景的表情是严肃的
      promptParts.push('所有角色表情必须严肃', '禁止在战斗场景中出现笑容')
      console.log('[generateIllustration] ✅ 强制战斗场景表情为严肃')
    }
  }
  
  // ========== 第四部分：多角色场景检测 ==========
  // 检测场景描述中的角色数量，如果包含多个角色，在prompt中明确要求
  if (description && description.trim()) {
    const desc = description.trim()
    
    // 检测多角色关键词
    const multiCharKeywords = ['三人', '多人', '联手', '一起', '共同', '并肩', '联手', '合作']
    const hasMultiChar = multiCharKeywords.some(keyword => desc.includes(keyword))
    
    if (hasMultiChar) {
      promptParts.push('多人场景', '画面中包含多个角色', '角色互动')
      
      // 如果传入了多个角色，明确列出
      if (Array.isArray(character) && character.length > 1) {
        const characterNames = character.map(c => {
          if (c && c.basicInfo && c.basicInfo.name) {
            return c.basicInfo.name
          } else if (c && c.name) {
            return c.name
          }
          return '角色'
        }).filter(name => name !== '角色' && name).join('、')
        if (characterNames) {
          promptParts.push(`包含角色：${characterNames}`)
        }
      } else if (character && character.basicInfo && character.basicInfo.name) {
        // 即使只有一个角色对象，如果描述中提到多个角色，也要提示
        promptParts.push(`主要角色：${character.basicInfo.name}`)
      }
      
      // 检测描述中提到的角色数量
      const charCountMatch = desc.match(/([三|四|五|六|七|八|九|十]|多)人/)
      if (charCountMatch) {
        promptParts.push(`画面中应包含${charCountMatch[0]}`)
      }
    }
  }
  
  // ========== 第五部分：构图和比例控制 ==========
  // 根据场景类型自动添加构图和比例提示
  if (description && description.trim()) {
    const desc = description.trim()
    
    // 检测场景类型并添加相应的构图指导
    if (desc.includes('山') || desc.includes('峰') || desc.includes('崖') || desc.includes('岭')) {
      // 武侠/仙侠场景：人物应该突出，背景作为衬托
      promptParts.push('人物位于前景，占据画面主要位置（约40-50%）')
      promptParts.push('背景山峰作为远景，比例适中（约50-60%），不要喧宾夺主')
      promptParts.push('人物清晰可见，背景适度虚化处理')
      promptParts.push('采用三分法构图，人物位于画面黄金分割点')
      promptParts.push('平视视角，自然舒适')
    } else if (desc.includes('战斗') || desc.includes('对峙') || desc.includes('对决')) {
      // 战斗场景：人物为主
      promptParts.push('人物占据画面中心（约60-70%）')
      promptParts.push('背景简洁，突出人物动作')
      promptParts.push('动态构图，视觉冲击力强')
      promptParts.push('人物与背景比例约为6:4或7:3')
    } else if (desc.includes('室内') || desc.includes('房间') || desc.includes('屋') || desc.includes('殿')) {
      // 室内场景：人物为主
      promptParts.push('人物占据画面主要位置（约50-60%）')
      promptParts.push('室内环境作为背景，比例约为4:6')
      promptParts.push('景深层次分明，前景清晰，背景适度虚化')
    } else if (desc.includes('海') || desc.includes('湖') || desc.includes('河') || desc.includes('水')) {
      // 水域场景：人物与背景平衡
      promptParts.push('人物位于前景或中景（约40-50%）')
      promptParts.push('水面和天空作为背景（约50-60%）')
      promptParts.push('画面平衡，视觉焦点明确')
    } else if (desc.includes('森林') || desc.includes('林') || desc.includes('树')) {
      // 森林场景：人物为主
      promptParts.push('人物清晰可见，占据画面主要位置（约45-55%）')
      promptParts.push('森林作为背景，比例适中（约45-55%）')
      promptParts.push('景深层次分明，前景清晰，背景适度虚化')
    } else {
      // 默认：人物为主，背景衬托
      promptParts.push('人物清晰可见，占据画面主要位置（约50-60%）')
      promptParts.push('背景作为衬托，比例适中（约40-50%）')
      promptParts.push('采用三分法构图，人物位于画面黄金分割点')
      promptParts.push('平视视角，自然舒适')
      promptParts.push('画面平衡，视觉焦点明确')
    }
    
    // 添加通用构图指导
    promptParts.push('景深层次分明，前景清晰，背景适度虚化')
    promptParts.push('画面平衡，视觉焦点明确')
    
    // 最后添加用户输入的场景描述
    promptParts.push(desc)
  } else {
    // 即使没有描述，也添加默认构图指导
    promptParts.push('人物清晰可见，占据画面主要位置')
    promptParts.push('采用三分法构图，人物位于画面黄金分割点')
    promptParts.push('平视视角，自然舒适')
  }
  
  // ========== 第六部分：质量提升词 ==========
  promptParts.push(
    '高清',
    '细节丰富',
    '精美插画',
    '专业画质',
    '精细描绘',
    '高质量',
    '8k分辨率'
  )
  
  // ========== 组合最终提示词 ==========
  let finalPrompt = promptParts.join('，')
  
  // 限制长度（避免超出API限制）
  if (finalPrompt.length > 500) {
    finalPrompt = finalPrompt.substring(0, 500)
  }
  
  console.log('[generateIllustration] 最终提示词:', finalPrompt)
  console.log('[generateIllustration] 提示词长度:', finalPrompt.length)
  
  // 负面提示词（避免常见问题）
  // ✅ 修复：加强风格限制
  let negativePrompt = '模糊，低质量，变形，扭曲，多手，多脚，畸形，不自然，比例失调，重复元素'

  // 如果识别为战斗场景，添加表情相关的负面提示词
  if (description && description.trim()) {
    const desc = description.trim().toLowerCase()
    if (desc.includes('战斗') || desc.includes('对决') || desc.includes('对峙') ||
        desc.includes('攻击') || desc.includes('战斗') || desc.includes('厮杀') ||
        desc.includes('破') || desc.includes('救') || desc.includes('潜入')) {
      negativePrompt += '，笑容，开心表情，不合适的表情，与场景不符的表情'
      console.log('[generateIllustration] ✅ 已添加战斗场景的负面表情提示词')
    }
  }

  // 如果识别为古风仙侠风格，添加额外的负面提示词
  if (promptParts.some(p => p.includes('古风') || p.includes('仙侠'))) {
    negativePrompt += '，现代风格，写实风格，现代人脸，现代服装，现代发型，西方人脸，欧美风格'
    console.log('[generateIllustration] ✅ 已添加古风仙侠风格的负面提示词')
  }
  
  console.log('[generateIllustration] ========== 开始调用图片生成API ==========')
  const result = await callImageAPI(finalPrompt, {
    style: 'anime', // 默认动漫风格
    size: '1024x1024',
    negativePrompt: negativePrompt
  })
  console.log('[generateIllustration] ========== 图片生成API调用完成 ==========')
  return result
}

/**
 * 生成故事大纲
 * @param {string} premise - 故事前提/一句话概括
 * @param {number} targetLength - 目标字数（如 2000, 4000）
 * @param {Array} characters - 角色列表
 * @param {object} worldview - 世界观信息
 * @returns {Promise<string>} JSON格式的大纲数组字符串
 */
function generateStoryOutline(premise, targetLength, characters = [], worldview = null) {
  let prompt = `你是一个专业的故事创作助手。请根据以下信息生成一个结构化的故事大纲。

## 任务说明
根据故事前提、角色设定和世界观，生成一个完整的故事大纲。大纲应该包含故事的起承转合，适合生成约${targetLength}字的短篇小说。

## 故事前提
${premise}

## 角色设定
`
  
  if (characters && characters.length > 0) {
    characters.forEach((char, index) => {
      prompt += `\n### 角色${index + 1}：${(char.basicInfo && char.basicInfo.name) || '未命名角色'}\n`
      if (char.basicInfo) {
        prompt += `- 身份：${char.basicInfo.identity || '未知'}\n`
        prompt += `- 性格：${char.personality ? char.personality.substring(0, 100) : '未知'}\n`
      }
    })
  } else {
    prompt += `\n暂无指定角色，请根据故事前提合理设计角色。\n`
  }
  
  if (worldview) {
    prompt += `\n## 世界观背景\n`
    prompt += `- 时代：${worldview.era || ''}\n`
    prompt += `- 环境：${worldview.geography || ''}\n`
    prompt += `- 规则：${worldview.socialRules || ''}\n`
    prompt += `- 冲突：${worldview.conflicts || ''}\n`
  }
  
  prompt += `\n## 输出要求
- **必须**只返回JSON格式，不要添加任何解释、说明或markdown代码块标记
- **必须**严格按照以下JSON格式返回
- 大纲应该包含3-8个关键节点，每个节点代表故事的一个阶段
- 每个节点应该包含：标题（title）和简要描述（description）
- 节点应该按照故事发展顺序排列：开头 → 发展 → 转折 → 高潮 → 结局

## JSON格式
{
  "outline": [
    {
      "title": "节点标题（如：序幕/开端/转折/高潮/结局）",
      "description": "该节点的详细描述（50-150字）"
    }
  ]
}

## 开始生成
请直接返回JSON，不要添加任何其他内容。`

  return callDoubaoAPI(prompt, 'story')
}

/**
 * 生成故事段落（根据大纲节点或续写）
 * @param {object} outlineItem - 大纲节点（可选）
 * @param {string} previousContent - 前文内容（用于续写）
 * @param {Array} characters - 角色列表
 * @param {object} worldview - 世界观信息
 * @param {number} targetLength - 目标字数（如 500, 1000）
 * @returns {Promise<string>} 故事段落文本
 */
function generateStorySegment(outlineItem, previousContent, characters = [], worldview = null, targetLength = 500) {
  let prompt = `你是一个专业的小说创作助手。请根据以下信息生成一段连贯的故事内容。

## 任务说明
${outlineItem ? '根据指定的大纲节点生成故事段落' : '根据前文内容续写故事'}，目标字数约${targetLength}字。

`
  
  if (outlineItem) {
    prompt += `## 当前大纲节点
标题：${outlineItem.title || ''}
描述：${outlineItem.description || ''}

`
  }
  
  if (previousContent && previousContent.trim()) {
    prompt += `## 前文内容
${previousContent.substring(Math.max(0, previousContent.length - 1000))}

## 续写要求
请承接前文，自然地继续故事发展。保持风格一致，情节连贯。

`
  }
  
  if (characters && characters.length > 0) {
    prompt += `## 角色设定\n`
    characters.forEach((char, index) => {
      prompt += `\n### 角色${index + 1}：${(char.basicInfo && char.basicInfo.name) || '未命名角色'}\n`
      if (char.basicInfo) {
        prompt += `- 身份：${char.basicInfo.identity || '未知'}\n`
        prompt += `- 性格：${char.personality ? char.personality.substring(0, 100) : '未知'}\n`
        if (char.catchphrases && char.catchphrases.length > 0) {
          prompt += `- 口头禅：${char.catchphrases.join('、')}\n`
        }
      }
    })
    prompt += `\n`
  }
  
  if (worldview) {
    prompt += `## 世界观背景\n`
    prompt += `- 时代：${worldview.era || ''}\n`
    prompt += `- 环境：${worldview.geography || ''}\n`
    prompt += `- 规则：${worldview.socialRules || ''}\n`
    prompt += `\n`
  }
  
  prompt += `## 写作要求
- 使用第三人称叙述
- 注重场景描写和人物心理刻画
- 对话要符合角色性格
- 保持故事的连贯性和节奏感
- 字数控制在${targetLength}字左右（允许±100字的浮动）
- 不要使用markdown格式，直接输出纯文本

## 开始创作
请直接输出故事段落，不要添加任何标题、说明或其他内容。`

  return callDoubaoAPI(prompt, 'dialog', { characters, worldview })
}

/**
 * 从故事段落中提取核心场景描述
 * 用于生成插画，提取最关键的视觉场景（如"萧无痕被血刃刺伤倒地"）
 * @param {string} storySegment - 故事段落文本
 * @param {Array} characters - 角色列表（用于识别角色名称）
 * @returns {Promise<string>} 核心场景描述（简短，10-30字）
 */
function extractKeyScene(storySegment, characters = []) {
  let prompt = `你是一个专业的场景分析助手。请从以下故事段落中提取最核心、最适合生成插画的视觉场景。

## 任务说明
从故事段落中识别出最关键的视觉场景，这个场景应该：
1. 包含具体的动作和状态（如"被刺伤倒地"、"拔剑对峙"）
2. 包含主要角色（如果场景中有多个角色，必须明确列出所有角色的姓名和数量）
3. 适合用一张插画表现
4. 描述简洁明了（10-30字）

## 故事段落
${storySegment}

## 角色信息
`
  
  if (characters && characters.length > 0) {
    characters.forEach((char, index) => {
      const name = (char.basicInfo && char.basicInfo.name) || char.name || '未命名角色'
      prompt += `- ${name}\n`
    })
  }
  
  prompt += `
## 输出要求
- **必须**只返回核心场景描述，不要添加任何解释、说明或markdown标记
- 描述应该简洁（10-30字），直接描述场景
- **重要**：如果场景中包含多个角色，必须明确列出所有角色的姓名和数量
- 格式示例：
  - 单角色："萧无痕被血刃刺伤倒地"
  - 多角色："萧无痕、林月瑶、影刃三人联手在禁地击败三长老"
  - 多角色："萧无痕拔剑与黑影对峙"
- 只输出场景描述，不要其他内容

## 开始提取
请直接输出核心场景描述：`

  return callDoubaoAPI(prompt, 'dialog')
}

/**
 * 从故事内容中识别多个核心场景
 * @param {string} storyContent - 故事正文
 * @param {Array} outline - 故事大纲
 * @param {Array} characters - 角色列表
 * @param {number} maxScenes - 最大场景数（默认5）
 * @returns {Promise<Array>} 核心场景列表 [{index, description, outlineIndex}]
 */
async function identifyKeyScenes(storyContent, outline, characters = [], maxScenes = 5) {
  const prompt = `你是一个专业的故事分析助手。请从以下故事中识别出最适合生成插画的核心场景。

## 任务说明
从故事正文和大纲中，识别出${maxScenes}个最核心、最适合生成插画的视觉场景。这些场景应该：
1. 包含具体的动作和状态（如"被刺伤倒地"、"拔剑对峙"）
2. 包含主要角色（如果场景中有多个角色，必须明确列出所有角色的姓名和数量）
3. 适合用一张插画表现
4. 场景之间要有故事连贯性
5. 按照故事发展顺序排列

## 故事大纲
${outline && outline.length > 0 ? outline.map((item, idx) => `${idx + 1}. ${item.title || '节点' + (idx + 1)}：${item.description || ''}`).join('\n') : '无大纲'}

## 故事正文
${storyContent.substring(0, 3000)}${storyContent.length > 3000 ? '...' : ''}

## 角色信息
${characters && characters.length > 0 ? characters.map((char, idx) => `${idx + 1}. ${(char.basicInfo && char.basicInfo.name) || char.name || '未命名角色'}`).join('\n') : '未指定角色'}

## 输出要求
- **必须**只返回JSON格式，不要添加任何解释、说明或markdown代码块标记
- 识别${maxScenes}个核心场景
- 每个场景包含：场景描述（10-30字）、在大纲中的位置（节点序号，从1开始）
- **重要**：如果场景中包含多个角色，场景描述必须明确列出所有角色的姓名和数量
- 场景描述示例：
  - 单角色："萧无痕被血刃刺伤倒地"
  - 多角色："萧无痕、林月瑶、影刃三人联手在禁地击败三长老"
- 按照故事发展顺序排列

## JSON格式
{
  "scenes": [
    {
      "index": 1,
      "outlineIndex": 1,
      "description": "场景描述（10-30字，多角色场景需明确列出所有角色）",
      "paragraphHint": "所在段落的提示信息"
    }
  ]
}

请直接返回JSON，不要添加任何其他内容。`
  
  try {
    const result = await callDoubaoAPI(prompt, 'dialog')
    const parsed = jsonParser.safeParseJSON(result, { scenes: [] })
    return parsed.scenes || []
  } catch (error) {
    console.error('[identifyKeyScenes] 识别核心场景失败:', error)
    return []
  }
}

/**
 * 从已有插画描述中提取角色外观特征
 * @param {Array} existingImages - 已有插画列表
 * @param {object} character - 角色信息
 * @returns {Promise<object>} 提取的外观特征
 */
async function extractCharacterAppearance(existingImages, character) {
  if (!existingImages || existingImages.length === 0) {
    return null
  }
  
  const prompt = `你是一个专业的角色外观分析助手。请从以下已有插画的描述中，提取角色的外观特征。

## 任务说明
从已有插画的描述中，提取角色的外观特征，确保新生成的插画能够保持一致性。

## 角色信息
姓名：${character.basicInfo?.name || '未命名'}
身份：${character.basicInfo?.identity || ''}
性格：${character.personality?.substring(0, 100) || ''}

## 已有插画描述
${existingImages.map((img, idx) => `${idx + 1}. ${img.description || img.title || ''}`).join('\n')}

## 提取要求
请提取以下外观特征：
1. 发色（如：黑色、棕色、银色等）
2. 发型（如：长发、短发、马尾等）
3. 服装（如：白色长袍、黑色劲装等）
4. 脸型特征（如：清秀、刚毅、柔和等）
5. 体型（如：修长、魁梧、娇小等）
6. 配饰（如：剑、玉佩、法杖等）
7. 整体风格（如：古风仙侠、赛博朋克等）

## 输出要求
- **必须**只返回JSON格式，不要添加任何解释、说明或markdown代码块标记
- 如果某个特征无法确定，返回空字符串
- 严格按照以下格式返回：

{
  "hairColor": "发色",
  "hairStyle": "发型",
  "clothing": "服装描述",
  "faceType": "脸型特征",
  "build": "体型",
  "accessories": ["配饰1", "配饰2"],
  "style": "整体风格"
}

请直接返回JSON，不要添加任何其他内容。`
  
  try {
    const result = await callDoubaoAPI(prompt, 'extractBasicInfo')
    const parsed = jsonParser.safeParseJSON(result, null)
    return parsed
  } catch (error) {
    console.warn('[extractCharacterAppearance] 提取外观特征失败:', error)
    return null
  }
}

/**
 * 构建一致性提示词
 * @param {object} appearance - 外观特征
 * @param {Array} existingImages - 已有插画
 * @returns {string} 一致性提示词
 */
function buildConsistencyPrompt(appearance, existingImages) {
  const parts = []
  
  if (appearance) {
    if (appearance.hairColor) parts.push(`发色：${appearance.hairColor}`)
    if (appearance.hairStyle) parts.push(`发型：${appearance.hairStyle}`)
    if (appearance.clothing) parts.push(`服装：${appearance.clothing}`)
    if (appearance.faceType) parts.push(`脸型：${appearance.faceType}`)
    if (appearance.build) parts.push(`体型：${appearance.build}`)
    if (appearance.accessories && appearance.accessories.length > 0) {
      parts.push(`配饰：${appearance.accessories.join('、')}`)
    }
    if (appearance.style) parts.push(`风格：${appearance.style}`)
  }
  
  if (parts.length > 0) {
    return `【重要：必须保持角色外观一致性】${parts.join('，')}。新插画中的角色必须完全符合以上外观特征，不能有任何变化。`
  }
  
  return '保持与已有插画的人物外观、服装、画风完全一致'
}

/**
 * 分析对话片段是否适合插入到故事的指定位置
 * @param {string} dialogTemplate - 对话片段内容
 * @param {string} storyContent - 故事内容（插入位置上下文）
 * @param {object} outlineItem - 大纲节点（插入位置）
 * @param {string} contextBefore - 插入位置前文
 * @param {string} contextAfter - 插入位置后文
 * @param {Array} characters - 角色列表
 * @param {object} worldview - 世界观
 * @returns {Promise<object>} {suitable: boolean, reason: string, suggestion: string}
 */
async function analyzeDialogInsertion(dialogTemplate, storyContent, outlineItem, contextBefore, contextAfter, characters = [], worldview = null) {
  const prompt = `你是一个专业的故事编辑助手。请分析以下对话片段是否适合插入到故事的指定位置。

## 任务说明
分析对话片段是否适合插入到故事的大纲节点对应段落位置，并给出建议。

## 对话片段
${dialogTemplate}

## 故事大纲节点（插入位置）
标题：${outlineItem.title || '未命名节点'}
描述：${outlineItem.description || ''}

## 插入位置上下文
${contextBefore ? `【前文】\n${contextBefore.substring(Math.max(0, contextBefore.length - 500))}\n\n` : ''}
${contextAfter ? `【后文】\n${contextAfter.substring(0, 500)}\n\n` : ''}
${storyContent ? `【当前段落】\n${storyContent.substring(0, 800)}\n\n` : ''}

## 角色信息
${characters && characters.length > 0 ? characters.map((char, idx) => `${idx + 1}. ${(char.basicInfo && char.basicInfo.name) || '未命名角色'}`).join('\n') : '未指定角色'}

## 世界观背景
${worldview ? `时代：${worldview.era || ''}\n环境：${worldview.geography || ''}` : '未指定世界观'}

## 分析要求
请从以下角度分析：
1. 对话片段的内容是否与大纲节点匹配
2. 对话片段是否与前后文连贯
3. 对话片段是否符合角色设定和世界观
4. 插入后是否会影响故事节奏和逻辑

## 输出要求
- **必须**只返回JSON格式，不要添加任何解释、说明或markdown代码块标记
- 严格按照以下格式返回：

{
  "suitable": true/false,
  "reason": "分析原因（50-100字）",
  "suggestion": "插入建议或需要调整的地方（50-100字）"
}

请直接返回JSON，不要添加任何其他内容。`
  
  try {
    const result = await callDoubaoAPI(prompt, 'dialog')
    const parsed = jsonParser.safeParseJSON(result, { suitable: false, reason: '分析失败', suggestion: '' })
    return parsed
  } catch (error) {
    console.error('[analyzeDialogInsertion] 分析失败:', error)
    return { suitable: false, reason: '分析失败：' + (error.message || '未知错误'), suggestion: '' }
  }
}

/**
 * 为对话片段生成增写内容，使其自然插入到故事中
 * @param {string} dialogTemplate - 对话片段内容
 * @param {string} contextBefore - 插入位置前文
 * @param {string} contextAfter - 插入位置后文
 * @param {object} outlineItem - 大纲节点
 * @param {Array} characters - 角色列表
 * @param {object} worldview - 世界观
 * @returns {Promise<string>} 增写后的完整内容（包含对话片段和过渡文字）
 */
async function generateDialogInsertion(dialogTemplate, contextBefore, contextAfter, outlineItem, characters = [], worldview = null) {
  const prompt = `你是一个专业的故事编辑助手。请为以下对话片段生成增写内容，使其能够自然插入到故事中。

## 任务说明
为对话片段添加必要的过渡文字和上下文描述，使其能够自然流畅地插入到故事的大纲节点对应段落位置。

## 对话片段
${dialogTemplate}

## 故事大纲节点（插入位置）
标题：${outlineItem.title || '未命名节点'}
描述：${outlineItem.description || ''}

## 插入位置上下文
${contextBefore ? `【前文】\n${contextBefore.substring(Math.max(0, contextBefore.length - 500))}\n\n` : ''}
${contextAfter ? `【后文】\n${contextAfter.substring(0, 500)}\n\n` : ''}

## 角色信息
${characters && characters.length > 0 ? characters.map((char, idx) => `${idx + 1}. ${(char.basicInfo && char.basicInfo.name) || '未命名角色'}`).join('\n') : '未指定角色'}

## 世界观背景
${worldview ? `时代：${worldview.era || ''}\n环境：${worldview.geography || ''}` : '未指定世界观'}

## 输出要求
- 生成的内容应该包含：
  1. 必要的场景描述和过渡文字（如果需要，用于连接前文）
  2. 对话片段本身
  3. 对话后的过渡文字（如果需要，用于连接后文）
- 保持与故事风格一致
- 确保插入后故事流畅自然
- 直接输出增写后的完整内容，不要添加说明或标记

请直接输出增写后的内容：`
  
  return await callDoubaoAPI(prompt, 'dialog', { characters, worldview })
}

/**
 * 生成视频提示词
 * 根据故事、插画、角色、世界观生成适合视频生成的提示词
 */
async function generateVideoPrompt({ story, storyTitle, outline, images, characters, worldview }) {
  const prompt = `你是一个专业的视频创作助手。请根据以下故事内容、插画描述、角色信息和世界观，生成一个适合视频生成的详细提示词。

## 任务说明
生成一个详细的视频提示词，该提示词应该：
1. 描述视频的整体风格和氛围
2. 明确视频中的主要场景和动作
3. 包含角色的外观和动作描述
4. 描述场景的视觉元素（背景、光线、色彩等）
5. 适合5-10秒的视频生成
6. 提示词长度控制在200-300字

## 故事信息
标题：${storyTitle || '未命名故事'}
内容：${story.substring(0, 2000)}${story.length > 2000 ? '...' : ''}

## 故事大纲
${outline && outline.length > 0 
  ? outline.map((item, idx) => `${idx + 1}. ${item.title || '节点' + (idx + 1)}：${item.description || ''}`).join('\n')
  : '无大纲'}

## 插画描述
${images && images.length > 0
  ? images.map((img, idx) => `${idx + 1}. ${img.description || '无描述'}`).join('\n')
  : '无插画'}

## 角色信息
${characters && characters.length > 0
  ? characters.map((char, idx) => `${idx + 1}. ${char.name}：${char.description || '无描述'}`).join('\n')
  : '无角色信息'}

## 世界观
${worldview 
  ? `时代：${worldview.era || ''}\n环境：${worldview.geography || ''}\n风格：${worldview.style || ''}`
  : '无世界观信息'}

## 输出要求
- 只返回视频提示词，不要添加任何解释或说明
- 提示词应该详细、具体，适合视频生成
- 使用中文描述
- 长度控制在200-300字

请直接输出视频提示词：`

  return await callDoubaoAPI(prompt, 'dialog')
}

/**
 * 生成视频
 * 调用阿里云通义万象视频生成API
 * @param {object} options - 生成选项
 * @param {string} options.prompt - 视频提示词
 * @param {string} options.firstFrame - 首帧图片（base64或URL，可选）
 * @param {number} options.duration - 视频时长（秒，默认5秒）
 * @param {string} options.resolution - 分辨率（720p/1080p，默认720p）
 * @returns {Promise<string>} 视频URL或base64
 */
async function generateVideo(options = {}) {
  const { prompt, firstFrame, duration = 5, resolution = '720p' } = options

  if (!prompt || !prompt.trim()) {
    throw new Error('视频提示词不能为空')
  }

  // 获取API配置
  const apiConfig = require('./storage').getAPIConfig()
  const apiKey = apiConfig?.tongyiApiKey || apiConfig?.imageApiKey

  if (!apiKey) {
    throw new Error('视频生成API Key未配置，请先在“我的 -> API配置”中填写通义/图片API Key')
  }

  console.log('[generateVideo] 开始生成视频')
  console.log('[generateVideo] 提示词:', prompt.substring(0, 100) + '...')
  console.log('[generateVideo] 时长:', duration, '秒')
  console.log('[generateVideo] 分辨率:', resolution)

  try {
    // 注意：阿里云通义万象的视频生成API端点可能需要根据最新文档调整
    // 这里使用示例端点，实际使用时需要确认正确的API地址
    const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/generation'

    // 构建请求数据
    const requestData = {
      model: 'qwen-vl-video', // 视频生成模型（需要确认实际模型名称）
      input: {
        prompt: prompt.trim()
      },
      parameters: {
        duration: duration, // 视频时长（秒）
        resolution: resolution, // 分辨率
        fps: 24 // 帧率
      }
    }

    // 如果有首帧图片，添加到请求中
    if (firstFrame) {
      requestData.input.first_frame = firstFrame
    }

    console.log('[generateVideo] 请求数据:', JSON.stringify(requestData).substring(0, 200) + '...')

    // 发送请求（异步任务）
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: apiUrl,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable' // 启用异步任务
        },
        data: requestData,
        dataType: 'json',
        timeout: 300000, // 5分钟超时
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res)
          } else {
            reject(new Error(`API调用失败: HTTP ${res.statusCode}`))
          }
        },
        fail: reject
      })
    })

    // 处理响应（获取任务ID）
    let responseData = response.data
    if (typeof responseData === 'string') {
      responseData = JSON.parse(responseData)
    }

    const taskId = responseData.output?.task_id
    if (!taskId) {
      throw new Error('未获取到任务ID，API可能不支持视频生成或需要更新端点')
    }

    console.log('[generateVideo] 获取到任务ID:', taskId)

    // 轮询任务状态
    const maxAttempts = 60 // 最多尝试60次
    const pollInterval = 5000 // 每5秒轮询一次

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      console.log(`[generateVideo] 轮询 ${i + 1}/${maxAttempts}，查询任务状态...`)

      try {
        const statusResponse = await new Promise((resolve, reject) => {
          wx.request({
            url: `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
            method: 'GET',
            header: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            dataType: 'json',
            timeout: 10000,
            success: (res) => {
              if (res.statusCode === 200) {
                resolve(res)
              } else {
                reject(new Error(`查询任务状态失败: HTTP ${res.statusCode}`))
              }
            },
            fail: reject
          })
        })

        const statusData = statusResponse.data
        console.log(`[generateVideo] 任务状态:`, statusData.output?.task_status)

        if (statusData.output?.task_status === 'SUCCEEDED') {
          // 任务成功，获取视频URL
          const results = statusData.output.results
          if (results && results.length > 0 && results[0].url) {
            const videoUrl = results[0].url
            console.log('[generateVideo] 获取到视频URL:', videoUrl.substring(0, 100) + '...')

            // 由于视频文件较大，建议直接保存URL
            return videoUrl
          }
        } else if (statusData.output?.task_status === 'FAILED') {
          throw new Error('视频生成任务失败: ' + (statusData.output.message || '未知错误'))
        } else if (statusData.output?.task_status === 'PENDING' || statusData.output?.task_status === 'RUNNING') {
          // 继续轮询
          continue
        }
      } catch (error) {
        console.error('[generateVideo] 轮询失败:', error)
        // 继续尝试
        continue
      }
    }

    throw new Error('视频生成超时，请稍后重试')
  } catch (error) {
    console.error('[generateVideo] 生成视频失败:', error)
    
    // 如果API不支持，提供友好的错误提示
    if (error.message && error.message.includes('未获取到任务ID')) {
      throw new Error('视频生成功能暂未开放，请等待API更新或使用其他视频生成服务')
    }
    
    throw error
  }
}

module.exports = {
  generateCharacter,
  generateWorldview,
  generateDialog,
  extractDialogFromText,
  optimizeDialog,
  analyzeDialogInsertion,
  generateDialogInsertion,
  generateIllustration,
  generateStoryOutline,
  generateStorySegment,
  extractKeyScene,
  identifyKeyScenes,
  extractCharacterAppearance,
  buildConsistencyPrompt,
  callDoubaoAPI,
  callImageAPI,
  extractBasicInfoFromText,
  generateVideoPrompt,
  generateVideo
}
