const https = require('https')
const logger = require('../logger')
const { getSettings, saveSettings } = require('../config')

let keytar = null
try {
  keytar = require('keytar')
} catch (error) {
  logger.warn('[LLMService] Keychain unavailable, falling back to settings storage:', error?.message || error)
}

const PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google'
}

const MODELS = {
  [PROVIDERS.OPENAI]: [
    { id: 'gpt-5', name: 'GPT-5', description: 'Most capable, default for ChatGPT' },
    { id: 'gpt-5.1', name: 'GPT-5.1', description: 'Enhanced reasoning' },
    { id: 'gpt-5-codex-max', name: 'GPT-5-Codex-Max', description: 'Frontier agentic coding' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Best for voice-first, real-time chat' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable' },
    { id: 'o4-mini', name: 'o4-mini', description: 'Efficient reasoning' },
    { id: 'o3', name: 'o3', description: 'Advanced reasoning (being phased out)' },
    { id: 'o3-mini', name: 'o3-mini', description: 'Fast reasoning' }
  ],
  [PROVIDERS.ANTHROPIC]: [
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', description: 'Most powerful, maximum capability' },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: 'Frontier model, best coding' },
    { id: 'claude-haiku-4-5-20251015', name: 'Claude Haiku 4.5', description: 'Fastest, near-frontier' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Excellent balance' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and efficient' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful Claude 3' }
  ],
  [PROVIDERS.GOOGLE]: [
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash', description: 'Latest, frontier intelligence built for speed' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro-preview', description: 'Most capable, 1M token context' },
    { id: 'gemini-2-5-flash', name: 'Gemini 2.5 Flash', description: 'Lightning-fast, highly capable' },
    { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', description: 'High-capability, complex reasoning' },
    { id: 'gemini-2-5-flash-lite', name: 'Gemini 2.5 Flash-Lite', description: 'Cost-sensitive, high-scale' }
  ]
}

const DEFAULT_MODELS = {
  [PROVIDERS.OPENAI]: 'gpt-5',
  [PROVIDERS.ANTHROPIC]: 'claude-opus-4-5',
  [PROVIDERS.GOOGLE]: 'gemini-3-pro-preview'
}

const ENDPOINTS = {
  [PROVIDERS.OPENAI]: {
    host: 'api.openai.com',
    path: '/v1/chat/completions'
  },
  [PROVIDERS.ANTHROPIC]: {
    host: 'api.anthropic.com',
    path: '/v1/messages'
  },
  [PROVIDERS.GOOGLE]: {
    host: 'generativelanguage.googleapis.com',
    basePath: '/v1beta/models'
  }
}

const SETTINGS_KEYS = {
  [PROVIDERS.OPENAI]: 'openaiApiKey',
  [PROVIDERS.ANTHROPIC]: 'anthropicApiKey',
  [PROVIDERS.GOOGLE]: 'googleApiKey'
}

const ENV_KEYS = {
  [PROVIDERS.OPENAI]: 'OPENAI_API_KEY',
  [PROVIDERS.ANTHROPIC]: 'ANTHROPIC_API_KEY',
  [PROVIDERS.GOOGLE]: 'GOOGLE_API_KEY'
}

class LLMService {
  constructor() {
    this.provider = PROVIDERS.ANTHROPIC
    this.model = DEFAULT_MODELS[PROVIDERS.ANTHROPIC]
    this.keychainService = 'RAU'
  }

  async getApiKey(provider = this.provider) {
    const account = `${provider}-api-key`
    if (keytar) {
      try {
        const stored = await keytar.getPassword(this.keychainService, account)
        if (stored) return stored
      } catch (error) {
        logger.error('[LLMService] Keychain lookup failed:', error)
      }
    }

    const settings = getSettings()
    let legacyKey = null
    const settingsKey = SETTINGS_KEYS[provider]
    if (settingsKey && settings[settingsKey]) {
      legacyKey = settings[settingsKey]
    } else {
      const envKey = ENV_KEYS[provider]
      legacyKey = envKey ? process.env[envKey] : null
    }

    if (legacyKey && keytar) {
      try {
        await keytar.setPassword(this.keychainService, account, legacyKey)
        delete settings.openaiApiKey
        delete settings.anthropicApiKey
        delete settings.googleApiKey
        saveSettings(settings)
        logger.log(`[LLMService] Migrated API key for ${provider} to Keychain`)
      } catch (error) {
        logger.error('[LLMService] Failed to migrate API key to Keychain:', error)
      }
    }

    return legacyKey
  }

  setProvider(provider) {
    if (!Object.values(PROVIDERS).includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`)
    }
    this.provider = provider
    this.model = DEFAULT_MODELS[provider]
    logger.log(`[LLMService] Provider set to: ${provider}, model: ${this.model}`)
  }

  setModel(model) {
    const providerModels = MODELS[this.provider]
    if (!providerModels.find(m => m.id === model)) {
      throw new Error(`Invalid model for ${this.provider}: ${model}`)
    }
    this.model = model
    logger.log(`[LLMService] Model set to: ${model}`)
  }

  getModels(provider) {
    return MODELS[provider || this.provider] || []
  }

  async getCurrentConfig() {
    return {
      provider: this.provider,
      model: this.model,
      hasApiKey: Boolean(await this.getApiKey())
    }
  }

  async saveApiKey(provider, apiKey) {
    const account = `${provider}-api-key`
    if (keytar) {
      try {
        await keytar.setPassword(this.keychainService, account, apiKey)
        logger.log(`[LLMService] API key saved to Keychain for: ${provider}`)
        return
      } catch (error) {
        logger.error(`[LLMService] Failed to save API key to Keychain:`, error)
        throw error
      }
    }

    const settingsKey = SETTINGS_KEYS[provider]
    if (!settingsKey) {
      throw new Error(`Invalid provider: ${provider}`)
    }

    const settings = getSettings()
    settings[settingsKey] = apiKey
    saveSettings(settings)
    logger.warn(`[LLMService] Keychain unavailable; stored API key in settings for: ${provider}`)
  }

  async generate(prompt, systemPrompt = '') {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error(`No API key configured for ${this.provider}`)
    }

    logger.log(`[LLMService] Generating with ${this.provider} (${this.model})...`)

    switch (this.provider) {
      case PROVIDERS.OPENAI:
        return this._callOpenAI(prompt, systemPrompt, apiKey)
      case PROVIDERS.ANTHROPIC:
        return this._callAnthropic(prompt, systemPrompt, apiKey)
      case PROVIDERS.GOOGLE:
        return this._callGoogle(prompt, systemPrompt, apiKey)
      default:
        throw new Error(`Unknown provider: ${this.provider}`)
    }
  }

  _callOpenAI(prompt, systemPrompt, apiKey) {
    const messages = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const body = JSON.stringify({
      model: this.model,
      messages,
      max_tokens: 4096,
      temperature: 0.2
    })

    const endpoint = ENDPOINTS[PROVIDERS.OPENAI]
    return this._makeRequest(endpoint.host, endpoint.path, body, {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }).then(data => {
      if (data.choices && data.choices[0]) {
        return data.choices[0].message.content
      }
      throw new Error('Invalid response from OpenAI')
    })
  }

  _callAnthropic(prompt, systemPrompt, apiKey) {
    const body = JSON.stringify({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages: [{ role: 'user', content: prompt }]
    })

    const endpoint = ENDPOINTS[PROVIDERS.ANTHROPIC]
    return this._makeRequest(endpoint.host, endpoint.path, body, {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }).then(data => {
      if (data.content && data.content[0]) {
        return data.content[0].text
      }
      throw new Error('Invalid response from Anthropic')
    })
  }

  _callGoogle(prompt, systemPrompt, apiKey) {
    const contents = []

    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `System instructions: ${systemPrompt}\n\nUser request: ${prompt}` }]
      })
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      })
    }

    const body = JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096
      }
    })

    const endpoint = ENDPOINTS[PROVIDERS.GOOGLE]
    const path = `${endpoint.basePath}/${this.model}:generateContent?key=${apiKey}`

    return this._makeRequest(endpoint.host, path, body, {
      'Content-Type': 'application/json'
    }).then(data => {
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text
      }
      if (data.error) {
        throw new Error(data.error.message || 'Google API error')
      }
      throw new Error('Invalid response from Google')
    })
  }

  _makeRequest(host, path, body, headers) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: host,
        port: 443,
        path: path,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body)
        }
      }

      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            if (res.statusCode >= 400) {
              logger.error(`[LLMService] API error (${res.statusCode}):`, parsed)
              const errorMsg = parsed.error?.message || parsed.message || `API error: ${res.statusCode}`
              reject(new Error(errorMsg))
            } else {
              resolve(parsed)
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`))
          }
        })
      })

      req.on('error', (e) => {
        logger.error(`[LLMService] Request error:`, e)
        reject(e)
      })

      req.setTimeout(60000, () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })

      req.write(body)
      req.end()
    })
  }
}

module.exports = {
  llmService: new LLMService(),
  PROVIDERS,
  MODELS,
  DEFAULT_MODELS
}
