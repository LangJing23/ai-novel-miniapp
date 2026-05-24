// pages/api-config/index.js
const storage = require('../../utils/storage')
const common = require('../../utils/common')

Page({
  data: {
    doubaoApiKey: '',
    imageApiKey: ''
  },

  onLoad() {
    this.loadConfig()
  },

  // 加载配置
  loadConfig() {
    const config = storage.getAPIConfig()
    if (config) {
      this.setData({
        doubaoApiKey: config.doubaoApiKey || '',
        imageApiKey: config.imageApiKey || ''
      })
    }
  },

  // 豆包API Key变化
  onDoubaoKeyChange(e) {
    this.setData({
      doubaoApiKey: e.detail.value
    })
  },

  // 插画API Key变化
  onImageKeyChange(e) {
    this.setData({
      imageApiKey: e.detail.value
    })
  },

  // 保存配置
  saveConfig() {
    const { doubaoApiKey, imageApiKey } = this.data
    
    const config = {
      doubaoApiKey,
      imageApiKey,
      updateTime: new Date().toISOString()
    }
    
    const success = storage.saveAPIConfig(config)
    if (success) {
      common.showSuccess('配置保存成功')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } else {
      common.showError('配置保存失败')
    }
  },

  // 打开豆包链接
  openDoubaoLink() {
    wx.showModal({
      title: '豆包开放平台',
      content: '请在浏览器中访问：https://open.doubao.com/',
      showCancel: false
    })
  }
})

