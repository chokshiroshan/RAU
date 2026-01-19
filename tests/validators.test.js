const { test, describe } = require('node:test')
const assert = require('node:assert')

const {
  validateFilePath,
  validateAppPath,
  validatePositiveInt,
  validateUrlProtocol,
  validateSearchQuery,
  validatePluginFilename,
  validateShortcutName,
  sanitizeMdfindQuery,
} = require('../shared/validation/validators')

describe('validatePluginFilename', () => {
  test('accepts valid plugin filename', () => {
    const result = validatePluginFilename('my-plugin.applescript')
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.value, 'my-plugin.applescript')
  })

  test('accepts filename with spaces', () => {
    const result = validatePluginFilename('My Custom Plugin.applescript')
    assert.strictEqual(result.valid, true)
  })

  test('accepts filename with underscores', () => {
    const result = validatePluginFilename('my_plugin_v2.applescript')
    assert.strictEqual(result.valid, true)
  })

  test('rejects filename without .applescript extension', () => {
    const result = validatePluginFilename('malicious.sh')
    assert.strictEqual(result.valid, false)
    assert.ok(result.error.includes('.applescript'))
  })

  test('rejects path traversal with slashes', () => {
    const result = validatePluginFilename('../../../etc/passwd.applescript')
    assert.strictEqual(result.valid, false)
    assert.ok(result.error.includes('traversal'))
  })

  test('rejects path traversal with backslashes', () => {
    const result = validatePluginFilename('..\\..\\malicious.applescript')
    assert.strictEqual(result.valid, false)
  })

  test('rejects double dots', () => {
    const result = validatePluginFilename('..hidden.applescript')
    assert.strictEqual(result.valid, false)
  })

  test('rejects absolute path', () => {
    const result = validatePluginFilename('/tmp/evil.applescript')
    assert.strictEqual(result.valid, false)
  })

  test('rejects empty filename', () => {
    const result = validatePluginFilename('')
    assert.strictEqual(result.valid, false)
  })

  test('rejects null', () => {
    const result = validatePluginFilename(null)
    assert.strictEqual(result.valid, false)
  })

  test('rejects special characters in basename', () => {
    const result = validatePluginFilename('evil$(whoami).applescript')
    assert.strictEqual(result.valid, false)
    assert.ok(result.error.includes('invalid characters'))
  })
})

describe('validateShortcutName', () => {
  test('accepts valid shortcut name', () => {
    const result = validateShortcutName('My Cool Shortcut')
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.value, 'My Cool Shortcut')
  })

  test('accepts shortcut name with numbers', () => {
    const result = validateShortcutName('Shortcut 2023')
    assert.strictEqual(result.valid, true)
  })

  test('rejects name starting with hyphen (flag injection)', () => {
    const result = validateShortcutName('--help')
    assert.strictEqual(result.valid, false)
    assert.ok(result.error.includes('hyphen'))
  })

  test('rejects name starting with single hyphen', () => {
    const result = validateShortcutName('-v')
    assert.strictEqual(result.valid, false)
  })

  test('rejects shell metacharacters - backtick', () => {
    const result = validateShortcutName('test`whoami`')
    assert.strictEqual(result.valid, false)
  })

  test('rejects shell metacharacters - dollar sign', () => {
    const result = validateShortcutName('test$(whoami)')
    assert.strictEqual(result.valid, false)
  })

  test('rejects shell metacharacters - pipe', () => {
    const result = validateShortcutName('test | cat /etc/passwd')
    assert.strictEqual(result.valid, false)
  })

  test('rejects shell metacharacters - semicolon', () => {
    const result = validateShortcutName('test; rm -rf /')
    assert.strictEqual(result.valid, false)
  })

  test('rejects empty name', () => {
    const result = validateShortcutName('')
    assert.strictEqual(result.valid, false)
  })

  test('rejects whitespace-only name', () => {
    const result = validateShortcutName('   ')
    assert.strictEqual(result.valid, false)
  })

  test('rejects null', () => {
    const result = validateShortcutName(null)
    assert.strictEqual(result.valid, false)
  })

  test('rejects overly long name', () => {
    const result = validateShortcutName('x'.repeat(501))
    assert.strictEqual(result.valid, false)
    assert.ok(result.error.includes('too long'))
  })
})

describe('sanitizeMdfindQuery', () => {
  test('escapes double quotes', () => {
    const result = sanitizeMdfindQuery('test"name')
    assert.strictEqual(result, 'test\\"name')
  })

  test('escapes backslashes', () => {
    const result = sanitizeMdfindQuery('test\\name')
    assert.strictEqual(result, 'test\\\\name')
  })

  test('escapes both quotes and backslashes', () => {
    const result = sanitizeMdfindQuery('test\\"name')
    assert.strictEqual(result, 'test\\\\\\"name')
  })

  test('returns empty string for null', () => {
    const result = sanitizeMdfindQuery(null)
    assert.strictEqual(result, '')
  })

  test('returns empty string for non-string', () => {
    const result = sanitizeMdfindQuery(123)
    assert.strictEqual(result, '')
  })

  test('leaves normal strings unchanged', () => {
    const result = sanitizeMdfindQuery('Safari')
    assert.strictEqual(result, 'Safari')
  })
})

describe('existing validators still work', () => {
  test('validateFilePath blocks path traversal', () => {
    const result = validateFilePath('../../../etc/passwd')
    assert.strictEqual(result.valid, false)
  })

  test('validateFilePath accepts valid path', () => {
    const result = validateFilePath('/Applications/Safari.app')
    assert.strictEqual(result.valid, true)
  })

  test('validateAppPath requires .app extension', () => {
    const result = validateAppPath('/usr/bin/bash')
    assert.strictEqual(result.valid, false)
  })

  test('validateUrlProtocol blocks javascript protocol', () => {
    const result = validateUrlProtocol('javascript:alert(1)')
    assert.strictEqual(result.valid, false)
  })

  test('validateUrlProtocol allows https', () => {
    const result = validateUrlProtocol('https://google.com')
    assert.strictEqual(result.valid, true)
  })

  test('validateSearchQuery sanitizes dangerous characters', () => {
    const result = validateSearchQuery('test$(whoami)')
    assert.strictEqual(result.valid, true)
    assert.ok(!result.value.includes('$'))
  })
})

console.log('\\nValidator tests completed!')
