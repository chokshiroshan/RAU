# RAU

A lightning-fast macOS launcher built with Electron + React. Search and open applications, browser tabs, and files from a single unified interface.

![RAU](https://img.shields.io/badge/macOS-11%2B-blue) ![Electron](https://img.shields.io/badge/Electron-latest-green) ![React](https://img.shields.io/badge/React-19-blue)

## ✨ Features

- **🚀 Lightning Fast**: Instant search across apps, tabs, and files
- **📱 Multi-Source**: Unified search for applications, browser tabs, and files
- **🤖 Scriptsmith AI**: Generate AppleScript automations with `/gen`
- **🔌 Plugins**: Extend functionality with custom `.applescript` plugins
- **⌨️ Keyboard-First**: Complete keyboard navigation and shortcuts
- **🖥️ Multi-Monitor**: Appears on the active screen with smart positioning
- **🌐 Browser Support**: Safari, Chrome, Brave, Arc, Comet, and Terminal tabs
- **🧮 Built-in Calculator**: Type math expressions for instant results
- **🔧 System Commands**: Sleep, lock, restart, and more
- **🎯 Always Available**: Works across all desktop spaces and fullscreen apps

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/chokshiroshan/RAU.git
cd RAU
npm install

# Build the React frontend
npm run build

# Start the application
npm start
```

## ⌨️ Usage

### Basic Controls
- **`Cmd+Shift+Space`**: Toggle search window
- **`Arrow Up/Down`**: Navigate results
- **`Enter`**: Open selected result
- **`Escape`**: Hide window
- **`Cmd+,`**: Open settings

### Search Types
- **Apps**: Type application names (e.g., "safari", "chrome", "terminal")
- **Tabs**: Search tab titles or URLs (e.g., "github", "youtube")
- **Files**: Search filenames using Spotlight (e.g., "package.json", "readme")
- **Math**: Type expressions (e.g., "2+2", "10*5")
- **Commands**: "sleep", "lock", "restart", "empty trash"
- **Web**: "g query" for Google search fallback

### 🤖 AI & Extensions
- **Scriptsmith**: Type `/gen open spotify and play weekly discovery` to generate automation scripts
- **Plugins**: Add `.applescript` files to `~/Documents/RAU/plugins` to create custom commands


## 🛠️ Development

### Environment Setup
```bash
# Install dependencies
npm install

# Development workflow
npm run build        # Build React frontend to dist/
npm run dev          # Start Vite dev server only
npm start           # Run the built Electron app

# Testing
npm test            # Run search tests
npm run test:tabs   # Run tab fetcher tests
npm run test:all    # Run all tests
```

### Project Architecture
```
RAU/
├── 📁 electron/                 # Electron main process
│   ├── main.js                  # Window management, hotkey, IPC handlers
│   ├── config.js                # Settings management and persistence
│   └── main-process/
│       ├── handlers/            # IPC request handlers
│       ├── services/            # Main process services
│       └── constants.js         # Main process configuration
├── 📁 src/                     # React renderer process
│   ├── components/              # React UI components
│   │   ├── App.jsx             # Main application container
│   │   ├── SearchBar.jsx       # Search input component
│   │   ├── ResultsList.jsx     # Results display with virtualization
│   │   └── Onboarding.jsx      # First-run experience
│   ├── services/               # Search and data services
│   │   ├── unifiedSearch.js    # Main search orchestrator
│   │   ├── tabFetcher.js       # Browser tab integration
│   │   ├── fileSearch.js       # File system search
│   │   ├── appSearch.js        # Application discovery
│   │   ├── commandSearch.js    # System commands
│   │   └── historyService.js   # Search history management
│   ├── constants/              # Configuration constants
│   ├── utils/                  # Utility functions
│   └── scripts/                # AppleScript for browser automation
├── 📁 tests/                   # Test suites
├── 📁 docs/                    # Documentation
└── 📄 settings.json            # User configuration (auto-generated)
```

### Key Technologies
- **Electron**: Cross-platform desktop app framework
- **React 19**: Modern UI with hooks and functional components
- **Tailwind CSS**: Utility-first styling
- **Fuse.js**: Fuzzy search with custom scoring
- **Vite**: Fast development and build tool
- **AppleScript**: Native macOS browser integration

## ⚙️ Configuration

### Settings Panel (`Cmd+,`)
- **Search Categories**: Toggle apps, tabs, files, commands
- **Browser Selection**: Choose which browsers to index
- **Performance**: Cache settings and timeouts
- **Privacy**: Clear history and manage data

### Configuration File (`settings.json`)
```json
{
  "searchApps": true,
  "searchTabs": true,
  "searchFiles": true,
  "searchCommands": true,
  "selectedApps": ["Safari", "Google Chrome", "Brave Browser"],
  "onboardingComplete": true
}
```

## 🔐 Security

- **Context Isolation**: `nodeIntegration: false` in renderer
- **Safe IPC**: All user input validated via `execFile()` (never `exec()`)
- **AppleScript Escaping**: String sanitization prevents injection
- **Input Validation**: Comprehensive path and URL validation
- **Code Signing**: macOS app notarization for distribution

## 🧪 Testing

```bash
# Run all tests
npm run test:all

# Test specific modules
npm test                    # Core search functionality
npm run test:tabs          # Browser tab integration
npm run test:files         # File search operations
```

Test coverage includes:
- Search result ranking and filtering
- Browser tab fetching and activation
- File system search integration
- Error handling and recovery
- Performance benchmarks

## 🐛 Troubleshooting

### Common Issues
- **App doesn't appear**: Check permissions for Accessibility and Apple Events
- **Tabs not found**: Ensure browsers are running and have Accessibility permissions
- **Search is slow**: Try clearing cache in settings or reducing browser selection
- **Hotkey not working**: Check for conflicts in System Preferences

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=1 npm start
```

## 📚 Documentation

### User Documentation
- **[Architecture Guide](docs/ARCHITECTURE.md)**: Deep dive into system design
- **[Contributing Guide](CONTRIBUTING.md)**: Development setup and contribution guidelines
- **[Security Guide](docs/SECURITY.md)**: Security considerations and practices
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)**: Common issues and solutions

### Developer Documentation
- **[API Reference](docs/API.md)**: Complete IPC and service API documentation
- **[Changelog](CHANGELOG.md)**: Version history and release notes

### AI Assistant Documentation
- **[Development Guide](CLAUDE.md)**: Comprehensive AI assistant guidance with specialized agents
- **[Specialized Agents](.claude/agents/)**: 6 domain-specific AI agents for different aspects of development
  - 🏗️ Core Architecture (macOS, Electron, React)
  - 🚀 Feature Development (Browser, Search, Testing)  
  - 🛡️ Infrastructure (Security, Build, Performance)
- **[Development Skills](.claude/skills/)**: 5 reusable patterns and best practices for common tasks
  - 🍎 macOS Integration (AppleScript, IPC Security)
  - 🎨 React Search Interface (UI Optimization)
  - 🔍 Fuzzy Search Optimization (Fuse.js tuning)
  - 🍎 macOS App Packaging (Distribution, Notarization)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Development environment setup
- Code style and conventions
- Pull request process
- Testing requirements

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Fuse.js**: Powerful fuzzy search library
- **Electron**: Cross-platform desktop framework
- **Vite**: Lightning-fast build tool
- **Tailwind CSS**: Utility-first CSS framework

---

**Made with ❤️ for macOS users who demand speed and efficiency**
