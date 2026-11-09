import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const alias = { '@shared': resolve('src/shared') }

/**
 * index.html ships a strict Content-Security-Policy for the packaged app. The dev server needs a
 * little more (an inline script for React Fast Refresh and a WebSocket for hot reload), so this
 * swaps the policy during `npm run dev` only. Production builds are untouched.
 */
function devContentSecurityPolicy(): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self' ws://localhost:* http://localhost:*"
  ].join('; ')
  return {
    name: 'handrail-dev-csp',
    apply: 'serve',
    transformIndexHtml: (html) =>
      html.replace(/(http-equiv="Content-Security-Policy"\s+content=")[^"]*(")/, `$1${policy}$2`)
  }
}

export default defineConfig({
  main: {
    resolve: { alias },
    build: { rollupOptions: { input: { index: resolve('src/main/index.ts') } } }
  },
  preload: {
    resolve: { alias },
    build: { rollupOptions: { input: { index: resolve('src/preload/index.ts') } } }
  },
  renderer: {
    root: resolve('src/renderer'),
    resolve: { alias },
    plugins: [react(), devContentSecurityPolicy()],
    build: {
      minify: true,
      rollupOptions: { input: { index: resolve('src/renderer/index.html') } }
    }
  }
})
