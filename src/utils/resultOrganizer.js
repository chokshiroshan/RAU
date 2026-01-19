export function organizeResults(results) {
  const groups = {}
  const apps = []
  const seenItems = new Set()

  results.forEach(result => {
    if (result.type === 'app') {
      const appKey = result.path
      if (!seenItems.has(appKey)) {
        seenItems.add(appKey)
        apps.push(result)
      }
      return
    }

    if (['calculator', 'command', 'web-search'].includes(result.type)) {
        const key = `${result.type}-${result.name}-${result.id}`
        if (!seenItems.has(key)) {
            seenItems.add(key)
            apps.push(result)
        }
        return
    }

    const itemKey = `${result.type}-${result.title || result.name || result.url}-${result.appName || result.browser}-${result.windowIndex || ''}-${result.tabIndex || ''}`

    if (seenItems.has(itemKey)) {
      return
    }
    seenItems.add(itemKey)

    const appName = result.appName || result.browser || result.name || 'Other'
    const category = result.capability?.category || null

    if (!groups[appName]) {
      groups[appName] = {
        type: 'group',
        appName,
        category,
        items: [],
        icon: null,
        score: 999
      }
    }

    groups[appName].items.push(result)
    groups[appName].score = Math.min(groups[appName].score, result.score || 999)
  })

  const sortedGroups = Object.values(groups).sort((a, b) => a.score - b.score)
  const sortedApps = apps.sort((a, b) => (a.score || 999) - (b.score || 999))

  const finalFlatList = []
  
  sortedApps.forEach(app => finalFlatList.push(app))
  
  sortedGroups.forEach(group => {
      group.items.forEach((item, index) => {
          // Ensure all items in group have the group name for correct rendering
          item._groupName = group.appName
          
          if (index === 0) {
              item._isGroupStart = true
              item._groupIcon = group.icon
              item._groupCategory = group.category
              item._groupItemCount = group.items.length
          }
          finalFlatList.push(item)
      })
  })
  
  return finalFlatList
}
