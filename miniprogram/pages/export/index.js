// pages/export/index.js
const storage = require('../../utils/storage')
const common = require('../../utils/common')

Page({
  data: {
    storyId: null,
    story: null,
    exportFormat: 'txt', // txt, image
    includeImages: true
  },

  onLoad(options) {
    if (options.storyId || options.id) {
      const storyId = options.storyId || options.id
      this.loadStory(storyId)
    }
  },

  loadStory(storyId) {
    const story = storage.getWork(storyId)
    if (!story || story.type !== 'story') {
      common.showError('故事不存在')
      return
    }
    
    // 加载关联的插画
    const allWorks = storage.getWorks()
    const images = allWorks.filter(w => 
      w.type === 'image' && 
      w.relatedStoryId === storyId
    ).sort((a, b) => (a.sceneIndex || 0) - (b.sceneIndex || 0))
    
    this.setData({
      storyId,
      story: {
        ...story,
        images
      }
    })
  },

  // 切换导出格式
  onFormatChange(e) {
    this.setData({ exportFormat: e.detail.value })
  },

  // 切换是否包含插画
  onIncludeImagesChange(e) {
    this.setData({ includeImages: e.detail.value })
  },

  // 导出为文本
  async exportAsText() {
    const { story, includeImages } = this.data
    if (!story) {
      common.showError('故事不存在')
      return
    }
    
    let text = `《${story.title || '未命名故事'}》\n\n`
    
    // 添加摘要
    if (story.summary || story.premise) {
      text += `${story.summary || story.premise || ''}\n\n`
      text += `---\n\n`
    }
    
    // 添加大纲
    if (story.outline && story.outline.length > 0) {
      text += `【故事大纲】\n\n`
      story.outline.forEach((item, idx) => {
        text += `${idx + 1}. ${item.title || '节点' + (idx + 1)}\n`
        if (item.description) {
          text += `${item.description}\n\n`
        }
      })
      text += `---\n\n`
    }
    
    // 添加正文
    if (story.content) {
      text += `【正文】\n\n${story.content}\n\n`
    }
    
    // 添加插画说明
    if (includeImages && story.images && story.images.length > 0) {
      text += `---\n\n【插画说明】\n\n`
      story.images.forEach((img, idx) => {
        text += `插图${idx + 1}：${img.description || img.title || '插画'}\n`
      })
    }
    
    // 添加元信息
    text += `\n---\n\n`
    text += `创作时间：${story.createTime ? common.formatDate(story.createTime) : '未知'}\n`
    if (story.updateTime) {
      text += `更新时间：${common.formatDate(story.updateTime)}\n`
    }
    
    // 复制到剪贴板
    wx.setClipboardData({
      data: text,
      success: () => {
        common.showSuccess('已复制到剪贴板')
      },
      fail: () => {
        common.showError('复制失败')
      }
    })
  },

  // 导出为图片（长图）
  async exportAsImage() {
    common.showError('图片导出功能开发中，请先使用文本导出')
    // TODO: 使用canvas将故事内容渲染为长图
  },

  // 导出
  async exportStory() {
    const { exportFormat } = this.data
    
    if (exportFormat === 'txt') {
      await this.exportAsText()
    } else if (exportFormat === 'image') {
      await this.exportAsImage()
    }
  }
})






