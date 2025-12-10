import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

// Get git commit count and changelog
let commitCount = '0'
let changelog = []
let buildDate = new Date().toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
try {
  commitCount = execSync('git rev-list --count HEAD').toString().trim()
  const logOutput = execSync('git log --pretty=format:"%h|%s|%cd" --date=format:"%Y-%m-%d" -n 20')
    .toString()
    .trim()
  changelog = logOutput.split('\n').map((line) => {
    const [hash, message, date] = line.split('|')
    return { hash, message, date }
  })
} catch {
  commitCount = '0'
  changelog = []
}

const appVersion = `v1.0.${commitCount}`

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['node-7z', '7zip-bin']
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_CHANGELOG__: JSON.stringify(changelog),
      __COMMIT_COUNT__: JSON.stringify(commitCount),
      __BUILD_DATE__: JSON.stringify(buildDate)
    },
    plugins: [react(), tailwindcss()]
  }
})
