// pages/image/index.js
const api = require('../../utils/api')
const storage = require('../../utils/storage')
const common = require('../../utils/common')

Page({
  data: {
    descriptionText: '',
    loading: false,
    result: null,
    characterList: [],
    worldviewList: [],
    selectedCharacterIndex: -1,
    selectedWorldviewIndex: -1,
    selectedCharacter: null,
    selectedWorldview: null,
    masterId: null,  // 关联的主作品ID
    imageId: null,    // 当前查看/编辑的插画ID（如果存在）
    storyId: null,    // 关联的故事ID（如果从故事页进入）
    existingImageIds: '',  // 已有插画ID列表（用于保持一致性）
    keyScene: '',      // 核心场景描述（用于保存）
    extractedAppearance: null  // 提取的外观特征（用于保存）
  },

  onLoad(options) {
    // 保存masterId（如果从作品详情页进入）
    if (options.masterId) {
      this.setData({ masterId: options.masterId })
    }
    
    // 保存故事相关参数
    if (options.storyId) {
      this.setData({ storyId: options.storyId })
    }
    if (options.existingImageIds) {
      this.setData({ existingImageIds: options.existingImageIds })
    }
    if (options.keyScene) {
      const keyScene = decodeURIComponent(options.keyScene)
      this.setData({ 
        keyScene: keyScene,
        descriptionText: keyScene  // 预填充核心场景描述
      })
    }

    // 如果传入了id，说明是查看已保存的插画
    if (options.id) {
      const savedImage = storage.getWork(options.id)
      if (savedImage && savedImage.type === 'image') {
        this.setData({
          result: savedImage.content,
          descriptionText: savedImage.description || savedImage.title || '',
          masterId: savedImage.workId || null,
          imageId: savedImage.id  // 保存插画ID，用于更新
        })
        // 如果有角色或世界观ID，加载它们
        if (savedImage.characterId) {
          const character = storage.getCharacter(savedImage.characterId)
          if (character) {
            this.setData({ selectedCharacter: character })
          }
        }
        if (savedImage.worldviewId) {
          const worldview = storage.getWorldview(savedImage.worldviewId)
          if (worldview) {
            this.setData({ selectedWorldview: worldview })
          }
        }
      }
    }

    // 先加载列表
    this.loadCharacters()
    this.loadWorldviews()

    // 延迟处理传入的参数，确保列表已加载
    setTimeout(() => {
      // 支持单个角色ID
      if (options.characterId) {
        const character = storage.getCharacter(options.characterId)
        if (character) {
          const characterList = this.data.characterList
          const index = characterList.findIndex(c => c.id === character.id)
          if (index >= 0) {
            this.setData({
              selectedCharacterIndex: index,
              selectedCharacter: character
            })
          }
        }
      }
      
      // 支持多个角色ID（用逗号分隔，取第一个作为主要角色）
      if (options.characterIds) {
        const ids = options.characterIds.split(',')
        if (ids.length > 0) {
          const character = storage.getCharacter(ids[0])
          if (character) {
            const characterList = this.data.characterList
            const index = characterList.findIndex(c => c.id === character.id)
            if (index >= 0) {
              this.setData({
                selectedCharacterIndex: index,
                selectedCharacter: character
              })
            }
          }
        }
      }

      if (options.worldviewId) {
        const worldview = storage.getWorldview(options.worldviewId)
        if (worldview) {
          const worldviewList = this.data.worldviewList
          const index = worldviewList.findIndex(w => w.id === worldview.id)
          if (index >= 0) {
            this.setData({
              selectedWorldviewIndex: index,
              selectedWorldview: worldview
            })
          }
        }
      }
    }, 100)
    
    if (options.template) {
      this.setData({
        descriptionText: decodeURIComponent(options.template)
      })
    }
  },

  onShow() {
    // 每次显示页面时刷新数据（可能在其他页面创建了新角色或世界观）
    this.loadCharacters()
    this.loadWorldviews()
  },

  loadCharacters() {
    const characters = storage.getCharacters()
    console.log('[loadCharacters] 从storage获取的角色列表:', characters)
    
    const characterList = characters.map(char => {
      // 角色数据结构：{id, basicInfo: {name, age, gender, identity}, personality, behavior, ...}
      const name = (char.basicInfo && char.basicInfo.name) 
        ? char.basicInfo.name 
        : (char.name || '未命名角色')
      
      return {
        id: char.id,
        name: name,
        data: char // 保存完整的角色对象
      }
    })
    
    console.log('[loadCharacters] 处理后的角色列表:', characterList)
    this.setData({ characterList })
  },

  loadWorldviews() {
    const worldviews = storage.getWorldviews()
    console.log('[loadWorldviews] ========== 开始加载世界观 ==========')
    console.log('[loadWorldviews] 从storage获取的世界观列表:', worldviews)
    console.log('[loadWorldviews] 世界观数量:', worldviews ? worldviews.length : 0)
    
    if (!worldviews || worldviews.length === 0) {
      console.log('[loadWorldviews] 没有世界观数据')
      this.setData({ worldviewList: [] })
      return
    }
    
    const worldviewList = worldviews.map((world, index) => {
      console.log(`[loadWorldviews] 处理世界观 ${index}:`, world)
      console.log(`[loadWorldviews] 世界观 ${index} era字段:`, world.era, '类型:', typeof world.era)
      console.log(`[loadWorldviews] 世界观 ${index} originalInput字段:`, world.originalInput)
      console.log(`[loadWorldviews] 世界观 ${index} geography字段:`, world.geography)
      
      // 世界观数据结构：{id, era, geography, socialRules, conflicts, techLevel, type, originalInput}
      // 尝试从不同字段获取标题
      let title = '世界观设定'
      
      // 优先从era字段获取（这是最常用的字段）
      if (world.era && typeof world.era === 'string' && world.era.trim().length > 0) {
        const eraText = world.era.trim()
        // 提取前20个字符作为标题
        title = eraText.length > 20 ? eraText.substring(0, 20) + '...' : eraText
        console.log(`[loadWorldviews] 世界观 ${index} 从era获取标题:`, title)
      } 
      // 如果没有era，尝试从originalInput获取
      else if (world.originalInput && typeof world.originalInput === 'string' && world.originalInput.trim().length > 0) {
        const inputText = world.originalInput.trim()
        title = inputText.length > 20 ? inputText.substring(0, 20) + '...' : inputText
        console.log(`[loadWorldviews] 世界观 ${index} 从originalInput获取标题:`, title)
      }
      // 如果有geography，也可以作为标题
      else if (world.geography && typeof world.geography === 'string' && world.geography.trim().length > 0) {
        const geoText = world.geography.trim()
        title = geoText.length > 20 ? geoText.substring(0, 20) + '...' : geoText
        console.log(`[loadWorldviews] 世界观 ${index} 从geography获取标题:`, title)
      }
      // 如果有title字段
      else if (world.title && typeof world.title === 'string') {
        title = world.title
        console.log(`[loadWorldviews] 世界观 ${index} 从title获取标题:`, title)
      }
      // 如果都没有，使用默认标题+ID
      else {
        title = `世界观设定 ${world.id ? world.id.substring(0, 8) : index + 1}`
        console.log(`[loadWorldviews] 世界观 ${index} 使用默认标题:`, title)
      }
      
      console.log(`[loadWorldviews] 世界观 ${index} 最终标题:`, title)
      
      return {
        id: world.id,
        title: title,
        data: world // 保存完整的世界观对象
      }
    })
    
    console.log('[loadWorldviews] 处理后的世界观列表:', worldviewList)
    console.log('[loadWorldviews] ========== 世界观加载完成 ==========')
    this.setData({ worldviewList })
  },

  onCharacterChange(e) {
    const index = parseInt(e.detail.value)
    console.log('[onCharacterChange] 选择的索引:', index)
    
    if (index >= 0 && index < this.data.characterList.length) {
      const characterItem = this.data.characterList[index]
      const character = characterItem.data
      
      console.log('[onCharacterChange] 选择的角色:', character)
      
      this.setData({
        selectedCharacterIndex: index,
        selectedCharacter: character
      })
      
      // 如果选择了角色，可以自动填充一些描述
      if (character && character.basicInfo) {
        const info = character.basicInfo
        let autoDesc = ''
        if (info.name) autoDesc += info.name
        if (info.identity) autoDesc += (autoDesc ? '，' : '') + info.identity
        if (info.gender) autoDesc += (autoDesc ? '，' : '') + (info.gender === '男' ? '男性' : '女性')
        
        // 如果当前描述为空，自动填充
        if (!this.data.descriptionText.trim() && autoDesc) {
          this.setData({
            descriptionText: autoDesc
          })
        }
      }
    } else {
      console.warn('[onCharacterChange] 无效的索引:', index)
    }
  },

  onWorldviewChange(e) {
    const index = parseInt(e.detail.value)
    console.log('[onWorldviewChange] 选择的索引:', index)
    console.log('[onWorldviewChange] 世界观列表长度:', this.data.worldviewList.length)
    
    if (index >= 0 && index < this.data.worldviewList.length) {
      const worldviewItem = this.data.worldviewList[index]
      const worldview = worldviewItem.data
      
      console.log('[onWorldviewChange] 选择的世界观数据:', worldview)
      console.log('[onWorldviewChange] 世界观era字段:', worldview.era)
      console.log('[onWorldviewChange] 世界观完整结构:', JSON.stringify(worldview, null, 2))
      
      // 确保世界观数据有效
      if (!worldview) {
        console.error('[onWorldviewChange] 世界观数据为空')
        common.showError('世界观数据无效')
        return
      }
      
      this.setData({
        selectedWorldviewIndex: index,
        selectedWorldview: worldview
      })
      
      // 如果选择了世界观，可以自动填充风格描述
      const eraText = worldview.era || worldview.originalInput || ''
      if (eraText && typeof eraText === 'string') {
        let styleDesc = ''
        if (eraText.includes('仙侠') || eraText.includes('古风') || eraText.includes('修仙')) {
          styleDesc = '古风仙侠风格'
        } else if (eraText.includes('赛博') || eraText.includes('未来') || eraText.includes('科幻')) {
          styleDesc = '赛博朋克风格'
        } else if (eraText.includes('现代') || eraText.includes('都市')) {
          styleDesc = '现代风格'
        }
        
        // 如果当前描述为空或很短，自动添加风格
        if (styleDesc && (!this.data.descriptionText.trim() || this.data.descriptionText.length < 10)) {
          this.setData({
            descriptionText: styleDesc + (this.data.descriptionText ? '，' + this.data.descriptionText : '')
          })
        }
      }
    } else {
      console.warn('[onWorldviewChange] 无效的索引:', index, '列表长度:', this.data.worldviewList.length)
      common.showError('选择失败，请重试')
    }
  },

  onDescriptionChange(e) {
    this.setData({
      descriptionText: e.detail.value
    })
  },

  useExample() {
    this.setData({
      descriptionText: '赛博朋克风格，银发女杀手，穿黑色机甲'
    })
  },

  useExample2() {
    this.setData({
      descriptionText: '古风仙侠，白衣剑客，站在山巅，背景是云海'
    })
  },

  navigateToCharacter() {
    wx.navigateTo({
      url: '/pages/character/index'
    })
  },

  navigateToWorld() {
    wx.navigateTo({
      url: '/pages/world/index'
    })
  },

  async generateImage() {
    const { descriptionText, selectedCharacter, selectedWorldview, existingImageIds } = this.data
    if (!descriptionText.trim()) {
      common.showError('请输入图片描述')
      return
    }

    console.log('[generateImage] ========== 开始生成插画 ==========')
    console.log('[generateImage] 描述文本:', descriptionText)
    console.log('[generateImage] 选择的角色:', selectedCharacter)
    console.log('[generateImage] 选择的世界观:', selectedWorldview)
    
    // 加载已有插画（用于保持一致性）
    let existingImages = []
    if (existingImageIds && existingImageIds.trim()) {
      const ids = existingImageIds.split(',').filter(id => id.trim())
      existingImages = ids.map(id => storage.getWork(id)).filter(img => img && img.type === 'image')
      console.log('[generateImage] 已有插画数量:', existingImages.length)
    }
    
    // 详细检查世界观数据
    if (selectedWorldview) {
      console.log('[generateImage] 世界观ID:', selectedWorldview.id)
      console.log('[generateImage] 世界观era:', selectedWorldview.era)
      console.log('[generateImage] 世界观geography:', selectedWorldview.geography)
      console.log('[generateImage] 世界观完整数据:', JSON.stringify(selectedWorldview, null, 2))
    } else {
      console.log('[generateImage] 未选择世界观')
    }
    
    // 详细检查角色数据
    if (selectedCharacter) {
      console.log('[generateImage] 角色ID:', selectedCharacter.id)
      console.log('[generateImage] 角色basicInfo:', selectedCharacter.basicInfo)
      console.log('[generateImage] 角色完整数据:', JSON.stringify(selectedCharacter, null, 2))
    } else {
      console.log('[generateImage] 未选择角色')
    }

    this.setData({ loading: true })
    common.showLoading('AI生成中，请稍候...')

    try {
      const result = await api.generateIllustration(
        descriptionText,
        selectedCharacter,
        selectedWorldview,
        existingImages
      )
      
      console.log('[generateImage] 生成结果:', result ? '成功' : '失败')
      console.log('[generateImage] ========== 生成完成 ==========')

      // 处理返回的图片URL或base64
      let imageUrl = result
      if (typeof result === 'object' && result.url) {
        imageUrl = result.url
      }

      // 生成成功后，提取并保存外观特征（用于保持一致性）
      let extractedAppearance = null
      if (selectedCharacter) {
        try {
          // 将新生成的插画也加入参考列表
          const allReferenceImages = [...existingImages]
          if (imageUrl) {
            allReferenceImages.push({
              description: descriptionText,
              content: imageUrl
            })
          }
          
          extractedAppearance = await api.extractCharacterAppearance(
            allReferenceImages.slice(0, 3), // 只参考最近3张
            selectedCharacter
          )
          
          if (extractedAppearance) {
            // 更新角色的外观特征
            const updatedCharacter = {
              ...selectedCharacter,
              appearance: { 
                ...(selectedCharacter.appearance || {}), 
                ...extractedAppearance 
              }
            }
            storage.saveCharacter(updatedCharacter)
            
            // 保存提取的特征到插画数据中
            this.setData({
              extractedAppearance: extractedAppearance
            })
          }
        } catch (error) {
          console.warn('提取外观特征失败:', error)
        }
      }

      // 检查返回的是base64还是URL
      const isBase64 = typeof imageUrl === 'string' && imageUrl.startsWith('data:image')
      const isUrl = typeof imageUrl === 'string' && 
                    (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
      
      if (isUrl) {
        // 如果是URL，说明下载失败，提示用户
        console.warn('⚠️ 图片生成返回的是URL格式，可能无法长期保存')
        wx.showModal({
          title: '提示',
          content: '图片已生成，但保存为URL格式。如果链接过期，图片将无法显示。\n\n建议重新生成以确保图片长期可用。',
          showCancel: true,
          confirmText: '重新生成',
          cancelText: '继续保存',
          success: (res) => {
            if (res.confirm) {
              // 用户选择重新生成
              this.setData({
                result: null,
                loading: false
              })
              common.hideLoading()
              this.generateImage()
              return
            } else {
              // 用户选择继续保存URL
              this.setData({
                result: imageUrl,
                loading: false
              })
              common.hideLoading()
              common.showSuccess('生成成功（URL格式）')
            }
          }
        })
      } else {
        // base64格式，正常保存
        this.setData({
          result: imageUrl,
          loading: false
        })
        common.hideLoading()
        common.showSuccess('生成成功')
      }
    } catch (error) {
      console.error('生成插画失败', error)
      common.hideLoading()
      
      // 检查是否是云函数未找到的错误
      if (error.errMsg && error.errMsg.includes('FunctionName parameter could not be found')) {
        wx.showModal({
          title: '云函数未部署',
          content: '请先部署 imageAPI 云函数：\n\n1. 右键 cloudfunctions/imageAPI 文件夹\n2. 选择"上传并部署：云端安装依赖"\n3. 等待部署完成后重试\n\n详细步骤请查看 DEPLOY_CLOUD_FUNCTION.md',
          showCancel: false,
          confirmText: '我知道了'
        })
        this.setData({ loading: false })
        return
      }
      
      // 检查是否是图片下载失败的错误
      if (error.message && error.message.includes('图片下载失败')) {
        wx.showModal({
          title: '图片生成失败',
          content: '图片已生成，但下载失败。可能原因：\n\n1. 图片URL已过期\n2. 网络连接问题\n3. 域名未配置白名单\n\n建议：\n1. 检查网络连接\n2. 在微信公众平台配置域名白名单\n3. 稍后重试',
          showCancel: false,
          confirmText: '我知道了'
        })
      } else {
        // 其他错误，显示错误信息
        common.showError('生成失败：' + (error.message || error.errMsg || '未知错误'))
      }
      this.setData({ loading: false })
    }
  },

  regenerate() {
    // 重新生成时，清除结果和imageId，这样保存时会创建新插画
    // 允许在同一个作品中生成多个插画
    this.setData({ 
      result: null,
      imageId: null  // 清除imageId，保存时创建新插画
    })
  },

  async saveImage() {
    const { result, keyScene, descriptionText, selectedCharacter, selectedWorldview, masterId, imageId, storyId } = this.data
    if (!result) {
      common.showError('没有可保存的内容')
      return
    }

    // 使用核心场景描述作为保存内容（如果有），否则使用描述文本
    const saveDescription = (keyScene && keyScene.trim()) || descriptionText || '插画'
    const saveTitle = saveDescription.length > 30 ? saveDescription.substring(0, 30) : saveDescription

    // 如果已有imageId，说明是更新已保存的插画
    if (imageId) {
      const existingImage = storage.getWork(imageId)
      if (existingImage) {
        // 更新现有插画
        const updatedWork = {
          ...existingImage,
          title: saveTitle,
          content: result,
          description: saveDescription,  // 保存核心场景描述
          characterId: selectedCharacter && selectedCharacter.id,
          worldviewId: selectedWorldview && selectedWorldview.id,
          relatedStoryId: storyId || existingImage.relatedStoryId  // 保持或更新故事关联
        }
        const saved = storage.saveWork(updatedWork)
        if (saved) {
          common.showSuccess('更新成功')
          // 如果是从作品详情页进入的，返回上一页
          if (masterId) {
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          }
        } else {
          common.showError('更新失败')
        }
        return
      }
    }

    // 新建插画：确定要保存到哪个作品
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
          wx.showModal({
            title: '创建新作品',
            editable: true,
            placeholderText: '请输入作品名称',
            success: (modalRes) => {
              if (modalRes.confirm && modalRes.content) {
                const title = modalRes.content.trim() || '未命名作品'
                const newMaster = storage.createMasterWork(title)
                this.saveImageToWork(newMaster.id)
              }
            }
          })
          return
        } else {
          // 选择现有作品
          targetMasterId = realMasters[idx].id
        }
      } catch (error) {
        // 用户取消选择
        return
      }
    }

    this.saveImageToWork(targetMasterId)
  },
  
  // 保存插画到作品（提取为独立方法）
  saveImageToWork(targetMasterId) {
    const { result, keyScene, descriptionText, selectedCharacter, selectedWorldview, storyId, masterId } = this.data
    
    // 使用核心场景描述作为保存内容（如果有），否则使用描述文本
    const saveDescription = (keyScene && keyScene.trim()) || descriptionText || '插画'
    const saveTitle = saveDescription.length > 30 ? saveDescription.substring(0, 30) : saveDescription
    
    // 确保主作品存在
    if (targetMasterId) {
      const master = storage.getWork(targetMasterId)
      if (!master || master.type !== 'work') {
        const newMaster = storage.ensureMasterWork(targetMasterId, '未命名作品')
        targetMasterId = newMaster.id
      }
    }

    const work = {
      type: 'image',
      title: saveTitle,
      content: result,
      description: saveDescription,  // 保存核心场景描述
      characterId: selectedCharacter && selectedCharacter.id,
      worldviewId: selectedWorldview && selectedWorldview.id,
      workId: targetMasterId,  // 关联到主作品
      relatedStoryId: storyId || null,  // 关联的故事ID（可选）
      extractedAppearance: this.data.extractedAppearance || null  // 保存提取的外观特征
    }

    try {
      const saved = storage.saveWork(work)
      if (saved) {
        common.showSuccess('保存成功')
        // 如果是从作品详情页进入的，返回上一页
        if (masterId) {
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      } else {
        common.showError('保存失败，请重试')
      }
    } catch (error) {
      console.error('保存插画失败:', error)
      common.showError('保存失败：' + (error.message || '未知错误'))
    }
  },

  downloadImage() {
    const { result } = this.data
    if (!result) {
      common.showError('没有可下载的图片')
      return
    }

    common.showLoading('保存中...')
    wx.downloadFile({
      url: result,
      success: (res) => {
        if (res.statusCode === 200) {
          common.saveImageToAlbum(res.tempFilePath)
            .then(() => {
              common.hideLoading()
              common.showSuccess('已保存到相册')
            })
            .catch(() => {
              common.hideLoading()
              common.showError('保存失败')
            })
        } else {
          common.hideLoading()
          common.showError('下载失败')
        }
      },
      fail: () => {
        common.hideLoading()
        common.showError('下载失败')
      }
    })
  },

  previewImage() {
    const { result } = this.data
    if (result) {
      wx.previewImage({
        urls: [result],
        current: result
      })
    }
  },

  backToInput() {
    this.setData({ result: null, descriptionText: '' })
  }
})
