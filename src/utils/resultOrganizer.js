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

    // These types appear as standalone items (not grouped)
    if (['calculator', 'command', 'web-search', 'shortcut', 'plugin'].includes(result.type)) {
      const key = `${result.type}-${result.name}-${result.id}`
      if (!seenItems.has(key)) {
        seenItems.add(key)
        apps.push(result)
      }
      return
    }

    // Files get grouped under "Files"
    if (result.type === 'file') {
      const itemKey = `file-${result.path || result.name}`
      if (seenItems.has(itemKey)) {
        return
      }
      seenItems.add(itemKey)

      if (!groups['Files']) {
        groups['Files'] = {
          type: 'group',
          appName: 'Files',
          category: 'files',
          items: [],
          icon: null,
          score: 999
        }
      }
      groups['Files'].items.push(result)
      groups['Files'].score = Math.min(groups['Files'].score, result.score || 999)
      return
    }

    // Tabs and other items get grouped by browser/app name
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

  // Sort groups by score, but ensure Files group comes after browser tabs
  const sortedGroups = Object.values(groups).sort((a, b) => {
    // Files group should come after other groups with similar scores
    if (a.appName === 'Files' && b.appName !== 'Files') {
      return 1 // Files comes after
    }
    if (b.appName === 'Files' && a.appName !== 'Files') {
      return -1 // Other comes before Files
    }
    return a.score - b.score
  })

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
