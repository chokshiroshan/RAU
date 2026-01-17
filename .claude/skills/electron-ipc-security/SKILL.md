---
name: electron-ipc-security
description: Provides secure patterns and best practices for implementing Inter-Process Communication (IPC) in Electron applications, ensuring security, validation, and proper error handling. Use when implementing new IPC handlers, exposing new APIs to renderer, securing existing IPC communication, setting up context isolation and preload scripts, or validating user input across process boundaries.
# Electron IPC Security Skill

## Purpose
Provides secure patterns and best practices for implementing Inter-Process Communication (IPC) in Electron applications, ensuring security, validation, and proper error handling.

## When to Use
- Implementing new IPC handlers in the main process
- Exposing new APIs to the renderer process
- Securing existing IPC communication
- Setting up context isolation and preload scripts
- Validating user input across process boundaries

## Key Patterns

### 1. Secure IPC Handler Template

**Main Process Handler**:
```javascript
// electron/main-process/handlers/secureHandler.js
const { validateInput } = require('../../../shared/validation/validators')
const logger = require('../logger')

/**
 * Secure IPC handler template
 * @param {Electron.IpcMainInvokeEvent} event - IPC event object
 * @param {any} params - User-provided parameters
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function secureHandler(event, params) {
  // 1. Input validation - ALWAYS validate user input
  const validation = validateInput(params)
  if (!validation.valid) {
    logger.error('[Handler] Input validation failed:', validation.error)
    return { success: false, error: 'Invalid input parameters' }
  }
  
  // 2. Authorization check (if needed)
  if (!hasPermission(event.sender, 'operation-name')) {
    logger.warn('[Handler] Unauthorized access attempt')
    return { success: false, error: 'Permission denied' }
  }
  
  // 3. Rate limiting (optional but recommended)
  if (isRateLimited(event.sender.id)) {
    logger.warn('[Handler] Rate limited request')
    return { success: false, error: 'Too many requests' }
  }
  
  // 4. Execute operation with proper error handling
  try {
    const result = await performSecureOperation(validation.value)
    logger.log('[Handler] Operation completed successfully')
    return { success: true, data: result }
  } catch (error) {
    logger.error('[Handler] Operation failed:', error)
    return { 
      success: false, 
      error: error.message || 'Operation failed' 
    }
  }
}

module.exports = { secureHandler }
```

### 2. Secure Preload Script Pattern

**Preload Script** (`electron/preload.js`):
```javascript
const { contextBridge, ipcRenderer } = require('electron')

/**
 * Secure preload script with limited API exposure
 * Only expose necessary, validated operations to renderer
 */
const secureAPI = {
  // === File Operations ===
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  searchFiles: (query) => ipcRenderer.invoke('search-files', query),
  
  // === Application Operations ===
  openApp: (appPath) => ipcRenderer.invoke('open-app', appPath),
  getApps: () => ipcRenderer.invoke('get-apps'),
  getAppIcon: (appPath) => ipcRenderer.invoke('get-app-icon', appPath),
  
  // === Browser Tab Operations ===
  getTabs: () => ipcRenderer.invoke('get-tabs'),
  activateTab: (tabData) => ipcRenderer.invoke('activate-tab', tabData),
  
  // === Settings Operations ===
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // === Window Operations ===
  resizeWindow: (dimensions) => ipcRenderer.invoke('resize-window', dimensions),
  hideWindow: () => ipcRenderer.send('hide-window'), // One-way message
  
  // === Event Subscriptions ===
  onWindowShown: (callback) => {
    const subscription = (_event, ...args) => callback(...args)
    ipcRenderer.on('window-shown', subscription)
    
    // Return unsubscribe function for cleanup
    return () => ipcRenderer.removeListener('window-shown', subscription)
  }
}

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('electronAPI', secureAPI)

// Security: Remove dangerous globals from renderer
delete window.require
delete window.process
delete window.global
delete window.Buffer
delete window.setImmediate
delete window.clearImmediate
```

### 3. Comprehensive Input Validation

