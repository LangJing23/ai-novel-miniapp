// pages/dialog-templates/index.js
const storage = require('../../utils/storage')
const common = require('../../utils/common')
const api = require('../../utils/api')

Page({
  data: {
    templates: [],
    filteredTemplates: [],
    currentCategory: 'all', // 'all', '情感', '冲突', '日常', '战斗', '其他'
    categories: ['全部', '情感', '冲突', '日常', '战斗', '其他']
  },

  onLoad() {
    this.loadTemplates()
  },

  onShow() {
    // 每次显示时刷新列表
    this.loadTemplates()
  },

  // 加载对话片段
  loadTemplates() {
    const allWorks = storage.getWorks()
    const templates = allWorks
      .filter(w => w.type === 'dialog_template')
      .map(t => ({
        ...t,
        createTime: t.createTime ? common.formatDate(t.createTime) : ''
      }))
      .sort((a, b) => {
        // 按更新时间倒序
        const timeA = new Date(a.updateTime || a.createTime || 0)
        const timeB = new Date(b.updateTime || b.createTime || 0)
        return timeB - timeA
      })
    
    this.setData({ templates })
    this.filterTemplates()
  },

  // 切换分类
  switchCategory(e) {
    const category = e.currentTarget.dataset.category
    const categoryMap = {
      '全部': 'all',
      '情感': '情感',
      '冲突': '冲突',
      '日常': '日常',
      '战斗': '战斗',
      '其他': '其他'
    }
    this.setData({ currentCategory: categoryMap[category] || 'all' })
    this.filterTemplates()
  },

  // 过滤模板
  filterTemplates() {
    const { templates, currentCategory } = this.data
    let filtered = templates
    
    if (currentCategory !== 'all') {
      filtered = templates.filter(t => t.category === currentCategory)
    }
    
    this.setData({ filteredTemplates: filtered })
  },

  // 使用片段
  useTemplate(e) {
    const id = e.currentTarget.dataset.id
    const template = this.data.templates.find(t => t.id === id)
    if (!template) return
    
    // 跳转到对话页面，使用片段内容
    const characterId = template.characterId || ''
    const worldviewId = template.worldviewId || ''
    const content = template.content || ''
    
    wx.navigateTo({
      url: `/pages/dialog/index?template=${encodeURIComponent(content)}&characterId=${characterId}&worldviewId=${worldviewId}`
    })
  },

  // 智能插入到故事
  async insertToStory(e) {
    const id = e.currentTarget.dataset.id
    const template = this.data.templates.find(t => t.id === id)
    if (!template) return
    
    // 第一步：选择作品
    const works = storage.getAggregatedWorks()
    if (works.length === 0) {
      common.showError('请先创建作品')
      return
    }
    
    const workNames = works.map(w => w.title || '未命名作品')
    
    try {
      // 选择作品
      const workRes = await new Promise((resolve, reject) => {
        wx.showActionSheet({
          itemList: workNames,
          success: resolve,
          fail: reject
        })
      })
      
      const selectedWork = works[workRes.tapIndex]
      if (!selectedWork || !selectedWork.stories || selectedWork.stories.length === 0) {
        common.showError('该作品下没有故事')
        return
      }
      
      // 第二步：选择故事
      const storyNames = selectedWork.stories.map(s => s.title || '未命名故事')
      const storyRes = await new Promise((resolve, reject) => {
        wx.showActionSheet({
          itemList: storyNames,
          success: resolve,
          fail: reject
        })
      })
      
      const selectedStory = selectedWork.stories[storyRes.tapIndex]
      const fullStory = storage.getWork(selectedStory.id)
      
      if (!fullStory || !fullStory.outline || fullStory.outline.length === 0) {
        common.showError('该故事没有大纲，无法选择插入位置')
        return
      }
      
      if (!fullStory.content || fullStory.content.trim().length === 0) {
        common.showError('该故事还没有正文内容，请先生成正文')
        return
      }
      
      // 第三步：选择大纲节点（插入位置）
      const outlineTitles = fullStory.outline.map((item, idx) => 
        `${idx + 1}. ${item.title || '节点' + (idx + 1)}`
      )
      outlineTitles.push('故事末尾')
      
      const outlineRes = await new Promise((resolve, reject) => {
        wx.showActionSheet({
          itemList: outlineTitles,
          success: resolve,
          fail: reject
        })
      })
      
      const selectedOutlineIndex = outlineRes.tapIndex
      const isInsertAtEnd = selectedOutlineIndex === fullStory.outline.length
      const selectedOutlineItem = isInsertAtEnd ? null : fullStory.outline[selectedOutlineIndex]
      
      // 第四步：定位大纲节点对应的正文段落位置
      const paragraphInfo = this.locateParagraphByOutline(fullStory, selectedOutlineIndex, isInsertAtEnd)
      
      // 第五步：AI分析是否适合插入
      common.showLoading('AI分析中...')
      
      try {
        // 获取故事的角色和世界观
        const storyCharacters = (fullStory.characterIds || []).map(id => storage.getCharacter(id)).filter(c => c)
        const storyWorldview = fullStory.worldviewId ? storage.getWorldview(fullStory.worldviewId) : null
        
        const analysis = await api.analyzeDialogInsertion(
          template.content,
          paragraphInfo.currentParagraph, // 当前段落内容
          selectedOutlineItem || { title: '故事末尾', description: '插入到故事结尾' },
          paragraphInfo.contextBefore, // 前文
          paragraphInfo.contextAfter, // 后文
          storyCharacters,
          storyWorldview
        )
        
        common.hideLoading()
        
        if (!analysis.suitable) {
          // 不适合插入，显示原因
          wx.showModal({
            title: '不适合插入',
            content: `分析结果：${analysis.reason}\n\n建议：${analysis.suggestion || '请选择其他位置或修改对话片段'}`,
            showCancel: false,
            confirmText: '我知道了'
          })
          return
        }
        
        // 适合插入，询问是否继续
        wx.showModal({
          title: '适合插入',
          content: `分析结果：${analysis.reason}\n\n${analysis.suggestion ? '建议：' + analysis.suggestion + '\n\n' : ''}是否让AI生成增写内容并插入？`,
          success: async (confirmRes) => {
            if (confirmRes.confirm) {
              await this.performInsertDialog(template, fullStory, paragraphInfo, selectedOutlineItem, isInsertAtEnd, storyCharacters, storyWorldview)
            }
          }
        })
      } catch (error) {
        console.error('分析失败:', error)
        common.hideLoading()
        common.showError('分析失败：' + (error.message || '未知错误'))
      }
    } catch (error) {
      // 用户取消选择
    }
  },
  
  // 根据大纲节点定位对应的正文段落位置
  locateParagraphByOutline(story, outlineIndex, isInsertAtEnd) {
    const content = story.content || ''
    const outline = story.outline || []
    
    if (isInsertAtEnd) {
      // 插入到末尾
      return {
        insertPosition: content.length,
        currentParagraph: content.substring(Math.max(0, content.length - 500)),
        contextBefore: content.substring(Math.max(0, content.length - 1000), content.length),
        contextAfter: ''
      }
    }
    
    const contentLength = content.length
    const nodeCount = outline.length
    
    if (nodeCount === 0) {
      // 没有大纲，插入到中间位置
      return {
        insertPosition: Math.floor(contentLength / 2),
        currentParagraph: content.substring(Math.max(0, contentLength / 2 - 500), Math.min(contentLength, contentLength / 2 + 500)),
        contextBefore: content.substring(0, contentLength / 2),
        contextAfter: content.substring(contentLength / 2)
      }
    }
    
    // 策略1：尝试根据段落分隔符（双换行）来定位
    // 如果正文中有明显的段落分隔（\n\n），可以更精确地定位
    const paragraphs = content.split(/\n\n+/)
    const paragraphCount = paragraphs.length
    
    let paragraphStart = 0
    let paragraphEnd = contentLength
    let currentParagraph = ''
    
    if (paragraphCount >= nodeCount) {
      // 如果段落数 >= 大纲节点数，每个节点对应一个或多个段落
      const paragraphsPerNode = Math.ceil(paragraphCount / nodeCount)
      const startParagraphIndex = outlineIndex * paragraphsPerNode
      const endParagraphIndex = Math.min(paragraphCount, (outlineIndex + 1) * paragraphsPerNode)
      
      // 计算这些段落在原文中的位置
      let charIndex = 0
      for (let i = 0; i < paragraphCount; i++) {
        const paraLength = paragraphs[i].length
        if (i === startParagraphIndex) {
          paragraphStart = charIndex
        }
        if (i === endParagraphIndex - 1) {
          paragraphEnd = charIndex + paraLength
          break
        }
        charIndex += paraLength + 2 // +2 for \n\n
      }
      
      currentParagraph = paragraphs.slice(startParagraphIndex, endParagraphIndex).join('\n\n')
    } else {
      // 如果段落数 < 大纲节点数，使用平均分配策略
      const avgLength = Math.floor(contentLength / nodeCount)
      paragraphStart = outlineIndex * avgLength
      paragraphEnd = Math.min(contentLength, (outlineIndex + 1) * avgLength)
      currentParagraph = content.substring(paragraphStart, paragraphEnd)
    }
    
    // 前文（用于上下文，取前500字）
    const contextBeforeStart = Math.max(0, paragraphStart - 500)
    const contextBefore = content.substring(contextBeforeStart, paragraphStart)
    
    // 后文（用于上下文，取后500字）
    const contextAfterEnd = Math.min(contentLength, paragraphEnd + 500)
    const contextAfter = content.substring(paragraphEnd, contextAfterEnd)
    
    // 插入位置：在当前段落中间位置插入，使插入更自然
    const insertPosition = paragraphStart + Math.floor((paragraphEnd - paragraphStart) / 2)
    
    return {
      insertPosition: insertPosition,
      currentParagraph: currentParagraph,
      contextBefore: contextBefore,
      contextAfter: contextAfter,
      paragraphStart: paragraphStart,
      paragraphEnd: paragraphEnd
    }
  },
  
  // 执行插入对话片段
  async performInsertDialog(template, story, paragraphInfo, outlineItem, isInsertAtEnd, characters, worldview) {
    common.showLoading('AI生成增写内容...')
    
    try {
      // AI生成增写内容
      const enhancedContent = await api.generateDialogInsertion(
        template.content,
        paragraphInfo.contextBefore,
        paragraphInfo.contextAfter,
        outlineItem || { title: '故事末尾', description: '插入到故事结尾' },
        characters,
        worldview
      )
      
      if (!enhancedContent) {
        common.hideLoading()
        common.showError('生成增写内容失败')
        return
      }
      
      // 插入到故事内容中
      let newContent = story.content || ''
      const insertPos = paragraphInfo.insertPosition
      
      // 在指定位置插入增写内容
      newContent = newContent.substring(0, insertPos) + 
                   '\n\n' + enhancedContent + '\n\n' + 
                   newContent.substring(insertPos)
      
      // 更新故事内容
      const updatedStory = {
        ...story,
        content: newContent
      }
      
      const saved = storage.saveWork(updatedStory)
      
      common.hideLoading()
      
      if (saved) {
        common.showSuccess('插入成功')
        // 询问是否打开故事查看
        wx.showModal({
          title: '插入成功',
          content: '对话片段已成功插入到故事中，是否打开故事查看？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: `/pages/story/index?id=${story.id}`
              })
            }
          }
        })
      } else {
        common.showError('保存失败')
      }
    } catch (error) {
      console.error('插入失败:', error)
      common.hideLoading()
      common.showError('插入失败：' + (error.message || '未知错误'))
    }
  },

  // 删除片段
  deleteTemplate(e) {
    const id = e.currentTarget.dataset.id
    const template = this.data.templates.find(t => t.id === id)
    if (!template) return
    
    wx.showModal({
      title: '删除片段',
      content: `确定要删除"${template.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          const ok = storage.deleteWork(id)
          if (ok) {
            common.showSuccess('删除成功')
            this.loadTemplates()
          } else {
            common.showError('删除失败')
          }
        }
      }
    })
  },

  // 编辑片段（支持编辑标题和内容）
  editTemplate(e) {
    const id = e.currentTarget.dataset.id
    const template = this.data.templates.find(t => t.id === id)
    if (!template) return
    
    // 第一步：编辑标题
    wx.showModal({
      title: '编辑片段名称',
      editable: true,
      placeholderText: '请输入片段名称',
      content: template.title || '',
      success: (res) => {
        if (res.confirm && res.content) {
          const newTitle = res.content.trim()
          if (!newTitle) {
            common.showError('片段名称不能为空')
            return
          }
          
          // 第二步：编辑内容
          wx.showModal({
            title: '编辑片段内容',
            editable: true,
            placeholderText: '请输入对话片段内容（可输入多行文本）',
            content: template.content || '',
            success: (contentRes) => {
              if (contentRes.confirm) {
                const newContent = contentRes.content ? contentRes.content.trim() : template.content
                
                const updated = storage.saveWork({
                  ...template,
                  title: newTitle,
                  content: newContent
                })
                
                if (updated) {
                  common.showSuccess('修改成功')
                  this.loadTemplates()
                } else {
                  common.showError('修改失败')
                }
              }
            }
          })
        }
      }
    })
  }
})

