/**
 * 本地存储工具类
 * 用于管理用户数据、作品数据等
 */

const STORAGE_KEYS = {
  USER_INFO: 'user_info',
  API_CONFIG: 'api_config',
  CHARACTERS: 'characters',
  WORLDVIEWS: 'worldviews',
  WORKS: 'works'
}

/**
 * 保存用户信息
 */
function saveUserInfo(userInfo) {
  try {
    wx.setStorageSync(STORAGE_KEYS.USER_INFO, userInfo)
    return true
  } catch (e) {
    console.error('保存用户信息失败', e)
    return false
  }
}

/**
 * 获取用户信息
 */
function getUserInfo() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.USER_INFO) || null
  } catch (e) {
    console.error('获取用户信息失败', e)
    return null
  }
}

/**
 * 保存API配置
 */
function saveAPIConfig(config) {
  try {
    wx.setStorageSync(STORAGE_KEYS.API_CONFIG, config)
    return true
  } catch (e) {
    console.error('保存API配置失败', e)
    return false
  }
}

/**
 * 获取API配置
 */
function getAPIConfig() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.API_CONFIG) || null
  } catch (e) {
    console.error('获取API配置失败', e)
    return null
  }
}

/**
 * 保存角色
 */
function saveCharacter(character) {
  try {
    const characters = getCharacters()
    const id = character.id || Date.now().toString()
    const newCharacter = {
      ...character,
      id,
      createTime: character.createTime || new Date().toISOString(),
      updateTime: new Date().toISOString()
    }
    
    const index = characters.findIndex(c => c.id === id)
    if (index >= 0) {
      characters[index] = newCharacter
    } else {
      characters.push(newCharacter)
    }
    
    wx.setStorageSync(STORAGE_KEYS.CHARACTERS, characters)
    return newCharacter
  } catch (e) {
    console.error('保存角色失败', e)
    return null
  }
}

/**
 * 获取所有角色
 */
function getCharacters() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.CHARACTERS) || []
  } catch (e) {
    console.error('获取角色列表失败', e)
    return []
  }
}

/**
 * 获取单个角色
 */
function getCharacter(id) {
  const characters = getCharacters()
  return characters.find(c => c.id === id) || null
}

/**
 * 删除角色
 */
function deleteCharacter(id) {
  try {
    const characters = getCharacters()
    const filtered = characters.filter(c => c.id !== id)
    wx.setStorageSync(STORAGE_KEYS.CHARACTERS, filtered)
    return true
  } catch (e) {
    console.error('删除角色失败', e)
    return false
  }
}

/**
 * 保存世界观
 */
function saveWorldview(worldview) {
  try {
    const worldviews = getWorldviews()
    const id = worldview.id || Date.now().toString()
    const newWorldview = {
      ...worldview,
      id,
      createTime: worldview.createTime || new Date().toISOString(),
      updateTime: new Date().toISOString()
    }
    
    const index = worldviews.findIndex(w => w.id === id)
    if (index >= 0) {
      worldviews[index] = newWorldview
    } else {
      worldviews.push(newWorldview)
    }
    
    wx.setStorageSync(STORAGE_KEYS.WORLDVIEWS, worldviews)
    return newWorldview
  } catch (e) {
    console.error('保存世界观失败', e)
    return null
  }
}

/**
 * 获取所有世界观
 */
function getWorldviews() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.WORLDVIEWS) || []
  } catch (e) {
    console.error('获取世界观列表失败', e)
    return []
  }
}

/**
 * 获取单个世界观
 */
function getWorldview(id) {
  const worldviews = getWorldviews()
  return worldviews.find(w => w.id === id) || null
}

/**
 * 删除世界观
 */
function deleteWorldview(id) {
  try {
    const worldviews = getWorldviews()
    const filtered = worldviews.filter(w => w.id !== id)
    wx.setStorageSync(STORAGE_KEYS.WORLDVIEWS, filtered)
    return true
  } catch (e) {
    console.error('删除世界观失败', e)
    return false
  }
}

/**
 * 保存作品
 */
function saveWork(work) {
  try {
    const works = getWorks()
    const id = work.id || Date.now().toString()
    const newWork = {
      ...work,
      id,
      createTime: work.createTime || new Date().toISOString(),
      updateTime: new Date().toISOString()
    }
    
    const index = works.findIndex(w => w.id === id)
    if (index >= 0) {
      works[index] = newWork
    } else {
      works.push(newWork)
    }
    
    wx.setStorageSync(STORAGE_KEYS.WORKS, works)
    return newWork
  } catch (e) {
    console.error('保存作品失败', e)
    return null
  }
}

/**
 * 获取所有作品
 */
function getWorks() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.WORKS) || []
  } catch (e) {
    console.error('获取作品列表失败', e)
    return []
  }
}

/**
 * 获取单个作品
 */
function getWork(id) {
  const works = getWorks()
  return works.find(w => w.id === id) || null
}

