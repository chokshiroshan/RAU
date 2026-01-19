# Technology Stack

## Core Runtime
- **Electron**: v30+ (Latest stable)
  - *Reason*: Robust cross-platform desktop framework, though we focus on macOS.
- **Node.js**: v20 LTS
  - *Reason*: Performance, stability, and compatibility with latest ecosystem tools.

## Frontend (Renderer)
- **React**: v19
  - *Reason*: Latest features (Concurrent Mode, useTransition) for high-performance UI.
- **TypeScript**: v5.x
  - *Reason*: Type safety, better refactoring, and developer confidence.
- **Vite**: v5.x
  - *Reason*: Lightning-fast HMR and optimized builds.
- **Tailwind CSS**: v3.4
  - *Reason*: Utility-first styling, small bundle size, consistent design system.
- **Zustand**: v4.x
  - *Reason*: Minimalist state management, much simpler than Redux, easier than Context for frequent updates.
- **@tanstack/react-virtual**: v3.x
  - *Reason*: Essential for rendering long lists (search results) without DOM lag.

## Backend (Main Process)
- **TypeScript**: v5.x
  - *Reason*: Consistent language across the stack.
- **Fuse.js**: v7.x
  - *Reason*: Powerful, lightweight fuzzy search library for in-memory collections.
- **Zod**: v3.x
  - *Reason*: Runtime schema validation for IPC security.
- **AppleScript / JXA**:
  - *Reason*: Native macOS automation (browser tabs, system events).

## Build & Tooling
- **electron-vite**:
  - *Reason*: Pre-configured build tool specifically designed for Electron + Vite monorepos.
- **electron-builder**:
  - *Reason*: Industry standard for packaging Electron apps.
- **Vitest**:
  - *Reason*: Fast unit testing, API compatible with Jest, native Vite integration.
- **Playwright**:
  - *Reason*: Reliable E2E testing for Electron apps.

## Architecture Decisions

### Why Monorepo?
Keeping `main`, `renderer`, and `shared` code in one workspace allows:
- Shared types (`shared/types`) ensure the frontend and backend agree on data structures.
- Atomic commits for features that span both processes.
- Simplified dependency management.

### Why Zustand?
Redux is too boilerplate-heavy. Context API causes unnecessary re-renders. Zustand provides a simple hook-based store that works perfectly outside of React components (e.g., inside non-component utility files) if needed, and supports transient updates well.

### Why Fuse.js in Main?
Running search in the Main process prevents blocking the UI thread. Fuse.js is fast enough for < 10,000 items. If we scale beyond that, we might consider a native module (Rust) or SQLite, but Fuse.js is the correct starting point for complexity vs. performance.
