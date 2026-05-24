// 版本标记文件 - 用于确认代码已更新
// 如果看到这个文件被加载，说明代码已更新

console.log('========================================')
console.log('API模块版本检查')
console.log('版本: 2.0.1')
console.log('更新日期: ' + new Date().toISOString())
console.log('特性: 使用官方 AI API，不使用云函数')
console.log('========================================')

module.exports = {
  version: '2.0.1',
  date: new Date().toISOString()
}