/**
 * 删除作品
 */
function deleteWork(id) {
  try {
    const works = getWorks()
    const filtered = works.filter(w => w.id !== id)
    wx.setStorageSync(STORAGE_KEYS.WORKS, filtered)
    return true
  } catch (e) {
    console.error('删除作品失败', e)
    return false
  }
}

module.exports = {
  saveUserInfo,
  getUserInfo,
  saveAPIConfig,
  getAPIConfig,
  saveCharacter,
  getCharacters,
  getCharacter,
  deleteCharacter,
  saveWorldview,
  getWorldviews,
  getWorldview,
  deleteWorldview,
  saveWork,
  getWorks,
  getWork,
  deleteWork,
  ensureMasterWork,
  linkChildToWork,
  getAggregatedWorks,
  createMasterWork,
  reassignWorkIds,
  listOrphanWorks
}

/**
 * 确保存在一个“主作品”（type: 'work'）。若指定ID不存在则创建，未指定则新建。
 */
function ensureMasterWork(workId, title = '未命名作品') {
  const works = getWorks()
  if (workId) {
    const hit = works.find(w => w.id === workId && w.type === 'work')
    if (hit) return hit
  }
  return saveWork({
    id: workId || undefined,
    type: 'work',
    title
  })
}

/**
 * 将子项作品关联到主作品
 */
function linkChildToWork(childWork, masterId) {
  if (!childWork || !masterId) return childWork
  return saveWork({
    ...childWork,
    workId: masterId
  })
}

/**
 * 返回仅“主作品”的列表，并聚合其子项（兼容老数据）
 */
function getAggregatedWorks() {
  const works = getWorks()
  const masterMap = new Map()

  // 收集已有主作品
  works.forEach(w => {
    if (w.type === 'work') {
      masterMap.set(w.id, { ...w, characters: [], worldviews: [], dialogs: [], images: [], stories: [], videos: [] })
    }
  })

  // 将子项挂到主作品；无workId的老数据自动生成临时主作品
  works.forEach(w => {
    if (!w.type || !['character', 'worldview', 'dialog', 'image', 'story', 'dialog_template', 'video'].includes(w.type)) return
    let mid = w.workId
    if (!mid) {
      mid = `m_${w.id}`
      if (!masterMap.has(mid)) {
        masterMap.set(mid, {
          id: mid,
          type: 'work',
          title: w.title || '未命名作品',
          createTime: w.createTime,
          updateTime: w.updateTime,
          characters: [], worldviews: [], dialogs: [], images: [], stories: [], videos: []
        })
      }
    } else if (!masterMap.has(mid)) {
      masterMap.set(mid, {
        id: mid,
        type: 'work',
        title: '未命名作品',
        createTime: w.createTime,
        updateTime: w.updateTime,
        characters: [], worldviews: [], dialogs: [], images: [], stories: [], videos: []
      })
    }
    const m = masterMap.get(mid)
    if (w.type === 'character') m.characters.push(w)
    if (w.type === 'worldview') m.worldviews.push(w)
    if (w.type === 'dialog') m.dialogs.push(w)
    if (w.type === 'image') m.images.push(w)
    if (w.type === 'story') m.stories.push(w)
    if (w.type === 'video') m.videos.push(w)
    // 更新主作品时间用于排序
    if (!m.updateTime || new Date(w.updateTime || 0) > new Date(m.updateTime || 0)) {
      m.updateTime = w.updateTime
    }
    if (!m.createTime || new Date(w.createTime || 0) < new Date(m.createTime || 0)) {
      m.createTime = w.createTime
    }
  })

  const masters = Array.from(masterMap.values())
  masters.sort((a, b) => new Date(b.updateTime || b.createTime || 0) - new Date(a.updateTime || a.createTime || 0))
  return masters
}

/**
 * 创建一个新的主作品
 */
function createMasterWork(title = '未命名作品') {
  return saveWork({
    type: 'work',
    title
  })
}

/**
 * 批量重定向子项到指定主作品ID
 */
function reassignWorkIds(workIds = [], masterId) {
  if (!Array.isArray(workIds) || !masterId) return false
  try {
    const works = getWorks()
    let changed = false
    workIds.forEach(id => {
      const idx = works.findIndex(w => w.id === id)
      if (idx >= 0) {
        works[idx] = { ...works[idx], workId: masterId, updateTime: new Date().toISOString() }
        changed = true
      }
    })
    if (changed) {
      wx.setStorageSync(STORAGE_KEYS.WORKS, works)
    }
    return changed
  } catch (e) {
    console.error('重定向子项workId失败', e)
    return false
  }
}

/**
 * 列出没有workId的散装子项
 */
function listOrphanWorks() {
  const works = getWorks()
  return works.filter(w => ['character', 'worldview', 'dialog', 'image', 'story', 'dialog_template', 'video'].includes(w.type) && !w.workId)
}
