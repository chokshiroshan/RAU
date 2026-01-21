import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Vite configuration for Electron + React app with multi-page build
export default defineConfig({
  plugins: [
    react(),
    // #region agent log (debug-mode instrumentation)
    {
      name: 'rau-debug-sentry-resolve',
      apply: 'build',
      configResolved(config) {
        fetch('http://127.0.0.1:7243/ingest/fe3efe51-8c72-4d08-b517-44cdac538246', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: process.env.RAU_DEBUG_RUN_ID || 'pre-fix',
            hypothesisId: 'H3',
            location: 'vite.config.js:configResolved',
            message: 'Vite config resolved (build starting)',
            data: { command: config.command, mode: config.mode },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
      },
      async resolveId(source, importer) {
        if (source !== '@sentry/electron/renderer') return null

        let resolved = null
        let resolveError = null
        try {
          const r = await this.resolve(source, importer, { skipSelf: true })
          resolved = r ? { id: r.id, external: Boolean(r.external) } : null
        } catch (e) {
          resolveError = { code: e?.code, message: e?.message }
        }

        fetch('http://127.0.0.1:7243/ingest/fe3efe51-8c72-4d08-b517-44cdac538246', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: process.env.RAU_DEBUG_RUN_ID || 'pre-fix',
            hypothesisId: 'H2',
            location: 'vite.config.js:resolveId',
            message: 'Vite resolve attempt for @sentry/electron/renderer',
            data: { source, importer, resolved, resolveError },
            timestamp: Date.now(),
          }),
        }).catch(() => {})

        return null
      },
      buildEnd(error) {
        fetch('http://127.0.0.1:7243/ingest/fe3efe51-8c72-4d08-b517-44cdac538246', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: process.env.RAU_DEBUG_RUN_ID || 'pre-fix',
            hypothesisId: 'H1',
            location: 'vite.config.js:buildEnd',
            message: 'Vite build ended',
            data: error ? { errorMessage: error.message } : { ok: true },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
      },
    },
    // #endregion agent log (debug-mode instrumentation)
    // #region agent log (debug-mode instrumentation 2)
    {
      name: 'rau-debug-sentry-env',
      apply: 'build',
      enforce: 'pre',
      configResolved(config) {
        const cwd = process.cwd()
        const sentryPkg = path.join(cwd, 'node_modules', '@sentry', 'electron', 'package.json')
        const sentryRendererCjs = path.join(cwd, 'node_modules', '@sentry', 'electron', 'renderer', 'index.js')
        const sentryRendererEsm = path.join(cwd, 'node_modules', '@sentry', 'electron', 'esm', 'renderer', 'index.js')

        fetch('http://127.0.0.1:7243/ingest/fe3efe51-8c72-4d08-b517-44cdac538246', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: process.env.RAU_DEBUG_RUN_ID || 'pre-fix',
            hypothesisId: 'H4',
            location: 'vite.config.js:debugEnv',
            message: 'Sentry presence check (cwd + node_modules)',
            data: {
              cwd,
              root: config.root,
              node: process.version,
              sentryPkgExists: fs.existsSync(sentryPkg),
              sentryRendererCjsExists: fs.existsSync(sentryRendererCjs),
              sentryRendererEsmExists: fs.existsSync(sentryRendererEsm),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
      },
      async resolveId(source, importer) {
        if (source !== '@sentry/electron/renderer') return null

        const cwd = process.cwd()
        const sentryRendererCjs = path.join(cwd, 'node_modules', '@sentry', 'electron', 'renderer', 'index.js')
        const sentryRendererEsm = path.join(cwd, 'node_modules', '@sentry', 'electron', 'esm', 'renderer', 'index.js')

        fetch('http://127.0.0.1:7243/ingest/fe3efe51-8c72-4d08-b517-44cdac538246', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: process.env.RAU_DEBUG_RUN_ID || 'pre-fix',
            hypothesisId: 'H5',
            location: 'vite.config.js:debugResolvePre',
            message: 'Pre-resolve hook saw @sentry/electron/renderer',
            data: {
              source,
              importer,
              sentryRendererCjsExists: fs.existsSync(sentryRendererCjs),
              sentryRendererEsmExists: fs.existsSync(sentryRendererEsm),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})

        return null
      },
    },
    // #endregion agent log (debug-mode instrumentation 2)
  ],
  base: './', // Use relative paths for Electron
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        settings: path.resolve(__dirname, 'settings.html'),
        scriptsmith: path.resolve(__dirname, 'scriptsmith.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
