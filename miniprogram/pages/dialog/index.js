// pages/dialog/index.js
const api = require('../../utils/api')
const storage = require('../../utils/storage')
const common = require('../../utils/common')

Page({
  data: {
    mode: 'generate', // 'generate': 生成模式, 'optimize': 优化模式
    sceneText: '',
    sourceText: '', // 源文本（用于优化模式）
    loading: false,
    result: null,
    characterList: [],
    worldviewList: [],
    selectedCharacterIndex: -1,
    selectedWorldviewIndex: -1,
    selectedCharacter: null,
    selectedWorldview: null,
    masterId: null,  // 关联的主作品ID
    relatedStoryId: null  // 关联的故事ID（可选）
  },

  onLoad(options) {
    // 如果从故事页传入源文本，使用优化模式
    if (options.sourceText) {
      this.setData({
        mode: 'optimize',
        sourceText: decodeURIComponent(options.sourceText),
        sceneText: decodeURIComponent(options.sourceText)
      })
    }
    
    // 保存masterId（如果从作品详情页或故事页进入）
    if (options.masterId) {
      this.setData({ masterId: options.masterId })
    }
    
    // 保存关联的故事ID（如果从故事页进入）
    if (options.relatedStoryId) {
      this.setData({ relatedStoryId: options.relatedStoryId })
    }
    
    // 加载角色和世界观列表
    this.loadCharacters()
    this.loadWorldviews()

    // 如果传入了角色ID或世界观ID，自动选择
    if (options.characterId) {
      const character = storage.getCharacter(options.characterId)
      if (character) {
        setTimeout(() => {
          const characters = this.data.characterList
          const index = characters.findIndex(c => c.id === character.id)
          if (index >= 0) {
            this.setData({
              selectedCharacterIndex: index,
              selectedCharacter: character
            })
          }
        }, 100)
      }
    }
    
    // 支持多个角色ID（用逗号分隔）
    if (options.characterIds) {
      const ids = options.characterIds.split(',')
      setTimeout(() => {
        ids.forEach(id => {
          const character = storage.getCharacter(id)
          if (character) {
            const characters = this.data.characterList
            const index = characters.findIndex(c => c.id === character.id)
            if (index >= 0) {
              this.setData({
                selectedCharacterIndex: index,
                selectedCharacter: character
              })
            }
          }
        })
      }, 100)
    }

    if (options.worldviewId) {
      const worldview = storage.getWorldview(options.worldviewId)
      if (worldview) {
        setTimeout(() => {
          const worldviews = this.data.worldviewList
          const index = worldviews.findIndex(w => w.id === worldview.id)
          if (index >= 0) {
            this.setData({
              selectedWorldviewIndex: index,
              selectedWorldview: worldview
            })
          }
        }, 100)
      }
    }
    if (options.template) {
      this.setData({
        sceneText: decodeURIComponent(options.template)
      })
    }
  },

  // 加载角色列表（与插画页保持一致的命名策略）
  loadCharacters() {
    const characters = storage.getCharacters()

    const characterList = (characters || []).map(char => {
      // 角色数据结构：{id, basicInfo: {name, age, gender, identity}, ...}
      let name = '未命名角色'
      if (char.basicInfo && char.basicInfo.name && char.basicInfo.name.trim()) {
        name = char.basicInfo.name.trim()
      } else if (char.name && typeof char.name === 'string' && char.name.trim()) {
        name = char.name.trim()
      }

      return {
        id: char.id,
        name,
        data: char
      }
    })

    this.setData({ characterList })
  },

  // 加载世界观列表（与插画页保持一致的标题策略）
  loadWorldviews() {
    const worldviews = storage.getWorldviews()

    if (!worldviews || worldviews.length === 0) {
      this.setData({ worldviewList: [] })
      return
    }

    const worldviewList = worldviews.map((world, index) => {
      // 世界观数据结构：{id, era, geography, socialRules, conflicts, techLevel, type, originalInput}
      // 尝试从不同字段获取标题，逻辑与插画页保持一致
      let title = '世界观设定'

      // 优先从 era 字段获取（常见：时代/背景一句话）
      if (world.era && typeof world.era === 'string' && world.era.trim().length > 0) {
        const eraText = world.era.trim()
        title = eraText.length > 20 ? eraText.substring(0, 20) + '...' : eraText
      }
      // 如果没有 era，尝试从 originalInput 获取
      else if (world.originalInput && typeof world.originalInput === 'string' && world.originalInput.trim().length > 0) {
        const inputText = world.originalInput.trim()
        title = inputText.length > 20 ? inputText.substring(0, 20) + '...' : inputText
      }
      // 如果有 geography，也可以作为标题
      else if (world.geography && typeof world.geography === 'string' && world.geography.trim().length > 0) {
        const geoText = world.geography.trim()
        title = geoText.length > 20 ? geoText.substring(0, 20) + '...' : geoText
      }
      // 如果有独立的 title 字段
      else if (world.title && typeof world.title === 'string' && world.title.trim()) {
        title = world.title.trim()
      }
      // 兜底：使用世界观设定 + ID 片段，避免全都同名
      else {
        title = `世界观设定 ${world.id ? world.id.substring(0, 8) : index + 1}`
      }

      return {
        id: world.id,
        title,
        data: world
      }
    })

    this.setData({ worldviewList })
  },

  // 角色选择变化
  onCharacterChange(e) {
    const index = parseInt(e.detail.value)
    const character = this.data.characterList[index] && this.data.characterList[index].data
    this.setData({
      selectedCharacterIndex: index,
      selectedCharacter: character
    })
  },

  // 世界观选择变化
  onWorldviewChange(e) {
    const index = parseInt(e.detail.value)
    const worldview = this.data.worldviewList[index] && this.data.worldviewList[index].data
    this.setData({
      selectedWorldviewIndex: index,
      selectedWorldview: worldview
    })
  },

  // 场景输入变化
  onSceneChange(e) {
    const value = e.detail.value
    this.setData({
      sceneText: value,
      sourceText: value // 同时更新sourceText（用于优化模式）
    })
  },

  useExample() {
    this.setData({
      sceneText: '仙侠世界观中，傲娇师妹向师兄道歉'
    })
  },

  useExample2() {
    this.setData({
      sceneText: '赛博朋克世界中，AI助手与人类进行日常对话'
    })
  },

  // 跳转到创建角色
  navigateToCharacter() {
    wx.navigateTo({
      url: '/pages/character/index'
    })
  },

  // 跳转到创建世界观
  navigateToWorld() {
    wx.navigateTo({
      url: '/pages/world/index'
    })
  },

  // 生成对话（生成模式或优化模式）
  async generateDialog() {
    const { mode, sceneText, sourceText, selectedCharacter, selectedWorldview } = this.data
    
    if (mode === 'optimize') {
      // 优化模式：从源文本提取对话并优化
      await this.optimizeDialog()
    } else {
      // 生成模式：根据场景生成对话
      if (!sceneText.trim()) {
        common.showError('请输入对话场景')
        return
      }

      this.setData({ loading: true })
      common.showLoading('AI生成中...')

      try {
        const result = await api.generateDialog(
          sceneText,
          selectedCharacter,
          selectedWorldview
        )

        this.setData({
          result: typeof result === 'string' ? result : JSON.stringify(result),
          loading: false
        })
        common.hideLoading()
        common.showSuccess('生成成功')
      } catch (error) {
        console.error('生成对话失败', error)
        common.hideLoading()
        // 即使API失败，也显示一个模拟结果
        const mockResult = `根据场景"${sceneText}"生成的对话内容：\n\n[模拟对话]\n\n这是基于您输入的场景生成的对话示例。请配置API后获取真实生成结果。`
        this.setData({
          result: mockResult,
          loading: false
        })
        // 不显示错误，因为已经自动降级到模拟模式
        common.showSuccess('生成完成（模拟模式）')
      }
    }
  },
  
  // 优化对话（从故事文本中提取并优化）
  async optimizeDialog() {
    const { sourceText, selectedCharacter, selectedWorldview } = this.data
    
    if (!sourceText || !sourceText.trim()) {
      common.showError('没有可优化的文本')
      return
    }
    
    this.setData({ loading: true })
    common.showLoading('正在提取对话...')
    
    try {
      // 1. 从源文本中提取对话部分
      const extractedDialog = await api.extractDialogFromText(sourceText)
      
      if (!extractedDialog || extractedDialog.includes('未找到对话内容')) {
        common.hideLoading()
        common.showError('未在文本中找到对话内容')
        this.setData({ loading: false })
        return
      }
      
      common.showLoading('正在优化对话...')
      
      // 2. 优化对话，使其更符合角色人设
      const optimized = await api.optimizeDialog(
        extractedDialog,
        selectedCharacter,
        selectedWorldview
      )
      
      this.setData({
        result: optimized,
        loading: false
      })
      common.hideLoading()
      common.showSuccess('优化成功')
    } catch (error) {
      console.error('优化对话失败', error)
      common.hideLoading()
      this.setData({ loading: false })
      common.showError('优化失败：' + (error.message || '未知错误'))
    }
  },

  editResult() {
    wx.showModal({
      title: '编辑',
      editable: true,
      placeholderText: '请输入修改内容',
      success: async (res) => {
        if (res.confirm && res.content) {
          common.showLoading('微调中...')
          try {
            const { selectedCharacter, selectedWorldview, sceneText } = this.data
            const result = await api.generateDialog(
              `${sceneText}，修改要求：${res.content}`,
              selectedCharacter,
              selectedWorldview
            )
            this.setData({
              result: typeof result === 'string' ? result : JSON.stringify(result)
            })
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

  regenerate() {
    this.setData({ result: null })
  },

  async saveDialog() {
    const { result, sceneText, selectedCharacter, selectedWorldview, masterId, relatedStoryId } = this.data
    if (!result) {
      common.showError('没有可保存的内容')
      return
    }

    // 确定要保存到哪个作品
    let targetMasterId = masterId

    // 如果没有masterId，让用户选择作品或创建新作品
    if (!targetMasterId) {
      const masters = storage.getAggregatedWorks()
      const masterNames = masters.map(m => m.title || '未命名作品')
      const choices = [...masterNames, '➕ 新建作品']
      
      try {
        const res = await new Promise((resolve, reject) => {
          wx.showActionSheet({
            itemList: choices,
            success: resolve,
            fail: reject
          })
        })
        
        const idx = res.tapIndex
        if (idx === choices.length - 1) {
          // 创建新作品
          const newMaster = storage.createMasterWork('未命名作品')
          targetMasterId = newMaster.id
        } else {
          // 选择现有作品
          targetMasterId = masters[idx].id
        }
      } catch (error) {
        // 用户取消选择
        return
      }
    }

    // 确保主作品存在
    if (targetMasterId) {
      const master = storage.getWork(targetMasterId)
      if (!master || master.type !== 'work') {
        const newMaster = storage.ensureMasterWork(targetMasterId, '未命名作品')
        targetMasterId = newMaster.id
      }
    }

    const work = {
      type: 'dialog',
      title: sceneText || '对话内容',
      content: result,
      scene: sceneText,
      characterId: selectedCharacter && selectedCharacter.id,
      worldviewId: selectedWorldview && selectedWorldview.id,
      workId: targetMasterId,  // 关联到主作品
      relatedStoryId: relatedStoryId || null  // 关联的故事ID（可选）
    }

    try {
      const saved = storage.saveWork(work)
      if (saved) {
        common.showSuccess('保存成功')
        // 如果是从作品详情页进入的，返回上一页
        if (this.data.masterId) {
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      } else {
        common.showError('保存失败，请重试')
      }
    } catch (error) {
      console.error('保存对话失败:', error)
      common.showError('保存失败：' + (error.message || '未知错误'))
    }
  },

  backToInput() {
    this.setData({ result: null, sceneText: '' })
  },

  // 从对话生成插画
  generateImageFromDialog() {
    const { result, sceneText, selectedCharacter, selectedWorldview, masterId } = this.data
    if (!result && !sceneText.trim()) {
      common.showError('没有可用的场景描述')
      return
    }
    
    // 使用对话内容或场景描述作为模板
    const template = result || sceneText
    const characterId = selectedCharacter ? selectedCharacter.id : ''
    const worldviewId = selectedWorldview ? selectedWorldview.id : ''
    
    wx.navigateTo({
      url: `/pages/image/index?masterId=${masterId || ''}&characterId=${characterId}&worldviewId=${worldviewId}&template=${encodeURIComponent(template.substring(0, 200))}`
    })
  },
  
  // 保存为对话片段
  async saveAsTemplate() {
    const { result, sceneText, selectedCharacter, selectedWorldview } = this.data
    if (!result) {
      common.showError('没有可保存的内容')
      return
    }
    
    // 让用户输入片段名称和分类
    wx.showModal({
      title: '保存为对话片段',
      editable: true,
      placeholderText: '请输入片段名称（如：道歉场景、战斗对话等）',
      success: async (res) => {
        if (res.confirm && res.content) {
          const templateName = res.content.trim()
          if (!templateName) {
            common.showError('片段名称不能为空')
            return
          }
          
          // 选择分类
          const categories = ['情感', '冲突', '日常', '战斗', '其他']
          try {
            const categoryRes = await new Promise((resolve, reject) => {
              wx.showActionSheet({
                itemList: categories,
                success: resolve,
                fail: reject
              })
            })
            
            const category = categories[categoryRes.tapIndex]
            
            // 保存为对话片段
            const template = {
              type: 'dialog_template',
              title: templateName,
              content: result,
              category: category,
              scene: sceneText || '',
              characterId: selectedCharacter && selectedCharacter.id,
              worldviewId: selectedWorldview && selectedWorldview.id,
              tags: [category] // 默认标签为分类
            }
            
            const saved = storage.saveWork(template)
            if (saved) {
              common.showSuccess('保存成功')
              // 询问是否查看片段库
              wx.showModal({
                title: '保存成功',
                content: '是否前往对话片段库查看？',
                success: (navRes) => {
                  if (navRes.confirm) {
                    wx.navigateTo({
                      url: '/pages/dialog-templates/index'
                    })
                  }
                }
              })
            } else {
              common.showError('保存失败')
            }
          } catch (error) {
            // 用户取消选择分类
          }
        }
      }
    })
  }
})
