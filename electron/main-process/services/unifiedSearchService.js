const Fuse = require('fuse.js')
const { getSettings } = require('../config')
const logger = require('../logger')
const { getApps } = require('../handlers/actionHandler')
const { getTabs } = require('../handlers/actionHandler')
const { searchFiles } = require('../handlers/searchHandler')
const automationHandlers = require('../handlers/automationHandler')
let Sentry = null
try {
  Sentry = require('@sentry/electron/main')
} catch {
  Sentry = null
}

const MATH_EXPRESSION_REGEX = /^[\d\s+\-*/().%^]+$/

const fuseOptions = {
  keys: [
    { name: 'name', weight: 3.0 },
    { name: 'title', weight: 2.0 },
    { name: 'url', weight: 1.5 },
    { name: 'path', weight: 1.0 },
  ],
  threshold: 0.2,
  distance: 50,
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
}

const DEFAULT_ENGINES = {
  g: { name: 'Google', url: 'https://google.com/search?q=', icon: '🔍' },
  default: { name: 'Google', url: 'https://google.com/search?q=', icon: '🔍' },
}

const SYSTEM_COMMANDS = [
  { id: 'sleep', name: 'Sleep', description: 'Put your Mac to sleep', keywords: ['sleep', 'nap', 'rest'], icon: '💤', action: 'system-sleep' },
  { id: 'lock', name: 'Lock Screen', description: 'Lock your screen', keywords: ['lock', 'lock screen', 'secure'], icon: '🔒', action: 'system-lock' },
  { id: 'trash', name: 'Empty Trash', description: 'Empty the trash bin', keywords: ['empty trash', 'trash', 'bin', 'delete'], icon: '🗑️', action: 'system-trash' },
  { id: 'restart', name: 'Restart', description: 'Restart your Mac', keywords: ['restart', 'reboot'], icon: '🔄', action: 'system-restart' },
  { id: 'shutdown', name: 'Shut Down', description: 'Shut down your Mac', keywords: ['shutdown', 'shut down', 'power off', 'turn off'], icon: '⏻', action: 'system-shutdown' },
  { id: 'logout', name: 'Log Out', description: 'Log out of your account', keywords: ['logout', 'log out', 'sign out'], icon: '👋', action: 'system-logout' },
]

function parseBangQuery(query, customBangs = {}) {
  const match = query.match(/^([a-zA-Z0-9]+)\s+(.+)$/)
  if (!match) return null
  const prefix = match[1].toLowerCase()
  const searchTerm = match[2].trim()
  const engine = customBangs[prefix] || DEFAULT_ENGINES[prefix]
  return engine ? { engine, searchTerm, prefix } : null
}

function getWebSearchResult(query, isFallback = false, customBangs = {}) {
  const bangInfo = parseBangQuery(query, customBangs)
  if (bangInfo) {
    return {
      type: 'web-search',
      name: `Search ${bangInfo.engine.name} for "${bangInfo.searchTerm}"`,
      url: bangInfo.engine.url + encodeURIComponent(bangInfo.searchTerm),
      engine: bangInfo.engine.name,
      icon: bangInfo.engine.icon,
      priority: 10,
      score: 0,
    }
  }

  const engine = DEFAULT_ENGINES.default
  return {
    type: 'web-search',
    name: isFallback ? `Search Google for "${query}"` : `Search the web for "${query}"`,
    url: engine.url + encodeURIComponent(query),
    engine: engine.name,
    icon: engine.icon,
    priority: isFallback ? 0 : -1,
    score: 1,
  }
}

function evaluateExpression(expression) {
  if (!MATH_EXPRESSION_REGEX.test(expression)) return null
  if (!/[+\-*/^%]/.test(expression)) return null
  try {
    const normalized = expression.replace(/\^/g, '**')
    const result = new Function(`return (${normalized})`)()
    if (typeof result === 'number' && isFinite(result)) {
      return Math.round(result * 1000000) / 1000000
    }
    return null
  } catch {
    return null
  }
}

function searchCommands(query) {
  if (!query || query.trim().length < 2) return []
  const lowerQuery = query.toLowerCase().trim()
  return SYSTEM_COMMANDS.filter(cmd =>
    cmd.keywords.some(kw => kw.includes(lowerQuery) || lowerQuery.includes(kw)) ||
    cmd.name.toLowerCase().includes(lowerQuery)
  ).map(cmd => ({
    ...cmd,
    type: 'command',
    priority: 5,
  }))
}

