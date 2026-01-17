---
name: macos-app-packaging
description: Provides comprehensive patterns, configurations, and best practices for packaging, signing, and distributing macOS Electron applications using Electron Builder, including code signing, notarization, and App Store submission. Use when creating distributable macOS packages, setting up code signing and notarization workflows, or configuring automated build and release pipelines.
---

# macOS App Packaging Skill

## Purpose
Provides comprehensive patterns, configurations, and best practices for packaging, signing, and distributing macOS Electron applications using Electron Builder, including code signing, notarization, and App Store submission.

## When to Use
- Creating distributable macOS packages for ContextSearch
- Setting up code signing and notarization workflows
- Configuring Electron Builder for macOS distribution
- Implementing automated build and release pipelines
- Troubleshooting packaging and distribution issues

## Key Patterns

### 1. Electron Builder Configuration

**Comprehensive macOS Build Configuration** (`electron-builder.json`):
```json
{
  "appId": "com.contextsearch.app",
  "productName": "ContextSearch",
  "directories": {
    "output": "dist",
    "buildResources": "build"
  },
  "files": [
    "dist/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "resources",
      "to": "Resources",
      "filter": ["**/*"]
    }
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      },
      {
        "target": "zip",
        "arch": ["x64", "arm64"]
      }
    ],
    "icon": "build/icon.icns",
    "bundleShortVersion": "1.0",
    "bundleVersion": "1.0.0",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist",
    "extendInfo": {
      "NSRequiresAquaSystemAppearance": false,
      "NSHighResolutionCapable": true,
      "NSSupportsAutomaticGraphicsSwitching": true,
      "NSAppTransportSecurity": {
        "NSAllowsArbitraryLoads": false,
        "NSAllowsLocalNetworking": true
      }
    },
    "darkModeSupport": true,
    "minimumSystemVersion": "10.15.0"
  },
  "dmg": {
    "title": "ContextSearch Installer",
    "icon": "build/dmg-icon.icns",
    "background": "build/dmg-background.png",
    "contents": [
      {
        "x": 130,
        "y": 220
      },
      {
        "x": 410,
        "y": 220,
        "type": "link",
        "path": "/Applications"
      }
    ],
    "window": {
      "size": {
        "width": 540,
        "height": 380
      }
    },
    "format": "UDZO"
  },
  "zip": {
    "title": "ContextSearch",
    "icon": "build/zip-icon.icns"
  },
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "context-search"
  },
  "afterSign": "scripts/notarize.js"
}
```

### 2. Entitlements Configuration

