# Contributing to RAU

We welcome contributions! This guide will help you get set up for development and understand our contribution process.

## 🚀 Quick Start

### Prerequisites
- macOS 11+ (required for Spotlight integration)
- Node.js 18+ 
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/chokshiroshan/RAU.git
cd RAU

# Install dependencies
npm install

# Build the frontend
npm run build

# Start the development environment
npm run dev
```

### First Run

1. **Build**: Always run `npm run build` before `npm start`
2. **Permissions**: Grant Accessibility permissions when prompted
3. **Hotkey**: Use `Cmd+Shift+Space` to toggle the search window
4. **Onboarding**: Complete the onboarding flow to select browsers

## 🛠️ Development Workflow

### 1. Code Style & Conventions

#### File Organization
- **Components**: `src/components/ComponentName.jsx` (PascalCase)
- **Frontend Services**: `src/services/serviceName.js` (camelCase)
- **Main Services**: `electron/main-process/services/serviceName.js` (camelCase)
- **Constants**: `src/constants/CONSTANT_NAME.js` (UPPER_SNAKE_CASE)
- **Tests**: `tests/serviceName.test.js` (descriptive)

#### Code Standards
```javascript
// Functional components with hooks
const ComponentName = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue)
  
  const handleAction = useCallback(() => {
    // Action logic
  }, [dependencies])
  
  return (
    <div className="component-class">
      {/* JSX content */}
    </div>
  )
}

// Services with error handling
export async function serviceFunction(params) {
  if (!ipcRenderer) return defaultValue
  
  try {
    const result = await ipcRenderer.invoke('channel-name', params)
    return result
  } catch (error) {
    console.error('[ServiceName] Error:', error)
    return defaultValue
  }
}
```

#### CSS (Tailwind)
- Use utility classes for consistency
- Implement responsive design with responsive prefixes
- Use semantic HTML elements
- Avoid inline styles except for dynamic values

### 2. Testing Requirements

#### Running Tests
```bash
# Run all tests
npm run test:all

# Run specific test suites
npm test              # Core search functionality
npm run test:tabs      # Browser tab integration
```

#### Writing Tests
```javascript
import { test, describe, mock } from 'node:test'
import assert from 'node:assert'

// Test service functions
test('service function works correctly', async () => {
  const mockIPC = {
    invoke: async (channel, params) => {
      if (channel === 'test-channel') return { success: true }
      throw new Error('Unknown channel')
    }
  }
  
  // Mock the IPC renderer
  global.window = { electronAPI: mockIPC }
  
  const result = await serviceFunction('test-param')
  assert.strictEqual(result, { success: true })
})
```

#### Test Coverage
- Aim for >80% coverage on new code
- Test both success and error scenarios
- Mock external dependencies properly
- Test edge cases and boundary conditions

### 3. Security Requirements

#### Critical Rules
1. **Always use `execFile()`** - Never use `exec()` for shell commands
2. **Validate all input** - Use validators in `shared/validation/`
3. **Escape AppleScript strings** - Prevent script injection
4. **Context isolation enabled** - No direct Node.js access in renderer
5. **Secure IPC patterns** - Limited API exposure via preload script

#### Input Validation
```javascript
import { validateFilePath, validatePositiveInt } from '../../../shared/validation/validators'

async function handleRequest(_event, params) {
  const validation = validateFilePath(params.path)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }
  
  // Process validated input
  return { success: true, data: validation.value }
}
```

### 4. Performance Guidelines

#### Search Performance
- **Parallel searches**: Execute all search types concurrently
- **Intelligent caching**: Cache results with appropriate TTL
- **Debouncing**: Use 150ms debounce on search input
- **Result limiting**: Limit to 20 results maximum

#### Memory Management
- **Cache limits**: Enforce maximum cache sizes (icons: 100, etc.)
- **Cleanup**: Remove event listeners and intervals properly
- **Virtualization**: Use virtual scrolling for large lists
- **Resource monitoring**: Check for memory leaks

## 📝 Pull Request Process

### 1. Branch Strategy
- Create feature branch from `main`: `git checkout -b feature/your-feature-name`
- Keep branches focused and small
- Use descriptive commit messages

### 2. Before Submitting PR
- [ ] All tests pass: `npm run test:all`
- [ ] Code follows style guidelines
- [ ] No console errors in development
- [ ] Documentation updated if needed
- [ ] Performance impact considered
- [ ] Security review completed

### 3. PR Template
```markdown
## Description
Brief description of the change and why it's needed.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] Manual testing completed
- [ ] Edge cases considered

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No security vulnerabilities
```

## 🐛 Bug Reports

### Bug Report Template
```markdown
## Description
Clear description of the bug.

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What should have happened.

## Actual Behavior
What actually happened.

## Environment
- macOS version:
- RAU version:
- Browser versions:

## Additional Context
Add any other context about the problem.
```

## 💡 Feature Requests

### Feature Request Template
```markdown
## Problem Description
What problem are you trying to solve?

## Proposed Solution
How would you like to solve it?

## Alternatives Considered
What other approaches did you consider?

## Additional Context
Add any other context or screenshots.
```

## 🔧 Development Tools

### Debugging
```bash
# Enable debug logging
DEBUG=1 npm start

# Monitor performance
npm run test:all
```

### Useful VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense

## 📚 Resources

### Documentation
- [Architecture Guide](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Security Guide](docs/SECURITY.md)

### External Resources
- [Electron Documentation](https://electronjs.org/docs)
- [React Documentation](https://react.dev)
- [Fuse.js Documentation](https://fusejs.io)
- [Tailwind CSS](https://tailwindcss.com)

## 🤝 Getting Help

- **Discord**: Join our community for real-time help
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to RAU!** 🙏