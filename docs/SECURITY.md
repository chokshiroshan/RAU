# Security Guide

This document covers security considerations, threat models, and best practices for RAU development and usage.

## 🔐 Security Model Overview

### Threat Model

RAU faces several potential security threats:

1. **Code Injection**: Malicious input in shell commands
2. **Privilege Escalation**: Accessing user files without permission
3. **AppleScript Injection**: Malicious scripts for browser control
4. **IPC Abuse**: Unauthorized communication between processes
5. **Data Exfiltration**: Sensitive data in search results

### Defense in Depth

We implement multiple layers of security:

```
┌─────────────────────────────────────────┐
│           User Interface              │
│    Input Sanitization & Display     │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│           IPC Bridge                │
│   Context Isolation & Validation    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         Main Process               │
│   System Call Validation & Exec    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         macOS APIs                │
│   Permission Checks & Limits      │
└───────────────────────────────────┘
```

## 🚫 Critical Security Rules

### 1. Never Use `exec()` - Always Use `execFile()`

**❌ DANGEROUS**:
```javascript
// Vulnerable to shell injection
exec(`open "${userInput}"`)
```

**✅ SECURE**:
```javascript
// Arguments passed as array, no shell interpretation
execFile('open', [validatedPath], { timeout: 5000 })
```

**Why**: `exec()` passes commands through shell, allowing injection. `execFile()` executes directly with argument array.

---

### 2. Context Isolation Must Remain Enabled

**Configuration**:
```javascript
// electron/preload.js
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,      // ❌ Never enable
    contextIsolation: true,       // ✅ Always enabled
    enableRemoteModule: false,    // ❌ Never enable
    preload: path.join(__dirname, 'preload.js')
  }
})
```

**Why**: Prevents renderer from accessing Node.js APIs directly.

---

### 3. All User Input Must Be Validated

**Input Validation Pipeline**:
```javascript
// 1. Frontend validation (basic)
if (typeof input !== 'string' || input.length === 0) {
  throw new Error('Invalid input')
}

// 2. IPC transport (via contextBridge)
const result = await electronAPI.invoke('channel', input)

// 3. Backend validation (comprehensive)
const validation = validateInput(input)
if (!validation.valid) {
  return { success: false, error: validation.error }
}

// 4. System execution with validated data
execFile('command', [validation.value], { timeout })
```

---

### 4. AppleScript Strings Must Be Escaped

**Escaping Function**:
```javascript
function escapeAppleScriptString(str) {
  return str
    .replace(/\\/g, '\\\\')      // Backslashes
    .replace(/"/g, '\\"')        // Double quotes
    .replace(/'/g, "\\'")        // Single quotes
    .replace(/\n/g, '\\n')       // Newlines
    .replace(/\r/g, '\\r')       // Carriage returns
    .replace(/\t/g, '\\t')       // Tabs
    .replace(/\(/g, '\\(')       // Parentheses (additional safety)
    .replace(/\)/g, '\\)')       // Closing parentheses
}
```

**Usage**:
```javascript
// ❌ DANGEROUS
const script = `tell application "Safari" to open location "${url}"`

// ✅ SECURE
const script = `tell application "Safari" to open location "${escapeAppleScriptString(url)}"`
```

---

### 5. Limited API Exposure via Preload Script

**Preload Script Pattern**:
```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron')

// Only expose necessary, safe APIs
contextBridge.exposeInMainWorld('electronAPI', {
  // ✅ Safe operations with validation
  openApp: (path) => ipcRenderer.invoke('open-app', path),
  getTabs: () => ipcRenderer.invoke('get-tabs'),
  
  // ❌ NEVER expose these
  // exec: require('child_process').exec,
  // fs: require('fs'),
  // shell: require('electron').shell
})
```

## 🔍 Input Validation Implementation

### Validation Functions

**File Path Validation**:
```javascript
// shared/validation/validators.js
export function validateFilePath(path) {
  // Type checking
  if (typeof path !== 'string') {
    return { valid: false, error: 'Path must be string' }
  }
  
  // Length limits
  if (path.length === 0 || path.length > 4096) {
    return { valid: false, error: 'Invalid path length' }
  }
  
  // Directory traversal prevention
  if (path.includes('..') || path.includes('~')) {
    return { valid: false, error: 'Path traversal detected' }
  }
  
  // Dangerous characters
  const dangerousChars = /[<>:"|?*\x00-\x1f]/
  if (dangerousChars.test(path)) {
    return { valid: false, error: 'Invalid characters in path' }
  }
  
  // Must be absolute path
  if (!path.startsWith('/')) {
    return { valid: false, error: 'Must be absolute path' }
  }
  
  // File existence check (in main process)
  try {
    const exists = fs.existsSync(path)
    if (!exists) {
      return { valid: false, error: 'File does not exist' }
    }
  } catch (error) {
    return { valid: false, error: 'Cannot access file' }
  }
  
  return { valid: true, value: path }
}
```