**macOS Entitlements** (`build/entitlements.mac.plist`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Apple Events for browser automation -->
    <key>com.apple.security.automation.apple-events</key>
    <array>
        <string>com.apple.Safari</string>
        <string>com.google.Chrome</string>
        <string>com.brave.Browser</string>
        <string>com.arc.Arc</string>
        <string>com.comet.Comet</string>
        <string>com.apple.Terminal</string>
    </array>

    <!-- File system access for app and file search -->
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>

    <!-- Network access for web search fallback -->
    <key>com.apple.security.network.client</key>
    <true/>

    <!-- Audio/Video access (if needed for future features) -->
    <key>com.apple.security.device.audio-input</key>
    <false/>
    <key>com.apple.security.device.camera</key>
    <false/>

    <!-- Print access (if needed for future features) -->
    <key>com.apple.security.print</key>
    <false/>

    <!-- Bluetooth access (if needed for future features) -->
    <key>com.apple.security.device.bluetooth</key>
    <false/>

    <!-- Calendar and Contacts access (if needed) -->
    <key>com.apple.security.personal-information.calendars</key>
    <false/>
    <key>com.apple.security.personal-information.address-book</key>
    <false/>

    <!-- Location access (if needed) -->
    <key>com.apple.security.personal-information.location</key>
    <false/>

    <!-- Photos access (if needed) -->
    <key>com.apple.security.personal-information.photos-library</key>
    <false/>
</dict>
</plist>
```

### 3. Notarization Script

**Automated Notarization** (`scripts/notarize.js`):
```javascript
// scripts/notarize.js
const { notarize } = require('electron-notarize')

module.exports = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') {
    return
  }

  const appName = context.packager.appInfo.productFilename

  return await notarize({
    appBundleId: 'com.contextsearch.app',
    appPath: `${appOutDir}/${appName}.app`,
    appleApi: {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    },
    tool: 'notarytool',
    allowRevocationChecks: true
  })
}
```

### 4. Build Scripts and Automation

**Package.json Build Scripts**:
```json
{
  "scripts": {
    "build": "vite build",
    "build:mac": "npm run build && electron-builder --mac",
    "build:mac-dmg": "npm run build && electron-builder --mac --publish=never",
    "build:mac-universal": "npm run build && electron-builder --mac --universal --publish=never",
    "dist": "npm run build && electron-builder --publish=never",
    "dist:mac": "npm run build && electron-builder --mac --publish=never",
    "sign": "npm run build && electron-builder --mac --publish=never",
    "notarize": "npm run build && electron-builder --mac --publish=never",
    "release": "npm run build && electron-builder --mac --publish=always",
    "clean": "rimraf dist build",
    "postinstall": "electron-builder install-app-deps"
  }
}
```

**Automated Build Script** (`scripts/build-mac.js`):
```javascript
// scripts/build-mac.js
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class MacBuildPipeline {
  constructor() {
    this.buildDir = path.join(__dirname, '..', 'dist')
    this.buildResources = path.join(__dirname, '..', 'build')
  }

  async run() {
    try {
      console.log('🚀 Starting macOS build pipeline...')

      // 1. Clean previous builds
      await this.clean()

      // 2. Validate environment
      await this.validateEnvironment()

      // 3. Build frontend
      await this.buildFrontend()

      // 4. Prepare build resources
      await this.prepareBuildResources()

      // 5. Build application
      await this.buildApplication()

      // 6. Sign application
      await this.signApplication()

      // 7. Notarize application
      await this.notarizeApplication()

      // 8. Create distributable packages
      await this.createPackages()

      console.log('✅ macOS build pipeline completed successfully!')

    } catch (error) {
      console.error('❌ Build pipeline failed:', error)
      process.exit(1)
    }
  }

  async clean() {
    console.log('🧹 Cleaning previous builds...')

    const dirsToClean = ['dist', 'build']
    for (const dir of dirsToClean) {
      if (fs.existsSync(dir)) {
        execSync(`rm -rf ${dir}`, { stdio: 'inherit' })
      }
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating build environment...')

    // Check for required environment variables
    const requiredEnvVars = ['APPLE_ID', 'APPLE_ID_PASSWORD', 'APPLE_TEAM_ID']
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`)
      }
    }

    // Check for Xcode command line tools
    try {
      execSync('xcodebuild -version', { stdio: 'pipe' })
    } catch (error) {
      throw new Error('Xcode command line tools not found. Install with: xcode-select --install')
    }

    // Check for certificates
    try {
      execSync('security find-identity -v -p codesigning', { stdio: 'pipe' })
    } catch (error) {
      throw new Error('No code signing certificates found. Install a developer certificate.')
    }
  }

  async buildFrontend() {
    console.log('📦 Building frontend...')
    execSync('npm run build', { stdio: 'inherit' })
  }

  async prepareBuildResources() {
    console.log('🎨 Preparing build resources...')

    // Create build directory if it doesn't exist
    if (!fs.existsSync(this.buildResources)) {
      fs.mkdirSync(this.buildResources, { recursive: true })
    }

    // Generate icon if needed
    await this.generateIcon()

    // Generate DMG background if needed
    await this.generateDmgBackground()

    // Copy entitlements file
    const entitlementsSource = path.join(__dirname, '..', 'entitlements.mac.plist')
    const entitlementsDest = path.join(this.buildResources, 'entitlements.mac.plist')
    if (fs.existsSync(entitlementsSource)) {
      fs.copyFileSync(entitlementsSource, entitlementsDest)
    }
  }

  async generateIcon() {
    console.log('🎨 Generating app icon...')

    const iconSource = path.join(__dirname, '..', 'assets', 'icon.png')
    const iconDest = path.join(this.buildResources, 'icon.icns')

    if (fs.existsSync(iconSource)) {
      // Use iconutil to generate .icns from .png
      const iconDir = path.join(this.buildResources, 'icon.iconset')
      fs.mkdirSync(iconDir, { recursive: true })

      // Copy icon to iconset
      execSync(`cp ${iconSource} ${iconDir}/icon_16x16.png`, { stdio: 'pipe' })
      execSync(`cp ${iconSource} ${iconDir}/icon_32x32.png`, { stdio: 'pipe' })
      execSync(`cp ${iconSource} ${iconDir}/icon_128x128.png`, { stdio: 'pipe' })
      execSync(`cp ${iconSource} ${iconDir}/icon_256x256.png`, { stdio: 'pipe' })
      execSync(`cp ${iconSource} ${iconDir}/icon_512x512.png`, { stdio: 'pipe' })

      // Generate .icns
      execSync(`iconutil -c icns ${iconDir}`, { stdio: 'inherit' })

      // Clean up iconset
      execSync(`rm -rf ${iconDir}`, { stdio: 'pipe' })
    }
  }

  async generateDmgBackground() {
    console.log('🎨 Generating DMG background...')

    const backgroundSource = path.join(__dirname, '..', 'assets', 'dmg-background.png')
    const backgroundDest = path.join(this.buildResources, 'dmg-background.png')

    if (fs.existsSync(backgroundSource)) {
      fs.copyFileSync(backgroundSource, backgroundDest)
    }
  }

  async buildApplication() {
    console.log('🔨 Building application...')
    execSync('npm run build:mac', { stdio: 'inherit' })
  }

  async signApplication() {
    console.log('✍️ Signing application...')

    const appName = 'ContextSearch'
    const appPath = path.join(this.buildDir, `${appName}.app`)

    if (fs.existsSync(appPath)) {
      // Sign the application
      execSync(`codesign --force --deep --sign "Developer ID Application: Your Name (${process.env.APPLE_TEAM_ID})" "${appPath}"`, { stdio: 'inherit' })

      // Verify signature
      execSync(`codesign --verify --verbose "${appPath}"`, { stdio: 'inherit' })
    }
  }

  async notarizeApplication() {
    console.log('📝 Notarizing application...')

    // Notarization is handled by the afterSign script in electron-builder
    // This is already configured in electron-builder.json
    execSync('npm run notarize', { stdio: 'inherit' })
  }

  async createPackages() {
    console.log('📦 Creating distributable packages...')

    // Create DMG
    execSync('npm run build:mac-dmg', { stdio: 'inherit' })

    // Create ZIP
    execSync('npm run build:mac-zip', { stdio: 'inherit' })
  }
}

// Run the build pipeline
if (require.main === module) {
  const pipeline = new MacBuildPipeline()
  pipeline.run()
}

module.exports = MacBuildPipeline
```

### 5. GitHub Actions CI/CD Pipeline

**Automated Build Workflow** (`.github/workflows/build-mac.yml`):
```yaml
name: Build macOS Application

on:
  push:
    branches: [ main, develop ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main ]

jobs:
  build-macos:
    runs-on: macos-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build:mac
      env:
        APPLE_ID: ${{ secrets.APPLE_ID }}
        APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
        APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: macos-build
        path: dist/

    - name: Release to GitHub
      if: startsWith(github.ref, 'refs/tags/v')
      uses: softprops/action-gh-release@v1
      with:
        files: dist/*.dmg
        draft: false
        prerelease: false
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Code Signing and Security

### 1. Developer Certificate Setup

**Certificate Management Script** (`scripts/setup-certificates.sh`):
```bash
#!/bin/bash

echo "🔑 Setting up code signing certificates..."

# Check for existing certificates
echo "Checking for existing certificates..."
security find-identity -v -p codesigning

# Import certificates if provided
if [ -f "certs/developer.p12" ]; then
    echo "Importing developer certificate..."
    security import certs/developer.p12 \
        -k ~/Library/Keychains/login.keychain-db \
        -P "$CERTIFICATE_PASSWORD" \
        -T /usr/bin/codesign
fi

# Verify certificate installation
echo "Verifying certificate installation..."
security find-identity -v -p codesigning

echo "✅ Certificate setup completed!"
```

### 2. Automated Signing Process

**Signing Verification Script** (`scripts/verify-signing.sh`):
```bash
#!/bin/bash

APP_PATH="$1"

if [ -z "$APP_PATH" ]; then
    echo "Usage: $0 <app-path>"
    exit 1
fi

echo "🔍 Verifying code signature for: $APP_PATH"

# Check if app is signed
codesign --verify --verbose "$APP_PATH"
SIGN_STATUS=$?

if [ $SIGN_STATUS -eq 0 ]; then
    echo "✅ App signature is valid"

    # Show signing details
    codesign -d --display "$APP_PATH"

    # Check for hardened runtime
    codesign -d --entitlements - "$APP_PATH"
else
    echo "❌ App signature is invalid or missing"
    exit 1
fi
```

## Distribution and Release Management

### 1. Version Management

**Version Bump Script** (`scripts/bump-version.js`):
```javascript
// scripts/bump-version.js
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class VersionBumper {
  constructor() {
    this.packageJsonPath = path.join(__dirname, '..', 'package.json')
    this.electronBuilderPath = path.join(__dirname, '..', 'electron-builder.json')
  }

  async bumpVersion(type) {
    const validTypes = ['patch', 'minor', 'major']
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid version type: ${type}. Must be one of: ${validTypes.join(', ')}`)
    }

    console.log(`🔢 Bumping ${type} version...`)

    // Get current version
    const currentVersion = this.getCurrentVersion()
    console.log(`Current version: ${currentVersion}`)

    // Calculate new version
    const newVersion = this.calculateNewVersion(currentVersion, type)
    console.log(`New version: ${newVersion}`)

    // Update package.json
    this.updatePackageJson(newVersion)

    // Update electron-builder.json if needed
    this.updateElectronBuilder(newVersion)

    // Commit version change
    this.commitVersionChange(currentVersion, newVersion)

    // Create git tag
    this.createGitTag(newVersion)

    console.log(`✅ Version bumped to ${newVersion}`)
  }

  getCurrentVersion() {
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'))
    return packageJson.version
  }

  calculateNewVersion(currentVersion, type) {
    const [major, minor, patch] = currentVersion.split('.').map(Number)

    switch (type) {
      case 'patch':
        return `${major}.${minor}.${patch + 1}`
      case 'minor':
        return `${major}.${minor + 1}.0`
      case 'major':
        return `${major + 1}.0.0`
      default:
        throw new Error(`Unknown version type: ${type}`)
    }
  }

  updatePackageJson(newVersion) {
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'))
    packageJson.version = newVersion
    fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2))
  }

  updateElectronBuilder(newVersion) {
    if (fs.existsSync(this.electronBuilderPath)) {
      const electronBuilder = JSON.parse(fs.readFileSync(this.electronBuilderPath, 'utf8'))
      electronBuilder.mac.bundleVersion = newVersion
      fs.writeFileSync(this.electronBuilderPath, JSON.stringify(electronBuilder, null, 2))
    }
  }

  commitVersionChange(oldVersion, newVersion) {
    execSync(`git add package.json electron-builder.json`, { stdio: 'inherit' })
    execSync(`git commit -m "chore: bump version from ${oldVersion} to ${newVersion}"`, { stdio: 'inherit' })
  }

  createGitTag(version) {
    const tag = `v${version}`
    execSync(`git tag ${tag}`, { stdio: 'inherit' })
    execSync(`git push origin ${tag}`, { stdio: 'inherit' })
  }
}

// CLI interface
if (require.main === module) {
  const type = process.argv[2]
  if (!type) {
    console.log('Usage: node bump-version.js <patch|minor|major>')
    process.exit(1)
  }

  const bumper = new VersionBumper()
  bumper.bumpVersion(type).catch(error => {
    console.error('Error bumping version:', error)
    process.exit(1)
  })
}

module.exports = VersionBumper
```

### 2. Release Automation

**Release Script** (`scripts/release.js`):
```javascript
// scripts/release.js
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class ReleaseManager {
  constructor() {
    this.distDir = path.join(__dirname, '..', 'dist')
  }

  async performRelease() {
    try {
      console.log('🚀 Starting release process...')

      // 1. Validate environment
      await this.validateReleaseEnvironment()

      // 2. Clean and build
      await this.cleanAndBuild()

      // 3. Sign and notarize
      await this.signAndNotarize()

      // 4. Create release packages
      await this.createReleasePackages()

      // 5. Generate release notes
      await this.generateReleaseNotes()

      // 6. Upload to distribution platform
      await this.uploadToDistribution()

      console.log('✅ Release completed successfully!')

    } catch (error) {
      console.error('❌ Release failed:', error)
      process.exit(1)
    }
  }

  async validateReleaseEnvironment() {
    console.log('🔍 Validating release environment...')

    // Check if we're on the main branch
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
    if (branch !== 'main') {
      throw new Error(`Must be on main branch to release. Current branch: ${branch}`)
    }

    // Check if working directory is clean
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim()
    if (status) {
      throw new Error('Working directory must be clean to release')
    }

    // Check for required environment variables
    const requiredEnv = ['APPLE_ID', 'APPLE_ID_PASSWORD', 'APPLE_TEAM_ID', 'GITHUB_TOKEN']
    for (const envVar of requiredEnv) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`)
      }
    }
  }

  async cleanAndBuild() {
    console.log('🧹 Cleaning and building...')
    execSync('npm run clean', { stdio: 'inherit' })
    execSync('npm run build', { stdio: 'inherit' })
    execSync('npm run build:mac', { stdio: 'inherit' })
  }

  async signAndNotarize() {
    console.log('✍️ Signing and notarizing...')
    execSync('npm run sign', { stdio: 'inherit' })
    execSync('npm run notarize', { stdio: 'inherit' })
  }

  async createReleasePackages() {
    console.log('📦 Creating release packages...')

    // Create DMG
    execSync('electron-builder --mac --publish=never', { stdio: 'inherit' })

    // Verify packages were created
    const dmgFiles = fs.readdirSync(this.distDir).filter(file => file.endsWith('.dmg'))
    if (dmgFiles.length === 0) {
      throw new Error('No DMG files were created')
    }

    console.log(`Created ${dmgFiles.length} DMG files: ${dmgFiles.join(', ')}`)
  }

  async generateReleaseNotes() {
    console.log('📝 Generating release notes...')

    const version = require('../package.json').version
    const releaseNotes = this.generateReleaseNotesContent(version)

    const notesPath = path.join(this.distDir, `RELEASE_NOTES_v${version}.md`)
    fs.writeFileSync(notesPath, releaseNotes)

    console.log(`Release notes saved to: ${notesPath}`)
  }

  generateReleaseNotesContent(version) {
    return `# ContextSearch v${version}

## 🚀 What's New

### Features
- Enhanced search performance and accuracy
- Improved browser integration
- Updated user interface with better accessibility
- Bug fixes and stability improvements

### 📦 Installation

### DMG (Recommended)
1. Download the DMG file from the releases page
2. Double-click to open
3. Drag ContextSearch to Applications folder
4. Launch from Applications or Spotlight

### System Requirements
- macOS 10.15 (Catalina) or later
- Apple Silicon (M1/M2) or Intel Mac

## 🔧 Technical Details

- Built with Electron ${require('electron/package.json').version}
- React ${require('react/package.json').version}
- Node.js ${require('../package.json').engines.node}

## 🐛 Bug Reports

Please report issues on our GitHub repository.

## 📄 License

MIT License - see LICENSE file for details.
`
  }

  async uploadToDistribution() {
    console.log('📤 Uploading to distribution platform...')

    // Upload to GitHub Releases
    const version = require('../package.json').version
    const tag = `v${version}`

    // This would be handled by the GitHub Actions workflow
    console.log('Upload will be handled by GitHub Actions workflow')
  }
}

