// 豆包API云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 调用豆包API
 * 注意：这里需要替换为实际的豆包API调用逻辑
 * 豆包API文档：https://open.doubao.com/
 */
async function callDoubaoAPI(prompt, type, context) {
  // TODO: 替换为实际的豆包API调用
  // 示例代码结构：
  
  // 1. 获取API配置（可以从数据库或环境变量获取）
  const apiKey = process.env.DOUBAO_API_KEY || 'your-api-key-here'
  const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions' // 示例URL，需替换为实际URL
  
  // 2. 根据类型调整参数
  // 实体提取需要更低的温度以确保准确性
  const temperature = type === 'extractBasicInfo' ? 0.1 : 0.7
  const maxTokens = type === 'extractBasicInfo' ? 500 : 2000
  
  // 3. 构建请求参数
  const requestData = {
    model: 'ep-xxx', // 豆包模型ID
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: temperature,
    max_tokens: maxTokens
  }
  
  // 4. 发送HTTP请求
  try {
    // 注意：微信云函数中需要使用云函数HTTP能力或第三方HTTP库
    // 这里使用模拟响应，实际需要替换为真实API调用
    
    // 模拟API响应（实际开发中需要替换）
    return simulateDoubaoResponse(prompt, type, context)
    
    /* 实际API调用代码示例（需要安装axios等HTTP库）：
    const axios = require('axios')
    const response = await axios.post(apiUrl, requestData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    let content = response.data.choices[0].message.content
    
    // 对于实体提取类型，尝试提取JSON
    if (type === 'extractBasicInfo') {
      // 尝试从响应中提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        content = jsonMatch[0]
      }
    }
    
    return content
    */
  } catch (error) {
    console.error('豆包API调用失败:', error)
    throw new Error('API调用失败: ' + error.message)
  }
}

/**
 * 模拟豆包API响应（用于测试，实际开发中应删除）
 */
function simulateDoubaoResponse(prompt, type, context) {
  // 模拟延迟
  const delay = Math.random() * 1000 + 500
  
  // 根据类型返回不同的模拟响应
  if (type === 'extractBasicInfo') {
    // 模拟实体提取结果
    // 这里使用简单的文本匹配作为模拟，实际应该调用真实的大模型API
    let name = ''
    let age = ''
    let gender = ''
    let identity = ''
    
    // 简单的模拟提取逻辑（实际应该由大模型完成）
    const ageMatch = prompt.match(/(\d+)岁/)
    if (ageMatch) {
      age = ageMatch[1]
    }
    
    if (prompt.includes('女') || prompt.includes('少女') || prompt.includes('女性')) {
      gender = '女'
    } else if (prompt.includes('男') || prompt.includes('少年') || prompt.includes('男性')) {
      gender = '男'
    }
    
    if (prompt.includes('魔法师') || prompt.includes('法师')) {
      identity = '魔法师'
    } else if (prompt.includes('侠客') || prompt.includes('剑客')) {
      identity = '侠客'
    } else if (prompt.includes('机器人') || prompt.includes('AI')) {
      identity = '机器人'
    }
    
    return JSON.stringify({
      name: name,
      age: age,
      gender: gender,
      identity: identity
    })
  } else if (type === 'character') {
    return JSON.stringify({
      basicInfo: {
        name: '模拟角色',
        age: 25,
        gender: '男',
        identity: '侠客'
      },
      personality: '根据您的描述生成的角色性格特点',
      behavior: '根据您的描述生成的行为逻辑',
      catchphrases: ['口头禅1', '口头禅2', '口头禅3'],
      taboos: ['禁忌1', '禁忌2']
    })
  } else if (type === 'worldview') {
    return JSON.stringify({
      era: '根据您的描述生成的时代背景',
      geography: '根据您的描述生成的地理环境',
      socialRules: '根据您的描述生成的社会规则',
      conflicts: '根据您的描述生成的核心冲突',
      techLevel: '根据您的描述生成的科技/魔法水平'
    })
  } else {
    return '根据您的描述生成的对话内容：\n\n' + prompt
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { prompt, type, context: ctx } = event
  
  try {
    const result = await callDoubaoAPI(prompt, type, ctx)
    
    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('云函数执行失败:', error)
    return {
      success: false,
      error: error.message || '生成失败'
    }
  }
}

