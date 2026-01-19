# Development Guide

## Prerequisites

- **Node.js**: v20 or later (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **OS**: macOS (required for AppleScript/Spotlight integration)

## Setup

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd rau-fresh
   npm install
   ```

2. **Directory Structure**
   The project is a **monorepo** managing three internal packages:
   - `packages/main`: Electron backend
   - `packages/renderer`: React frontend
   - `packages/shared`: Shared types and utils

## Running Development Server

To start the development environment with hot-reload:

```bash
npm run dev
```

This command will:
1. Build the shared package.
2. Start the Vite dev server for the Renderer (port 5173).
3. Start the Electron Main process in watch mode.

## Building for Production

To create a distributable `.dmg` or `.app`:

```bash
npm run build
npm run dist
```

Artifacts will be output to the `dist/` directory.

## Testing

We use **Vitest** for unit tests and **Playwright** for E2E tests.

### Run Unit Tests
```bash
npm run test          # Run all unit tests
npm run test:watch    # Run in watch mode
```

### Run E2E Tests
```bash
npm run test:e2e      # Run Playwright tests
```

## Code Quality

### Linting & Formatting
```bash
npm run lint         # Check for linting errors
npm run format       # Fix formatting with Prettier
```

### Type Checking
```bash
npm run typecheck    # Run TypeScript compiler check
```

## Adding New Features

### Adding a New IPC Channel

1. **Define the Type**: Add the method signature to `packages/shared/src/types/ipc.ts`.
2. **Define Validation**: Add Zod schema to `packages/shared/src/schemas/ipcSchema.ts` if needed.
3. **Implement Handler**: Create a handler in `packages/main/src/ipc/` and register it in `index.ts`.
4. **Expose in Preload**: Add the function to `packages/main/src/preload.ts`.
5. **Call from Renderer**: Use `window.electronAPI.methodName()` in your React components.

### Adding a New Search Source

1. **Create Service**: Create `NewSourceService.ts` in `packages/main/src/services/`.
2. **Implement Logic**: Add search logic (caching, querying).
3. **Integrate**: Add the service to `SearchService.ts` and include it in the `Promise.all` chain.
4. **Update UI**: If needed, add a filter toggle in `AppStore` and `Settings.tsx`.
