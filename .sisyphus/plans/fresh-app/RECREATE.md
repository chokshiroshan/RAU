# RAU: From Scratch Recreation Guide

## 🎯 Overview
This document provides a complete roadmap to recreate RAU (macOS launcher) from scratch, addressing all technical debt and performance issues from the current implementation.

## 📊 Current State Analysis

### ✅ What RAU Does Well
- **Fast Core Functionality**: Search is fundamentally quick when data is cached
- **Security Conscious**: Uses `execFile()`, input validation, context isolation
- **Modern Stack**: React 19, Vite, Tailwind CSS
- **Clean Separation**: Clear distinction between main/renderer processes

### ❌ Critical Issues to Fix
- **God Component**: `App.jsx` (550+ lines) mixing UI, business logic, and window management
- **Massive IPC Overhead**: Sends 1000s of tabs/apps to renderer for searching
- **No Type Safety**: Pure JavaScript leads to runtime errors and refactoring risk
- **Scattered Logic**: Search logic split across multiple files
- **Performance Bottlenecks**: No virtualization, inefficient re-renders

---

## 🏗️ New Architecture Overview

### Core Design Principle: "Heavy Lifting in Main Process"
Instead of:
> Renderer: "Here's 5000 apps/tabs, please search them"
> Main: "OK, here's the data"
> Renderer: "Thanks, let me search through all this..."

We'll do:
> Renderer: "Please search for 'safari'"
> Main: "OK, here are the top 20 results"
> Renderer: "Thanks, I'll display these immediately"

### Directory Structure (Monorepo-style)

```
rau-fresh/
├── packages/
│   ├── main/                     # Electron Main Process (TypeScript)
│   │   ├── src/
│   │   │   ├── services/          # Business logic services
│   │   │   │   ├── SearchService.ts
│   │   │   │   ├── AppService.ts
│   │   │   │   ├── TabService.ts
│   │   │   │   ├── FileService.ts
│   │   │   │   └── WindowService.ts
│   │   │   ├── ipc/              # Type-safe IPC handlers
│   │   │   │   ├── searchHandlers.ts
│   │   │   │   ├── appHandlers.ts
│   │   │   │   └── windowHandlers.ts
│   │   │   ├── utils/            # Native utilities
│   │   │   │   ├── appleScript.ts
│   │   │   │   ├── mdfind.ts
│   │   │   │   └── iconExtractor.ts
│   │   │   ├── config/           # Configuration and constants
│   │   │   │   └── appConfig.ts
│   │   │   └── index.ts           # Entry point
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── renderer/                 # React Frontend (TypeScript + TSX)
│   │   ├── src/
│   │   │   ├── components/       # UI Components (dumb, presentational)
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── ResultsList.tsx
│   │   │   │   ├── ResultItem.tsx
│   │   │   │   ├── Settings.tsx
│   │   │   │   └── Onboarding.tsx
│   │   │   ├── hooks/            # State & Logic (smart components)
│   │   │   │   ├── useSearch.ts
│   │   │   │   ├── useKeyboard.ts
│   │   │   │   └── useAppStore.ts
│   │   │   ├── stores/           # Zustand state stores
│   │   │   │   └── appStore.ts
│   │   │   ├── api/              # Type-safe IPC bridges
│   │   │   │   └── electronAPI.ts
│   │   │   ├── utils/            # Frontend utilities
│   │   │   │   └── resultOrganizer.ts
│   │   │   └── main.tsx          # Entry point
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── shared/                   # Shared Types & Validation
│       ├── src/
│       │   ├── types/            # TypeScript interfaces
│       │   │   ├── search.ts
│       │   │   ├── ipc.ts
│       │   │   └── app.ts
│       │   ├── schemas/          # Zod validation schemas
│       │   │   ├── searchSchema.ts
│       │   │   └── ipcSchema.ts
│       │   ├── constants/        # Shared constants
│       │   │   └── appConstants.ts
│       │   └── utils/            # Shared utilities
│       │       └── validators.ts
│       ├── tsconfig.json
│       └── package.json
│
├── scripts/                      # Build & automation scripts
│   ├── build.sh
│   ├── dev.sh
│   └── test.sh
├── docs/                         # Documentation
│   ├── API.md
│   └── DEPLOYMENT.md
├── tests/                        # Test suites
│   ├── unit/                     # Vitest unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # Playwright E2E tests
├── package.json                  # Workspace configuration
├── tsconfig.base.json            # Shared TypeScript config
├── electron.vite.config.ts       # electron-vite configuration
└── README.md
```

## 🚀 Implementation Roadmap

### Phase 1: Foundation & Tooling (Days 1-2)
- Initialize monorepo structure
- Configure TypeScript and build tools
- Set up test harness (Vitest + Playwright)

### Phase 2: Shared Infrastructure (Days 3-4)
- Define TypeScript interfaces for all data types
- Implement Zod schemas for runtime validation
- Create IPC contract definitions

### Phase 3: Main Process Services (Days 5-7)
- Implement `SearchService` with Fuse.js
- Port AppleScript logic to `TabService`
- Create `AppService` for application indexing
- Build type-safe IPC handlers

### Phase 4: Renderer Process (Days 8-10)
- Set up Zustand stores for state management
- Create virtualized `ResultsList` component
- Implement `useSearch` hook with React Concurrent features
- Build responsive and accessible UI components

### Phase 5: Testing & Polish (Days 11-12)
- Write unit tests for all services
- Implement E2E tests for critical flows
- Optimize bundle size and startup performance
- Final security audit

---

## 🎯 Success Metrics

### Performance Targets
- **Search Latency**: < 50ms from keystroke to results display
- **App Startup**: < 500ms to show search UI
- **Memory Usage**: < 100MB idle, < 200MB during active use
- **Bundle Size**: Main process < 5MB, Renderer < 2MB

### Quality Metrics
- **TypeScript Coverage**: 100% of source files
- **Test Coverage**: > 80% lines covered
- **Zero Runtime Errors**: All IPC calls validated
- **A11y Score**: 100% WCAG 2.1 AA compliance
