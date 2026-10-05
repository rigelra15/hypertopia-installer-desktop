/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { apiFetch } from '../utils/apiClient'

const AuthContext = createContext()

const emptyGameAccess = () => ({ standalone: [], pcvr: [] })

function normalizeGameAccess(gameAccess) {
  const normalized = emptyGameAccess()
  if (!gameAccess || typeof gameAccess !== 'object') return normalized

  Object.keys(normalized).forEach((type) => {
    const records = gameAccess[type]
    if (Array.isArray(records)) {
      normalized[type] = records.filter(Boolean)
    } else if (records && typeof records === 'object') {
      normalized[type] = Object.entries(records).map(([id, record]) => ({
        id,
        ...(record && typeof record === 'object' ? record : {})
      }))
    }
  })

  return normalized
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessTypes, setAccessTypes] = useState([]) // Array of: 'standalone', 'pcvr', 'qgo'
  const [gameAccess, setGameAccess] = useState(emptyGameAccess)
  const [trialAccessTypes, setTrialAccessTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [eligibilityLoading, setEligibilityLoading] = useState(false)

  // Check eligibility for all categories — server-side via API (never exposes other users' data)
  const checkEligibility = useCallback(async (email) => {
    if (!email) {
      setAccessTypes([])
      setGameAccess(emptyGameAccess())
      setTrialAccessTypes([])
      return []
    }

    setEligibilityLoading(true)

    try {
      const res = await apiFetch(`/api/v1/access-status?email=${encodeURIComponent(email)}`)

      if (!res.ok) {
        console.warn('[Auth] Eligibility check failed:', res.status)
        setAccessTypes([])
        setGameAccess(emptyGameAccess())
        setTrialAccessTypes([])
        return []
      }

      const data = await res.json()
      if (!data.success) {
        setAccessTypes([])
        setGameAccess(emptyGameAccess())
        setTrialAccessTypes([])
        return []
      }

      // API returns full category access and per-game trial access separately.
      const access = Array.isArray(data.accessTypes)
        ? data.accessTypes
        : Object.entries(data.access || {})
            .filter(([, info]) => info?.status === 'active')
            .map(([type]) => type)
      const nextGameAccess = normalizeGameAccess(data.gameAccess)
      const nextTrialAccessTypes = Array.isArray(data.trialAccessTypes)
        ? data.trialAccessTypes
        : Object.entries(nextGameAccess)
            .filter(([, records]) => Array.isArray(records) && records.length > 0)
            .map(([type]) => type)

      setAccessTypes(access)
      setGameAccess(nextGameAccess)
      setTrialAccessTypes(nextTrialAccessTypes)
      return access
    } catch (error) {
      console.error('[Auth] Error checking eligibility:', error)
      setAccessTypes([])
      setGameAccess(emptyGameAccess())
      setTrialAccessTypes([])
      return []
    } finally {
      setEligibilityLoading(false)
    }
  }, [])

  // Record login event — uses the API proxy so the server (Admin SDK) writes to RTDB.
  // This avoids needing Firebase Auth in the Electron renderer for RTDB writes.
  const recordLogin = useCallback(async (userData, method) => {
    if (!userData?.uid) return
    try {
      let deviceInfo = null
      try {
        if (window.api?.getDeviceInfo) {
          deviceInfo = await window.api.getDeviceInfo()
        }
      } catch {
        // ignore
      }

      const event = {
        timestamp: Date.now(),
        method,
        platform: 'desktop',
        email: userData.email || null,
        uid: userData.uid,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        deviceInfo
      }

      // Use the API proxy to record login (server writes with Admin SDK)
      await apiFetch('/api/v1/record-login', {
        method: 'POST',
        body: JSON.stringify(event)
      })
    } catch (err) {
      console.warn('recordLogin failed:', err)
    }
  }, [])

  // Save user and check eligibility
  const saveUser = useCallback(
    async (userData, method) => {
      localStorage.setItem('hypertopia_user', JSON.stringify(userData))
      setUser(userData)
      // Fire-and-forget login history recording (only on fresh login)
      if (method) {
        recordLogin(userData, method)
      }
      await checkEligibility(userData.email)
    },
    [checkEligibility, recordLogin]
  )

  // Load saved user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('hypertopia_user')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
        checkEligibility(parsedUser.email)
      } catch (err) {
        console.error('Error parsing saved user:', err)
        localStorage.removeItem('hypertopia_user')
      }
    }
    setLoading(false)
  }, [checkEligibility])

  // Listen for auth-callback from deep link (browser login flow)
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return

    const handleAuthCallback = async (_, data) => {
      // uid is now extracted in main process — no JWT decode in renderer
      if (data?.success && data?.email) {
        const userData = {
          uid: data.uid || null,
          email: data.email,
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
          idToken: data.idToken || null, // Firebase ID token for API auth
          loginAt: Date.now()
        }
        await saveUser(userData, 'browser-deep-link')
      }
    }

    window.electron.ipcRenderer.on('auth-callback', handleAuthCallback)
    return () => {
      window.electron.ipcRenderer.removeListener('auth-callback', handleAuthCallback)
    }
  }, [saveUser])

  // Logout
  const logout = useCallback(async () => {
    // Reset all state
    localStorage.removeItem('hypertopia_user')
    setUser(null)
    setAccessTypes([])
    setGameAccess(emptyGameAccess())
    setTrialAccessTypes([])
  }, [])

  const value = {
    user,
    accessTypes,
    gameAccess,
    trialAccessTypes,
    loading,
    eligibilityLoading,
    logout,
    checkEligibility
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
