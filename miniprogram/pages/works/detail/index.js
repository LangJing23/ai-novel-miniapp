// pages/works/detail/index.js
const storage = require('../../../utils/storage')
const common = require('../../../utils/common')

Page({
  data: {
    id: '',
    work: null
  },

  onLoad(options) {
    const { id } = options || {}
    if (!id) {
      common.showError('缺少作品ID')
      return
    }
    this.setData({ id })
    this.loadWork(id)
  },

  onShow() {
    if (this.data.id) {
      this.loadWork(this.data.id)
    }
  },

  loadWork(id) {
    const list = storage.getAggregatedWorks()
    const hit = list.find(w => w.id === id)
    if (!hit) {
      common.showError('作品不存在')
      return
    }
    // 格式化时间
    const format = (t) => t ? common.formatDate(t) : ''
    // 清除图片的错误标记，确保videos数组存在
    const work = {
      ...hit,
      updateTime: format(hit.updateTime),
      createTime: format(hit.createTime),
      images: (hit.images || []).map(img => ({
        ...img,
        _loadError: false // 重置错误标记
      })),
      videos: hit.videos || [] // 确保videos数组存在
    }
    this.setData({ work })
  },

  // 编辑作品名称
  editWorkTitle() {
    const { work, id } = this.data
    const currentTitle = work ? (work.title || '未命名作品') : '未命名作品'
    
    wx.showModal({
      title: '修改作品名称',
      editable: true,
      placeholderText: '请输入作品名称',
      content: currentTitle,
      success: (res) => {
        if (res.confirm && res.content) {
          const newTitle = res.content.trim()
          if (!newTitle) {
            common.showError('作品名称不能为空')
            return
          }
          
          // 更新作品名称
          const masterWork = storage.getWork(id)
          if (masterWork && masterWork.type === 'work') {
            const updated = storage.saveWork({
              ...masterWork,
              title: newTitle
            })
            if (updated) {
              common.showSuccess('修改成功')
              // 重新加载作品数据
              this.loadWork(id)
            } else {
              common.showError('修改失败')
            }
          } else {
            // 如果是临时聚合ID，需要创建主作品
            const newMaster = storage.ensureMasterWork(id, newTitle)
            if (newMaster) {
              common.showSuccess('修改成功')
              this.loadWork(newMaster.id)
              this.setData({ id: newMaster.id })
            } else {
              common.showError('修改失败')
            }
          }
        }
      }
    })
  },

  // 操作 - 新建/打开 子项
  createCharacter() {
    const id = this.data.id
    wx.navigateTo({ url: `/pages/character/index?masterId=${id}` })
  },
  openCharacter(e) {
    const id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: `/pages/character/index?characterId=${id}` })
  },

  createWorldview() {
    const id = this.data.id
    wx.navigateTo({ url: `/pages/world/index?masterId=${id}` })
  },
  openWorldview(e) {
    const id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: `/pages/world/index?id=${id}` })
  },

  createDialog() {
    const id = this.data.id
    wx.navigateTo({ url: `/pages/dialog/index?masterId=${id}` })
  },
  openDialog(e) {
    const id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: `/pages/dialog/index?id=${id}` })
  },

  createImage() {
    const id = this.data.id
    wx.navigateTo({ url: `/pages/image/index?masterId=${id}` })
  },
  openImage(e) {
    const id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: `/pages/image/index?id=${id}` })
  },
  
  // 预览插画
  previewImage(e) {
    const { url, id } = e.currentTarget.dataset
    if (!url) {
      common.showError('插画链接无效')
      return
    }
    
    // 检查是否是URL格式（可能已过期）
    const isUrl = typeof url === 'string' && 
                  (url.startsWith('http://') || url.startsWith('https://'))
    
    if (isUrl) {
      // 如果是URL格式，先检查是否可以访问
      wx.showLoading({ title: '加载中...', mask: true })
      
      // 使用短超时检查图片是否可访问
      wx.request({
        url: url,
        method: 'HEAD',
        timeout: 5000,
        success: (res) => {
          wx.hideLoading()
          if (res.statusCode === 200 || res.statusCode === 403) {
            // 403也可能是因为跨域，但图片可能仍可显示
            this.doPreviewImage(url, id)
          } else {
            wx.hideLoading()
            wx.showModal({
              title: '图片无法加载',
              content: '图片链接可能已过期。是否尝试查看？',
              success: (res) => {
                if (res.confirm) {
                  this.doPreviewImage(url, id)
                }
              }
            })
          }
        },
        fail: (err) => {
          wx.hideLoading()
          // 网络错误，仍然尝试预览（可能是跨域问题）
          this.doPreviewImage(url, id)
        }
      })
    } else {
      // base64格式，直接预览
      this.doPreviewImage(url, id)
    }
  },

  // 执行预览
  doPreviewImage(url, id) {
    // 获取该作品的所有插画URL
    const allImages = this.data.work.images || []
    const urls = allImages
      .filter(img => img.content)
      .map(img => img.content)
    
    const currentIndex = urls.findIndex(u => u === url)
    
    wx.previewImage({
      urls: urls,
      current: currentIndex >= 0 ? urls[currentIndex] : url,
      fail: (err) => {
        console.error('预览图片失败:', err)
        wx.showModal({
          title: '预览失败',
          content: '图片可能已过期或无法访问。\n\n建议：\n1. 检查网络连接\n2. 重新生成插画',
          showCancel: false
        })
      }
    })
  },
  
  // 图片加载错误处理
  onImageError(e) {
    console.error('图片加载失败:', e)
    const imageId = e.currentTarget.dataset.id
    const image = this.data.work && this.data.work.images ? this.data.work.images.find(img => img.id === imageId) : null
    
    if (image) {
      // 标记图片加载失败
      const images = this.data.work.images.map(img => {
        if (img.id === imageId) {
          return { ...img, _loadError: true }
        }
        return img
      })
      this.setData({
        'work.images': images
      })
      
      if (image.content) {
        // 检查是否是URL格式（不是base64）
        const isUrl = typeof image.content === 'string' && 
                      (image.content.startsWith('http://') || image.content.startsWith('https://'))
        
        if (isUrl) {
          // 检查是否是OSS域名
          const isOSSDomain = image.content.includes('oss-cn-') || image.content.includes('aliyuncs.com')
          
          if (isOSSDomain) {
            // OSS URL可能已过期，提供修复选项
            wx.showModal({
              title: '图片加载失败',
              content: '图片链接可能已过期（签名过期）或域名未配置白名单。\n\n是否尝试重新下载并保存？',
              success: async (res) => {
                if (res.confirm) {
                  await this.reDownloadImage(image)
                } else {
                  // 显示详细提示
                  wx.showModal({
                    title: '解决方案',
                    content: '1. 删除该插画，使用"生成插画"功能重新生成（会自动保存为base64）\n2. 在微信公众平台配置域名白名单：\n   dashscope-result-*.oss-cn-*.aliyuncs.com',
                    showCancel: false,
                    confirmText: '我知道了'
                  })
                }
              }
            })
          } else {
            // 其他URL，也尝试重新下载
            wx.showModal({
              title: '图片加载失败',
              content: '图片链接可能已失效，是否尝试重新下载并保存？',
              success: async (res) => {
                if (res.confirm) {
                  await this.reDownloadImage(image)
                }
              }
            })
          }
        } else {
          // base64格式，可能是其他问题
          common.showError('图片加载失败，请刷新页面重试')
        }
      }
    }
  },
  
  // 重新下载图片并转换为base64
  async reDownloadImage(image) {
    if (!image.content || typeof image.content !== 'string') {
      common.showError('图片数据无效')
      return
    }
    
    const isUrl = image.content.startsWith('http://') || image.content.startsWith('https://')
    if (!isUrl) {
      common.showError('该图片不是URL格式，无法重新下载')
      return
    }
    
    common.showLoading('正在重新下载图片...')
    
    try {
      const imageResponse = await new Promise((resolve, reject) => {
        wx.request({
          url: image.content,
          method: 'GET',
          responseType: 'arraybuffer',
          timeout: 30000,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res)
            } else if (res.statusCode === 403) {
              reject(new Error('图片链接已过期（403），无法重新下载'))
            } else {
              reject(new Error(`下载失败: HTTP ${res.statusCode}`))
            }
          },
          fail: (err) => {
            if (err.errMsg && err.errMsg.includes('403')) {
              reject(new Error('图片链接已过期（403）'))
            } else {
              reject(new Error('下载失败：' + (err.errMsg || '未知错误')))
            }
          }
        })
      })
      
      const base64 = wx.arrayBufferToBase64(imageResponse.data)
      const base64Data = `data:image/png;base64,${base64}`
      
      // 更新图片数据
      const updatedImage = {
        ...image,
        content: base64Data
      }
      
      const saved = storage.saveWork(updatedImage)
      if (saved) {
        common.hideLoading()
        common.showSuccess('图片已重新保存为base64格式')
        // 重新加载作品数据，清除错误标记
        this.loadWork(this.data.id)
      } else {
        common.hideLoading()
        common.showError('保存失败，请重试')
      }
    } catch (error) {
      console.error('重新下载图片失败:', error)
      common.hideLoading()
      
      if (error.message && error.message.includes('403')) {
        wx.showModal({
          title: '图片已过期',
          content: '图片链接已过期，无法重新下载。\n\n建议：\n1. 删除该插画\n2. 使用"生成插画"功能重新生成（会自动保存为base64格式，不会过期）',
          showCancel: false,
          confirmText: '我知道了'
        })
      } else {
        common.showError('重新下载失败：' + error.message)
      }
    }
  },
  
  // 编辑插画描述
  editImageDescription(e) {
    const id = e.currentTarget.dataset.id
    const image = this.data.work.images.find(img => img.id === id)
    if (!image) {
      common.showError('插画不存在')
      return
    }
    
    const currentDescription = image.description || image.title || ''
    
    wx.showModal({
      title: '编辑插画描述',
      editable: true,
      placeholderText: '请输入插画描述（用于重新生成时参考）',
      content: currentDescription,
      success: (res) => {
        if (res.confirm && res.content !== undefined) {
          const newDescription = res.content.trim()
          
          // 更新插画描述
          const updatedImage = {
            ...image,
            description: newDescription,
            title: newDescription.length > 30 ? newDescription.substring(0, 30) : newDescription
          }
          
          try {
            const saved = storage.saveWork(updatedImage)
            if (saved) {
              common.showSuccess('修改成功')
              // 重新加载作品数据
              this.loadWork(this.data.id)
            } else {
              common.showError('修改失败，请重试')
            }
          } catch (error) {
            console.error('更新插画描述失败:', error)
            common.showError('修改失败：' + (error.message || '未知错误'))
          }
        }
      }
    })
  },

  createStory() {
    const id = this.data.id
    wx.navigateTo({ url: `/pages/story/index?masterId=${id}` })
  },
  openStory(e) {
    const id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: `/pages/story/index?id=${id}` })
  },
  
  // 导出故事
  exportStory(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({ url: `/pages/export/index?storyId=${id}` })
    }
  },

  // 创建视频
  createVideo() {
    const { id } = this.data
    if (!id) {
      common.showError('缺少作品ID')
      return
    }

    // 检查是否有故事
    const work = this.data.work
    if (!work || !work.stories || work.stories.length === 0) {
      common.showError('请先创建故事')
      return
    }

    // 跳转到视频创作页面
    const storyId = work.stories[0].id // 默认选择第一个故事
    wx.navigateTo({
      url: `/pages/video/index?workId=${id}&storyId=${storyId}`
    })
  },

  // 删除单个子作品（角色 / 世界观 / 对话 / 插画 / 视频）
  deleteChildWork(e) {
    const { id, type } = e.currentTarget.dataset
    if (!id) {
      common.showError('删除失败：未获取到子项ID')
      return
    }

    const typeLabelMap = {
      character: '角色',
      worldview: '世界观',
      dialog: '对话',
      image: '插画',
      story: '故事',
      video: '视频'
    }
    const label = typeLabelMap[type] || '内容'

    wx.showModal({
      title: `删除${label}`,
      content: `确定要删除这个${label}吗？`,
      success: (res) => {
        if (!res.confirm) return

        // 先获取作品数据，以便删除对应的角色/世界观数据
        const work = storage.getWork(id)
        let characterIdToDelete = null
        let worldviewIdToDelete = null
        
        if (work) {
          if (type === 'character') {
            // 获取角色ID
            if (work.characterId) {
              characterIdToDelete = work.characterId
            } else if (work.content && work.content.id) {
              characterIdToDelete = work.content.id
            }
          } else if (type === 'worldview') {
            // 获取世界观ID
            if (work.content && work.content.id) {
              worldviewIdToDelete = work.content.id
            }
          }
        }

        // 删除 WORKS 中的数据
        const ok = storage.deleteWork(id)
        if (ok) {
          // 同时删除对应的角色/世界观数据
          if (characterIdToDelete) {
            storage.deleteCharacter(characterIdToDelete)
          }
          if (worldviewIdToDelete) {
            storage.deleteWorldview(worldviewIdToDelete)
          }
          
          common.showSuccess('删除成功')
          // 重新加载当前作品的数据
          if (this.data.id) {
            this.loadWork(this.data.id)
          }
        } else {
          common.showError('删除失败')
        }
      }
    })
  }
})

