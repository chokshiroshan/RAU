const { llmService, PROVIDERS, MODELS } = require('../services/llmService')
const { APPLESCRIPT_SYSTEM_PROMPT } = require('../services/scriptsmithPrompt')
const pluginService = require('../services/pluginService')
const logger = require('../logger')
const path = require('path')
const fs = require('fs/promises')
const { app } = require('electron')

const PLUGINS_DIR = path.join(app.getPath('documents'), 'RAU', 'plugins')

function extractMetadata(scriptContent) {
  const nameMatch = scriptContent.match(/^--\s*@name:\s*(.+)$/m)
  const descMatch = scriptContent.match(/^--\s*@description:\s*(.+)$/m)
  
  return {
    name: nameMatch ? nameMatch[1].trim() : 'Untitled Script',
    description: descMatch ? descMatch[1].trim() : 'Generated AppleScript'
  }
}

function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .substring(0, 50)
}

async function generateScript(_event, userPrompt) {
  logger.log(`[Scriptsmith] Generating script for: "${userPrompt}"`)
  
  try {
    const scriptContent = await llmService.generate(userPrompt, APPLESCRIPT_SYSTEM_PROMPT)
    
    let cleanedScript = scriptContent.trim()
    if (cleanedScript.startsWith('```')) {
      cleanedScript = cleanedScript.replace(/^```(?:applescript)?\n?/, '').replace(/\n?```$/, '')
    }
    
    const metadata = extractMetadata(cleanedScript)
    
    logger.log(`[Scriptsmith] Generated script: ${metadata.name}`)
    
    return {
      success: true,
      script: cleanedScript,
      metadata
    }
  } catch (error) {
    logger.error(`[Scriptsmith] Generation failed:`, error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function saveScript(_event, scriptContent, filename) {
  try {
    await fs.mkdir(PLUGINS_DIR, { recursive: true })
    
    const metadata = extractMetadata(scriptContent)
    const safeName = filename || sanitizeFilename(metadata.name)
    const finalFilename = safeName.endsWith('.applescript') ? safeName : `${safeName}.applescript`
    const filePath = path.join(PLUGINS_DIR, finalFilename)
    
    await fs.writeFile(filePath, scriptContent, 'utf-8')
    
    logger.log(`[Scriptsmith] Saved script to: ${filePath}`)
    
    pluginService.cachedPlugins = []
    pluginService.lastFetch = 0
    
    return {
      success: true,
      path: filePath,
      filename: finalFilename
    }
  } catch (error) {
    logger.error(`[Scriptsmith] Save failed:`, error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function setApiKey(_event, provider, apiKey) {
  try {
    await llmService.saveApiKey(provider, apiKey)
    return { success: true }
  } catch (error) {
    logger.error(`[Scriptsmith] Failed to save API key:`, error)
    return { success: false, error: error.message }
  }
}

async function setProvider(_event, provider) {
  try {
    llmService.setProvider(provider)
    return { success: true, model: llmService.model }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function setModel(_event, model) {
  try {
    llmService.setModel(model)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function getProviders() {
  return Object.values(PROVIDERS).map(p => ({
    id: p,
    name: p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Google'
  }))
}

function getModels(_event, provider) {
  return MODELS[provider] || []
}

async function getCurrentConfig() {
  return await llmService.getCurrentConfig()
}

async function hasApiKey() {
  return Boolean(await llmService.getApiKey())
}

module.exports = {
  generateScript,
  saveScript,
  setApiKey,
  setProvider,
  setModel,
  getProviders,
  getModels,
  getCurrentConfig,
  hasApiKey
}
