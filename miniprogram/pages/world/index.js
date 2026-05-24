// pages/world/index.js
const api = require('../../utils/api')
const storage = require('../../utils/storage')
const common = require('../../utils/common')

Page({
  data: {
    inputText: '',
    loading: false,
    result: null,
    hasInput: false,
    editMode: false,          // 是否处于编辑模式
    editingField: null,       // 当前正在编辑的字段：era/geography/socialRules/conflicts/techLevel
    editingText: ''           // 当前编辑文本
  },

  onLoad(options) {
    console.log('世界观页面 onLoad', options)
    
    // 如果从其他页面传入世界观ID，加载已有世界观
    if (options.id) {
      this.loadWorldview(options.id)
    }
    // 如果传入worldviewId，加载世界观
    else if (options.worldviewId) {
      this.loadWorldview(options.worldviewId)
    }
    // 如果传入作品ID，从作品中加载世界观内容
    else if (options.workId) {
      this.loadWorldviewFromWork(options.workId)
    }
    // 如果从模板库传入模板内容，自动填充
    if (options.template) {
      const text = decodeURIComponent(options.template)
      this.setData({
        inputText: text,
        hasInput: !!text && !!text.trim()
      })
    }
  },

  onInputChange(e) {
    const value = e.detail.value
    this.setData({
      inputText: value,
      hasInput: !!value && !!value.trim()
    })
  },

  useExample() {
    this.setData({
      inputText: '仙侠世界观，修仙体系，分为炼气、筑基、金丹等境界，灵气是核心资源',
      hasInput: true
    })
  },

  useExample2() {
    this.setData({
      inputText: '赛博朋克未来世界，科技高度发达，AI与人类共存，存在虚拟现实技术',
      hasInput: true
    })
  },

  async generateWorldview() {
    const { inputText } = this.data
    console.log('generateWorldview 被调用', { inputText, inputTextLength: inputText.length })
    
    if (!inputText || !inputText.trim()) {
      common.showError('请输入世界观描述')
      return
    }

    this.setData({ loading: true })
    common.showLoading('AI生成中...')

    try {
      console.log('开始调用API生成世界观')
      const result = await api.generateWorldview(inputText)
      console.log('API返回结果:', result)
      
      let parsedResult
      if (typeof result === 'string') {
        try {
          const cleaned = this.cleanJSONText(result)
          parsedResult = JSON.parse(cleaned)
        } catch (e) {
          console.log('JSON解析失败，使用文本解析', e)
          parsedResult = this.parseTextToWorldview(result)
        }
      } else {
        parsedResult = result
      }

      this.setData({
        result: parsedResult,
        loading: false
      })
      common.hideLoading()
      common.showSuccess('生成成功')
    } catch (error) {
      console.error('生成世界观失败', error)
      common.hideLoading()
      // 即使API失败，也显示一个模拟结果，方便测试
      const mockResult = this.parseTextToWorldview(inputText)
      this.setData({
        result: mockResult,
        loading: false
      })
      // 不显示错误，因为已经自动降级到模拟模式
      common.showSuccess('生成完成（模拟模式）')
    }
  },

  parseTextToWorldview(text) {
    return {
      era: text,
      geography: '',
      socialRules: '',
      conflicts: '',
      techLevel: ''
    }
  },

  // 清理包含 ```json 代码块标记的文本，提取纯 JSON
  cleanJSONText(text) {
    if (!text || typeof text !== 'string') return text
    let str = text.trim()
    // 去掉起始的 ```json 或 ```
    if (str.startsWith('```')) {
      // 去掉第一行到换行
      const firstLineEnd = str.indexOf('\n')
      if (firstLineEnd !== -1) {
        str = str.substring(firstLineEnd + 1)
      }
    }
    // 去掉结尾的 ```
    if (str.endsWith('```')) {
      str = str.substring(0, str.length - 3)
    }
    return str.trim()
  },

  // 切换编辑模式
  editResult() {
    this.setData({
      editMode: !this.data.editMode,
      editingField: null,
      editingText: ''
    })
  },

  // 开始编辑某个字段
  startEdit(e) {
    const field = e.currentTarget.dataset.field
    const text = (this.data.result && this.data.result[field]) || ''
    this.setData({
      editMode: true,
      editingField: field,
      editingText: text
    })
  },

  // 实时更新编辑文本
  updateFieldContent(e) {
    const value = e.detail.value
    this.setData({ editingText: value })
  },

  // 取消编辑（恢复原文，不保存）
  cancelEdit() {
    this.setData({
      editingField: null,
      editingText: ''
    })
  },

  // 确认保存字段编辑
  confirmFieldEdit(e) {
    const field = e.currentTarget.dataset.field || this.data.editingField
    const { result, editingText } = this.data
    if (!field) return

    const newResult = { ...(result || {}) }
    newResult[field] = editingText

    // 更新数据与收起编辑框
    this.setData({
      result: newResult,
      editingField: null,
      editingText: ''
    })

    // 若已有ID则立即落盘，并同步作品
    if (newResult && newResult.id) {
      const worldview = {
        ...newResult,
        originalInput: this.data.inputText,
        type: 'worldview',
        id: newResult.id,
        updateTime: new Date().toISOString()
      }
      storage.saveWorldview(worldview)

      // 同步作品
      if (newResult.workId) {
        const work = storage.getWork(newResult.workId)
        if (work) {
          storage.saveWork({
            ...work,
            content: newResult,
            updateTime: new Date().toISOString()
          })
        }
      } else {
        const works = storage.getWorks && storage.getWorks()
        if (works && works.length) {
          const work = works.find(w => w.worldviewId === newResult.id || (w.type === 'worldview' && w.content))
          if (work) {
            storage.saveWork({
              ...work,
              content: newResult,
              updateTime: new Date().toISOString()
            })
          }
        }
      }
    }

    common.showSuccess('修改已保存')
  },

  regenerate() {
    this.setData({ result: null })
  },

  async saveWorldview() {
    const { result, inputText } = this.data
    if (!result) {
      common.showError('没有可保存的内容')
      return
    }

    const worldview = {
      ...result,
      originalInput: inputText,
      type: 'worldview'
    }

    const saved = storage.saveWorldview(worldview)
    if (saved) {
      // 确保主作品存在，并将子项归属到主作品（若无，则引导选择/新建）
      const masterId = await this.ensureMasterForSave(result.workId, null)
      const master = storage.ensureMasterWork(masterId, '未命名作品')

      // 使用与各页展示一致的标题策略：优先 era / originalInput / geography
      let title = '世界观设定'
      if (result && typeof result.era === 'string' && result.era.trim()) {
        const eraText = result.era.trim()
        title = eraText.length > 20 ? eraText.substring(0, 20) + '...' : eraText
      } else if (result && typeof result.originalInput === 'string' && result.originalInput.trim()) {
        const input = result.originalInput.trim()
        title = input.length > 20 ? input.substring(0, 20) + '...' : input
      } else if (result && typeof result.geography === 'string' && result.geography.trim()) {
        const geo = result.geography.trim()
        title = geo.length > 20 ? geo.substring(0, 20) + '...' : geo
      }

      storage.saveWork({
        type: 'worldview',
        title,
        content: result,
        worldviewId: saved.id,
        workId: master.id,
        originalInput: inputText // 保存原始输入，方便后续编辑
      })
      common.showSuccess('保存成功')
    } else {
      common.showError('保存失败')
    }
  },

  // 选择主作品：优先使用传入ID，否则弹出作品选择器/新建
  async ensureMasterForSave(preferId, fallbackId) {
    let masterId = preferId || fallbackId
    if (masterId) return masterId

    const works = storage.getAggregatedWorks()
    const names = (works || []).map(w => w.title || '未命名作品')
    const choices = [...names, '➕ 新建作品']

    return new Promise(resolve => {
      wx.showActionSheet({
        itemList: choices,
        success: (res) => {
          const idx = res.tapIndex
          if (idx === choices.length - 1) {
            wx.showModal({
              title: '新建作品',
              editable: true,
              placeholderText: '请输入作品名称',
              success: (r) => {
                const title = (r.confirm && r.content) ? r.content : '未命名作品'
                const master = storage.createMasterWork(title)
                resolve(master.id)
              },
              fail: () => resolve(null)
            })
          } else {
            resolve(works[idx]?.id || null)
          }
        },
        fail: () => resolve(null)
      })
    })
  },

  linkToDialog() {
    const { result } = this.data
    if (!result) return
    
    this.saveWorldview()
    
    wx.navigateTo({
      url: `/pages/dialog/index?worldviewId=${result.id || ''}`
    })
  },

  linkToImage() {
    const { result } = this.data
    if (!result) return
    
    this.saveWorldview()
    
    wx.navigateTo({
      url: `/pages/image/index?worldviewId=${result.id || ''}`
    })
  },

  backToInput() {
    // 返回到首页工作台（tabBar：/pages/create/index）
    const url = '/pages/create/index'
    wx.switchTab({
      url,
      fail: () => {
        wx.reLaunch({ url })
      }
    })
  },

  // 加载已有世界观
  loadWorldview(id) {
    console.log('加载世界观，ID:', id)
    const worldview = storage.getWorldview(id)
    console.log('找到的世界观数据:', worldview)
    
    if (worldview) {
      this.setData({
        result: worldview,
        inputText: worldview.originalInput || '',
        hasInput: !!(worldview.originalInput && worldview.originalInput.trim && worldview.originalInput.trim())
      })
      console.log('世界观加载成功')
    } else {
      console.warn('未找到世界观，ID:', id)
      common.showError('世界观不存在')
    }
  },

  // 从作品中加载世界观内容
  loadWorldviewFromWork(workId) {
    console.log('从作品加载世界观，作品ID:', workId)
    const work = storage.getWork(workId)
    console.log('找到的作品数据:', work)
    
    if (!work) {
      common.showError('作品不存在')
      return
    }
    
    // 如果作品中有worldviewId，优先使用
    if (work.worldviewId) {
      this.loadWorldview(work.worldviewId)
      return
    }
    
    // 如果作品中有content，直接使用
    if (work.content) {
      let worldviewData = work.content
      
      // 如果content是字符串，尝试解析为JSON
      if (typeof worldviewData === 'string') {
        try {
          worldviewData = JSON.parse(worldviewData)
        } catch (e) {
          console.warn('无法解析作品内容为JSON', e)
        }
      }
      
      // 确保有基本结构
      if (worldviewData && (worldviewData.era || worldviewData.geography)) {
        this.setData({
          result: worldviewData,
          inputText: work.originalInput || worldviewData.originalInput || '',
          hasInput: !!((work.originalInput || worldviewData.originalInput || '').trim && (work.originalInput || worldviewData.originalInput || '').trim())
        })
        console.log('从作品内容加载世界观成功')
      } else {
        common.showError('作品数据格式不正确')
      }
    } else {
      common.showError('作品中没有世界观数据')
    }
  }
})