async function searchUnified(query, filters = {}, requestId, senderId) {
  const activeFilters = {
    apps: true,
    files: true,
    tabs: true,
    commands: true,
    shortcuts: true,
    plugins: true,
    ...filters,
  }

  if (!query || query.trim() === '') return []
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const settings = getSettings()
  const telemetryEnabled = settings?.telemetryEnabled && process.env.SENTRY_DSN && Sentry
  const transaction = telemetryEnabled ? Sentry.startTransaction({ name: 'search-unified' }) : null
  const customBangs = settings?.webBangs || {}

  const bangInfo = getWebSearchResult(trimmed, false, customBangs)
  if (bangInfo.priority === 10) {
    if (transaction) {
      transaction.setData('results', 1)
      transaction.finish()
    }
    return [bangInfo]
  }

  const calculatorResult = evaluateExpression(trimmed)
  if (calculatorResult !== null) {
    if (transaction) {
      transaction.setData('results', 1)
      transaction.finish()
    }
    return [{
      type: 'calculator',
      name: `= ${calculatorResult}`,
      expression: trimmed,
      result: calculatorResult,
      priority: 10,
      score: 0,
    }]
  }

  if (trimmed === '/' || trimmed.toLowerCase().startsWith('/g')) {
    const isGen = trimmed.toLowerCase().startsWith('/gen')
    const prompt = isGen
      ? trimmed.slice(4).trim()
      : trimmed.toLowerCase().startsWith('/g')
        ? trimmed.slice(2).trim()
        : ''
    if (transaction) {
      transaction.setData('results', 1)
      transaction.finish()
    }
    return [{
      type: 'scriptsmith-trigger',
      name: prompt ? `Generate: ${prompt}` : 'Generate AppleScript with AI...',
      description: 'Use Scriptsmith to create custom automation',
      icon: null,
      prompt,
      priority: 100,
      score: 0,
    }]
  }

  const searchPromises = []

  if (activeFilters.apps && settings.searchApps !== false) {
    searchPromises.push(getApps().catch(err => {
      logger.warn('[UnifiedSearch] App search failed:', err.message)
      return []
    }))
  } else {
    searchPromises.push(Promise.resolve([]))
  }

  if (activeFilters.tabs && settings.searchTabs !== false) {
    searchPromises.push(getTabs().catch(err => {
      logger.warn('[UnifiedSearch] Tab search failed:', err.message)
      return []
    }))
  } else {
    searchPromises.push(Promise.resolve([]))
  }

  if (activeFilters.files && settings.searchFiles !== false) {
    searchPromises.push(searchFiles(null, trimmed).catch(err => {
      logger.warn('[UnifiedSearch] File search failed:', err.message)
      return []
    }))
  } else {
    searchPromises.push(Promise.resolve([]))
  }

  if (activeFilters.shortcuts && settings.searchShortcuts !== false) {
    searchPromises.push(automationHandlers.getShortcuts().catch(err => {
      logger.warn('[UnifiedSearch] Shortcuts search failed:', err.message)
      return []
    }))
  } else {
    searchPromises.push(Promise.resolve([]))
  }

  if (activeFilters.plugins && settings.searchPlugins !== false) {
    searchPromises.push(automationHandlers.getPlugins().catch(err => {
      logger.warn('[UnifiedSearch] Plugins search failed:', err.message)
      return []
    }))
  } else {
    searchPromises.push(Promise.resolve([]))
  }

  const searchPromise = Promise.all(searchPromises)
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 5000))

  const [apps, tabs, fileResults, shortcuts, plugins] = await Promise.race([searchPromise, timeoutPromise]).catch(err => {
    logger.error('[UnifiedSearch] Search error:', err.message)
    return [[], [], [], [], []]
  })

  const appsWithType = apps.map(app => ({ ...app, type: 'app', priority: 3 }))
  const tabsWithType = tabs.map(tab => ({
    ...tab,
    type: tab.type || 'tab',
    name: tab.title || tab.name,
    priority: 2,
  }))
  const filesWithType = fileResults.map(file => ({ ...file, type: 'file', priority: 1 }))
  const shortcutsWithType = shortcuts.map(shortcut => ({ ...shortcut, type: 'shortcut', priority: 2.5, icon: null }))
  const pluginsWithType = plugins.map(plugin => ({ ...plugin, type: 'plugin', priority: 2.5 }))

  const commands = activeFilters.commands ? searchCommands(trimmed) : []

  const allResults = [...appsWithType, ...tabsWithType, ...filesWithType, ...shortcutsWithType, ...pluginsWithType]
  let fuzzyResults = []
  if (allResults.length > 0) {
    const fuse = new Fuse(allResults, fuseOptions)
    fuzzyResults = fuse.search(trimmed)
  }

  const matchedResults = fuzzyResults
    .filter(result => result.score < 0.25)
    .slice(0, 18)
    .map(result => ({ ...result.item, score: result.score }))
    .sort((a, b) => {
      const scoreDiff = (a.score || 0) - (b.score || 0)
      if (Math.abs(scoreDiff) < 0.05) {
        return (b.priority || 0) - (a.priority || 0)
      }
      return scoreDiff
    })

  const commandsWithScore = commands.map(cmd => ({ ...cmd, score: 0 }))
  const finalResults = [...commandsWithScore, ...matchedResults].slice(0, 20)

  if (finalResults.length === 0) {
    if (transaction) {
      transaction.setData('results', 0)
      transaction.finish()
    }
    return [getWebSearchResult(trimmed, true, customBangs)]
  }

  if (transaction) {
    transaction.setData('results', finalResults.length)
    transaction.finish()
  }
  return finalResults
}

module.exports = {
  searchUnified,
}
