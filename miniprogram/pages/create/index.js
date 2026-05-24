// pages/create/index.js
const storage = require('../../utils/storage')
const common = require('../../utils/common')

Page({
  data: {
    recentWorks: []  // 最近的作品列表
  },

  onLoad(options) {
    console.log('创作页面 onLoad 执行')
  },

  onShow() {
    // 每次显示时刷新最近作品列表
    this.loadRecentWorks()
  },

  // 加载最近的作品
  loadRecentWorks() {
    const works = storage.getAggregatedWorks()
    // 取最近5个作品
    const recent = works.slice(0, 5).map(w => ({
      ...w,
      updateTime: w.updateTime ? common.formatDate(w.updateTime) : '',
      stats: {
        character: (w.characters || []).length,
        worldview: (w.worldviews || []).length,
        dialog: (w.dialogs || []).length,
        image: (w.images || []).length,
        story: (w.stories || []).length
      }
    }))
    this.setData({ recentWorks: recent })
  },

  // 流程A：从零开始新故事
  createNewStory() {
    // 先创建新作品，然后跳转到作品详情页
    const master = storage.createMasterWork('未命名作品')
    wx.navigateTo({
      url: `/pages/works/detail/index?id=${master.id}`
    })
  },

  // 流程B：继续创作某个作品
  continueWork(e) {
    const { id } = e.currentTarget.dataset
    if (id) {
      wx.navigateTo({
        url: `/pages/works/detail/index?id=${id}`
      })
    }
  },

  // 直接跳转到故事创作页
  navigateToStory() {
    wx.navigateTo({
      url: '/pages/story/index'
    })
  },

  // 跳转到人物角色定义页面
  navigateToCharacter() {
    wx.navigateTo({
      url: '/pages/character/index'
    })
  },

  // 跳转到世界观构建页面
  navigateToWorld() {
    wx.navigateTo({
      url: '/pages/world/index'
    })
  },

  // 跳转到对话生成页面
  navigateToDialog() {
    wx.navigateTo({
      url: '/pages/dialog/index'
    })
  },

  // 跳转到插画生成页面
  navigateToImage() {
    wx.navigateTo({
      url: '/pages/image/index'
    })
  },

  // 跳转到视频创作页面
  navigateToVideo() {
    wx.navigateTo({
      url: '/pages/video/index'
    })
  },

  // 跳转到我的作品
  navigateToWorks() {
    wx.switchTab({
      url: '/pages/works/index'
    })
  }
})
