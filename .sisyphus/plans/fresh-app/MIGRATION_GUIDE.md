# Migration Guide: RAU Legacy to Fresh

This guide outlines how to migrate functionality from the legacy RAU codebase to the new `rau-fresh` architecture.

## Strategy: "Strangler Fig" Pattern
We will build the new application alongside the old one, porting features one by one. Since this is a rewrite in a new directory, "alongside" effectively means referencing the old code as a source of truth while building the new implementation.

## 1. Porting Constants & Config
**Source**: `src/constants.js`, `shared/constants.js`
**Destination**: `packages/shared/src/constants/`

- Copy all constant values (keycodes, window dimensions, etc.).
- Convert them to TypeScript `const` or `enum`.
- Ensure naming is consistent (UPPER_SNAKE_CASE).

## 2. Porting Search Logic
**Source**: `src/services/unifiedSearch.js`, `src/services/appSearch.js`
**Destination**: `packages/main/src/services/SearchService.ts`

- **Step 1**: Identify the data sources in the old code.
- **Step 2**: Extract the AppleScript for fetching tabs into `packages/main/src/utils/appleScript.ts`.
- **Step 3**: Extract the `mdfind` logic into `packages/main/src/utils/mdfind.ts`.
- **Step 4**: Re-implement the aggregation logic in `SearchService.ts` using `Promise.allSettled`.
- **Note**: The old code likely mixed "fetching" and "searching". In the new architecture, try to cache the "fetch" (get all apps) and then "search" in memory using Fuse.js where possible to reduce disk I/O latency.

## 3. Porting IPC Handlers
**Source**: `electron/main-process/handlers/`
**Destination**: `packages/main/src/ipc/`

- Map every `ipcMain.handle('channel', ...)` from the old app to a new handler file.
- **Critical**: Add Zod validation for every input argument. Do not copy-paste without adding validation.
- Update the `preload` script to expose these via `contextBridge`.

## 4. Porting UI Components
**Source**: `src/components/`
**Destination**: `packages/renderer/src/components/`

- **Components to Port**:
  - `SearchBar`: Convert to functional component with `useSearch` hook.
  - `ResultItem`: Extract CSS to Tailwind classes.
  - `Settings`: Break down into smaller sub-components if it's monolithic.
- **Styling**: Replace custom CSS/SCSS with Tailwind utility classes.
- **Icons**: Move any SVG assets or icon logic to a shared asset folder or component library.

## 5. Porting Scripts
**Source**: `src/scripts/` (AppleScripts)
**Destination**: `packages/main/src/scripts/` or inline strings in `utils/appleScript.ts`.

- Review all AppleScripts for efficiency.
- Ensure all user inputs injected into scripts are sanitized (though the new `SearchService` should prefer parametrized inputs where possible).

## Checklist for Migration

### Phase 1: Core Search
- [ ] Apps search (mdfind)
- [ ] Browser Tabs search (AppleScript)
- [ ] Basic UI (Input + List)

### Phase 2: Actions
- [ ] Launch App
- [ ] Activate Tab
- [ ] Open File

### Phase 3: Settings & Preferences
- [ ] Port Settings UI
- [ ] Persist settings using `electron-store` or similar (in Main process) or `localStorage` (in Renderer). *Recommendation: Use Main process persistence for app-wide settings.*

### Phase 4: Polish
- [ ] Keyboard navigation (Arrow keys, Enter, Esc)
- [ ] Window management (Blur to hide, Global Shortcut)
- [ ] Theme support (Dark/Light mode)

## Common Pitfalls
- **Direct DOM Manipulation**: The old code might manually manipulate DOM in some places. Use React state instead.
- **Node Integration**: Ensure `nodeIntegration` is `false`. Use IPC for everything.
- **Race Conditions**: Old search might not handle rapid keystrokes well. Ensure `useSearch` hook uses `cleanup` functions or `AbortController` (if applicable) to discard stale results.
