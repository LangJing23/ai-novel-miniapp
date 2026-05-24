// pages/story/index.js
const api = require('../../utils/api')
const storage = require('../../utils/storage')
const common = require('../../utils/common')
const jsonParser = require('../../utils/jsonParser')

Page({
  data: {
    // 基础数据
    masterId: null,
    storyId: null,  // 如果编辑已有故事
    currentTab: 0,  // 0: 大纲生成, 1: 正文生成
    
    // 选择项
    characterList: [],
    worldviewList: [],
    selectedCharacterIndex: -1,  // 当前选择器索引
    selectedCharacterIndices: [],  // 已选择的角色索引列表（用于多选）
    selectedWorldviewIndex: -1,
    selectedCharacters: [],  // 已选择的角色列表（支持多选）
    selectedWorldview: null,
    
    // 大纲生成
    premiseText: '',
    targetLength: 2000,
    outline: [],
    outlineLoading: false,
    
    // 正文生成
    currentContent: '',
    selectedOutlineIndex: -1,
    segmentLoading: false,
    
    // 故事数据
    storyTitle: '',
    storySummary: ''
  },

  onLoad(options) {
    // 如果从作品详情页进入，保存masterId
    if (options.masterId) {
      this.setData({ masterId: options.masterId })
    }
    
    // 如果编辑已有故事
    if (options.id) {
      this.loadStory(options.id)
    }
    
    // 加载角色和世界观列表
    this.loadCharacters()
    this.loadWorldviews()
    
    // 如果传入了角色ID或世界观ID，自动选择
    if (options.characterIds) {
      const ids = options.characterIds.split(',')
      setTimeout(() => {
        const selectedIndices = []
        const selectedChars = []
        ids.forEach(id => {
          const character = storage.getCharacter(id)
          if (character) {
            const index = this.data.characterList.findIndex(c => c.id === character.id)
            if (index >= 0 && !selectedIndices.includes(index)) {
              selectedIndices.push(index)
              selectedChars.push(character)
            }
          }
        })
        this.setData({
          selectedCharacterIndices: selectedIndices,
          selectedCharacters: selectedChars
        })
      }, 100)
    }
    
    if (options.worldviewId) {
      const worldview = storage.getWorldview(options.worldviewId)
      if (worldview) {
        setTimeout(() => {
          const worldviewList = this.data.worldviewList
          const index = worldviewList.findIndex(w => w.id === worldview.id)
          if (index >= 0) {
            this.setData({
              selectedWorldviewIndex: index,
              selectedWorldview: worldview
            })
          }
        }, 100)
      }
    }
    
    // 如果从对话/故事段落跳转，传入场景文本
    if (options.template) {
      this.setData({
        premiseText: decodeURIComponent(options.template)
      })
    }
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadCharacters()
    this.loadWorldviews()
  },

  // 加载已有故事
  loadStory(id) {
    const story = storage.getWork(id)
    if (story && story.type === 'story') {
      this.setData({
        storyId: story.id,
        masterId: story.workId || null,
        storyTitle: story.title || '',
        storySummary: story.summary || '',
        outline: story.outline || [],
        currentContent: story.content || '',
        premiseText: story.summary || ''
      })
      // 加载关联的角色和世界观
      if (story.characterIds && story.characterIds.length > 0) {
        story.characterIds.forEach(charId => {
          const character = storage.getCharacter(charId)
          if (character) {
            this.data.selectedCharacters.push(character)
          }
        })
      }
      if (story.worldviewId) {
        const worldview = storage.getWorldview(story.worldviewId)
        if (worldview) {
          this.setData({ selectedWorldview: worldview })
        }
      }
    }
  },

  // 加载角色列表
  loadCharacters() {
    const characters = storage.getCharacters()
    const characterList = (characters || []).map(char => {
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

  // 加载世界观列表
  loadWorldviews() {
    const worldviews = storage.getWorldviews()
    if (!worldviews || worldviews.length === 0) {
      this.setData({ worldviewList: [] })
      return
    }
    
    const worldviewList = worldviews.map((world, index) => {
      let title = '世界观设定'
      if (world.era && typeof world.era === 'string' && world.era.trim().length > 0) {
        const eraText = world.era.trim()
        title = eraText.length > 20 ? eraText.substring(0, 20) + '...' : eraText
      } else if (world.originalInput && typeof world.originalInput === 'string' && world.originalInput.trim().length > 0) {
        const inputText = world.originalInput.trim()
        title = inputText.length > 20 ? inputText.substring(0, 20) + '...' : inputText
      } else if (world.geography && typeof world.geography === 'string' && world.geography.trim().length > 0) {
        const geoText = world.geography.trim()
        title = geoText.length > 20 ? geoText.substring(0, 20) + '...' : geoText
      } else if (world.title && typeof world.title === 'string' && world.title.trim()) {
        title = world.title.trim()
      } else {
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

  // 角色选择变化（支持多选）
  onCharacterChange(e) {
    const index = parseInt(e.detail.value)
    if (index >= 0 && index < this.data.characterList.length) {
      const characterItem = this.data.characterList[index]
      if (characterItem && characterItem.data) {
        const character = characterItem.data
        // 检查是否已选择
        const exists = this.data.selectedCharacters.find(c => c.id === character.id)
        if (!exists) {
          // 添加到已选列表
          const selectedCharacters = [...this.data.selectedCharacters, character]
          const selectedCharacterIndices = [...this.data.selectedCharacterIndices, index]
          this.setData({
            selectedCharacters,
            selectedCharacterIndices,
            selectedCharacterIndex: -1  // 重置选择器
          })
        } else {
          common.showToast('该角色已添加', 'none')
          // 即使已存在，也重置选择器
          this.setData({
            selectedCharacterIndex: -1
          })
        }
      }
    }
  },

  // 移除角色
  removeCharacter(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    if (index >= 0 && index < this.data.selectedCharacters.length) {
      const selectedCharacters = [...this.data.selectedCharacters]
      const selectedCharacterIndices = [...this.data.selectedCharacterIndices]
      const removedCharacter = selectedCharacters[index]
      selectedCharacters.splice(index, 1)
      selectedCharacterIndices.splice(index, 1)
      this.setData({ 
        selectedCharacters,
        selectedCharacterIndices
      })
    }
  },

  // 世界观选择变化
  onWorldviewChange(e) {
    const index = parseInt(e.detail.value)
    if (index >= 0 && index < this.data.worldviewList.length) {
      const worldviewItem = this.data.worldviewList[index]
      this.setData({
        selectedWorldviewIndex: index,
        selectedWorldview: worldviewItem.data
      })
    }
  },

  // 前提输入变化
  onPremiseChange(e) {
    this.setData({
      premiseText: e.detail.value
    })
  },

  // 目标字数变化
  onTargetLengthChange(e) {
    const lengths = [2000, 4000, 6000, 8000]
    const index = parseInt(e.detail.value)
    this.setData({
      targetLength: lengths[index] || 2000
    })
  },

  // 切换Tab
  switchTab(e) {
    const tab = parseInt(e.currentTarget.dataset.tab)
    this.setData({ currentTab: tab })
  },

  // 生成大纲
  async generateOutline() {
    const { premiseText, targetLength, selectedCharacters, selectedWorldview } = this.data
    const trimmedPremise = premiseText ? premiseText.trim() : ''
    if (!trimmedPremise) {
      common.showError('请输入故事前提')
      return
    }

    this.setData({ outlineLoading: true })
    common.showLoading('AI生成中...')

    try {
      const result = await api.generateStoryOutline(
        trimmedPremise,
        targetLength,
        selectedCharacters,
        selectedWorldview
      )
      
      // 解析JSON
      let parsedResult
      if (typeof result === 'string') {
        parsedResult = jsonParser.safeParseJSON(result, { outline: [] })
      } else {
        parsedResult = result
      }
      
      const outline = parsedResult.outline || []
      
      this.setData({
        outline,
        outlineLoading: false
      })
      common.hideLoading()
      common.showSuccess('大纲生成成功')
      
      // 自动切换到正文生成Tab
      if (outline.length > 0) {
        this.setData({ currentTab: 1 })
      }
    } catch (error) {
      console.error('生成大纲失败', error)
      common.hideLoading()
      this.setData({ outlineLoading: false })
      common.showError('生成失败：' + (error.message || '未知错误'))
    }
  },

  // 编辑大纲节点
  editOutlineItem(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const item = this.data.outline[index]
    if (!item) return
    
    wx.showModal({
      title: '编辑大纲节点',
      editable: true,
      placeholderText: '请输入节点描述（可输入多行文本，建议50-200字）',
      content: item.description || '',
      success: (res) => {
        if (res.confirm && res.content) {
          const outline = [...this.data.outline]
          outline[index] = {
            ...outline[index],
            description: res.content.trim()
          }
          this.setData({ outline })
          common.showSuccess('修改成功')
        }
      }
    })
  },

  // 选择大纲节点生成段落
  async generateSegmentFromOutline(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const outlineItem = this.data.outline[index]
    if (!outlineItem) return

    this.setData({ 
      selectedOutlineIndex: index,
      segmentLoading: true 
    })
    common.showLoading('AI生成中...')

    try {
      const segmentLength = Math.ceil(this.data.targetLength / this.data.outline.length)
      const result = await api.generateStorySegment(
        outlineItem,
        this.data.currentContent,
        this.data.selectedCharacters,
        this.data.selectedWorldview,
        segmentLength
      )
      
      const newContent = this.data.currentContent 
        ? this.data.currentContent + '\n\n' + result
        : result
      
      this.setData({
        currentContent: newContent,
        segmentLoading: false
      })
      common.hideLoading()
      common.showSuccess('段落生成成功')
    } catch (error) {
      console.error('生成段落失败', error)
      common.hideLoading()
      this.setData({ segmentLoading: false })
      common.showError('生成失败：' + (error.message || '未知错误'))
    }
  },

  // 续写故事
  async continueStory() {
    const { currentContent, selectedCharacters, selectedWorldview, targetLength } = this.data
    if (!currentContent.trim()) {
      common.showError('请先生成故事开头')
      return
    }

    this.setData({ segmentLoading: true })
    common.showLoading('AI续写中...')

    try {
      const segmentLength = 500  // 续写默认500字
      const result = await api.generateStorySegment(
        null,  // 没有大纲节点
        currentContent,
        selectedCharacters,
        selectedWorldview,
        segmentLength
      )
      
      const newContent = currentContent + '\n\n' + result
      
      this.setData({
        currentContent: newContent,
        segmentLoading: false
      })
      common.hideLoading()
      common.showSuccess('续写成功')
    } catch (error) {
      console.error('续写失败', error)
      common.hideLoading()
      this.setData({ segmentLoading: false })
      common.showError('续写失败：' + (error.message || '未知错误'))
    }
  },

  // 保存故事
  async saveStory() {
    const { 
      storyTitle, 
      storySummary, 
      premiseText, 
      outline, 
      currentContent, 
      selectedCharacters, 
      selectedWorldview, 
      masterId,
      storyId
    } = this.data
    
    const trimmedTitle = storyTitle ? storyTitle.trim() : ''
    const trimmedPremise = premiseText ? premiseText.trim() : ''
    const trimmedContent = currentContent ? currentContent.trim() : ''
    const trimmedSummary = storySummary ? storySummary.trim() : ''
    
    if (!trimmedTitle && !trimmedPremise) {
      common.showError('请输入故事标题或前提')
      return
    }
    
    if (!trimmedContent && outline.length === 0) {
      common.showError('请先生成大纲或正文')
      return
    }

    // 确定要保存到哪个作品
    let targetMasterId = masterId

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
          const newMaster = storage.createMasterWork('未命名作品')
          targetMasterId = newMaster.id
        } else {
          targetMasterId = masters[idx].id
        }
      } catch (error) {
        return
      }
    }

    // 确保主作品存在
    if (targetMasterId) {
      const master = storage.getWork(targetMasterId)
      if (!master || master.type !== 'work') {
        const newMaster = storage.ensureMasterWork(targetMasterId)
        targetMasterId = newMaster.id
      }
    }

    // 保存故事
    // 优化标题生成：优先使用用户输入的标题，否则从summary或premise提取简短标题
    let finalTitle = trimmedTitle
    if (!finalTitle) {
      if (trimmedSummary && trimmedSummary.trim()) {
        finalTitle = trimmedSummary.length > 15 ? trimmedSummary.substring(0, 15) + '...' : trimmedSummary
      } else if (trimmedPremise && trimmedPremise.trim()) {
        finalTitle = trimmedPremise.length > 15 ? trimmedPremise.substring(0, 15) + '...' : trimmedPremise
      } else {
        finalTitle = '未命名故事'
      }
    }
    
    const story = {
      type: 'story',
      id: storyId || undefined,
      title: finalTitle,
      summary: trimmedSummary || trimmedPremise,
      premise: trimmedPremise,
      outline: outline,
      content: trimmedContent,
      characterIds: selectedCharacters.map(c => c.id),
      worldviewId: selectedWorldview ? selectedWorldview.id : null,
      workId: targetMasterId
    }

    const saved = storage.saveWork(story)
    if (saved) {
      // 更新storyId，用于后续操作
      this.setData({ storyId: saved.id })
      
      common.showSuccess('保存成功')
      
      // 关键修改：只有新建故事且内容足够长时才询问生成插画
      // 如果是编辑已有故事（storyId存在），不再询问
      const isNewStory = !storyId  // 如果原来没有storyId，说明是新故事
      const shouldAskForImages = isNewStory && trimmedContent && trimmedContent.length > 500 && outline.length > 0
      
      if (shouldAskForImages) {
        wx.showModal({
          title: '自动生成插画',
          content: `检测到故事内容，是否自动识别核心场景并生成插画？\n\n将自动生成3-5张插画，保持人物外观一致。`,
          success: async (res) => {
            if (res.confirm) {
              await this.autoGenerateIllustrations(saved.id, story)
            } else {
              // 用户取消，正常返回
              if (masterId) {
                setTimeout(() => {
                  wx.navigateBack()
                }, 500)
              }
            }
          },
          fail: () => {
            // 用户取消，正常返回
            if (masterId) {
              setTimeout(() => {
                wx.navigateBack()
              }, 500)
            }
          }
        })
      } else {
        // 如果是从作品详情页进入的，返回上一页
        if (masterId) {
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      }
    } else {
      common.showError('保存失败')
    }
  },

  /**
   * 自动批量生成插画
   */
  async autoGenerateIllustrations(storyId, story) {
    const { selectedCharacters, selectedWorldview, masterId } = this.data
    
    // 关键修改：确保 masterId 存在，如果不存在则从故事中获取
    let targetMasterId = masterId
    if (!targetMasterId && story.workId) {
      targetMasterId = story.workId
    }
    
    // 如果还是没有，需要创建或选择主作品
    if (!targetMasterId) {
      common.showError('请先保存故事到作品')
      return
    }
    
    common.showLoading('识别场景中...')
    
    try {
      // 1. 识别核心场景
      const scenes = await api.identifyKeyScenes(
        story.content,
        story.outline || [],
        selectedCharacters,
        5 // 最多5个场景
      )
      
      if (!scenes || scenes.length === 0) {
        common.hideLoading()
        common.showError('未识别到核心场景')
        if (this.data.masterId) {
          setTimeout(() => {
            wx.navigateBack()
          }, 500)
        }
        return
      }
      
      common.hideLoading()
      common.showLoading(`生成中 ${scenes.length}张...`)
      
      // 2. 获取已有插画（用于保持一致性）
      const allWorks = storage.getWorks()
      let existingImages = allWorks.filter(w => 
        w.type === 'image' && 
        w.workId === targetMasterId &&  // 使用确保存在的targetMasterId
        w.relatedStoryId === storyId
      )
      
      // 3. 批量生成插画
      const generatedImages = []
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i]
        
        try {
          // 提取核心场景描述（如果已经是简短描述，直接使用）
          let sceneDescription = scene.description
          if (sceneDescription.length > 50) {
            const keyScene = await api.extractKeyScene(
              sceneDescription,
              selectedCharacters
            )
            sceneDescription = (keyScene && keyScene.trim()) || sceneDescription.substring(0, 30)
          }
          
          // 检测场景描述中的角色数量，决定传入哪些角色
          const sceneDesc = sceneDescription
          const multiCharKeywords = ['三人', '多人', '联手', '一起', '共同', '并肩', '联手', '合作']
          const hasMultiChar = multiCharKeywords.some(keyword => sceneDesc.includes(keyword))
          
          // 如果场景描述包含多个角色，传入第一个角色（prompt中会通过描述检测多角色）
          let targetCharacter = selectedCharacters[0] || null
          if (hasMultiChar && selectedCharacters.length > 1) {
            // 多角色场景：传入第一个角色，但在prompt中会通过描述检测多角色
            targetCharacter = selectedCharacters[0] || null
          }
          
          // 生成插画
          const imageResult = await api.generateIllustration(
            sceneDescription,
            targetCharacter,
            selectedWorldview,
            existingImages // 传入已有插画保持一致性
          )
          
          if (imageResult) {
            // 保存插画 - 确保关联到主作品
            const imageWork = {
              type: 'image',
              title: sceneDescription.length > 30 ? sceneDescription.substring(0, 30) : sceneDescription,
              content: imageResult,
              description: sceneDescription,
              characterId: selectedCharacters[0] && selectedCharacters[0].id,
              worldviewId: selectedWorldview && selectedWorldview.id,
              workId: targetMasterId,  // 使用确保存在的targetMasterId
              relatedStoryId: storyId,
              outlineIndex: scene.outlineIndex || null, // 关联到大纲节点
              sceneIndex: scene.index || (i + 1) // 场景序号
            }
            
            const savedImage = storage.saveWork(imageWork)
            if (savedImage) {
              existingImages.push(savedImage) // 添加到已有插画列表，保持一致性
              generatedImages.push(savedImage)
            }
          }
          
          // 更新进度
          common.showLoading(`生成中 ${i + 1}/${scenes.length}...`)
        } catch (error) {
          console.error(`生成场景${i + 1}的插画失败:`, error)
          // 继续生成下一个
        }
      }
      
      common.hideLoading()
      
      if (generatedImages.length > 0) {
        common.showSuccess(`成功生成${generatedImages.length}张插画`)
        
        // 刷新作品详情页（如果是从详情页进入的）
        if (targetMasterId) {
          const pages = getCurrentPages()
          const prevPage = pages[pages.length - 2]
          if (prevPage && prevPage.route === 'pages/works/detail/index') {
            prevPage.onShow()
          }
        }
        
        // 延迟返回，让用户看到成功提示
        setTimeout(() => {
          if (targetMasterId) {
            wx.navigateBack()
          }
        }, 2000)
      } else {
        common.showError('插画生成失败，请稍后手动生成')
        if (this.data.masterId) {
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      }
    } catch (error) {
      console.error('自动生成插画失败:', error)
      common.hideLoading()
      common.showError('自动生成插画失败：' + (error.message || '未知错误'))
      if (this.data.masterId) {
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    }
  },

  /**
   * 批量生成插画（手动触发）
   */
  async batchGenerateImages() {
    const { currentContent, outline, selectedCharacters, selectedWorldview, masterId, storyId } = this.data
    
    if (!currentContent.trim() || outline.length === 0) {
      common.showError('请先生成故事内容和大纲')
      return
    }
    
    wx.showModal({
      title: '批量生成插画',
      content: `将自动识别故事中的核心场景，并生成3-5张插画。\n\n所有插画将保持人物外观一致。`,
      success: async (res) => {
        if (res.confirm) {
          // 如果故事已保存，使用storyId；否则先保存故事
          let targetStoryId = storyId
          if (!targetStoryId) {
            // 先保存故事
            await this.saveStory()
            targetStoryId = this.data.storyId
          }
          
          if (targetStoryId) {
            const story = storage.getWork(targetStoryId)
            if (story) {
              await this.autoGenerateIllustrations(targetStoryId, story)
            } else {
              common.showError('故事数据不存在')
            }
          } else {
            common.showError('无法获取故事ID')
          }
        }
      }
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
  
  // 跳转到对话片段库
  navigateToDialogTemplates() {
    wx.navigateTo({
      url: '/pages/dialog-templates/index'
    })
  },

  // 从当前段落生成插画（智能提取核心场景）
  async generateImageFromSegment() {
    const { currentContent, selectedCharacters, selectedWorldview, masterId, storyId } = this.data
    if (!currentContent.trim()) {
      common.showError('请先生成故事内容')
      return
    }
    
    common.showLoading('提取场景中...')
    
    try {
      // 取最后一段作为场景描述（约300字，确保有足够上下文）
      const sceneText = currentContent.substring(Math.max(0, currentContent.length - 300))
      
      // 提取核心场景描述
      const keyScene = await api.extractKeyScene(sceneText, selectedCharacters)
      const keySceneText = (keyScene && keyScene.trim()) || sceneText.substring(0, 50)
      
      common.hideLoading()
      
      // 获取同一故事已有的插画，用于保持一致性
      let existingImages = []
      if (storyId) {
        const story = storage.getWork(storyId)
        if (story && story.workId) {
          const allWorks = storage.getWorks()
          existingImages = allWorks.filter(w => 
            w.type === 'image' && 
            w.workId === story.workId &&
            w.relatedStoryId === storyId
          )
        }
      } else if (masterId) {
        const allWorks = storage.getWorks()
        existingImages = allWorks.filter(w => 
          w.type === 'image' && 
          w.workId === masterId
        )
      }
      
      // 构建参数
      const characterIds = selectedCharacters.map(c => c.id).join(',')
      const worldviewId = selectedWorldview ? selectedWorldview.id : ''
      const existingImageIds = existingImages.map(img => img.id).join(',')
      
      wx.navigateTo({
        url: `/pages/image/index?masterId=${masterId || ''}&characterIds=${characterIds}&worldviewId=${worldviewId}&template=${encodeURIComponent(keySceneText)}&storyId=${storyId || ''}&existingImageIds=${existingImageIds}&keyScene=${encodeURIComponent(keySceneText)}`
      })
    } catch (error) {
      console.error('提取核心场景失败:', error)
      common.hideLoading()
      common.showError('提取场景失败，将使用完整段落')
      
      // 失败时使用原逻辑
      const sceneText = currentContent.substring(Math.max(0, currentContent.length - 200))
      const characterIds = selectedCharacters.map(c => c.id).join(',')
      const worldviewId = selectedWorldview ? selectedWorldview.id : ''
      
      wx.navigateTo({
        url: `/pages/image/index?masterId=${masterId || ''}&characterIds=${characterIds}&worldviewId=${worldviewId}&template=${encodeURIComponent(sceneText)}`
      })
    }
  },

  // 从当前段落生成对话
  generateDialogFromSegment() {
    const { currentContent, selectedCharacters, selectedWorldview, masterId, storyId } = this.data
    if (!currentContent.trim()) {
      common.showError('请先生成故事内容')
      return
    }
    
    // 取最后一段作为场景描述
    const sceneText = currentContent.substring(Math.max(0, currentContent.length - 200))
    const characterIds = selectedCharacters.map(c => c.id).join(',')
    const worldviewId = selectedWorldview ? selectedWorldview.id : ''
    
    wx.navigateTo({
      url: `/pages/dialog/index?masterId=${masterId || ''}&characterIds=${characterIds}&worldviewId=${worldviewId}&template=${encodeURIComponent(sceneText)}&relatedStoryId=${storyId || ''}`
    })
  },
  
  // 优化故事中的所有对话
  async optimizeAllDialogs() {
    const { currentContent, selectedCharacters, selectedWorldview } = this.data
    
    if (!currentContent.trim() || selectedCharacters.length === 0) {
      common.showError('请先生成故事内容并选择角色')
      return
    }
    
    wx.showModal({
      title: '优化所有对话',
      content: '将自动提取故事中的所有对话，并根据角色人设进行优化。\n\n优化后的对话将替换原文中的对话部分。',
      success: async (res) => {
        if (res.confirm) {
          await this.performOptimizeAllDialogs()
        }
      }
    })
  },
  
  // 执行优化所有对话
  async performOptimizeAllDialogs() {
    const { currentContent, selectedCharacters, selectedWorldview } = this.data
    
    common.showLoading('正在提取对话...')
    
    try {
      // 1. 提取所有对话
      const extractedDialogs = await api.extractDialogFromText(currentContent)
      
      if (!extractedDialogs || extractedDialogs.includes('未找到对话内容')) {
        common.hideLoading()
        common.showError('未在故事中找到对话内容')
        return
      }
      
      common.showLoading('正在优化对话...')
      
      // 2. 优化对话（使用第一个角色作为主要角色）
      const optimizedDialogs = await api.optimizeDialog(
        extractedDialogs,
        selectedCharacters[0] || null,
        selectedWorldview
      )
      
      if (!optimizedDialogs) {
        common.hideLoading()
        common.showError('优化失败')
        return
      }
      
      // 3. 替换原文中的对话
      // 简单的替换策略：找到原文中的对话部分，用优化后的替换
      let newContent = currentContent
      
      // 尝试智能替换：找到对话标记（引号内的内容）
      const dialogRegex = /["""]([^"""]+)["""]/g
      const matches = [...currentContent.matchAll(dialogRegex)]
      
      if (matches.length > 0) {
        // 如果有多个对话，尝试逐个替换
        const optimizedLines = optimizedDialogs.split('\n').filter(line => line.trim())
        let optimizedIndex = 0
        
        matches.forEach((match, index) => {
          if (optimizedIndex < optimizedLines.length) {
            const originalDialog = match[0]
            const optimizedDialog = `"${optimizedLines[optimizedIndex].trim()}"`
            newContent = newContent.replace(originalDialog, optimizedDialog)
            optimizedIndex++
          }
        })
      } else {
        // 如果没有找到引号，尝试在原文末尾添加优化后的对话作为参考
        newContent = currentContent + '\n\n【优化后的对话参考】\n' + optimizedDialogs
      }
      
      this.setData({ currentContent: newContent })
      common.hideLoading()
      common.showSuccess('对话优化完成')
    } catch (error) {
      console.error('优化对话失败:', error)
      common.hideLoading()
      common.showError('优化失败：' + (error.message || '未知错误'))
    }
  },

  // 内容输入变化
  onContentChange(e) {
    this.setData({
      currentContent: e.detail.value
    })
  },

  // 标题输入变化
  onTitleChange(e) {
    this.setData({
      storyTitle: e.detail.value
    })
  },

  // 清空内容
  clearContent() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有内容吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            premiseText: '',
            outline: [],
            currentContent: '',
            storyTitle: '',
            storySummary: ''
          })
        }
      }
    })
  }
})

