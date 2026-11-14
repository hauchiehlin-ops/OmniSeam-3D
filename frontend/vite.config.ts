import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The repo lives on an exFAT volume, where macOS writes AppleDouble `._*`
 * files next to every file. Strip them from the build output so they never
 * end up in the web deploy or the iOS app bundle (codesign rejects them).
 */
function stripAppleDouble(): Plugin {
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (name.startsWith('._') || name === '.DS_Store') {
        rmSync(full, { force: true, recursive: true })
      } else if (statSync(full).isDirectory()) {
        walk(full)
      }
    }
  }
  return {
    name: 'strip-apple-double',
    apply: 'build',
    closeBundle() {
      walk('dist')
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  // Relative asset paths: the build is served from capacitor://localhost/
  // inside the native WebView.
  base: './',
  plugins: [react(), stripAppleDouble()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
