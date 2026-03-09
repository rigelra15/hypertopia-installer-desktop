import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'
import { config } from 'dotenv'
import { readFileSync, existsSync } from 'fs'

// Load environment variables from .env file directly
const envPath = resolve(process.cwd(), '.env')
let env = {}

// Try loading with dotenv first
const dotenvResult = config({ path: envPath })
if (dotenvResult.parsed) {
  env = dotenvResult.parsed
} else if (existsSync(envPath)) {
  // Fallback: manually parse .env file
  try {
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key) {
          let value = valueParts.join('=')
          // Remove quotes if present
          value = value.replace(/^["']|["']$/g, '')
          env[key.trim()] = value
        }
      }
    })
  } catch (e) {
    console.warn('Failed to read .env file:', e.message)
  }
}

// Fallback to process.env for keys not found in .env file (e.g. CI/GitHub Actions)
;['REACT_APP_GOOGLE_API_KEY', 'REACT_APP_GOOGLE_CLIENT_ID'].forEach((key) => {
  if (!env[key] && process.env[key]) {
    env[key] = process.env[key]
  }
})

console.log('[electron.vite.config] Loaded env keys:', Object.keys(env))
console.log('[electron.vite.config] GOOGLE_API_KEY present:', !!env.REACT_APP_GOOGLE_API_KEY)

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
    },
    define: {
      'process.env.REACT_APP_GOOGLE_API_KEY': JSON.stringify(env.REACT_APP_GOOGLE_API_KEY || ''),
      'process.env.REACT_APP_GOOGLE_CLIENT_ID': JSON.stringify(env.REACT_APP_GOOGLE_CLIENT_ID || '')
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
