# Changelog

All notable changes to RAU will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive filtering for non-runnable system apps
- Enhanced documentation structure and developer guides
- Specialized AI agent system for development
- Security-focused validation improvements

### Changed
- Application discovery now filters out system services
- Improved caching behavior with better memory management
- Enhanced error handling and user feedback

### Fixed
- Non-runnable apps (ThermalTrap, Archive Utility, etc.) no longer appear in search
- Memory leaks from improper cache cleanup
- Window positioning issues on multi-monitor setups

## [1.0.0] - 2024-01-15

### Added
- Initial release of RAU
- Lightning-fast unified search for apps, tabs, and files
- Multi-browser support (Safari, Chrome, Brave, Arc, Comet, Terminal)
- Keyboard-first interface with full navigation
- Multi-monitor and multi-space support
- Built-in calculator and system commands
- Comprehensive onboarding flow
- Performance-optimized caching system
- Security-first architecture with input validation

### Features
#### Search
- **Apps**: Find and launch any installed application
- **Tabs**: Search across open browser tabs
- **Files**: Search files using macOS Spotlight index
- **Commands**: Built-in system commands (sleep, lock, restart)
- **Calculator**: Instant math expression evaluation
- **Web Search**: Fallback to Google search

#### User Interface
- **Keyboard Navigation**: Complete keyboard control
- **Virtualized Lists**: Fast rendering of large result sets
- **Type Indicators**: Visual distinction between result types
- **Real-time Search**: Debounced instant search
- **Multi-monitor**: Appears on active screen
- **Multi-space**: Works across all desktop spaces

#### Performance
- **Parallel Search**: All search types execute concurrently
- **Intelligent Caching**: Multi-layer caching with appropriate TTL
- **Fuzzy Search**: Fuse.js with custom scoring
- **Result Limiting**: Maximum 20 results for performance

#### Security
- **Context Isolation**: Strict renderer/main process separation
- **Input Validation**: Comprehensive validation for all inputs
- **Safe Execution**: `execFile()` only, no shell commands
- **AppleScript Security**: String escaping prevents injection
- **Permission Management**: Proper macOS permission handling

### Browser Support
- **Safari**: Full tab enumeration and activation
- **Google Chrome**: Tab management with window handling
- **Brave Browser**: Complete tab integration
- **Arc**: Tab support with activation
- **Comet**: Browser tab enumeration
- **Terminal**: Window and tab management

### macOS Integration
- **Global Hotkey**: Cmd+Shift+Space system-wide
- **Spotlight Integration**: Uses system file index
- **Apple Events**: Browser automation via AppleScript
- **Multi-Display**: Proper screen detection and positioning
- **Desktop Spaces**: Works across all virtual desktops

### Developer Experience
- **Comprehensive Tests**: Unit and integration test coverage
- **Debug Logging**: Detailed logging for troubleshooting
- **Error Boundaries**: Graceful error handling and recovery
- **Performance Monitoring**: Built-in performance metrics
- **Documentation**: Comprehensive developer guides

### Architecture
- **Electron Main Process**: Secure backend with IPC handlers
- **React Renderer**: Modern UI with hooks and components
- **Service Layer**: Modular search and data services
- **Configuration**: Centralized settings management
- **Validation**: Shared validation utilities

## [0.9.0] - 2024-01-10

### Added
- Beta testing phase
- Core search functionality
- Basic browser integration
- Application discovery

### Known Issues
- Some system apps appear in search results
- Memory usage increases over time
- Browser permissions need manual granting

## [0.8.0] - 2024-01-05

### Added
- Initial development version
- Basic Electron + React setup
- Window management system
- IPC communication layer

### Technical Details
- Basic mdfind integration
- Simple AppleScript execution
- Configuration file handling

---

## Version Support

### macOS Support
- **Minimum**: macOS 11.0 (Big Sur)
- **Recommended**: macOS 13.0 (Ventura) or later
- **Tested**: macOS 14.0 (Sonoma)

### Architecture Support
- **Apple Silicon (M1/M2/M3)**: Native support
- **Intel (x86_64)**: Native support
- **Universal**: Single app bundle supports both

### Browser Support Matrix

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Safari | 14.0+ | ✅ Full | macOS default |
| Google Chrome | 90+ | ✅ Full | Requires permissions |
| Brave Browser | 1.20+ | ✅ Full | Requires permissions |
| Arc | 1.0+ | ✅ Full | Experimental |
| Comet | 1.0+ | ✅ Full | Third-party browser |
| Terminal | Any | ✅ Basic | Window enumeration |

---

## Breaking Changes

### From 0.9.x to 1.0.0
- Settings file format changed (automatic migration)
- IPC channel names standardized
- AppleScript output format unified
- Cache TTL values adjusted for performance

---

## Security Updates

### Version 1.0.0
- All inputs validated via shared validators
- AppleScript string escaping implemented
- `execFile()` only policy enforced
- Context isolation enabled by default
- Permission system implemented

### Version 0.9.0
- Basic input validation added
- IPC security measures implemented
- Error handling improved

---

## Performance Benchmarks

### Search Performance (Typical Usage)
- **Cold Start**: <500ms to first results
- **App Search**: <50ms (cached)
- **Tab Search**: <200ms per browser
- **File Search**: <300ms (Spotlight dependent)
- **Total Search**: <1s (typical case)

### Memory Usage
- **Baseline**: ~50MB (with 100 tabs cached)
- **Peak**: ~120MB (during heavy tab enumeration)
- **Leak Rate**: <1MB/hour (acceptable)

### Startup Performance
- **Launch to Ready**: <2s
- **Hotkey Response**: <100ms
- **Window Show**: <50ms

---

## Migration Guide

### Upgrading from 0.9.x to 1.0.0

**Automatic Migration**:
- Settings file automatically updated
- Browser permissions preserved
- Cache cleared for security

**Manual Steps**:
1. Update app (drag new version to Applications)
2. Grant permissions if prompted
3. Complete onboarding for new features
4. Verify browser selection in settings

**Configuration Changes**:
- `searchApps` replaces `enableAppSearch`
- `selectedApps` now stores browser names instead of indices
- Cache TTLs adjusted for better performance

---

## Known Limitations

### Current Limitations
- Browser tabs require Accessibility permissions
- File search depends on Spotlight indexing
- Some third-party browsers not supported
- No clipboard history integration
- No plugin system (planned for 2.0)

### Platform Limitations
- macOS only (Windows/Linux not planned)
- Requires Apple Silicon or Intel Mac
- Requires macOS 11.0 or later

---

## Future Roadmap

### Version 1.1.0 (Planned)
- [ ] Plugin system for extensions
- [ ] Clipboard history search
- [ ] Application-specific search plugins
- [ ] Custom themes and UI customization
- [ ] Keyboard shortcut customization

### Version 1.2.0 (Planned)
- [ ] Web application integration
- [ ] Cloud storage search (Dropbox, Google Drive)
- [ ] Advanced calculator with history
- [ ] Search result actions (copy, move, delete)

### Version 2.0.0 (Future)
- [ ] Windows and Linux support
- [ ] Machine learning for result ranking
- [ ] Advanced automation scripting
- [ ] Team/enterprise features

---

**For detailed release notes and download links, visit [GitHub Releases](https://github.com/chokshiroshan/RAU/releases)**