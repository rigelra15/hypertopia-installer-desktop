import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'

const NetworkContext = createContext(null)

// API endpoint to check connectivity
const CONNECTIVITY_CHECK_URL = 'https://api.hypertopia.store/api/v1/health'
const PING_INTERVAL = 10000 // Ping every 10 seconds for latency display (like mobile games)
const RETRY_INTERVAL = 5000 // Retry every 5 seconds when offline

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isApiReachable, setIsApiReachable] = useState(true)
  const [lastChecked, setLastChecked] = useState(null)
  const [connectionType, setConnectionType] = useState('unknown')
  const [showOfflineNotification, setShowOfflineNotification] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)
  const [showBackOnlineNotification, setShowBackOnlineNotification] = useState(false)
  const [latency, setLatency] = useState(null) // Ping in ms

  const checkIntervalRef = useRef(null)
  const retryTimeoutRef = useRef(null)

  /**
   * Check if API is reachable
   * Uses health endpoint first, falls back to light games endpoint
   */
  const checkApiConnectivity = useCallback(async () => {
    const endpoints = [
      CONNECTIVITY_CHECK_URL,
      // Fallback endpoint if health check doesn't exist yet
      'https://api.hypertopia.store/api/v1/standalone-games-light?limit=1'
    ]

    for (const url of endpoints) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const startTime = performance.now()
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store'
        })
        const endTime = performance.now()

        clearTimeout(timeoutId)

        if (response.ok) {
          const pingMs = Math.round(endTime - startTime)
          setLatency(pingMs)
          setIsApiReachable(true)
          setLastChecked(new Date())

          // If we were offline and now back online, show notification
          if (wasOffline) {
            setShowOfflineNotification(false)
            setShowBackOnlineNotification(true)
            setWasOffline(false)

            // Auto-hide back online notification after 3 seconds
            setTimeout(() => {
              setShowBackOnlineNotification(false)
            }, 3000)
          }

          return true
        }
      } catch (error) {
        console.warn(`[Network] Connectivity check failed for ${url}:`, error.message)
        // Continue to next endpoint
      }
    }

    // All endpoints failed
    setIsApiReachable(false)
    setLatency(null)
    setLastChecked(new Date())
    return false
  }, [wasOffline])

  /**
   * Handle online/offline browser events
   */
  const handleOnline = useCallback(() => {
    console.log('[Network] Browser reports online')
    setIsOnline(true)
    // Verify API is actually reachable
    checkApiConnectivity()
  }, [checkApiConnectivity])

  const handleOffline = useCallback(() => {
    console.log('[Network] Browser reports offline')
    setIsOnline(false)
    setIsApiReachable(false)
    setShowOfflineNotification(true)
    setWasOffline(true)
  }, [])

  /**
   * Get connection type info
   */
  const updateConnectionType = useCallback(() => {
    if ('connection' in navigator) {
      const conn = navigator.connection
      setConnectionType(conn.effectiveType || conn.type || 'unknown')
    }
  }, [])

  /**
   * Dismiss offline notification
   */
  const dismissOfflineNotification = useCallback(() => {
    setShowOfflineNotification(false)
  }, [])

  /**
   * Manual retry connection
   */
  const retryConnection = useCallback(async () => {
    const reachable = await checkApiConnectivity()
    if (!reachable) {
      setShowOfflineNotification(true)
    }
    return reachable
  }, [checkApiConnectivity])

  // Setup event listeners
  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', updateConnectionType)
    }

    // Initial check
    updateConnectionType()
    checkApiConnectivity()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', updateConnectionType)
      }
    }
  }, [handleOnline, handleOffline, updateConnectionType, checkApiConnectivity])

  // Periodic connectivity/ping check - runs continuously like mobile game network indicators
  useEffect(() => {
    const interval = isOnline && isApiReachable ? PING_INTERVAL : RETRY_INTERVAL

    checkIntervalRef.current = setInterval(() => {
      checkApiConnectivity()
    }, interval)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [isOnline, isApiReachable, checkApiConnectivity])

  // Show offline notification when API not reachable
  useEffect(() => {
    if (!isApiReachable && isOnline) {
      // Online but API not reachable - show notification after a delay
      retryTimeoutRef.current = setTimeout(() => {
        setShowOfflineNotification(true)
        setWasOffline(true)
      }, 2000)
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [isApiReachable, isOnline])

  // Computed overall connectivity status
  const isConnected = isOnline && isApiReachable

  /**
   * Get signal strength based on latency
   * 0 = offline, 1 = poor (<1000ms), 2 = fair (<500ms), 3 = good (<200ms), 4 = excellent (<100ms)
   */
  const getSignalStrength = useCallback(() => {
    if (!isConnected || latency === null) return 0
    if (latency < 100) return 4
    if (latency < 200) return 3
    if (latency < 500) return 2
    return 1
  }, [isConnected, latency])

  const value = {
    isOnline,
    isApiReachable,
    isConnected,
    connectionType,
    lastChecked,
    latency,
    getSignalStrength,
    showOfflineNotification,
    showBackOnlineNotification,
    dismissOfflineNotification,
    retryConnection,
    checkApiConnectivity
  }

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
}

NetworkProvider.propTypes = {
  children: PropTypes.node.isRequired
}

export function useNetwork() {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider')
  }
  return context
}

export default NetworkContext
