// pages/video/index.js
const storage = require('../../utils/storage')
const common = require('../../utils/common')
const api = require('../../utils/api')

Page({
  data: {
    workId: '',           // 选中的作品ID
    work: null,           // 作品数据
    story: null,          // 选中的故事
    images: [],          // 插画列表
    characters: [],      // 角色列表
    worldview: null,     // 世界观
    videoPrompt: '',     // 生成的视频提示词
    generating: false,   // 是否正在生成
    generatedVideo: null, // 生成的视频URL
    videoList: []        // 该作品的所有视频列表
  },

  onLoad(options) {
    const { workId, storyId } = options || {}
    if (workId) {
      this.setData({ workId })
      this.loadWork(workId, storyId)
    } else {
      // 如果没有传入workId，显示作品选择界面
      this.showWorkSelector()
    }
  },

  onShow() {
    // 每次显示时刷新数据
    if (this.data.workId) {
      this.loadWork(this.data.workId)
    }
  },

  // 加载作品数据
  loadWork(workId, storyId) {
    const works = storage.getAggregatedWorks()
    const work = works.find(w => w.id === workId)
    if (!work) {
      common.showError('作品不存在')
      return
    }

    // 加载故事、插画、角色、世界观
    const story = storyId 
      ? (work.stories || []).find(s => s.id === storyId)
      : (work.stories || [])[0] // 默认选择第一个故事

    const images = work.images || []
    const characters = work.characters || []
    const worldview = (work.worldviews || [])[0] || null

    // 加载该作品已生成的视频
    const allWorks = storage.getWorks()
    const videos = allWorks.filter(w => 
      w.type === 'video' && w.workId === workId
    )

    this.setData({
      work,
      story,
      images,
      characters,
      worldview,
      videoList: videos
    })

    // 自动生成视频提示词
    if (story) {
      this.generateVideoPrompt()
    }
  },

  // 显示作品选择器
  showWorkSelector() {
    const works = storage.getAggregatedWorks()
    const workNames = works
      .filter(w => !w.id.startsWith('m_')) // 过滤临时聚合ID
      .filter(w => (w.stories || []).length > 0) // 只显示有故事的作品
      .map(w => w.title || '未命名作品')

    if (workNames.length === 0) {
      common.showError('没有可用的作品，请先创建故事')
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    wx.showActionSheet({
      itemList: workNames,
      success: (res) => {
        const selectedWork = works
          .filter(w => !w.id.startsWith('m_'))
          .filter(w => (w.stories || []).length > 0)[res.tapIndex]
        
        if (selectedWork) {
          this.setData({ workId: selectedWork.id })
          this.loadWork(selectedWork.id)
        }
      },
      fail: () => {
        wx.navigateBack()
      }
    })
  },

  // 选择故事
  selectStory(e) {
    const storyId = e.currentTarget.dataset.id
    if (storyId && this.data.work) {
      const story = (this.data.work.stories || []).find(s => s.id === storyId)
      if (story) {
        this.setData({ story })
        this.generateVideoPrompt()
      }
    }
  },

  // 生成视频提示词
  async generateVideoPrompt() {
    const { story, images, characters, worldview } = this.data
    if (!story || !story.content) {
      common.showError('请先选择包含故事内容的作品')
      return
    }

    common.showLoading('正在生成视频提示词...')

    try {
      // 调用API生成视频提示词
      const prompt = await api.generateVideoPrompt({
        story: story.content,
        storyTitle: story.title,
        outline: story.outline || [],
        images: images.map(img => ({
          description: img.description || img.title || '',
          content: img.content
        })),
        characters: characters.map(char => ({
          name: (char.basicInfo && char.basicInfo.name) || char.name || '',
          description: char.personality || '',
          appearance: char.appearance || {}
        })),
        worldview: worldview ? {
          era: (worldview.content && worldview.content.era) || worldview.era || '',
          geography: (worldview.content && worldview.content.geography) || worldview.geography || '',
          style: (worldview.content && worldview.content.era) || worldview.era || ''
        } : null
      })

      this.setData({ videoPrompt: prompt })
      common.hideLoading()
      common.showSuccess('提示词生成成功')
    } catch (error) {
      console.error('生成视频提示词失败:', error)
      common.hideLoading()
      common.showError('生成提示词失败：' + (error.message || '未知错误'))
    }
  },

  // 生成视频
  async generateVideo() {
    const { workId, story, images, videoPrompt } = this.data

    if (!videoPrompt) {
      common.showError('请先生成视频提示词')
      return
    }

    if (!workId) {
      common.showError('请先选择作品')
      return
    }

    wx.showModal({
      title: '生成视频',
      content: '视频生成可能需要较长时间（1-3分钟），是否继续？',
      success: async (res) => {
        if (res.confirm) {
          await this.performGenerateVideo()
        }
      }
    })
  },

  // 执行视频生成
  async performGenerateVideo() {
    const { workId, story, images, videoPrompt } = this.data

    this.setData({ generating: true })
    common.showLoading('正在生成视频，请耐心等待...')

    try {
      // 选择第一张插画作为首帧（如果有）
      const firstImage = images.length > 0 && images[0].content 
        ? images[0].content 
        : null

      // 调用视频生成API
      const videoUrl = await api.generateVideo({
        prompt: videoPrompt,
        firstFrame: firstImage, // 使用第一张插画作为首帧
        duration: 5, // 视频时长（秒）
        resolution: '720p' // 分辨率
      })

      // 保存视频到作品
      const videoWork = {
        type: 'video',
        title: `${story.title || '未命名故事'} - 视频`,
        content: videoUrl, // 视频URL
        description: videoPrompt,
        workId: workId,
        relatedStoryId: story.id,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }

      const saved = storage.saveWork(videoWork)
      if (saved) {
        this.setData({
          generating: false,
          generatedVideo: videoUrl,
          videoList: [...this.data.videoList, saved]
        })
        common.hideLoading()
        common.showSuccess('视频生成成功')
      } else {
        throw new Error('保存视频失败')
      }
    } catch (error) {
      console.error('生成视频失败:', error)
      this.setData({ generating: false })
      common.hideLoading()
      
      // 提供友好的错误提示
      if (error.message && error.message.includes('暂未开放')) {
        wx.showModal({
          title: '功能提示',
          content: '视频生成功能需要等待API更新。\n\n目前可以：\n1. 使用视频提示词在其他平台生成视频\n2. 等待API更新后使用',
          showCancel: false,
          confirmText: '我知道了'
        })
      } else {
        common.showError('生成视频失败：' + (error.message || '未知错误'))
      }
    }
  },

  // 播放视频
  playVideo(e) {
    const { url } = e.currentTarget.dataset
    if (!url) {
      common.showError('视频链接无效')
      return
    }

    // 使用微信小程序的视频播放器
    wx.previewMedia({
      sources: [{
        url: url,
        type: 'video'
      }],
      current: 0
    })
  },

  // 视频播放事件
  onVideoPlay(e) {
    console.log('视频开始播放')
  },

  // 视频错误事件
  onVideoError(e) {
    console.error('视频播放错误:', e)
    common.showError('视频播放失败，请检查视频链接')
  },

  // 删除视频
  deleteVideo(e) {
    const { id } = e.currentTarget.dataset
    if (!id) {
      common.showError('删除失败：未获取到视频ID')
      return
    }

    wx.showModal({
      title: '删除视频',
      content: '确定要删除这个视频吗？',
      success: (res) => {
        if (res.confirm) {
          const ok = storage.deleteWork(id)
          if (ok) {
            common.showSuccess('删除成功')
            // 重新加载视频列表
            if (this.data.workId) {
              this.loadWork(this.data.workId)
            }
          } else {
            common.showError('删除失败')
          }
        }
      }
    })
  }
})

