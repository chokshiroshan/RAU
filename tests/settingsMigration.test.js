const { test, describe, after } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const proxyquire = require('proxyquire')

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rau-settings-'))
const userDataDir = path.join(tempDir, 'userData')
const exePath = path.join(tempDir, 'RAU.app', 'Contents', 'MacOS', 'RAU')

const mockElectron = {
  app: {
    getPath: (name) => {
      if (name === 'userData') return userDataDir
      if (name === 'exe') return exePath
      return tempDir
    },
    isPackaged: true,
  }
}

const config = proxyquire('../electron/main-process/config', {
  electron: mockElectron,
})

describe('Settings migration', () => {
  test('creates default settings in userData when missing', () => {
    const settings = config.getSettings()
    assert.strictEqual(settings.searchApps, true)
    const configPath = config.getConfigPath()
    assert.ok(fs.existsSync(configPath), 'settings.json should be created in userData')
  })

  test('migrates legacy settings from exe directory', () => {
    const legacyPath = path.join(path.dirname(exePath), 'settings.json')
    fs.mkdirSync(path.dirname(exePath), { recursive: true })
    fs.writeFileSync(legacyPath, JSON.stringify({ searchApps: false }, null, 2))

    const configPath = config.getConfigPath()
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath)

    const settings = config.getSettings()
    assert.strictEqual(settings.searchApps, false)
    assert.ok(fs.existsSync(configPath), 'migrated settings should be saved to userData')
  })
})

after(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true })
  } catch {
    // ignore cleanup errors
  }
})
