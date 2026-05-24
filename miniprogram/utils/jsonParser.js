/**
 * JSON解析工具函数
 * 用于从AI返回的字符串中提取和解析JSON
 */

/**
 * 从文本中提取JSON对象
 * @param {string} text - 可能包含JSON的文本
 * @returns {object|null} 解析后的JSON对象，失败返回null
 */
function extractJSON(text) {
  if (!text || typeof text !== 'string') {
    return null
  }
  
  // 1. 尝试直接解析整个文本
  try {
    const parsed = JSON.parse(text.trim())
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed
    }
  } catch (e) {
    // 继续尝试其他方法
  }
  
  // 2. 尝试提取JSON对象（匹配第一个完整的JSON对象）
  try {
    // 匹配最外层的大括号对
    let braceCount = 0
    let startIndex = -1
    let endIndex = -1
    
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (startIndex === -1) {
          startIndex = i
        }
        braceCount++
      } else if (text[i] === '}') {
        braceCount--
        if (braceCount === 0 && startIndex !== -1) {
          endIndex = i
          break
        }
      }
    }
    
    if (startIndex !== -1 && endIndex !== -1) {
      const jsonStr = text.substring(startIndex, endIndex + 1)
      const parsed = JSON.parse(jsonStr)
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed
      }
    }
  } catch (e) {
    // 继续尝试其他方法
  }
  
  // 3. 使用正则表达式匹配JSON（更宽松的方式）
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const jsonStr = jsonMatch[0]
      const parsed = JSON.parse(jsonStr)
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed
      }
    }
  } catch (e) {
    // 继续尝试其他方法
  }
  
  // 4. 尝试移除markdown代码块标记
  try {
    let cleanText = text
    // 移除 ```json 或 ``` 标记
    cleanText = cleanText.replace(/^```(?:json)?\s*/gm, '')
    cleanText = cleanText.replace(/\s*```$/gm, '')
    cleanText = cleanText.trim()
    
    const parsed = JSON.parse(cleanText)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed
    }
  } catch (e) {
    // 所有方法都失败了
  }
  
  return null
}

/**
 * 安全解析JSON字符串
 * @param {string} text - JSON字符串
 * @param {object} defaultValue - 解析失败时的默认值
 * @returns {object} 解析后的对象或默认值
 */
function safeParseJSON(text, defaultValue = {}) {
  if (!text || typeof text !== 'string') {
    return defaultValue
  }
  
  try {
    const parsed = extractJSON(text)
    return parsed || defaultValue
  } catch (e) {
    console.error('[safeParseJSON] JSON解析失败:', e, '原始文本:', text.substring(0, 200))
    return defaultValue
  }
}

/**
 * 验证基础信息对象的格式
 * @param {object} basicInfo - 基础信息对象
 * @returns {object} 验证并规范化后的基础信息对象
 */
function validateBasicInfo(basicInfo) {
  const defaultInfo = {
    name: '',
    age: '',
    gender: '',
    identity: ''
  }
  
  if (!basicInfo || typeof basicInfo !== 'object') {
    return defaultInfo
  }
  
  return {
    name: typeof basicInfo.name === 'string' ? basicInfo.name.trim() : '',
    age: typeof basicInfo.age === 'string' || typeof basicInfo.age === 'number' 
      ? String(basicInfo.age).trim() 
      : '',
    gender: typeof basicInfo.gender === 'string' && ['男', '女', ''].includes(basicInfo.gender.trim())
      ? basicInfo.gender.trim()
      : '',
    identity: typeof basicInfo.identity === 'string' ? basicInfo.identity.trim() : ''
  }
}

/**
 * 验证角色定义对象的格式
 * @param {object} character - 角色定义对象
 * @returns {object} 验证并规范化后的角色定义对象
 */
function validateCharacter(character) {
  if (!character || typeof character !== 'object') {
    return null
  }
  
  // 确保有basicInfo对象
  if (!character.basicInfo || typeof character.basicInfo !== 'object') {
    character.basicInfo = {}
  }
  
  // 验证并规范化basicInfo
  character.basicInfo = validateBasicInfo(character.basicInfo)
  
  // 确保其他字段存在
  character.personality = typeof character.personality === 'string' ? character.personality : ''
  character.behavior = typeof character.behavior === 'string' ? character.behavior : ''
  character.catchphrases = Array.isArray(character.catchphrases) ? character.catchphrases : []
  character.taboos = Array.isArray(character.taboos) ? character.taboos : []
  
  return character
}

module.exports = {
  extractJSON,
  safeParseJSON,
  validateBasicInfo,
  validateCharacter
}

