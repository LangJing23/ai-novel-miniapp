// pages/character/index.js
const api = require('../../utils/api')
const storage = require('../../utils/storage')
const common = require('../../utils/common')
const jsonParser = require('../../utils/jsonParser')

Page({
  data: {
    inputText: '',
    loading: false,
    result: null,
    editingField: null, // 当前正在编辑的字段：'basicInfo', 'personality', 'behavior', 'catchphrases', 'taboos'
    editMode: false, // 是否处于编辑模式
    originalBasicInfo: null, // 保存基础信息的原始数据，用于取消编辑时恢复
    editingText: '', // 保存编辑时的文本内容（用于 catchphrases、taboos、personality、behavior）
    originalCatchphrases: null, // 保存口头禅的原始数组，用于取消编辑时恢复
    originalTaboos: null, // 保存禁忌的原始数组，用于取消编辑时恢复
    originalPersonality: null, // 保存性格特点的原始文本，用于取消编辑时恢复
    originalBehavior: null // 保存行为逻辑的原始文本，用于取消编辑时恢复
  },

  onLoad(options) {
    console.log('角色页面 onLoad', options)
    
    // 如果从其他页面传入角色ID，加载已有角色
    if (options.id) {
      this.loadCharacter(options.id)
    }
    // 如果传入characterId，加载角色
    else if (options.characterId) {
      this.loadCharacter(options.characterId)
    }
    // 如果传入作品ID，从作品中加载角色内容
    else if (options.workId) {
      this.loadCharacterFromWork(options.workId)
    }
    // 如果从模板库传入模板内容，自动填充
    if (options.template) {
      this.setData({
        inputText: decodeURIComponent(options.template)
      })
    }
  },

  // 输入变化
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    })
  },

  // 使用示例
  useExample() {
    this.setData({
      inputText: '古风侠客，男，28岁，沉稳寡言，擅长剑术，口头禅\'无妨\''
    })
  },

  useExample2() {
    this.setData({
      inputText: '二次元少女，16岁，傲娇性格，粉色双马尾，魔法师身份'
    })
  },

  // 生成角色
  async generateCharacter() {
    const { inputText } = this.data
    if (!inputText.trim()) {
      common.showError('请输入角色描述')
      return
    }

    this.setData({ loading: true })
    common.showLoading('AI生成中...')

    let extractedBasicInfo = {
      name: '',
      age: '',
      gender: '',
      identity: ''
    }

    // 第一步：使用大模型提取基础信息（不使用本地模拟）
    console.log('[generateCharacter] ========== 开始第一步：基础信息提取 ==========')
    console.log('[generateCharacter] 输入文本长度:', inputText.length)
    console.log('[generateCharacter] 输入文本内容:', inputText.substring(0, 100) + '...')
    
    try {
      const extractStartTime = Date.now()
      console.log('[generateCharacter] 开始调用 extractBasicInfoFromText...')
      
      const basicInfoResult = await api.extractBasicInfoFromText(inputText)
      
      const extractEndTime = Date.now()
      console.log(`[generateCharacter] extractBasicInfoFromText 调用完成，耗时: ${extractEndTime - extractStartTime}ms`)
      console.log('[generateCharacter] 返回结果类型:', typeof basicInfoResult)
      console.log('[generateCharacter] 返回结果预览:', typeof basicInfoResult === 'string' 
        ? basicInfoResult.substring(0, 200) + '...' 
        : JSON.stringify(basicInfoResult).substring(0, 200) + '...')
      
      // 使用JSON解析工具解析结果
      if (typeof basicInfoResult === 'string') {
        const parsed = jsonParser.safeParseJSON(basicInfoResult, { name: '', age: '', gender: '', identity: '' })
        extractedBasicInfo = jsonParser.validateBasicInfo(parsed)
        console.log('[generateCharacter] 基础信息解析成功:', extractedBasicInfo)
      } else if (typeof basicInfoResult === 'object' && basicInfoResult !== null) {
        extractedBasicInfo = jsonParser.validateBasicInfo(basicInfoResult)
        console.log('[generateCharacter] 基础信息（对象）验证成功:', extractedBasicInfo)
      } else {
        console.warn('[generateCharacter] 基础信息格式不正确，使用默认值')
        extractedBasicInfo = { name: '', age: '', gender: '', identity: '' }
      }
      
      console.log('[generateCharacter] ========== 第一步完成：基础信息提取 ==========')
      console.log('[generateCharacter] 提取的基础信息:', JSON.stringify(extractedBasicInfo))
      
    } catch (error) {
      console.error('[generateCharacter] 第一步失败：基础信息提取错误', error)
      console.error('[generateCharacter] 错误详情:', error.message, error.stack)
      // 不使用本地备用方案，基础信息保持为空
      extractedBasicInfo = { name: '', age: '', gender: '', identity: '' }
      console.warn('[generateCharacter] 基础信息提取失败，将继续进行完整角色生成')
    }

    // 第二步：生成完整的角色卡
    console.log('[generateCharacter] ========== 开始第二步：完整角色卡生成 ==========')
    
    try {
      const generateStartTime = Date.now()
      console.log('[generateCharacter] 开始调用 generateCharacter...')
      
      const result = await api.generateCharacter(inputText)
      
      const generateEndTime = Date.now()
      console.log(`[generateCharacter] generateCharacter 调用完成，耗时: ${generateEndTime - generateStartTime}ms`)
      console.log('[generateCharacter] 返回结果类型:', typeof result)
      console.log('[generateCharacter] 返回结果长度:', typeof result === 'string' ? result.length : 'N/A')
      console.log('[generateCharacter] 返回结果预览:', typeof result === 'string' 
        ? result.substring(0, 300) + '...' 
        : JSON.stringify(result).substring(0, 300) + '...')
      
      // 使用JSON解析工具解析结果
      let parsedResult
      if (typeof result === 'string') {
        parsedResult = jsonParser.safeParseJSON(result, null)
        if (!parsedResult) {
          console.error('[generateCharacter] JSON解析失败，原始结果:', result.substring(0, 500))
          throw new Error('AI 返回的结果格式不正确，无法解析 JSON。请检查AI API返回的内容。')
        }
        console.log('[generateCharacter] JSON解析成功')
      } else if (typeof result === 'object' && result !== null) {
        parsedResult = result
        console.log('[generateCharacter] 结果已是对象格式')
      } else {
        console.error('[generateCharacter] 结果格式不正确:', typeof result, result)
        throw new Error('AI 返回的结果格式不正确')
      }

      // 验证并规范化角色定义
      parsedResult = jsonParser.validateCharacter(parsedResult)
      if (!parsedResult) {
        throw new Error('角色定义验证失败')
      }
      
      console.log('[generateCharacter] 角色定义验证成功')
      console.log('[generateCharacter] 解析后的角色定义:', JSON.stringify(parsedResult).substring(0, 500) + '...')

      // 第三步：合并基础信息
      console.log('[generateCharacter] ========== 开始第三步：数据合并 ==========')
      console.log('[generateCharacter] 第一步提取的基础信息:', JSON.stringify(extractedBasicInfo))
      console.log('[generateCharacter] 第二步生成的基础信息:', JSON.stringify(parsedResult.basicInfo))
      
      // 合并策略：优先使用第一步提取的基础信息（更准确）
      // 如果第一步提取的信息不为空，则使用它；否则使用第二步生成的信息
      const mergedBasicInfo = { ...parsedResult.basicInfo }
      
      // 合并姓名
      if (extractedBasicInfo.name && extractedBasicInfo.name.trim()) {
        mergedBasicInfo.name = extractedBasicInfo.name.trim()
        console.log('[generateCharacter] 使用第一步提取的姓名:', mergedBasicInfo.name)
      } else if (!mergedBasicInfo.name || mergedBasicInfo.name === '' || mergedBasicInfo.name === '未命名') {
        mergedBasicInfo.name = mergedBasicInfo.name || '未命名'
        console.log('[generateCharacter] 使用第二步生成的姓名:', mergedBasicInfo.name)
      }
      
      // 合并年龄
      if (extractedBasicInfo.age && extractedBasicInfo.age.toString().trim()) {
        mergedBasicInfo.age = extractedBasicInfo.age.toString().trim()
        console.log('[generateCharacter] 使用第一步提取的年龄:', mergedBasicInfo.age)
      } else if (mergedBasicInfo.age) {
        mergedBasicInfo.age = typeof mergedBasicInfo.age === 'number' 
          ? String(mergedBasicInfo.age) 
          : String(mergedBasicInfo.age).trim()
        console.log('[generateCharacter] 使用第二步生成的年龄:', mergedBasicInfo.age)
      } else {
        mergedBasicInfo.age = ''
        console.log('[generateCharacter] 年龄为空')
      }
      
      // 合并性别
      if (extractedBasicInfo.gender && extractedBasicInfo.gender.trim()) {
        mergedBasicInfo.gender = extractedBasicInfo.gender.trim()
        console.log('[generateCharacter] 使用第一步提取的性别:', mergedBasicInfo.gender)
      } else if (mergedBasicInfo.gender && mergedBasicInfo.gender.trim()) {
        mergedBasicInfo.gender = mergedBasicInfo.gender.trim()
        console.log('[generateCharacter] 使用第二步生成的性别:', mergedBasicInfo.gender)
      } else {
        mergedBasicInfo.gender = ''
        console.log('[generateCharacter] 性别为空')
      }
      
      // 合并身份
      if (extractedBasicInfo.identity && extractedBasicInfo.identity.trim()) {
        mergedBasicInfo.identity = extractedBasicInfo.identity.trim()
        console.log('[generateCharacter] 使用第一步提取的身份:', mergedBasicInfo.identity)
      } else if (mergedBasicInfo.identity && mergedBasicInfo.identity.trim()) {
        mergedBasicInfo.identity = mergedBasicInfo.identity.trim()
        console.log('[generateCharacter] 使用第二步生成的身份:', mergedBasicInfo.identity)
      } else {
        mergedBasicInfo.identity = ''
        console.log('[generateCharacter] 身份为空')
      }
      
      // 更新parsedResult中的basicInfo
      parsedResult.basicInfo = mergedBasicInfo
      
      console.log('[generateCharacter] ========== 第三步完成：数据合并 ==========')
      console.log('[generateCharacter] 最终合并的基础信息:', JSON.stringify(mergedBasicInfo))
      console.log('[generateCharacter] ========== 所有步骤完成 ==========')

      // 第四步：更新UI
      console.log('[generateCharacter] 开始更新UI...')
      this.setData({
        result: parsedResult,
        loading: false
      })
      common.hideLoading()
      common.showSuccess('生成成功')
      console.log('[generateCharacter] UI更新完成')
      
    } catch (error) {
      console.error('[generateCharacter] 第二步失败：完整角色卡生成错误', error)
      console.error('[generateCharacter] 错误详情:', error.message)
      console.error('[generateCharacter] 错误堆栈:', error.stack)
      
      common.hideLoading()
      this.setData({ loading: false })
      
      // 不使用本地模拟，直接显示错误信息
      let errorMessage = '生成失败，请重试'
      if (error && error.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      // 根据错误类型显示不同的提示
      if (errorMessage.includes('云开发环境不存在') || errorMessage.includes('env not exists')) {
        wx.showModal({
          title: '云开发环境配置错误',
          content: '云开发环境不存在或未正确配置。\n\n请按照以下步骤操作：\n1. 在微信开发者工具中，点击"云开发"按钮\n2. 创建或选择正确的云开发环境\n3. 确保环境已开通 AI 能力\n4. 检查 app.js 中的环境 ID 是否正确\n5. 重新编译小程序',
          showCancel: false,
          confirmText: '我知道了'
        })
      } else if (errorMessage.includes('云开发未初始化')) {
        common.showError('云开发未初始化，请检查 app.js 中的云开发配置')
      } else if (errorMessage.includes('wx.cloud.extend') || errorMessage.includes('AI 能力')) {
        common.showError('AI 能力不可用，请更新基础库版本或开通 AI 能力')
      } else if (errorMessage.includes('AI') || errorMessage.includes('API')) {
        common.showError('AI API 调用失败: ' + errorMessage.substring(0, 100))
      } else if (errorMessage.includes('JSON') || errorMessage.includes('解析')) {
        common.showError('数据解析失败: ' + errorMessage + '。请稍后重试。')
      } else {
        common.showError('生成失败: ' + errorMessage.substring(0, 100))
      }
    }
  },

  // 从文本中提取基础信息
  extractBasicInfoFromText(text) {
    const basicInfo = {
      name: '',
      age: '',
      gender: '',
      identity: ''
    }

    if (!text || typeof text !== 'string') {
      return basicInfo
    }

    // 提取年龄 - 匹配 "数字+岁" 的模式
    const agePatterns = [
      /(\d+)岁/,           // 16岁
      /(\d+)周岁/,         // 16周岁
      /年龄[：:]\s*(\d+)/, // 年龄：16
      /(\d+)years?\s*old/i // 16 years old (英文)
    ]
    for (const pattern of agePatterns) {
      const match = text.match(pattern)
      if (match) {
        const ageNum = parseInt(match[1] || match[0].match(/\d+/)?.[0])
        if (ageNum && ageNum > 0 && ageNum < 200) {
          basicInfo.age = ageNum.toString()
          break
        }
      }
    }

    // 提取性别 - 匹配各种性别描述
    // 优先匹配"女"，因为"少女"、"女性"等词可能包含"男"字
    const femalePatterns = [
      /(?:性别[：:]?\s*)?(女(?:性|生|孩|子)?)/,
      /(?:是|为)(?:一个|一名|一位)?(女(?:性|生|孩|子)?)/,
      /(?:二次元)?(?:少)?(女)/,  // 少女、女孩、二次元少女
      /(?:gender[：:]?\s*)?(female|woman|girl)/i,
      /(?:她是|她为|她是)(?:一个|一名|一位)?/,
      /(?:she|her)\s+(?:is|was)/i
    ]
    
    const malePatterns = [
      /(?:性别[：:]?\s*)?(男(?:性|生|孩|子)?)/,
      /(?:是|为)(?:一个|一名|一位)?(男(?:性|生|孩|子)?)/,
      /(?:少)?(男)(?!性)/,              // 少年、男孩，但不匹配"男性"
      /(?:gender[：:]?\s*)?(male|man|boy)/i,
      /(?:他是|他为|他是)(?:一个|一名|一位)?/,
      /(?:he|his|him)\s+(?:is|was)/i
    ]
    
    // 先检查女性模式
    for (const pattern of femalePatterns) {
      if (pattern.test(text)) {
        basicInfo.gender = '女'
        break
      }
    }
    
    // 如果没有匹配到女性，再检查男性模式
    if (!basicInfo.gender) {
      for (const pattern of malePatterns) {
        if (pattern.test(text)) {
          basicInfo.gender = '男'
          break
        }
      }
    }

    // 提取身份 - 匹配常见的身份描述
    // 优先匹配包含"身份"关键词的模式
    const identityPatterns = [
      // 优先：匹配 "身份" 关键词后的身份（最精确）
      /身份[：:]?\s*(魔法师|法师|魔法使|侠客|剑客|剑士|机器人|AI|人工智能|骑士|武士|公主|王子|国王|女王|学生|老师|教师|医生|护士|警察|侦探|商人|老板|科学家|工程师|程序员|艺术家|作家|记者|律师|法官)/,
      // 优先：匹配身份在"身份"关键词前（如"魔法师身份"）
      /(魔法师|法师|魔法使|侠客|剑客|剑士|机器人|AI|人工智能|骑士|武士|公主|王子|国王|女王|学生|老师|教师|医生|护士|警察|侦探|商人|老板|科学家|工程师|程序员|艺术家|作家|记者|律师|法官)(?:身份|职业)/,
      // 匹配 "是/为" 后的身份
      /(?:是|为)(?:一个|一名|一位)?(?:的)?(魔法师|法师|魔法使|侠客|剑客|剑士|机器人|AI|人工智能|骑士|武士|公主|王子|国王|女王|学生|老师|教师|医生|护士|警察|侦探|商人|老板|科学家|工程师|程序员|艺术家|作家|记者|律师|法官)/,
      // 最后：匹配文本中出现的身份关键词（可能不够精确）
      /(?:身份[：:]?\s*)?(魔法师|法师|魔法使|侠客|剑客|剑士|机器人|AI|人工智能|骑士|武士|公主|王子|国王|女王|学生|老师|教师|医生|护士|警察|侦探|商人|老板|科学家|工程师|程序员|艺术家|作家|记者|律师|法官)/
    ]
    
    for (const pattern of identityPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        basicInfo.identity = match[1]
        break
      }
    }

    // 如果没有找到明确的身份，尝试从文本中提取关键词
    if (!basicInfo.identity) {
      const identityKeywords = {
        '魔法师': ['魔法', '法师', '魔法使', 'mage', 'wizard'],
        '侠客': ['侠客', '剑客', '剑士', 'knight', 'swordsman'],
        '机器人': ['机器人', 'AI', '人工智能', 'robot', 'android'],
        '学生': ['学生', 'student'],
        '老师': ['老师', '教师', 'teacher'],
        '医生': ['医生', 'doctor'],
        '警察': ['警察', 'police', 'cop']
      }
      
      for (const [identity, keywords] of Object.entries(identityKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          basicInfo.identity = identity
          break
        }
      }
    }

    // 提取姓名 - 尝试从文本开头或特定模式中提取
    // 通常姓名会在文本的开头，或者跟在"姓名"、"名字"等关键词后面
    const namePatterns = [
      /(?:姓名[：:]?\s*|名字[：:]?\s*|叫|名为)([^\s，,。.\n]{2,8})/,
      /^([^\s，,。.\n]{2,8})(?:，|,|是|为)/,  // 文本开头的2-8个字符
      /^([A-Za-z]{2,20})(?:\s|,|，)/  // 英文名
    ]
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const potentialName = match[1].trim()
        // 排除常见的非姓名词汇
        const excludeWords = ['二次元', '古风', '科幻', '年龄', '性别', '身份', '性格', '特点', '外貌']
        if (!excludeWords.some(word => potentialName.includes(word))) {
          basicInfo.name = potentialName
          break
        }
      }
    }

    return basicInfo
  },

  // 解析文本为角色结构（备用方案）
  parseTextToCharacter(text) {
    // 从文本中提取基础信息
    const basicInfo = this.extractBasicInfoFromText(text)
    
    // 提取口头禅 - 查找"口头禅"、"catchphrase"等关键词
    const catchphrases = []
    const catchphrasePatterns = [
      /(?:口头禅[：:]?\s*|catchphrase[：:]?\s*)(['""])([^'"]+)\1/g,
      /(?:口头禅[：:]?\s*|catchphrase[：:]?\s*)([^\n，,。.]+)/g,
      /['""]([^'"]+)['""](?:是|为)?(?:他|她|角色)?(?:的)?(?:口头禅|常说|常说)?/g
    ]
    
    for (const pattern of catchphrasePatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        const phrase = match[1] || match[0]
        if (phrase && phrase.length > 0 && phrase.length < 50) {
          catchphrases.push(phrase.trim())
        }
      }
    }

    // 如果没有找到口头禅，尝试从文本中提取引号内容
    if (catchphrases.length === 0) {
      const quoteMatches = text.matchAll(/['""]([^'"]{2,20})['""]/g)
      for (const match of quoteMatches) {
        catchphrases.push(match[1])
      }
    }

    return {
      basicInfo: {
        name: basicInfo.name || '未命名',
        age: basicInfo.age || '',
        gender: basicInfo.gender || '',
        identity: basicInfo.identity || ''
      },
      personality: text,
      behavior: '',
      catchphrases: catchphrases.length > 0 ? catchphrases : [],
      taboos: []
    }
  },

  // 切换编辑模式
  editResult() {
    this.setData({
      editMode: !this.data.editMode,
      editingField: null
    })
  },

  // 开始编辑某个字段
  startEdit(e) {
    const field = e.currentTarget.dataset.field
    const { result } = this.data
    const updateData = {
      editingField: field,
      editMode: true
    }
    
    // 保存原始数据，用于取消时恢复
    if (field === 'basicInfo') {
      updateData.originalBasicInfo = result.basicInfo ? JSON.parse(JSON.stringify(result.basicInfo)) : {}
    } else if (field === 'catchphrases') {
      // 数组类型字段，保存原始数组和文本
      const originalArray = result.catchphrases ? JSON.parse(JSON.stringify(result.catchphrases)) : []
      updateData.originalCatchphrases = originalArray
      updateData.editingText = originalArray.join('，')
    } else if (field === 'taboos') {
      // 数组类型字段，保存原始数组和文本
      const originalArray = result.taboos ? JSON.parse(JSON.stringify(result.taboos)) : []
      updateData.originalTaboos = originalArray
      updateData.editingText = originalArray.join('，')
    } else if (field === 'personality') {
      // 字符串类型字段，保存原始文本
      const originalText = result.personality || ''
      updateData.originalPersonality = originalText
      updateData.editingText = originalText
    } else if (field === 'behavior') {
      // 字符串类型字段，保存原始文本
      const originalText = result.behavior || ''
      updateData.originalBehavior = originalText
      updateData.editingText = originalText
    }
    
    this.setData(updateData)
  },

  // 取消编辑
  cancelEdit() {
    const { editingField, originalBasicInfo, originalCatchphrases, originalTaboos, originalPersonality, originalBehavior, result } = this.data
    
    const updateData = {
      editingField: null,
      editingText: ''
    }
    
    // 恢复原始数据
    if (editingField === 'basicInfo' && originalBasicInfo) {
      const newResult = { ...result }
      newResult.basicInfo = originalBasicInfo
      updateData.result = newResult
      updateData.originalBasicInfo = null
    } else if (editingField === 'catchphrases' && originalCatchphrases !== null) {
      const newResult = { ...result }
      newResult.catchphrases = originalCatchphrases
      updateData.result = newResult
      updateData.originalCatchphrases = null
    } else if (editingField === 'taboos' && originalTaboos !== null) {
      const newResult = { ...result }
      newResult.taboos = originalTaboos
      updateData.result = newResult
      updateData.originalTaboos = null
    } else if (editingField === 'personality' && originalPersonality !== null) {
      const newResult = { ...result }
      newResult.personality = originalPersonality
      updateData.result = newResult
      updateData.originalPersonality = null
    } else if (editingField === 'behavior' && originalBehavior !== null) {
      const newResult = { ...result }
      newResult.behavior = originalBehavior
      updateData.result = newResult
      updateData.originalBehavior = null
    }
    
    this.setData(updateData)
  },

  // 更新基础信息字段（实时更新，不保存）
  updateBasicInfoField(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    
    const { result } = this.data
    const newResult = { ...result }
    
    if (!newResult.basicInfo) {
      newResult.basicInfo = {}
    }
    
    newResult.basicInfo[field] = value
    
    // 只更新数据，不保存到storage
    this.setData({
      result: newResult
    })
  },

  // 确认保存基础信息编辑
  confirmBasicInfoEdit() {
    const { result } = this.data
    
    // 保存到storage
    if (result.id) {
      const character = {
        ...result,
        originalInput: this.data.inputText,
        type: 'character',
        id: result.id,
        updateTime: new Date().toISOString()
      }
      storage.saveCharacter(character)
      
      // 同时更新作品
      if (result.workId) {
        const work = storage.getWork(result.workId)
        if (work) {
          storage.saveWork({
            ...work,
            content: result,
            updateTime: new Date().toISOString()
          })
        }
      } else {
        // 如果没有workId，查找对应的作品
        const works = storage.getWorks()
        const work = works.find(w => w.characterId === result.id || (w.type === 'character' && w.content && (w.content.id === result.id || (typeof w.content === 'object' && w.content.basicInfo && w.content.basicInfo.name === (result.basicInfo && result.basicInfo.name)))))
        if (work) {
          storage.saveWork({
            ...work,
            content: result,
            updateTime: new Date().toISOString()
          })
          // 更新result中的workId
          this.setData({
            'result.workId': work.id
          })
        }
      }
    }
    
    // 关闭编辑状态
    this.setData({
      editingField: null,
      originalBasicInfo: null
    })
    
    common.showSuccess('修改已保存')
  },

  // 实时更新字段内容（只更新编辑文本，不保存）
  updateFieldContent(e) {
    const value = e.detail.value
    
    // 只更新编辑文本，不分割，不保存到result
    this.setData({
      editingText: value
    })
  },

  // 确认保存字段编辑（关闭编辑状态）
  confirmFieldEdit(e) {
    const field = e.currentTarget.dataset.field
    const { editingText, result } = this.data
    const newResult = { ...result }
    
    // 根据字段类型处理数据
    if (field === 'catchphrases' || field === 'taboos') {
      // 数组类型，按中文逗号、英文逗号或换行分割
      // 支持多种分隔符：中文逗号、英文逗号、换行符
      let items = []
      if (editingText && editingText.trim()) {
        items = editingText.split(/[，,\n\r]+/).map(s => s.trim()).filter(s => s)
      }
      newResult[field] = items
    } else if (field === 'personality' || field === 'behavior') {
      // 字符串类型，直接赋值
      newResult[field] = editingText
    }
    
    // 更新数据
    this.setData({
      result: newResult,
      editingField: null,
      editingText: ''
    })
    
    // 清理原始数据
    if (field === 'catchphrases') {
      this.setData({ originalCatchphrases: null })
    } else if (field === 'taboos') {
      this.setData({ originalTaboos: null })
    } else if (field === 'personality') {
      this.setData({ originalPersonality: null })
    } else if (field === 'behavior') {
      this.setData({ originalBehavior: null })
    }
    
    // 保存到storage
    if (result.id) {
      const character = {
        ...newResult,
        originalInput: this.data.inputText,
        type: 'character',
        id: result.id,
        workId: result.workId,
        updateTime: new Date().toISOString()
      }
      storage.saveCharacter(character)
      
      // 同时更新作品
      if (result.workId) {
        const work = storage.getWork(result.workId)
        if (work) {
          storage.saveWork({
            ...work,
            content: newResult,
            updateTime: new Date().toISOString()
          })
        }
      } else {
        // 如果没有workId，查找对应的作品
        const works = storage.getWorks()
        const work = works.find(w => w.characterId === result.id || (w.type === 'character' && w.content && (w.content.id === result.id || (typeof w.content === 'object' && w.content.basicInfo && w.content.basicInfo.name === (newResult.basicInfo && newResult.basicInfo.name)))))
        if (work) {
          storage.saveWork({
            ...work,
            content: newResult,
            updateTime: new Date().toISOString()
          })
          // 更新result中的workId
          this.setData({
            'result.workId': work.id
          })
        }
      }
    }
    
    common.showSuccess('修改已保存')
  },

  // 保存字段编辑（关闭编辑状态）- 保留作为备用
  saveFieldEdit(e) {
    const field = e.currentTarget.dataset.field
    
    // 先更新内容
    this.updateFieldContent(e)
    
    // 延迟关闭编辑状态，避免滚动时触发
    setTimeout(() => {
      this.setData({
        editingField: null
      })
      common.showSuccess('修改已保存')
    }, 100)
  },

  // 旧版编辑结果（保留作为备用）
  editResultOld() {
    wx.showModal({
      title: '编辑',
      editable: true,
      placeholderText: '请输入修改内容',
      success: async (res) => {
        if (res.confirm && res.content) {
          // 这里可以调用微调API
          common.showLoading('微调中...')
          try {
            const result = await api.callDoubaoAPI(
              `请根据以下修改要求调整角色设定：${res.content}\n\n当前角色设定：${JSON.stringify(this.data.result)}`,
              'character'
            )
            let parsedResult
            if (typeof result === 'string') {
              try {
                parsedResult = JSON.parse(result)
              } catch (e) {
                parsedResult = this.data.result
              }
            } else {
              parsedResult = result
            }
            this.setData({ result: parsedResult })
            common.hideLoading()
            common.showSuccess('修改成功')
          } catch (error) {
            common.hideLoading()
            common.showError('修改失败')
          }
        }
      }
    })
  },

  // 重新生成
  regenerate() {
    this.setData({ result: null })
  },

  // 保存角色
  async saveCharacter() {
    const { result, inputText } = this.data
    if (!result) {
      common.showError('没有可保存的内容')
      return
    }

    const character = {
      ...result,
      originalInput: inputText,
      type: 'character'
    }

    const saved = storage.saveCharacter(character)
    if (saved) {
      // 确保主作品存在，并将子项归属到主作品
      const masterId = await this.ensureMasterForSave(result.workId, null)
      const master = storage.ensureMasterWork(masterId, (result.basicInfo && result.basicInfo.name) || '未命名作品')
      storage.saveWork({
        type: 'character',
        title: (result.basicInfo && result.basicInfo.name) || '未命名角色',
        content: result,
        characterId: saved.id,
        workId: master.id,
        originalInput: inputText // 保存原始输入，方便后续编辑
      })
      common.showSuccess('保存成功')
    } else {
      common.showError('保存失败')
    }
  },

  // 选择主作品：优先使用传入ID，否则弹出作品选择器/新建
  async ensureMasterForSave(preferId, fallbackId) {
    let masterId = preferId || fallbackId
    if (masterId) return masterId

    const works = storage.getAggregatedWorks()
    const names = (works || []).map(w => w.title || '未命名作品')
    const choices = [...names, '➕ 新建作品']

    return new Promise(resolve => {
      wx.showActionSheet({
        itemList: choices,
        success: (res) => {
          const idx = res.tapIndex
          if (idx === choices.length - 1) {
            wx.showModal({
              title: '新建作品',
              editable: true,
              placeholderText: '请输入作品名称',
              success: (r) => {
                const title = (r.confirm && r.content) ? r.content : '未命名作品'
                const master = storage.createMasterWork(title)
                resolve(master.id)
              },
              fail: () => resolve(null)
            })
          } else {
            resolve(works[idx]?.id || null)
          }
        },
        fail: () => resolve(null)
      })
    })
  },

  // 关联对话
  linkToDialog() {
    const { result } = this.data
    if (!result) return
    
    // 先保存角色
    this.saveCharacter()
    
    // 跳转到对话页面，传入角色ID
    wx.navigateTo({
      url: `/pages/dialog/index?characterId=${result.id || ''}`
    })
  },

  // 导出图片
  exportImage() {
    common.showError('导出功能开发中...')
    // TODO: 实现图片导出功能
  },

  // 返回工作台
  backToInput() {
    // 切换到创作工作台页面（tabBar页面）
    wx.switchTab({
      url: '/pages/create/index'
    })
  },

  // 加载已有角色
  loadCharacter(id) {
    console.log('加载角色，ID:', id)
    const character = storage.getCharacter(id)
    console.log('找到的角色数据:', character)
    
    if (character) {
      // 查找对应的作品，获取workId
      const works = storage.getWorks()
      const work = works.find(w => w.characterId === id || (w.type === 'character' && w.content && (w.content.id === id || (typeof w.content === 'object' && w.content.basicInfo && w.content.basicInfo.name === (character.basicInfo && character.basicInfo.name)))))
      
      // 确保角色数据包含id和workId
      const characterData = {
        ...character,
        id: character.id || id,
        workId: work ? work.id : character.workId
      }
      
      this.setData({
        result: characterData,
        inputText: character.originalInput || ''
      })
      console.log('角色加载成功', characterData)
    } else {
      console.warn('未找到角色，ID:', id)
      common.showError('角色不存在')
    }
  },

  // 从作品中加载角色内容
  loadCharacterFromWork(workId) {
    console.log('从作品加载角色，作品ID:', workId)
    const work = storage.getWork(workId)
    console.log('找到的作品数据:', work)
    
    if (!work) {
      common.showError('作品不存在')
      return
    }
    
    // 如果作品中有characterId，优先使用
    if (work.characterId) {
      this.loadCharacter(work.characterId)
      return
    }
    
    // 如果作品中有content，直接使用
    if (work.content) {
      let characterData = work.content
      
      // 如果content是字符串，尝试解析为JSON
      if (typeof characterData === 'string') {
        try {
          characterData = JSON.parse(characterData)
        } catch (e) {
          console.warn('无法解析作品内容为JSON', e)
        }
      }
      
      // 确保有基本结构
      if (characterData && (characterData.basicInfo || characterData.personality)) {
        // 确保包含workId和id
        const finalData = {
          ...characterData,
          id: characterData.id || work.characterId || workId,
          workId: work.id || workId
        }
        
        this.setData({
          result: finalData,
          inputText: work.originalInput || characterData.originalInput || ''
        })
        console.log('从作品内容加载角色成功', finalData)
      } else {
        common.showError('作品数据格式不正确')
      }
    } else {
      common.showError('作品中没有角色数据')
    }
  }
})
