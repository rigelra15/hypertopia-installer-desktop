/**
 * apiClient.js
 *
 * Centralised fetch wrapper for hypertopia-api calls.
 * Automatically injects the X-API-Secret header on every request
 * so individual call sites don't have to remember to add it.
 *
 * Usage:
 *   import { apiFetch, API_BASE_URL } from '../utils/apiClient'
 *
 *   const res = await apiFetch('/api/v1/user-profile?email=...')
 *   const res = await apiFetch('/api/v1/game-size', { method: 'POST', body: JSON.stringify({...}) })
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://api.hypertopia.web.id'

const APP_SECRET =
  import.meta.env.REACT_APP_HYPERTOPIA_API_SECRET ||
  import.meta.env.VITE_HYPERTOPIA_API_SECRET ||
  ''

// Injected at build time by electron.vite.config.mjs — unique per build
// eslint-disable-next-line no-undef
const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev-build'

/**
 * Drop-in replacement for fetch() that targets hypertopia-api.
 *
 * @param {string} path   - API path, e.g. '/api/v1/user-profile?email=...'
 * @param {RequestInit} [options] - Standard fetch options (method, body, headers, …)
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    // App attestation headers — validated server-side
    'X-API-Secret': APP_SECRET,
    'X-Build-ID': BUILD_ID,
  }

  return fetch(url, { ...options, headers })
}
