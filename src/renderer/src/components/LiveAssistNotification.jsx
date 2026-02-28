import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'

// Firebase REST API URL (same as LiveAssist)
const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'

// Admin email
const ADMIN_EMAIL = 'hypertopiaid@gmail.com'

/**
 * LiveAssistNotification Component
 * Shows toast notification when users request help via Live Assist
 * Works from any tab in the app (except when on Live Assist tab)
 */
export default function LiveAssistNotification({
  onNavigateToLiveAssist,
  userEmail,
  isOnLiveAssistTab = false
}) {
  const { t } = useLanguage()
  const [pendingRequests, setPendingRequests] = useState([])
  const [dismissed, setDismissed] = useState([])
  const prevRequestsRef = useRef([])

  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (e) {
      console.warn('Could not play notification sound:', e)
    }
  }

  // Poll for pending sessions (admin only) - using REST API
  useEffect(() => {
    if (!isAdmin) return

    const fetchPendingSessions = async () => {
      try {
        const response = await fetch(`${FIREBASE_DB_URL}/liveAssist.json`)
        const data = await response.json()

        if (!data) {
          setPendingRequests([])
          return
        }

        const pending = Object.entries(data)
          .filter(([, session]) => session.status === 'waiting')
          .map(([id, session]) => ({
            id,
            userName: session.userName || 'Unknown User',
            userEmail: session.userEmail,
            createdAt: session.createdAt
          }))
          .sort((a, b) => a.createdAt - b.createdAt)

        // Check for new requests (only play sound if not on Live Assist tab)
        const prevIds = prevRequestsRef.current.map((r) => r.id)
        const newRequests = pending.filter((r) => !prevIds.includes(r.id))

        if (newRequests.length > 0 && !isOnLiveAssistTab) {
          playNotificationSound()
        }

        prevRequestsRef.current = pending
        setPendingRequests(pending)
      } catch (error) {
        console.error('Failed to fetch pending sessions:', error)
      }
    }

    // Initial fetch
    fetchPendingSessions()

    // Poll every 5 seconds
    const interval = setInterval(fetchPendingSessions, 5000)

    return () => clearInterval(interval)
  }, [isAdmin, isOnLiveAssistTab])

  // Filter out dismissed notifications
  const visibleRequests = pendingRequests.filter((r) => !dismissed.includes(r.id))

  const handleDismiss = (id) => {
    setDismissed((prev) => [...prev, id])
  }

  const handleAnswer = (sessionId) => {
    onNavigateToLiveAssist?.(sessionId)
    handleDismiss(sessionId)
  }

  // Don't render if not admin, no pending requests, or on Live Assist tab
  if (!isAdmin || visibleRequests.length === 0 || isOnLiveAssistTab) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9998] flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {visibleRequests.slice(0, 3).map((request) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-3 rounded-xl border p-3 shadow-lg pointer-events-auto bg-[#1a3a5c] border-[#0081FB]/50"
          >
            {/* Icon */}
            <div className="rounded-lg p-2 bg-[#0081FB]/20">
              <Icon icon="mdi:headset" className="h-5 w-5 text-[#0081FB]" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {t('live_assist_request') || 'Support Request'}
              </p>
              <p className="text-xs text-white/60 truncate">{request.userName}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleAnswer(request.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0081FB] text-white hover:bg-[#0070E0] transition-colors"
              >
                {t('live_assist_answer') || 'Answer'}
              </button>
              <button
                onClick={() => handleDismiss(request.id)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Icon icon="mdi:close" className="h-4 w-4 text-white/50" />
              </button>
            </div>
          </motion.div>
        ))}

        {/* More indicator */}
        {visibleRequests.length > 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-1 pointer-events-auto"
          >
            <button
              onClick={() => onNavigateToLiveAssist?.()}
              className="text-xs text-[#0081FB] hover:underline"
            >
              +{visibleRequests.length - 3} {t('more') || 'more'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

LiveAssistNotification.propTypes = {
  onNavigateToLiveAssist: PropTypes.func,
  userEmail: PropTypes.string,
  isOnLiveAssistTab: PropTypes.bool
}
