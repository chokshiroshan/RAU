/**
 * Icon Extractor Service
 * Handles extracting app icons from .app bundles on macOS
 */

const path = require('path')
const fs = require('fs')
const { execFile } = require('child_process')
const os = require('os')
const logger = require('../logger')

// Configuration
const ICON_SIZE = 64
const EXTRACTION_TIMEOUT_MS = 5000

/**
 * Helper to wrap a promise with a timeout
 */
function withTimeout(promise, ms, fallbackValue = null) {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(fallbackValue), ms)
  })
  return Promise.race([promise, timeout])
}

/**
 * Get icon filename from Info.plist
 * @param {string} appPath - Path to .app bundle
 * @returns {string|null} Icon filename or null
 */
function getIconNameFromPlist(appPath) {
  const plistPath = path.join(appPath, 'Contents', 'Info.plist')
  if (!fs.existsSync(plistPath)) {
    return null
  }

  try {
    const plistContent = fs.readFileSync(plistPath, 'utf8')

    // Try CFBundleIconFile first (most common)
    let match = plistContent.match(/<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/)
    if (match && match[1]) {
      let iconName = match[1].trim()
      if (!iconName.endsWith('.icns')) {
        iconName = iconName + '.icns'
      }
      return iconName
    }

    // Try CFBundleIconName (newer apps)
    match = plistContent.match(/<key>CFBundleIconName<\/key>\s*<string>([^<]+)<\/string>/)
    if (match && match[1]) {
      let iconName = match[1].trim()
      if (!iconName.endsWith('.icns')) {
        iconName = iconName + '.icns'
      }
      return iconName
    }

    return null
  } catch (error) {
    logger.error(`[IconExtractor] Failed to read Info.plist for ${path.basename(appPath)}:`, error.message)
    return null
  }
}

/**
 * Extract app icon as base64 PNG
 * @param {string} appPath - Path to .app bundle
 * @returns {Promise<string|null>} Base64 data URL or null
 */
function extractAppIconAsync(appPath) {
  return new Promise((resolve) => {
    const tempDir = os.tmpdir()
    const tempPngPath = path.join(tempDir, `app-icon-${Date.now()}-${Math.random().toString(36).slice(2, 11)}.png`)

    // Clean up temp file helper
    const cleanupTempFile = () => {
      try {
        if (fs.existsSync(tempPngPath)) {
          fs.unlinkSync(tempPngPath)
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // Get icon name from Info.plist
    const plistIconName = getIconNameFromPlist(appPath)

    // Build list of icon paths to try
    const iconPaths = []

    if (plistIconName) {
      iconPaths.push(path.join(appPath, 'Contents', 'Resources', plistIconName))
    }

    // Add common fallback names
    iconPaths.push(
      path.join(appPath, 'Contents', 'Resources', 'AppIcon.icns'),
      path.join(appPath, 'Contents', 'Resources', 'app.icns'),
      path.join(appPath, 'Contents', 'Resources', 'icon.icns'),
      path.join(appPath, 'Contents', 'Resources', 'application-logo.icns'),
    )

    // Helper to try extracting from a list of paths
    const tryExtractIcon = (paths, index = 0) => {
      if (index >= paths.length) {
        tryExtractFromResources()
        return
      }

      const iconPath = paths[index]
      if (fs.existsSync(iconPath)) {
        execFile('sips', ['-s', 'format', 'png', iconPath, '--out', tempPngPath, '-z', String(ICON_SIZE), String(ICON_SIZE)], { timeout: EXTRACTION_TIMEOUT_MS }, (error) => {
          if (!error && fs.existsSync(tempPngPath)) {
            try {
              const pngData = fs.readFileSync(tempPngPath)
              const base64 = pngData.toString('base64')
              cleanupTempFile()
              resolve(`data:image/png;base64,${base64}`)
            } catch (readError) {
              cleanupTempFile()
              tryExtractIcon(paths, index + 1)
            }
          } else {
            tryExtractIcon(paths, index + 1)
          }
        })
      } else {
        tryExtractIcon(paths, index + 1)
      }
    }

    // Try to find any .icns or .png in Resources folder
    const tryExtractFromResources = () => {
      const resourcesDir = path.join(appPath, 'Contents', 'Resources')
      if (fs.existsSync(resourcesDir)) {
        fs.readdir(resourcesDir, (error, files) => {
          if (error) {
            resolve(null)
            return
          }

          const iconFiles = files.filter(file => file.endsWith('.icns') || file.endsWith('.png'))
          if (iconFiles.length === 0) {
            resolve(null)
            return
          }

          // Prefer .icns files
          iconFiles.sort((a, b) => {
            if (a.endsWith('.icns') && !b.endsWith('.icns')) return -1
            if (!a.endsWith('.icns') && b.endsWith('.icns')) return 1
            return a.localeCompare(b)
          })

          const filePath = path.join(resourcesDir, iconFiles[0])
          execFile('sips', ['-s', 'format', 'png', filePath, '--out', tempPngPath, '-z', String(ICON_SIZE), String(ICON_SIZE)], { timeout: EXTRACTION_TIMEOUT_MS }, (error) => {
            if (!error && fs.existsSync(tempPngPath)) {
              try {
                const pngData = fs.readFileSync(tempPngPath)
                const base64 = pngData.toString('base64')
                cleanupTempFile()
                resolve(`data:image/png;base64,${base64}`)
              } catch (readError) {
                cleanupTempFile()
                resolve(null)
              }
            } else {
              resolve(null)
            }
          })
        })
      } else {
        resolve(null)
      }
    }

    // Start extraction process
    tryExtractIcon(iconPaths)
  })
}

/**
 * Extract icon with timeout
 * @param {string} appPath - Path to .app bundle
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<string|null>} Base64 data URL or null
 */
async function extractIconWithTimeout(appPath, timeoutMs = 10000) {
  return withTimeout(extractAppIconAsync(appPath), timeoutMs, null)
}

module.exports = {
  extractAppIconAsync,
  extractIconWithTimeout,
  getIconNameFromPlist,
}
