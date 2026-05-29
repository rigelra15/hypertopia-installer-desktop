/**
 * apiClient.js
 *
 * Centralised API wrapper for hypertopia-api calls.
 *
 * Security: X-API-Secret and X-Build-ID are injected by the main process
 * via the 'api-fetch' IPC handler — they are never embedded in the renderer
 * bundle and cannot be extracted from the distributed app.
 *
 * Usage:
 *   import { apiFetch, API_BASE_URL } from '../utils/apiClient'
 *
 *   const res = await apiFetch('/api/v1/user-profile?email=...')
 *   const res = await apiFetch('/api/v1/game-size', { method: 'POST', body: JSON.stringify({...}) })
 *
 * Response shape (mirrors fetch Response):
 *   { ok: boolean, status: number, statusText: string, json(): Promise<any>, text(): Promise<string> }
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.hypertopia.web.id'

/**
 * Drop-in replacement for fetch() that targets hypertopia-api.
 * Routes through the Electron main process so secrets stay out of the renderer.
 *
 * @param {string} path   - API path, e.g. '/api/v1/user-profile?email=...'
 * @param {RequestInit} [options] - Standard fetch options (method, body, headers, …)
 * @returns {Promise<{ ok: boolean, status: number, statusText: string, json: () => Promise<any>, text: () => Promise<string> }>}
 */
export async function apiFetch(path, options = {}) {
  // Use IPC proxy in Electron (main process holds the secret)
  if (window.api?.apiFetch) {
    const result = await window.api.apiFetch(path, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body || undefined
    })

    // Wrap result to match the fetch Response interface
    return {
      ok: result.ok,
      status: result.status,
      statusText: result.statusText,
      text: async () => result.body ?? '',
      json: async () => {
        try {
          return JSON.parse(result.body ?? 'null')
        } catch {
          throw new Error(`Failed to parse JSON response from ${path}`)
        }
      }
    }
  }

  // Fallback for non-Electron environments (e.g. browser dev/testing)
  // Secret is not available here — requests will be unauthenticated
  console.warn(
    '[apiClient] window.api.apiFetch not available, falling back to direct fetch (no auth headers)'
  )
  const url = `${API_BASE_URL}${path}`
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
}
