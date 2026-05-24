// pages/me/index.js
const storage = require('../../utils/storage')
const common = require('../../utils/common')

Page({
  data: {
    userInfo: null,
    stats: {
      characters: 0,
      worldviews: 0,
      works: 0
    }
  },

  onLoad() {
    this.loadUserInfo()
    this.loadStats()
  },

  onShow() {
    this.loadStats()
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = storage.getUserInfo()
    this.setData({ userInfo })
  },

  // 加载统计信息
  loadStats() {
    try {
      const allWorks = storage.getAggregatedWorks()
      // 过滤掉临时聚合，只统计真实主作品
      const realWorks = allWorks.filter(m => !m.id.startsWith('m_') || m.type === 'work')
      
      // 统计所有真实主作品中的角色总数
      const characters = realWorks.reduce((sum, work) => sum + (work.characters?.length || 0), 0)
      
      // 统计所有真实主作品中的世界观总数
      const worldviews = realWorks.reduce((sum, work) => sum + (work.worldviews?.length || 0), 0)
      
      const works = realWorks.length
      
      this.setData({
        stats: {
          characters,
          worldviews,
          works
        }
      })
    } catch (error) {
      console.error('加载统计信息失败:', error)
      // 使用默认值
      this.setData({
        stats: {
          characters: 0,
          worldviews: 0,
          works: 0
        }
      })
    }
  },

  // 微信登录
  login() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = {
          ...res.userInfo,
          openid: 'user_' + Date.now() // 实际应该从云函数获取
        }
        storage.saveUserInfo(userInfo)
        this.setData({ userInfo })
        common.showSuccess('登录成功')
      },
      fail: (err) => {
        console.error('登录失败', err)
        common.showError('登录失败')
      }
    })
  },

  // 跳转到API配置
  navigateToAPIConfig() {
    wx.navigateTo({
      url: '/pages/api-config/index'
    })
  },

  // 导出所有数据
  async navigateToExport() {
    wx.showModal({
      title: '导出数据',
      content: '是否导出所有作品数据？数据将以JSON格式导出到剪贴板。',
      success: async (res) => {
        if (res.confirm) {
          await this.exportAllData()
        }
      }
    })
  },
  
  // 导出所有数据
  async exportAllData() {
    try {
      common.showLoading('正在导出数据...')
      
      // 获取所有数据
      const characters = storage.getCharacters()
      const worldviews = storage.getWorldviews()
      const works = storage.getWorks()
      const aggregatedWorks = storage.getAggregatedWorks()
      
      // 构建导出数据
      const exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        summary: {
          characters: characters.length,
          worldviews: worldviews.length,
          works: aggregatedWorks.filter(m => !m.id.startsWith('m_') || m.type === 'work').length,
          totalItems: works.length
        },
        data: {
          characters: characters,
          worldviews: worldviews,
          works: works
        }
      }
      
      // 转换为JSON字符串
      const jsonString = JSON.stringify(exportData, null, 2)
      
      // 复制到剪贴板
      wx.setClipboardData({
        data: jsonString,
        success: () => {
          common.hideLoading()
          wx.showModal({
            title: '导出成功',
            content: `已导出${exportData.summary.totalItems}项数据到剪贴板。\n\n数据包括：\n- ${exportData.summary.characters}个角色\n- ${exportData.summary.worldviews}个世界观\n- ${exportData.summary.works}个作品`,
            showCancel: false,
            confirmText: '我知道了'
          })
        },
        fail: (err) => {
          console.error('复制到剪贴板失败:', err)
          common.hideLoading()
          common.showError('导出失败：无法复制到剪贴板')
        }
      })
    } catch (error) {
      console.error('导出数据失败:', error)
      common.hideLoading()
      common.showError('导出失败：' + (error.message || '未知错误'))
    }
  },
  
  // 批量修复URL格式的图片
  async fixAllImages() {
    wx.showModal({
      title: '修复图片',
      content: '将尝试重新下载所有URL格式的图片并转换为base64格式保存。\n\n此操作可能需要较长时间，且只能修复未过期的图片链接。',
      success: async (res) => {
        if (res.confirm) {
          await this.performFixImages()
        }
      }
    })
  },
  
  // 执行批量修复图片
  async performFixImages() {
    try {
      const allWorks = storage.getWorks()
      const imageWorks = allWorks.filter(w => w.type === 'image' && w.content && typeof w.content === 'string')
      
      // 筛选出URL格式的图片
      const urlImages = imageWorks.filter(img => {
        const content = img.content
        return content.startsWith('http://') || content.startsWith('https://')
      })
      
      if (urlImages.length === 0) {
        common.showSuccess('没有需要修复的图片（所有图片都是base64格式）')
        return
      }
      
      common.showLoading(`正在修复 ${urlImages.length} 张图片...`)
      
      let successCount = 0
      let failCount = 0
      const failedImages = []
      
      for (let i = 0; i < urlImages.length; i++) {
        const image = urlImages[i]
        try {
          // 尝试下载并转换
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
                  reject(new Error('链接已过期（403）'))
                } else {
                  reject(new Error(`HTTP ${res.statusCode}`))
                }
              },
              fail: (err) => {
                if (err.errMsg && err.errMsg.includes('403')) {
                  reject(new Error('链接已过期（403）'))
                } else {
                  reject(new Error(err.errMsg || '下载失败'))
                }
              }
            })
          })
          
          const base64 = wx.arrayBufferToBase64(imageResponse.data)
          const base64Data = `data:image/png;base64,${base64}`
          
          const updatedImage = {
            ...image,
            content: base64Data
          }
          
          storage.saveWork(updatedImage)
          successCount++
        } catch (error) {
          console.warn(`修复图片 ${image.id} 失败:`, error)
          failCount++
          failedImages.push({
            id: image.id,
            title: image.title || '未命名插画',
            error: error.message
          })
        }
        
        // 更新进度
        if ((i + 1) % 5 === 0 || i === urlImages.length - 1) {
          common.showLoading(`正在修复 ${i + 1}/${urlImages.length}...`)
        }
      }
      
      common.hideLoading()
      
      let resultMessage = `修复完成：\n成功：${successCount}张\n失败：${failCount}张`
      if (failCount > 0) {
        resultMessage += '\n\n失败的图片可能是链接已过期，需要删除后重新生成。'
      }
      
      wx.showModal({
        title: '修复完成',
        content: resultMessage,
        showCancel: false,
        confirmText: '我知道了'
      })
    } catch (error) {
      console.error('批量修复图片失败:', error)
      common.hideLoading()
      common.showError('修复失败：' + (error.message || '未知错误'))
    }
  },

  // 跳转到帮助中心
  navigateToHelp() {
    wx.showModal({
      title: '使用帮助',
      content: '1. 先创建角色和世界观\n2. 再生成对话和插画\n3. 所有作品会自动保存\n4. 可在"我的作品"中查看',
      showCancel: false
    })
  },

  // 跳转到关于我们
  navigateToAbout() {
    wx.showModal({
      title: '关于我们',
      content: '文绪绘境录 v1.0\n一站式创作辅助工具链\n支持角色、世界观、对话、插画生成',
      showCancel: false
    })
  }
})