// CLI interface
if (require.main === module) {
  const manager = new ReleaseManager()
  manager.performRelease().catch(error => {
    console.error('Release failed:', error)
    process.exit(1)
  })
}

module.exports = ReleaseManager
```

## Common Pitfalls and Solutions

### Pitfall 1: Code Signing Issues
**Problem**: "Code sign error" or "No valid certificates."

**Solutions**:
```bash
# Check for certificates
security find-identity -v -p codesigning

# Install Xcode command line tools
xcode-select --install

# Import certificate (if you have .p12 file)
security import certificate.p12 -k ~/Library/Keychains/login.keychain-db

# Verify certificate
codesign --verify --verbose YourApp.app
```

### Pitfall 2: Notarization Failures
**Problem**: Notarization fails with "Invalid package" error.

**Solutions**:
```bash
# Check app bundle structure
spctl -a -v YourApp.app

# Re-sign app if needed
codesign --force --deep --sign "Developer ID Application" YourApp.app

# Check for entitlements
codesign -d --entitlements - YourApp.app

# Retry notarization
electron-builder --mac --publish=never
```

### Pitfall 3: Gatekeeper Blocking
**Problem**: App is blocked by Gatekeeper after installation.

**Solutions**:
```bash
# Check app signature
spctl -a -v YourApp.app

# If blocked, user needs to:
# 1. Right-click app and select "Open"
# 2. Click "Open" in security dialog
# 3. Or go to System Preferences → Security & Privacy → General and click "Allow Anyway"
```

## When to Use This Skill
Use this skill when:
- Creating distributable macOS packages
- Setting up code signing and notarization
- Configuring automated build pipelines
- Troubleshooting packaging issues
- Managing releases and version control
- Setting up CI/CD for macOS applications

## Related Files
- `electron-builder.json` - Build configuration
- `build/entitlements.mac.plist` - macOS entitlements
- `scripts/notarize.js` - Notarization script
- `scripts/build-mac.js` - Build pipeline
- `.github/workflows/build-mac.yml` - CI/CD pipeline
