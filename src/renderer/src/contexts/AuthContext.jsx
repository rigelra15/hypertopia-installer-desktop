/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'

const AuthContext = createContext()

// Firebase Database URL
const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'

// Generate random 5-character alphanumeric code (uppercase only for easier reading)
function generateDeviceCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars: I, O, 0, 1
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessTypes, setAccessTypes] = useState([]) // Array of: 'standalone', 'pcvr', 'qgo'
  const [loading, setLoading] = useState(true)
  const [eligibilityLoading, setEligibilityLoading] = useState(false)

  // Device code login state
  const [deviceCode, setDeviceCode] = useState(null)
  const [deviceCodeLoading, setDeviceCodeLoading] = useState(false)
  const [deviceCodeError, setDeviceCodeError] = useState(null)
  const pollIntervalRef = useRef(null)

  // Check eligibility for all categories
  const checkEligibility = useCallback(async (email) => {
    if (!email) {
      setAccessTypes([])
      return []
    }

    setEligibilityLoading(true)
    
    try {
      // Fetch all data from each category and filter client-side
      // This avoids the need for Firebase Rules indexing on REST API
      const [standaloneRes, pcvrRes, qgoRes] = await Promise.all([
        fetch(`${FIREBASE_DB_URL}/eligibleUsers/standalone.json`),
        fetch(`${FIREBASE_DB_URL}/eligibleUsers/pcvr.json`),
        fetch(`${FIREBASE_DB_URL}/eligibleUsers/qgo.json`)
      ])

      const [standaloneData, pcvrData, qgoData] = await Promise.all([
        standaloneRes.ok ? standaloneRes.json() : null,
        pcvrRes.ok ? pcvrRes.json() : null,
        qgoRes.ok ? qgoRes.json() : null
      ])

      // Filter by email client-side
      const hasStandaloneAccess = standaloneData && Object.values(standaloneData).some(
        (user) => user && user.email && user.email.toLowerCase() === email.toLowerCase()
      )
      const hasPcvrAccess = pcvrData && Object.values(pcvrData).some(
        (user) => user && user.email && user.email.toLowerCase() === email.toLowerCase()
      )
      const hasQgoAccess = qgoData && Object.values(qgoData).some(
        (user) => user && user.email && user.email.toLowerCase() === email.toLowerCase()
      )

      const access = []
      if (hasStandaloneAccess) access.push('standalone')
      if (hasPcvrAccess) access.push('pcvr')
      if (hasQgoAccess) access.push('qgo')

      setAccessTypes(access)
      return access
    } catch (error) {
      console.error('[Auth] Error checking eligibility:', error)
      setAccessTypes([])
      return []
    } finally {
      setEligibilityLoading(false)
    }
  }, [])

  // Save user and check eligibility
  const saveUser = useCallback(
    async (userData) => {
      localStorage.setItem('hypertopia_user', JSON.stringify(userData))
      setUser(userData)
      await checkEligibility(userData.email)
    },
    [checkEligibility]
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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Generate device code and start polling
  const startDeviceCodeLogin = useCallback(async () => {
    setDeviceCodeLoading(true)
    setDeviceCodeError(null)

    // Stop any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    try {
      const code = generateDeviceCode()
      const now = Date.now()
      const expiresAt = now + 5 * 60 * 1000 // 5 minutes

      // Save code to Firebase
      const response = await fetch(`${FIREBASE_DB_URL}/deviceCodes/${code}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdAt: now,
          expiresAt: expiresAt,
          claimed: false,
          userId: null,
          email: null,
          displayName: null,
          photoURL: null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create device code')
      }

      setDeviceCode({ code, expiresAt })
      setDeviceCodeLoading(false)

      // Start polling for claim status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollResponse = await fetch(`${FIREBASE_DB_URL}/deviceCodes/${code}.json`)
          const data = await pollResponse.json()

          if (!data) {
            // Code expired or deleted
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
            setDeviceCode(null)
            setDeviceCodeError('Code expired')
            return
          }

          if (data.claimed && data.email) {
            // Code claimed! Login successful
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null

            const userData = {
              uid: data.userId || null,
              email: data.email,
              displayName: data.displayName || null,
              photoURL: data.photoURL || null,
              loginAt: Date.now()
            }

            await saveUser(userData)
            setDeviceCode(null)

            // Delete used code
            await fetch(`${FIREBASE_DB_URL}/deviceCodes/${code}.json`, {
              method: 'DELETE'
            })
          }

          // Check if expired
          if (Date.now() > data.expiresAt) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
            setDeviceCode(null)
            setDeviceCodeError('Code expired')

            // Delete expired code
            await fetch(`${FIREBASE_DB_URL}/deviceCodes/${code}.json`, {
              method: 'DELETE'
            })
          }
        } catch (err) {
          console.error('Error polling device code:', err)
        }
      }, 2000) // Poll every 2 seconds
    } catch (error) {
      console.error('Error creating device code:', error)
      setDeviceCodeError(error.message)
      setDeviceCodeLoading(false)
    }
  }, [saveUser])

  // Cancel device code login
  const cancelDeviceCodeLogin = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    if (deviceCode?.code) {
      // Delete the code from Firebase
      fetch(`${FIREBASE_DB_URL}/deviceCodes/${deviceCode.code}.json`, {
        method: 'DELETE'
      }).catch(() => {})
    }

    setDeviceCode(null)
    setDeviceCodeError(null)
  }, [deviceCode])

  // Logout
  const logout = useCallback(async () => {
    // Stop polling if active
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    // Reset all state
    localStorage.removeItem('hypertopia_user')
    setUser(null)
    setAccessTypes([])
    setDeviceCode(null)
    setDeviceCodeLoading(false)
    setDeviceCodeError(null)
  }, [])

  const value = {
    user,
    accessTypes,
    loading,
    eligibilityLoading,
    deviceCode,
    deviceCodeLoading,
    deviceCodeError,
    startDeviceCodeLogin,
    cancelDeviceCodeLogin,
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
