/**
 * 通用工具函数
 */

/**
 * 格式化日期
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm') {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
}

/**
 * 显示加载提示
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示成功提示
 */
function showSuccess(title) {
  wx.showToast({
    title,
    icon: 'success',
    duration: 2000
  })
}

/**
 * 显示错误提示
 */
function showError(title) {
  wx.showToast({
    title,
    icon: 'none',
    duration: 2000
  })
}

/**
 * 图片转Base64
 */
function imageToBase64(imagePath) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: imagePath,
      encoding: 'base64',
      success: res => {
        resolve('data:image/png;base64,' + res.data)
      },
      fail: reject
    })
  })
}

/**
 * 保存图片到相册
 */
function saveImageToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: err => {
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '提示',
            content: '需要您授权保存相册权限',
            success: res => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        }
        reject(err)
      }
    })
  })
}

/**
 * 导出图片（生成分享图）
 */
function exportImage(canvasId, width, height) {
  return new Promise((resolve, reject) => {
    const ctx = wx.createCanvasContext(canvasId)
    ctx.draw(false, () => {
      wx.canvasToTempFilePath({
        canvasId,
        width,
        height,
        destWidth: width,
        destHeight: height,
        success: resolve,
        fail: reject
      })
    })
  })
}

module.exports = {
  formatDate,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  imageToBase64,
  saveImageToAlbum,
  exportImage
}