**App Path Validation**:
```javascript
export function validateAppPath(path) {
  const fileValidation = validateFilePath(path)
  if (!fileValidation.valid) {
    return fileValidation
  }
  
  // Must end with .app
  if (!path.endsWith('.app')) {
    return { valid: false, error: 'Must be an application bundle' }
  }
  
  // Check if it's actually a valid app bundle
  const infoPlistPath = path.join(path, 'Contents', 'Info.plist')
  if (!fs.existsSync(infoPlistPath)) {
    return { valid: false, error: 'Invalid app bundle' }
  }
  
  return { valid: true, value: path }
}
```

**URL Validation**:
```javascript
export function validateUrlProtocol(url) {
  if (typeof url !== 'string') {
    return { valid: false, error: 'URL must be string' }
  }
  
  const allowedProtocols = ['http:', 'https:', 'file:', 'mailto:']
  const urlObj = new URL(url)
  
  if (!allowedProtocols.includes(urlObj.protocol)) {
    return { valid: false, error: 'Protocol not allowed' }
  }
  
  // Prevent javascript: and data: URLs
  if (urlObj.protocol === 'javascript:' || urlObj.protocol === 'data:') {
    return { valid: false, error: 'Dangerous protocol blocked' }
  }
  
  return { valid: true, value: url }
}
```

---

### IPC Handler Security Template

**Secure Handler Pattern**:
```javascript
// electron/main-process/handlers/actionHandler.js
async function secureHandler(_event, params) {
  // 1. Input validation
  const validation = validateInput(params)
  if (!validation.valid) {
    logger.error('[Handler] Validation failed:', validation.error)
    return { success: false, error: 'Invalid input' }
  }
  
  // 2. Rate limiting (if needed)
  if (isRateLimited(_event.sender.id)) {
    return { success: false, error: 'Rate limited' }
  }
  
  // 3. Permission check
  if (!hasPermission(_event.sender, operation)) {
    return { success: false, error: 'Permission denied' }
  }
  
  // 4. Safe execution
  try {
    const result = await performSecureOperation(validation.value)
    logger.log('[Handler] Operation completed successfully')
    return { success: true, data: result }
  } catch (error) {
    logger.error('[Handler] Operation failed:', error)
    return { success: false, error: 'Operation failed' }
  }
}
```

## 🍎 macOS Security Integration

### Permission Requirements

RAU requires these macOS permissions:

1. **Accessibility**: Required for AppleScript browser automation
2. **Automation**: Required for controlling other applications
3. **Full Disk Access**: Required for comprehensive file search
4. **Screen Recording**: Required for window management

### Permission Validation

**Check Permissions Programmatically**:
```javascript
// electron/services/permissions.js
const { systemPreferences } = require('electron')

function checkPermissions() {
  return {
    accessibility: systemPreferences.isTrustedAccessibilityClient(false),
    screenCapture: systemPreferences.getMediaAccessStatus('screen') === 'granted',
    fullDiskAccess: checkFullDiskAccess() // Custom implementation
  }
}
```

### Secure App Bundle Signing

**Entitlements Configuration**:
```xml
<!-- entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Apple Events for browser control -->
    <key>com.apple.security.cs.apple-events</key>
    <array>
        <string>com.apple.Safari</string>
        <string>com.google.Chrome</string>
        <string>com.brave.Browser</string>
    </array>
    
    <!-- File system access -->
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    
    <!-- Network access -->
    <key>com.apple.security.network.client</key>
    <true/>
</dict>
</plist>
```

---

## 🔒 Data Protection

### Sensitive Data Handling

**What We Collect**:
- Search queries (in memory only)
- Application names and paths
- Browser tab titles and URLs
- File names and paths (from Spotlight index)

**What We Don't Collect**:
- File contents
- Passwords or credentials
- Personal identification
- Usage analytics or telemetry

**Data Protection Measures**:

1. **In-Memory Only**: Search queries not persisted
2. **No Network**: All data processing happens locally
3. **No Logging**: No sensitive data logged to files
4. **Cache Encryption**: Encrypted cache storage (optional)

