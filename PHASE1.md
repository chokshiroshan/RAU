# Task: ContextSearch - Phase 1 (Core Launcher)

## Project Overview
Build a macOS launcher app (Spotlight alternative) using Electron + React + Vite.
Fast file search with fuzzy matching and global hotkey.

## Tech Stack
- Electron (desktop framework)
- React (UI framework)
- Vite (build tool)
- Tailwind CSS (styling)
- fuse.js or similar (fuzzy search)
- Node.js child_process (for mdfind)

## Project Setup Requirements
1. Initialize npm project
2. Install dependencies:
   - electron
   - react, react-dom
   - vite
   - @vitejs/plugin-react
   - electron-builder (for packaging)
   - tailwindcss
   - fuse.js or fast-fuzzy
3. Configure Vite for Electron
4. Set up Electron main process
5. Set up React renderer process
6. Configure Tailwind CSS

## Core Features to Implement

### 1. Electron Main Process
- Register global hotkey: Cmd+Shift+Space
- Create frameless, always-on-top window
- Window shows/hides on hotkey
- Window auto-hides when losing focus
- Position window at center-top of screen

### 2. Search Interface (React)
- Input field that auto-focuses when window appears
- Results list below input
- Keyboard navigation:
  - Arrow Up/Down to navigate results
  - Enter to open selected item
  - Escape to close window
- Display format per result:
  - File name (bold)
  - File path (gray, smaller)
  - Icon (optional for v1, can skip)

### 3. File Search Engine
- Use macOS `mdfind` command for file indexing
- Implement search function that:
  - Takes query string
  - Executes: `mdfind -name "query"`
  - Returns array of file paths
  - Limits results to top 20
- Implement fuzzy search with fuse.js:
  - Search file names and paths
  - Score and rank results
  - Return sorted by relevance

### 4. File Operations
- When user presses Enter on selected file:
  - Open file with default application
  - Use: `child_process.exec('open "filepath"')`
  - Close launcher window after opening

## Project Structure
```
context-search/
├── package.json
├── vite.config.js
├── electron/
│   └── main.js           # Electron main process
├── src/
│   ├── App.jsx           # Main React component
│   ├── components/
│   │   ├── SearchBar.jsx
│   │   └── ResultsList.jsx
│   ├── services/
│   │   └── fileSearch.js # Search logic
│   ├── index.css         # Tailwind imports
│   └── main.jsx          # React entry
├── index.html
└── tests/
    └── search.test.js
```

## Success Criteria (ALL must pass)
- [ ] npm install works without errors
- [ ] npm run dev starts the app
- [ ] Pressing Cmd+Shift+Space shows/hides window
- [ ] Window appears at center-top of screen
- [ ] Window is frameless and always on top
- [ ] Typing in search bar triggers file search
- [ ] Search returns results within 200ms
- [ ] Results display file name and path
- [ ] Arrow keys navigate through results
- [ ] Enter opens selected file
- [ ] Escape closes window
- [ ] Clicking outside window closes it
- [ ] Searching "package" finds package.json files
- [ ] Basic tests pass (at least 3 test cases)
- [ ] No console errors on startup
- [ ] App doesn't crash during normal use

## Testing Requirements
Create basic tests for:
1. File search returns results for valid query
2. Fuzzy matching works ("pckg" finds "package.json")
3. Search limits to 20 results max

## Build Configuration
Ensure these scripts work:
- `npm run dev` - Development mode
- `npm run build` - Production build
- `npm run start` - Run built app

## Important Notes
- Keep code clean and commented
- Handle errors gracefully (no crashes)
- Log important actions to console for debugging
- Use async/await for file operations
- Debounce search input (300ms)

## If Stuck After 10 Iterations
Document:
- What's blocking progress
- What was attempted
- Error messages encountered
- Suggested alternative approaches

Then continue working on solvable parts.

## Completion Signal
When ALL success criteria are met AND basic tests pass:
Output exactly: <promise>PHASE1_COMPLETE</promise>