**Validation Library** (`shared/validation/validators.js`):
```javascript
/**
 * File path validation with security checks
 */
function validateFilePath(filePath) {
  // Type checking
  if (typeof filePath !== 'string') {
    return { valid: false, error: 'Path must be a string' }
  }
  
  // Length limits
  if (filePath.length === 0 || filePath.length > 4096) {
    return { valid: false, error: 'Invalid path length' }
  }
  
  // Directory traversal prevention
  if (filePath.includes('..') || filePath.includes('~')) {
    return { valid: false, error: 'Path traversal detected' }
  }
  
  // Dangerous characters
  const dangerousChars = /[<>:"|?*\x00-\x1f]/
  if (dangerousChars.test(filePath)) {
    return { valid: false, error: 'Invalid characters in path' }
  }
  
  // Must be absolute path
  if (!filePath.startsWith('/')) {
    return { valid: false, error: 'Must be absolute path' }
  }
  
  return { valid: true, value: filePath }
}

/**
 * URL validation with protocol restrictions
 */
function validateUrlProtocol(url) {
  if (typeof url !== 'string') {
    return { valid: false, error: 'URL must be a string' }
  }
  
  try {
    const parsed = new URL(url)
    
    // Allow only safe protocols
    const allowedProtocols = ['http:', 'https:', 'file:', 'mailto:']
    if (!allowedProtocols.includes(parsed.protocol)) {
      return { valid: false, error: 'Protocol not allowed' }
    }
    
    // Block dangerous protocols
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      return { valid: false, error: 'Dangerous protocol blocked' }
    }
    
    return { valid: true, value: url }
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Positive integer validation for indices
 */
function validatePositiveInt(value) {
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 1 || num > 999999) {
    return { valid: false, error: 'Must be a positive integer' }
  }
  return { valid: true, value: num }
}

module.exports = {
  validateFilePath,
  validateUrlProtocol,
  validatePositiveInt
}
```

### 4. IPC Channel Security

**Channel Registry** (`src/constants/ipc.js`):
```javascript
// Centralized IPC channel definitions with security metadata
export const IPC_CHANNELS = {
  // Search/Data channels
  SEARCH_FILES: {
    name: 'search-files',
    requiresValidation: true,
    rateLimit: { max: 10, window: 1000 } // 10 requests per second
  },
  
  GET_APPS: {
    name: 'get-apps',
    requiresValidation: false,
    rateLimit: { max: 5, window: 10000 } // 5 requests per 10 seconds
  },
  
  GET_TABS: {
    name: 'get-tabs',
    requiresValidation: false,
    rateLimit: { max: 3, window: 10000 } // 3 requests per 10 seconds
  },
  
  // Action channels
  OPEN_FILE: {
    name: 'open-file',
    requiresValidation: true,
    rateLimit: { max: 20, window: 60000 } // 20 requests per minute
  },
  
  OPEN_APP: {
    name: 'open-app',
    requiresValidation: true,
    rateLimit: { max: 10, window: 60000 } // 10 requests per minute
  },
  
  ACTIVATE_TAB: {
    name: 'activate-tab',
    requiresValidation: true,
    rateLimit: { max: 30, window: 60000 } // 30 requests per minute
  }
}

// Extract just channel names for backward compatibility
export const CHANNEL_NAMES = Object.fromEntries(
  Object.entries(IPC_CHANNELS).map(([key, config]) => [key, config.name])
)
```

### 5. Rate Limiting Implementation

**Rate Limiter**:
```javascript
class RateLimiter {
  constructor() {
    this.requests = new Map() // Map<clientId, Array<timestamp>>
  }
  
  isAllowed(clientId, maxRequests, windowMs) {
    const now = Date.now()
    const clientRequests = this.requests.get(clientId) || []
    
    // Clean old requests outside window
    const validRequests = clientRequests.filter(timestamp => 
      now - timestamp < windowMs
    )
    
    // Check if under limit
    if (validRequests.length >= maxRequests) {
      return false
    }
    
    // Add current request and update
    validRequests.push(now)
    this.requests.set(clientId, validRequests)
    return true
  }
  
  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now()
    for (const [clientId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => 
        now - timestamp < 60000 // Keep 1 minute of history
      )
      
      if (validRequests.length === 0) {
        this.requests.delete(clientId)
      } else {
        this.requests.set(clientId, validRequests)
      }
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter()

// Cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 300000)
```

## Common Pitfalls and Solutions

### Pitfall 1: Exposing Dangerous APIs
**Problem**: Exposing `require`, `process`, or `fs` to renderer.

**Solution**:
```javascript
// ❌ DANGEROUS - Never do this
contextBridge.exposeInMainWorld('electronAPI', {
  fs: require('fs'),           // DANGEROUS
  exec: require('child_process').exec, // DANGEROUS
  shell: require('electron').shell  // DANGEROUS
})

// ✅ SECURE - Only expose safe, validated operations
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (path) => ipcRenderer.invoke('open-file', path), // Validated
  readFile: (path) => ipcRenderer.invoke('read-file', path) // Validated
})
```

