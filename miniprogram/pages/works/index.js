// pages/works/index.js
const storage = require('../../utils/storage')
const common = require('../../utils/common')

Page({
  data: {
    works: [],
    filteredWorks: [],
    filterType: 'all'
  },

  onLoad() {
    this.loadWorks()
  },

  onShow() {
    // 每次显示时刷新作品列表
    this.loadWorks()
  },

  // 加载作品列表（仅主作品，并聚合统计）
  loadWorks() {
    const masters = storage.getAggregatedWorks()
    // 过滤掉临时聚合ID（以m_开头的），只显示真实的主作品
    const realMasters = masters.filter(m => !m.id.startsWith('m_'))
    
    const formattedWorks = realMasters.map(m => ({
      ...m,
      updateTime: m.updateTime ? common.formatDate(m.updateTime) : '',
      createTime: m.createTime ? common.formatDate(m.createTime) : '',
      stats: {
        character: (m.characters || []).length,
        worldview: (m.worldviews || []).length,
        dialog: (m.dialogs || []).length,
        image: (m.images || []).length,
        story: (m.stories || []).length
      }
    }))
    this.setData({
      works: formattedWorks,
      filteredWorks: formattedWorks
    })
  },

  // （移除类型筛选，保留函数兼容但不做筛选）
  setFilter() {},

  // 查看作品（进入作品详情页）
  viewWork(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/works/detail/index?id=${id}` })
  },

  // 旧的详情弹窗保留（不再使用）
  showWorkDetail(id) {
    const work = storage.getWork(id)
    if (!work) {
      common.showError('作品不存在')
      return
    }

    let content = ''
    if (work.type === 'image') {
      content = work.content // 图片URL
    } else {
      content = typeof work.content === 'string' ? work.content : JSON.stringify(work.content, null, 2)
    }

    wx.showModal({
      title: work.title || '作品详情',
      content: work.type === 'image' ? '[图片]' : content.substring(0, 500) + (content.length > 500 ? '...' : ''),
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 删除作品
  deleteWork(e) {
    console.log('deleteWork 被调用', e)
    console.log('dataset:', e.currentTarget.dataset)
    const id = e.currentTarget.dataset.id
    
    if (!id) {
      console.error('删除失败：未获取到作品ID')
      common.showError('删除失败：未获取到作品ID')
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个作品吗？删除后无法恢复。',
      success: (res) => {
        if (res.confirm) {
          let success = false
          let deletedCount = 0
          try {
            const allWorks = storage.getWorks()
            const idsToDelete = []

            // 检查是否是真实主作品
            const masterReal = allWorks.find(w => w.id === id && w.type === 'work')
            
            if (masterReal) {
              // 情况1：真实主作品 - 删除所有子项和主作品本身
              console.log('删除真实主作品:', id)
              allWorks.forEach(w => {
                if (w.workId === id) {
                  idsToDelete.push(w.id)
                }
              })
              idsToDelete.push(id) // 最后删除主作品
            } else if (id.startsWith('m_')) {
              // 情况2：临时聚合ID - 删除所有没有workId的子项
              console.log('删除临时聚合ID:', id)
              allWorks.forEach(w => {
                // 删除所有没有workId的子项（它们都属于这个临时聚合）
                if (!w.workId && ['character', 'worldview', 'dialog', 'image', 'story', 'dialog_template'].includes(w.type)) {
                  idsToDelete.push(w.id)
                }
              })
            } else {
              // 情况3：回退方案 - 从聚合数据中查找
              console.log('回退方案：从聚合数据查找')
              const agg = this.data.filteredWorks.find(w => w.id === id)
              if (agg) {
                // 收集所有子项的ID
                const pickId = (item) => item && item.id
                ;(agg.characters || []).forEach(it => { const i = pickId(it); if (i) idsToDelete.push(i) })
                ;(agg.worldviews || []).forEach(it => { const i = pickId(it); if (i) idsToDelete.push(i) })
                ;(agg.dialogs || []).forEach(it => { const i = pickId(it); if (i) idsToDelete.push(i) })
                ;(agg.images || []).forEach(it => { const i = pickId(it); if (i) idsToDelete.push(i) })
                ;(agg.stories || []).forEach(it => { const i = pickId(it); if (i) idsToDelete.push(i) })
                
                // 如果是真实主作品，也要删除主作品本身
                const masterWork = allWorks.find(w => w.id === id && w.type === 'work')
                if (masterWork) {
                  idsToDelete.push(id)
                }
              } else {
                // 最后回退：直接删除（如果存在）
                const work = allWorks.find(w => w.id === id)
                if (work) {
                  idsToDelete.push(id)
                  // 如果是子项，还要删除关联的其他子项
                  if (work.workId) {
                    allWorks.forEach(w => {
                      if (w.workId === work.workId) idsToDelete.push(w.id)
                    })
                    // 删除主作品
                    const master = allWorks.find(w => w.id === work.workId && w.type === 'work')
                    if (master) {
                      idsToDelete.push(work.workId)
                    }
                  }
                }
              }
            }

            // 检查是否有要删除的内容
            if (idsToDelete.length === 0) {
              console.warn('未找到要删除的内容，ID:', id)
              common.showError('未找到要删除的内容')
              return
            }

            console.log('准备删除的ID列表:', idsToDelete)

            // 逐一删除
            idsToDelete.forEach(delId => {
              const ok = storage.deleteWork(delId)
              if (ok) {
                deletedCount++
                console.log('成功删除:', delId)
              } else {
                console.warn('删除失败:', delId)
              }
            })
            
            // 只有成功删除了至少一个项目才算成功
            success = deletedCount > 0
            console.log('删除结果 - 成功:', success, '删除数量:', deletedCount)
          } catch (err) {
            console.error('批量删除异常:', err)
            success = false
          }

          if (success) {
            common.showSuccess(`删除成功（已删除${deletedCount}项）`)
            // 立即刷新，确保数据同步
            this.loadWorks()
          } else {
            common.showError('删除失败，请重试')
          }
        }
      }
    })
  }
  ,

  // 合并散装子项到指定主作品
  mergeOrphansToMaster() {
    const orphans = storage.listOrphanWorks()
    if (!orphans || orphans.length === 0) {
      common.showSuccess('没有可合并的散装子项')
      return
    }
    const masters = storage.getAggregatedWorks()
    const names = (masters || []).map(w => w.title || '未命名作品')
    const choices = [...names, '➕ 新建作品']
    wx.showActionSheet({
      itemList: choices,
      success: (res) => {
        const idx = res.tapIndex
        let masterId = masters[idx]?.id
        if (idx === choices.length - 1) {
          const master = storage.createMasterWork('未命名作品')
          masterId = master.id
        }
        const ids = orphans.map(o => o.id)
        const ok = storage.reassignWorkIds(ids, masterId)
        if (ok) {
          common.showSuccess('合并完成')
          this.loadWorks()
        } else {
          common.showError('合并失败')
        }
      }
    })
  }
})
