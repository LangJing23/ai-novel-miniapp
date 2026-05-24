// pages/templates/index.js
Page({
  data: {
    currentTab: 0, // 0: 故事前提, 1: 角色设定, 2: 世界观
    inspirations: {
      premises: [
        { 
          id: 'p1', 
          title: '七日洗冤', 
          content: '被误认为叛徒，必须在七日内洗清冤屈，否则将面临死亡', 
          tags: ['悬疑', '复仇', '时间限制'],
          difficulty: '中级'
        },
        { 
          id: 'p2', 
          title: '失落的记忆', 
          content: '醒来时发现自己失去了所有记忆，但周围的人都说认识自己', 
          tags: ['悬疑', '身份', '记忆'],
          difficulty: '初级'
        },
        { 
          id: 'p3', 
          title: '最后的试炼', 
          content: '为了拯救族人，必须通过三个不可能完成的试炼', 
          tags: ['冒险', '成长', '挑战'],
          difficulty: '中级'
        },
        { 
          id: 'p4', 
          title: '时空交错', 
          content: '意外穿越到另一个时空，发现那里也有一个自己', 
          tags: ['科幻', '穿越', '平行世界'],
          difficulty: '高级'
        },
        { 
          id: 'p5', 
          title: '守护者', 
          content: '被选中成为古老封印的守护者，但封印正在逐渐失效', 
          tags: ['奇幻', '责任', '守护'],
          difficulty: '中级'
        }
      ],
      characters: [
        { 
          id: 'c1', 
          title: '古风剑客', 
          content: '沉稳寡言，擅长剑术，口头禅"无妨"，总是独自一人', 
          tags: ['古风', '侠客'],
          difficulty: '初级'
        },
        { 
          id: 'c2', 
          title: '傲娇师妹', 
          content: '表面冷漠，内心温柔，总是说反话，但关键时刻很可靠', 
          tags: ['傲娇', '师妹'],
          difficulty: '初级'
        },
        { 
          id: 'c3', 
          title: '神秘商人', 
          content: '行踪不定，掌握各种秘密，总是用信息换取利益', 
          tags: ['神秘', '商人'],
          difficulty: '中级'
        },
        { 
          id: 'c4', 
          title: '失忆少年', 
          content: '失去所有记忆，但拥有强大的战斗本能，在寻找真相', 
          tags: ['失忆', '战斗'],
          difficulty: '中级'
        }
      ],
      worldviews: [
        { 
          id: 'w1', 
          title: '仙侠世界', 
          content: '修仙体系，分为炼气、筑基、金丹等境界，灵气是核心资源', 
          tags: ['仙侠', '修仙'],
          difficulty: '初级'
        },
        { 
          id: 'w2', 
          title: '赛博朋克', 
          content: '未来科技世界，AI与人类共存，虚拟现实技术普及', 
          tags: ['科幻', '未来'],
          difficulty: '中级'
        },
        { 
          id: 'w3', 
          title: '魔法学院', 
          content: '魔法与科技并存的世界，学院培养魔法师，存在魔法等级制度', 
          tags: ['魔法', '学院'],
          difficulty: '初级'
        },
        { 
          id: 'w4', 
          title: '废土世界', 
          content: '末日后的世界，资源稀缺，人类在废墟中重建文明', 
          tags: ['废土', '末日'],
          difficulty: '高级'
        }
      ]
    }
  },

  onLoad() {
    this.loadInspirations()
  },

  // 加载灵感库（可以从服务器或本地加载）
  loadInspirations() {
    // 这里可以扩展为从服务器加载更多灵感
    // 目前使用内置的灵感数据
  },

  // 切换Tab
  switchTab(e) {
    const tab = parseInt(e.currentTarget.dataset.tab)
    this.setData({ currentTab: tab })
  },

  // 使用灵感
  useInspiration(e) {
    const { category, id } = e.currentTarget.dataset
    const inspiration = this.data.inspirations[category].find(i => i.id === id)
    if (!inspiration) return
    
    // 根据类型跳转到对应页面
    let url = ''
    switch (category) {
      case 'premises':
        url = `/pages/story/index?template=${encodeURIComponent(inspiration.content)}`
        break
      case 'characters':
        url = `/pages/character/index?template=${encodeURIComponent(inspiration.content)}`
        break
      case 'worldviews':
        url = `/pages/world/index?template=${encodeURIComponent(inspiration.content)}`
        break
    }
    
    if (url) {
      wx.navigateTo({ url })
    }
  }
})