### Pitfall 2: No Input Validation
**Problem**: Trusting user input from renderer process.

**Solution**:
```javascript
// ❌ VULNERABLE - No validation
async function openFile(_event, filePath) {
  execFile('open', [filePath]) // Dangerous - could be any file
}

// ✅ SECURE - Always validate
async function openFile(_event, filePath) {
  const validation = validateFilePath(filePath)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }
  
  return execFile('open', [validation.value])
}
```

### Pitfall 3: Using exec() Instead of execFile()
**Problem**: Using shell commands allows injection attacks.

**Solution**:
```javascript
// ❌ VULNERABLE - Shell injection
exec(`open "${userInput}"`) // User could inject "; rm -rf /"

// ✅ SECURE - Arguments as array
execFile('open', [validatedPath]) // No shell interpretation
```

### Pitfall 4: Insecure Event Listeners
**Problem**: Not cleaning up event listeners causing memory leaks.

**Solution**:
```javascript
// ✅ SECURE - Proper cleanup
const setupEventListeners = () => {
  const handleWindowShown = (_event, data) => {
    console.log('Window shown:', data)
  }
  
  ipcRenderer.on('window-shown', handleWindowShown)
  
  // Return cleanup function
  return () => {
    ipcRenderer.removeListener('window-shown', handleWindowShown)
  }
}

// Use in component
useEffect(() => {
  const cleanup = setupEventListeners()
  return cleanup // React will call this on unmount
}, [])
```

## Testing Security

### 1. Input Validation Testing
```javascript
// Test validation functions
describe('Input Validation', () => {
  test('should reject path traversal', () => {
    const result = validateFilePath('../../../etc/passwd')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Path traversal')
  })
  
  test('should reject dangerous protocols', () => {
    const result = validateUrlProtocol('javascript:alert("xss")')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Dangerous protocol')
  })
})
```

### 2. IPC Security Testing
```javascript
// Test IPC handlers with malicious input
describe('IPC Security', () => {
  test('should handle malicious file paths', async () => {
    const result = await ipcRenderer.invoke('open-file', '../../../etc/passwd')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid input')
  })
})
```

## Performance Considerations

### 1. Efficient Data Transfer
```javascript
// Minimize data transferred over IPC
const optimizedResults = largeResults.map(result => ({
  id: result.id,
  name: result.name,
  type: result.type
  // Only include essential fields, not large objects
}))

// Use structured clone algorithm for efficiency
const clonedData = JSON.parse(JSON.stringify(data))
```

### 2. Batch Operations
```javascript
// Batch multiple operations instead of individual IPC calls
const batchOpenFiles = async (filePaths) => {
  return await ipcRenderer.invoke('batch-open-files', filePaths)
}

// Instead of:
// filePaths.forEach(path => ipcRenderer.invoke('open-file', path))
```

## Debugging IPC Security

### 1. Enable IPC Logging
```javascript
// Add to preload script for debugging
if (process.env.NODE_ENV === 'development') {
  const originalInvoke = ipcRenderer.invoke
  ipcRenderer.invoke = (channel, ...args) => {
    console.log(`[IPC OUT] ${channel}:`, args)
    return originalInvoke(channel, ...args).then(result => {
      console.log(`[IPC IN] ${channel}:`, result)
      return result
    })
  }
}
```

### 2. Security Audit Checklist
- [ ] All user input validated before processing
- [ ] No dangerous APIs exposed to renderer
- [ ] Context isolation enabled
- [ ] Rate limiting implemented for expensive operations
- [ ] Error messages don't leak sensitive information
- [ ] Event listeners properly cleaned up
- [ ] File operations use absolute paths only
- [ ] Shell commands use execFile() with argument arrays

## When to Use This Skill
Use this skill when:
- Creating new IPC channels or handlers
- Reviewing existing IPC security
- Setting up context isolation and preload scripts
- Implementing input validation across process boundaries
- Securing Electron applications against malicious renderer code
- Optimizing IPC communication performance

## Related Documentation
- [Security Guide](docs/SECURITY.md) - Comprehensive security practices
- [Architecture Guide](docs/ARCHITECTURE.md) - IPC design patterns
- [API Reference](docs/API.md) - Complete channel documentation
- [Electron Architecture Agent](.claude/agents/electron-architecture-agent.md) - Architecture patterns