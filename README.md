# ContextSearch

A macOS Spotlight-alternative launcher built with Electron and React. Search and open applications, browser tabs, and files from a single unified interface.

## Features

- **App Search**: Find and launch any installed macOS application
- **Tab Search**: Search across open browser tabs (Safari, Chrome, Brave, Comet)
- **File Search**: Search files by name using macOS Spotlight index
- **Keyboard-First**: Navigate entirely with keyboard
- **Multi-Monitor Support**: Appears on the active screen
- **Always Available**: Works across all desktop spaces

## Installation

```bash
# Install dependencies
npm install

# Build the app
npm run build

# Start the app
npm start
```

## Usage

- **Cmd+Shift+Space**: Toggle the search window
- **Arrow Up/Down**: Navigate results
- **Enter**: Open selected result
- **Escape**: Hide window
- **Cmd+,**: Open settings

## Development

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start Electron app
npm start
```

## Architecture

```
context-search/
├── electron/           # Electron main process
│   ├── main.js        # Window management, IPC handlers
│   ├── config.js      # Settings management
│   └── services/      # Extracted services
├── src/
│   ├── components/    # React components
│   ├── services/      # Search services
│   ├── constants/     # Configuration constants
│   ├── utils/         # Utility functions
│   └── scripts/       # AppleScript files
└── tests/             # Test files
```

## Configuration

Settings are stored in `settings.json` and can be toggled via the settings panel:

- `searchApps`: Enable/disable app search
- `searchTabs`: Enable/disable browser tab search
- `searchFiles`: Enable/disable file search

## License

MIT
