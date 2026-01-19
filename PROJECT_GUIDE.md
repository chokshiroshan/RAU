# RAU Project Guide

## 🚀 Introduction

RAU (Rapid Access Unit) is a high-performance macOS launcher built with Electron and React. It serves as a Spotlight alternative, offering unified search capabilities across applications, browser tabs, files, and system commands.

This guide provides a comprehensive overview of the project's architecture, development patterns, and "first principles" design choices.

## 🏗️ Core Architecture

### Process Model
RAU follows the standard Electron process model with strict security boundaries:

- **Main Process** (`electron/main.js`):
  - Handles system-level operations (file access, window management, AppleScript execution).
  - Exposes functionality via secure IPC handlers.
  - manages application lifecycle and configuration.

- **Renderer Process** (`src/App.jsx`):
  - Runs the React UI (Vite-bundled).
  - Communicates with Main *only* via `window.electronAPI`.
  - **No Node.js integration** enabled in Renderer (Security Best Practice).

### IPC Bridge & Security
We use a **Context Bridge** to expose a safe API to the Renderer.

1.  **Preload Script** (`electron/main-process/preload.js`):
    - Exposes specific methods via `contextBridge.exposeInMainWorld('electronAPI', ...)`.
    - Does *not* expose raw `ipcRenderer`.

2.  **Safe Invocation** (`src/utils/ipc.js`):
    - The renderer uses `safeInvoke(channel, ...args)` wrapper.
    - Catches errors automatically and logs them.
    - Prevents UI crashes from IPC failures.

3.  **Input Validation** (`shared/validation/validators.js`):
    - **ALL** user input sent to Main is validated before execution.
    - Prevents Command Injection and Path Traversal.
    - Validates: App paths, File paths, Shortcuts, Plugin filenames, URLs.

## 📂 Project Structure

```bash
RAU/
├── electron/                 # Backend (Node.js)
│   ├── main.js               # Entry point
│   ├── main-process/
│   │   ├── handlers/         # IPC Handlers (Action, Search, System)
│   │   ├── services/         # Core Logic (TabFetcher, PluginService)
│   │   └── modules/          # Infrastructure (Logger, ErrorHandler)
├── src/                      # Frontend (React)
│   ├── components/           # UI Components (SearchBar, ResultsList)
│   ├── services/             # Frontend Services (UnifiedSearch)
│   ├── utils/                # Helpers (IPC, Logger)
│   └── scripts/              # AppleScript Templates
├── shared/                   # Shared Code
│   └── validation/           # Validators used by both processes
├── tests/                    # Test Suite
└── settings.json             # User Config (Auto-generated)
```

## 🧩 Key Systems

### 1. Unified Search (`src/services/unifiedSearch.js`)
The search engine orchestrates parallel queries to multiple sources:
- **Apps**: Cached list of `.app` bundles (mdfind).
- **Tabs**: Live AppleScript query to running browsers (Safari, Chrome, Brave, Arc, etc.).
- **Files**: Live `mdfind` query for user documents.
- **Commands**: Static list of system actions (Sleep, Lock, etc.).
- **Plugins**: Custom AppleScript plugins.

Results are aggregated, ranked (Fuse.js), and displayed in a virtualized list (`ResultsList.jsx`).

### 2. Tab Fetcher (`src/services/tabFetcher.js`)
A sophisticated module that:
- Detects running browsers.
- Executes optimized AppleScript to fetch tabs.
- Caches results (Stale-While-Revalidate) to ensure instant subsequent searches.
- **Security**: Escapes all inputs to prevent AppleScript injection.

### 3. Scriptsmith (AI Integration)
An AI-powered feature to generate AppleScript automations.
- **Prompt**: User types `/gen <instruction>`.
- **Generation**: Calls LLM provider to generate AppleScript.
- **Execution**: Safely runs the script via `osascript`.

### 4. Plugins System
Allows users to extend RAU with custom `.applescript` files in `~/Documents/RAU/plugins`.
- **Execution**: Triggered via `run-plugin` IPC.
- **Security**: Filenames validated to prevent path traversal.

## 🛡️ Security & Stability Principles

We adhere to strict "First Principles" engineering:

1.  **Trust No Input**:
    - Every IPC handler validates its arguments using `shared/validation/validators.js`.
    - Shortcuts and Plugins must match strict allowlists/patterns.

2.  **Fail Safely**:
    - `safeInvoke` wrapper ensures the UI never crashes due to backend errors.
    - `try/catch` blocks in all async operations.
    - Centralized logging (`electron/main-process/logger.js`) for debugging without leaking sensitive info.

3.  **Performance First**:
    - `React.memo` on high-frequency components (`ResultsList`, `SearchBar`).
    - Virtualized rendering for result lists.
    - Debounced search input (150ms).

## 🛠️ Developer Workflow

### Prerequisites
- Node.js 18+
- macOS (for AppleScript support)

### Commands
```bash
# Install dependencies
npm install

# Run in Development Mode (Hot Reload)
npm run dev

# Build for Production
npm run dist:mac

# Run Tests
npm run test:all
```

### Adding a New Feature
1.  **Frontend**: Add UI component in `src/components`.
2.  **IPC**: Define new channel in `src/constants/ipc.js` (if needed).
3.  **Backend**: Add handler in `electron/main-process/handlers`.
4.  **Validation**: Add validator in `shared/validation`.
5.  **Test**: Add test case in `tests/`.

## 📚 Further Reading
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Deep dive into system design.
- [SECURITY.md](docs/SECURITY.md) - Security threat model and mitigations.
- [API.md](docs/API.md) - IPC API reference.