### Cache Security

**Secure Cache Implementation**:
```javascript
// electron/services/secureCache.js
const crypto = require('crypto')

class SecureCache {
  constructor(ttl, maxSize) {
    this.cache = new Map()
    this.ttl = ttl
    this.maxSize = maxSize
    this.encryptionKey = generateKey()
  }
  
  set(key, value) {
    // Encrypt sensitive data
    const encrypted = crypto.createCipher('aes-256-gcm', this.encryptionKey)
      .update(JSON.stringify(value), 'utf8', 'hex')
    
    this.cache.set(key, {
      data: encrypted,
      timestamp: Date.now()
    })
    
    this.enforceSizeLimit()
  }
  
  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    
    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    // Decrypt data
    try {
      const decrypted = crypto.createDecipher('aes-256-gcm', this.encryptionKey)
        .update(item.data, 'hex', 'utf8')
      return JSON.parse(decrypted)
    } catch {
      // Decryption failed - remove item
      this.cache.delete(key)
      return null
    }
  }
}
```

---

## 🚨 Common Security Pitfalls

### 1. eval() and Function Constructor

**❌ NEVER DO THIS**:
```javascript
// Extremely dangerous - arbitrary code execution
eval(userInput)
new Function(userInput)
setTimeout(userInput, 0)
```

**✅ ALTERNATIVES**:
```javascript
// Use JSON parsing for data
JSON.parse(userInput)

// Use command-specific functions
const commands = { sleep: () => /* ... */ }
commands[safeCommandName]()
```

### 2. Direct File System Access

**❌ DANGEROUS**:
```javascript
// Renderer accessing file system directly
const fs = require('fs')
fs.readFileSync(userPath) // Can read any file!
```

**✅ SECURE ALTERNATIVE**:
```javascript
// Via IPC with validation
const fileContent = await electronAPI.invoke('read-file', validatedPath)
```

### 3. Unsafe Shell Commands

**❌ DANGEROUS**:
```javascript
// Shell injection vulnerable
exec(`rm -rf "${userPath}"`)
exec(`find ~ -name "${userQuery}"`)
```

**✅ SECURE ALTERNATIVES**:
```javascript
// Use specific APIs
execFile('rm', ['-rf', validatedPath])
execFile('mdfind', ['-name', validatedQuery])
```

---

## 🛡️ Security Testing

### Penetration Testing Checklist

- [ ] **Input Validation**: All user inputs validated
- [ ] **Command Injection**: No shell command injection possible
- [ ] **Path Traversal**: Directory traversal attacks blocked
- [ ] **AppleScript Injection**: Script injection prevented
- [ ] **XSS**: No unsafe HTML rendering
- [ ] **Privilege Escalation**: No unauthorized system access
- [ ] **Data Exfiltration**: No sensitive data transmitted
- [ ] **Cache Poisoning**: Cache manipulation prevented

### Automated Security Scans

**NPM Audit**:
```bash
npm audit
npm audit fix
```

**Electron Security Checklist**:
```bash
npm install -g electron-security
electron-security-check
```

**Dependency Scanning**:
```bash
npm install -g snyk
snyk test
```

---

## 📋 Security Review Process

### Before Each Release

1. **Code Review**: Security-focused review of all changes
2. **Dependency Audit**: Check for vulnerable dependencies
3. **Permission Review**: Minimize required permissions
4. **Testing**: Run security test suite
5. **Documentation**: Update security docs if needed

### Responding to Security Issues

1. **Assessment**: Evaluate severity and impact
2. **Communication**: Transparent disclosure to users
3. **Patch**: Rapid fix development
4. **Verification**: Testing and validation
5. **Release**: Coordinated security update

---

## 🔧 Security Configuration

### Production Security Settings

**Electron Production Config**:
```javascript
// electron/main.js
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    webSecurity: true,           // Enable web security
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    sandbox: true                 // Enable sandbox
  }
})
```

**CSP Headers**:
```javascript
// Content Security Policy
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
```

### Development Security

**Development-Only Features**:
```javascript
if (process.env.NODE_ENV === 'development') {
  // Enable dev tools only in development
  mainWindow.webContents.openDevTools()
  
  // Allow unsafe eval for debugging
  global.unsafeEval = (code) => eval(code)
}
```

---

**Security is everyone's responsibility**. If you discover a security vulnerability, please report it privately and responsibly. 🛡️