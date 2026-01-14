import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'

// Firebase REST API URL (same as AuthContext)
const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'

// STUN servers (public, free)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
}

// Admin email
const ADMIN_EMAIL = 'hypertopiaid@gmail.com'

// Generate random session ID
function generateSessionId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

export function LiveAssist() {
  const { t } = useLanguage()
  const { user } = useAuth()

  // Check if user is admin
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  // State
  const [status, setStatus] = useState('idle') // idle, waiting, connecting, connected, ended
  const [sessionId, setSessionId] = useState(null)
  const [isMuted, setIsMuted] = useState(true) // Default: mic OFF
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [error, setError] = useState(null)
  const [connectionTime, setConnectionTime] = useState(0)
  const [queuePosition, setQueuePosition] = useState(0)

  // Admin-specific state
  const [pendingSessions, setPendingSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false)

  // Refs
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteVideoStreamRef = useRef(null) // Store video stream for later assignment
  const connectionTimerRef = useRef(null)
  const pollIntervalRef = useRef(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Clear timer
    if (connectionTimerRef.current) {
      clearInterval(connectionTimerRef.current)
      connectionTimerRef.current = null
    }

    setIsScreenSharing(false)
    setConnectionTime(0)
    setCurrentSession(null)
    setQueuePosition(0)
  }, [])

  // ============ USER FUNCTIONS ============

  // Create session and wait for admin
  const startSession = async () => {
    if (!user) {
      setError(t('live_assist_login_required') || 'Please login to use Live Assist')
      return
    }

    try {
      setError(null)
      setStatus('waiting')

      // Generate new session ID
      const newSessionId = generateSessionId()
      setSessionId(newSessionId)

      // Get user's microphone (but muted by default)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      // Mute by default
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false
      })

      // Create session data with timestamp for queue ordering
      const sessionData = {
        id: newSessionId,
        userEmail: user.email,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        status: 'waiting',
        createdAt: new Date().toISOString(),
        timestamp: Date.now(), // For queue ordering
        adminEmail: ADMIN_EMAIL,
        offer: null,
        answer: null,
        userCandidates: {},
        adminCandidates: {}
      }

      // Save to Firebase
      const response = await fetch(`${FIREBASE_DB_URL}/liveAssist/${newSessionId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      // Start polling for admin to join and queue position
      pollIntervalRef.current = setInterval(async () => {
        try {
          // Get all sessions to calculate queue position
          const allSessionsRes = await fetch(`${FIREBASE_DB_URL}/liveAssist.json`)
          const allSessions = await allSessionsRes.json()

          if (allSessions) {
            const waitingSessions = Object.values(allSessions)
              .filter((s) => s && s.status === 'waiting')
              .sort((a, b) => a.timestamp - b.timestamp)

            const myPosition = waitingSessions.findIndex((s) => s.id === newSessionId) + 1
            setQueuePosition(myPosition)
          }

          // Get my session
          const pollRes = await fetch(`${FIREBASE_DB_URL}/liveAssist/${newSessionId}.json`)
          const data = await pollRes.json()

          if (!data) {
            // Session deleted
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
            endSession()
            return
          }

          if (data.status === 'admin_joined' && !peerConnectionRef.current) {
            // Admin joined, create offer
            createOfferAsUser(newSessionId)
          } else if (data.status === 'ended') {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
            endSession()
          } else if (data.answer && peerConnectionRef.current) {
            // Admin sent answer
            if (peerConnectionRef.current.remoteDescription === null) {
              try {
                await peerConnectionRef.current.setRemoteDescription(
                  new RTCSessionDescription(data.answer)
                )
              } catch (e) {
                console.error('Error setting remote description:', e)
              }
            }
          }

          // Check for new ICE candidates from admin
          if (data.adminCandidates && peerConnectionRef.current) {
            const candidates = Object.values(data.adminCandidates)
            for (const candidate of candidates) {
              if (candidate && !candidate.added) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                } catch (e) {
                  console.error('Error adding ICE candidate:', e)
                }
              }
            }
          }
        } catch (err) {
          console.error('Error polling session:', err)
        }
      }, 2000)
    } catch (err) {
      console.error('Failed to start session:', err)
      setError(err.message || 'Failed to start session')
      setStatus('idle')
      cleanup()
    }
  }

  // Create WebRTC offer (as user)
  const createOfferAsUser = async (sessId) => {
    try {
      setStatus('connecting')

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS)
      peerConnectionRef.current = pc

      // Add local audio track
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current)
        })
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0]
          }
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          const candidateId = `c_${Date.now()}`
          await fetch(
            `${FIREBASE_DB_URL}/liveAssist/${sessId}/userCandidates/${candidateId}.json`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(event.candidate.toJSON())
            }
          )
        }
      }

      // Handle connection state
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setStatus('connected')
          // Start connection timer
          connectionTimerRef.current = setInterval(() => {
            setConnectionTime((prev) => prev + 1)
          }, 1000)
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          endSession()
        }
      }

      // Create and set offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Send offer to Firebase
      await fetch(`${FIREBASE_DB_URL}/liveAssist/${sessId}/offer.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: offer.type,
          sdp: offer.sdp
        })
      })
    } catch (err) {
      console.error('Failed to create offer:', err)
      setError(err.message || 'Failed to connect')
      setStatus('idle')
      cleanup()
    }
  }

  // End session (as user)
  const endSession = useCallback(() => {
    if (sessionId) {
      fetch(`${FIREBASE_DB_URL}/liveAssist/${sessionId}.json`, {
        method: 'DELETE'
      }).catch(() => {})
    }
    cleanup()
    setStatus('ended')
    setSessionId(null)
  }, [sessionId, cleanup])

  // ============ ADMIN FUNCTIONS ============

  // Fetch pending sessions (admin only)
  const fetchPendingSessions = useCallback(async () => {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/liveAssist.json`)
      const data = await res.json()

      if (data) {
        const sessions = Object.values(data)
          .filter((s) => s && s.status === 'waiting' && s.adminEmail === ADMIN_EMAIL)
          .sort((a, b) => a.timestamp - b.timestamp) // Sort by timestamp (oldest first)
        setPendingSessions(sessions)

        // Check if admin is currently in a call
        const activeSession = Object.values(data).find(
          (s) => s && (s.status === 'admin_joined' || s.status === 'connected')
        )
        // Admin is busy if there's an active session
        if (activeSession) {
          console.log('Admin is currently in a call')
        }
      } else {
        setPendingSessions([])
      }
    } catch (err) {
      console.error('Error fetching sessions:', err)
    }
  }, [])

  // Start polling for sessions (admin only)
  useEffect(() => {
    if (isAdmin && status === 'idle') {
      fetchPendingSessions()
      pollIntervalRef.current = setInterval(fetchPendingSessions, 3000)

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    }
  }, [isAdmin, status, fetchPendingSessions])

  // Join session as admin (only first in queue)
  const joinSession = async (session) => {
    try {
      setError(null)
      setStatus('connecting')
      setSessionId(session.id)
      setCurrentSession(session)

      // Get admin's microphone (muted by default)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false
      })

      // Update session status
      await fetch(`${FIREBASE_DB_URL}/liveAssist/${session.id}/status.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('admin_joined')
      })

      // Stop polling for sessions list
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }

      // Track last offer SDP to detect renegotiation
      let lastOfferSdp = null

      // Poll for offer from user
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`${FIREBASE_DB_URL}/liveAssist/${session.id}.json`)
          const data = await pollRes.json()

          if (!data || data.status === 'ended') {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
            endSessionAsAdmin()
            return
          }

          if (data.offer) {
            if (!peerConnectionRef.current) {
              // Initial offer - create answer
              lastOfferSdp = data.offer.sdp
              await createAnswerAsAdmin(session.id, data.offer)
            } else if (data.offer.sdp !== lastOfferSdp) {
              // Renegotiation - new offer received (screen sharing added/removed)
              console.log('Renegotiation detected - new offer received')
              lastOfferSdp = data.offer.sdp
              await handleRenegotiation(session.id, data.offer)
            }
          }

          // Check for new ICE candidates from user
          if (data.userCandidates && peerConnectionRef.current) {
            const candidates = Object.values(data.userCandidates)
            for (const candidate of candidates) {
              if (candidate && !candidate.added) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                } catch (e) {
                  console.error('Error adding ICE candidate:', e)
                }
              }
            }
          }
        } catch (err) {
          console.error('Error polling session:', err)
        }
      }, 2000)
    } catch (err) {
      console.error('Failed to join session:', err)
      setError(err.message || 'Failed to join session')
      setStatus('idle')
      cleanup()
    }
  }

  // Create answer as admin
  const createAnswerAsAdmin = async (sessId, offer) => {
    try {
      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS)
      peerConnectionRef.current = pc

      // Add local audio track
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current)
        })
      }

      // Handle remote stream (audio and screen share from user)
      pc.ontrack = (event) => {
        console.log('Received track:', event.track.kind)
        if (event.track.kind === 'audio') {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0]
          }
        } else if (event.track.kind === 'video') {
          const stream = event.streams[0]
          const videoTrack = event.track
          console.log('Video track received:')
          console.log('  - Stream ID:', stream.id)
          console.log('  - Stream active:', stream.active)
          console.log('  - Track ID:', videoTrack.id)
          console.log('  - Track enabled:', videoTrack.enabled)
          console.log('  - Track readyState:', videoTrack.readyState)
          console.log('  - Track muted:', videoTrack.muted)

          // Store stream in ref
          remoteVideoStreamRef.current = stream

          // Function to assign stream to video
          const assignStreamToVideo = () => {
            if (remoteVideoRef.current) {
              console.log('Assigning stream to video element')

              // Create new MediaStream with the track (helps with cross-context issues)
              const newStream = new MediaStream([videoTrack])
              console.log('Created new MediaStream with video track')

              // Update ref with new stream so useEffect doesn't conflict
              remoteVideoStreamRef.current = newStream

              remoteVideoRef.current.srcObject = newStream
              remoteVideoRef.current
                .play()
                .then(() => {
                  console.log('Video play() succeeded')
                  // Check if video has dimensions after a short delay
                  setTimeout(() => {
                    if (remoteVideoRef.current) {
                      console.log(
                        'Video dimensions:',
                        remoteVideoRef.current.videoWidth,
                        'x',
                        remoteVideoRef.current.videoHeight
                      )
                      console.log('Video readyState:', remoteVideoRef.current.readyState)
                    }
                  }, 1000)
                })
                .catch((e) => console.error('Play error:', e.name, e.message))
            }
          }

          // If track is muted, wait for unmute event
          if (videoTrack.muted) {
            console.log('Track is muted, waiting for unmute...')
            videoTrack.onunmute = () => {
              console.log('Track unmuted! Now assigning to video.')
              assignStreamToVideo()
            }
          } else {
            assignStreamToVideo()
          }

          setIsRemoteScreenSharing(true)

          // Handle when user stops screen sharing
          videoTrack.onended = () => {
            console.log('Video track ended')
            setIsRemoteScreenSharing(false)
            remoteVideoStreamRef.current = null
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null
            }
          }
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          const candidateId = `c_${Date.now()}`
          await fetch(
            `${FIREBASE_DB_URL}/liveAssist/${sessId}/adminCandidates/${candidateId}.json`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(event.candidate.toJSON())
            }
          )
        }
      }

      // Handle connection state
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setStatus('connected')
          connectionTimerRef.current = setInterval(() => {
            setConnectionTime((prev) => prev + 1)
          }, 1000)
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          endSessionAsAdmin()
        }
      }

      // Set remote offer
      await pc.setRemoteDescription(new RTCSessionDescription(offer))

      // Create and set answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Send answer to Firebase
      await fetch(`${FIREBASE_DB_URL}/liveAssist/${sessId}/answer.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: answer.type,
          sdp: answer.sdp
        })
      })
    } catch (err) {
      console.error('Failed to create answer:', err)
      setError(err.message || 'Failed to connect')
      setStatus('idle')
      cleanup()
    }
  }

  // Handle renegotiation (when user adds/removes screen share)
  const handleRenegotiation = async (sessId, offer) => {
    if (!peerConnectionRef.current) return

    try {
      console.log('Handling renegotiation...')
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer))

      const answer = await peerConnectionRef.current.createAnswer()
      await peerConnectionRef.current.setLocalDescription(answer)

      // Send new answer to Firebase
      await fetch(`${FIREBASE_DB_URL}/liveAssist/${sessId}/answer.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: answer.type,
          sdp: answer.sdp
        })
      })
      console.log('Renegotiation complete')
    } catch (err) {
      console.error('Renegotiation error:', err)
    }
  }

  // End session as admin
  const endSessionAsAdmin = useCallback(() => {
    if (sessionId) {
      fetch(`${FIREBASE_DB_URL}/liveAssist/${sessionId}.json`, {
        method: 'DELETE'
      }).catch(() => {})
    }
    cleanup()
    setStatus('idle')
    setSessionId(null)
    setPendingSessions([])
  }, [sessionId, cleanup])

  // ============ SHARED FUNCTIONS ============

  // Toggle screen sharing (user only)
  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current || status !== 'connected') return

    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop())
          screenStreamRef.current = null
        }
        // Remove video sender
        const videoSender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track?.kind === 'video')
        if (videoSender) {
          peerConnectionRef.current.removeTrack(videoSender)
        }
        setIsScreenSharing(false)

        // Renegotiate to inform remote that screen share stopped
        await renegotiateConnection()
      } else {
        // Start screen sharing - use Electron's desktopCapturer
        let screenStream
        
        // Check if we're in Electron and have access to desktopCapturer
        if (window.api?.getDesktopSources) {
          // Use Electron's desktopCapturer via preload
          const sources = await window.api.getDesktopSources()
          if (sources && sources.length > 0) {
            // Get the first screen source
            const source = sources[0]
            screenStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: source.id
                }
              }
            })
          } else {
            throw new Error('No screen sources available')
          }
        } else {
          // Fallback for web - try getDisplayMedia
          try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: false
            })
          } catch (e) {
            console.error('getDisplayMedia not supported:', e)
            throw new Error('Screen sharing is not supported in this environment')
          }
        }
        
        screenStreamRef.current = screenStream

        // Add video track
        const videoTrack = screenStream.getVideoTracks()[0]
        console.log('[ScreenShare] Video track:', videoTrack)
        console.log('[ScreenShare] Track enabled:', videoTrack.enabled)
        console.log('[ScreenShare] Track readyState:', videoTrack.readyState)
        console.log('[ScreenShare] Track settings:', videoTrack.getSettings())
        
        peerConnectionRef.current.addTrack(videoTrack, screenStream)
        console.log('[ScreenShare] Track added to peer connection')

        // Handle screen share stop
        videoTrack.onended = async () => {
          console.log('[ScreenShare] Track ended')
          setIsScreenSharing(false)
          screenStreamRef.current = null
          // Remove track and renegotiate
          const sender = peerConnectionRef.current
            ?.getSenders()
            .find((s) => s.track?.kind === 'video')
          if (sender && peerConnectionRef.current) {
            peerConnectionRef.current.removeTrack(sender)
            await renegotiateConnection()
          }
        }

        setIsScreenSharing(true)

        // Renegotiate to send new video track
        console.log('[ScreenShare] Starting renegotiation...')
        await renegotiateConnection()
        console.log('[ScreenShare] Renegotiation complete')
      }
    } catch (err) {
      console.error('Screen share error:', err)
      if (err.name !== 'NotAllowedError') {
        setError(err.message || 'Failed to share screen')
      }
    }
  }

  // Renegotiate connection after adding/removing tracks
  const renegotiateConnection = async () => {
    if (!peerConnectionRef.current || !sessionId) return

    try {
      const offer = await peerConnectionRef.current.createOffer()
      await peerConnectionRef.current.setLocalDescription(offer)

      // Send new offer to Firebase
      await fetch(`${FIREBASE_DB_URL}/liveAssist/${sessionId}/offer.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: offer.type,
          sdp: offer.sdp
        })
      })

      // Clear old answer to trigger renegotiation on remote
      await fetch(`${FIREBASE_DB_URL}/liveAssist/${sessionId}/answer.json`, {
        method: 'DELETE'
      })
    } catch (err) {
      console.error('Renegotiation error:', err)
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted // If muted, enable; if not muted, disable
      })
      setIsMuted(!isMuted)
    }
  }

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Format date
  const formatDate = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // Assign video stream to video element when it becomes available (backup)
  useEffect(() => {
    if (isRemoteScreenSharing && remoteVideoRef.current && remoteVideoStreamRef.current) {
      // Only set if not already set (ontrack handler already set it)
      if (remoteVideoRef.current.srcObject !== remoteVideoStreamRef.current) {
        console.log('useEffect: Assigning video stream to video element')
        remoteVideoRef.current.srcObject = remoteVideoStreamRef.current
        remoteVideoRef.current.play().catch((e) => console.log('useEffect play:', e.message))
      }
    }
  }, [isRemoteScreenSharing])

  // ============ ADMIN UI ============
  if (isAdmin) {
    return (
      <div className="flex flex-1 flex-col bg-[#111] overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/10 bg-[#111] p-4 text-center md:text-left">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 justify-center md:justify-start">
            <Icon icon="mdi:headset" className="text-[#0081FB] hidden md:block" />
            <span className="text-[#0081FB]">Live</span> Assist
            <span className="ml-2 px-2 py-0.5 bg-[#0081FB]/20 text-[#0081FB] text-xs rounded-full font-medium">
              ADMIN
            </span>
          </h2>
          <p className="text-xs text-white/40">
            {t('live_assist_admin_subtitle') || 'Manage and respond to user support requests'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-[#0081FB]/30 bg-[#0081FB]/10 p-4 mb-6">
              <div className="flex items-center gap-3">
                <Icon icon="mdi:alert-circle" className="h-5 w-5 text-[#0081FB] shrink-0" />
                <p className="text-sm text-[#0081FB]">{error}</p>
              </div>
            </div>
          )}

          {status === 'idle' ? (
            // Admin Dashboard - Show pending sessions
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-xl bg-[#0081FB]/10 p-3 text-[#0081FB]">
                    <Icon icon="mdi:headset" className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {t('live_assist_admin_panel') || 'Admin Dashboard'}
                    </h3>
                    <p className="text-xs text-white/50">
                      {t('live_assist_admin_info') ||
                        'View and respond to incoming support requests'}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="rounded-xl bg-[#0081FB]/10 p-4">
                    <p className="text-2xl font-bold text-[#0081FB]">{pendingSessions.length}</p>
                    <p className="text-xs text-white/50">
                      {t('live_assist_pending') || 'Pending Requests'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#0081FB]/10 p-4">
                    <p className="text-2xl font-bold text-[#0081FB]">
                      {status === 'connected' ? 1 : 0}
                    </p>
                    <p className="text-xs text-white/50">
                      {t('live_assist_active') || 'Active Sessions'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pending Sessions List */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Icon icon="mdi:clock-outline" className="h-5 w-5 text-[#0081FB]" />
                  {t('live_assist_waiting_list') || 'Waiting Queue'}
                </h3>

                {pendingSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Icon
                      icon="mdi:inbox-outline"
                      className="h-12 w-12 text-white/20 mx-auto mb-3"
                    />
                    <p className="text-white/40 text-sm">
                      {t('live_assist_no_requests') || 'No pending support requests'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingSessions.map((session, index) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0081FB]/20 flex items-center justify-center text-[#0081FB] font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-[#0081FB]/20 flex items-center justify-center">
                            <Icon icon="mdi:account" className="h-5 w-5 text-[#0081FB]" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{session.userName}</p>
                            <p className="text-xs text-white/50">{session.userEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/30">
                            {formatDate(session.createdAt)}
                          </span>
                          {index === 0 ? (
                            <button
                              onClick={() => joinSession(session)}
                              className="px-4 py-2 bg-[#0081FB] hover:bg-[#0070E0] text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2"
                            >
                              <Icon icon="mdi:phone" className="h-4 w-4" />
                              {t('live_assist_answer') || 'Answer'}
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 bg-white/5 text-white/40 rounded-lg text-xs">
                              {t('live_assist_in_queue') || 'In Queue'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : status === 'connecting' ? (
            // Connecting State
            <div className="rounded-2xl border border-[#0081FB]/30 bg-[#0081FB]/5 p-8 text-center">
              <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-[#0081FB]/20 flex items-center justify-center">
                <Icon icon="mdi:loading" className="h-10 w-10 text-[#0081FB] animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {t('live_assist_connecting_title') || 'Establishing Connection...'}
              </h3>
              <p className="text-sm text-white/50">
                {t('live_assist_connecting_user') || 'Connecting with user'}:{' '}
                {currentSession?.userName}
              </p>
            </div>
          ) : (
            // Connected State (Admin View)
            <div className="rounded-2xl border border-[#0081FB]/30 bg-[#0081FB]/5 p-6">
              {/* Connection Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#0081FB]/20 flex items-center justify-center">
                    <Icon icon="mdi:account" className="h-6 w-6 text-[#0081FB]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{currentSession?.userName}</h3>
                    <p className="text-xs text-[#0081FB]">{currentSession?.userEmail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-mono font-bold text-white">
                    {formatTime(connectionTime)}
                  </p>
                  <p className="text-xs text-white/50">{t('live_assist_duration') || 'Duration'}</p>
                </div>
              </div>

              {/* Compact status indicator - inline */}
              <div className="flex items-center gap-2 text-[#0081FB] text-sm mb-4">
                <div className="h-2 w-2 rounded-full bg-[#0081FB] animate-pulse" />
                <span>{t('live_assist_connected') || 'Connected'}</span>
              </div>

              {/* Video Call Area */}
              <div
                className="mb-4 rounded-xl overflow-hidden bg-[#1a1a1a] border border-[#0081FB]/30 relative"
                style={{ minHeight: '280px' }}
              >
                {/* When NOT screen sharing - show avatar placeholder */}
                {!isRemoteScreenSharing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {/* User Avatar */}
                    <div className="w-24 h-24 rounded-full bg-[#0081FB]/20 flex items-center justify-center border-2 border-[#0081FB]/30">
                      <Icon icon="mdi:account" className="h-12 w-12 text-[#0081FB]" />
                    </div>

                    {/* User info bottom left */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <div className="px-3 py-1.5 bg-black/60 rounded-lg flex items-center gap-2">
                        <span className="text-white text-sm font-medium">
                          {currentSession?.userName}
                        </span>
                        {isMuted && (
                          <Icon icon="mdi:microphone-off" className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* When screen sharing - show video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={false}
                  style={{ width: '100%', minHeight: '280px', backgroundColor: 'transparent' }}
                  className={`w-full h-auto object-contain ${!isRemoteScreenSharing ? 'hidden' : ''}`}
                />

                {/* User info overlay when screen sharing */}
                {isRemoteScreenSharing && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-black/60 rounded-lg flex items-center gap-2">
                      <span className="text-white text-sm font-medium">
                        {currentSession?.userName}
                      </span>
                      {isMuted && (
                        <Icon icon="mdi:microphone-off" className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                {/* Mute Button */}
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isMuted
                      ? 'bg-[#0081FB]/20 text-[#0081FB] hover:bg-[#0081FB]/30'
                      : 'bg-[#0081FB] text-white hover:bg-[#0070E0]'
                  }`}
                  title={isMuted ? t('unmute') || 'Unmute' : t('mute') || 'Mute'}
                >
                  <Icon
                    icon={isMuted ? 'mdi:microphone-off' : 'mdi:microphone'}
                    className="h-6 w-6"
                  />
                </button>

                {/* End Call Button */}
                <button
                  onClick={endSessionAsAdmin}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all"
                  title={t('end_call') || 'End Call'}
                >
                  <Icon icon="mdi:phone-hangup" className="h-6 w-6" />
                </button>
              </div>
            </div>
          )}

          {/* Remote Audio */}
          <audio ref={remoteAudioRef} autoPlay hidden />
        </div>
      </div>
    )
  }

  // ============ USER UI ============
  return (
    <div className="flex flex-1 flex-col bg-[#111] overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#111] p-4 text-center md:text-left">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 justify-center md:justify-start">
          <Icon icon="mdi:headset" className="text-[#0081FB] hidden md:block" />
          <span className="text-[#0081FB]">Live</span> Assist
        </h2>
        <p className="text-xs text-white/40">
          {t('live_assist_subtitle') ||
            'Get real-time help from HyperTopia team via voice and screen sharing'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {/* Info Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-[#0081FB]/10 p-3 text-[#0081FB]">
              <Icon icon="mdi:information-outline" className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">
                {t('live_assist_info_title') || 'How Live Assist Works'}
              </h3>
              <ul className="text-sm text-white/60 space-y-2">
                <li className="flex items-start gap-2">
                  <Icon
                    icon="mdi:check-circle"
                    className="h-4 w-4 text-[#0081FB] mt-0.5 shrink-0"
                  />
                  <span>
                    {t('live_assist_info_1') || 'Connect directly with HyperTopia support team'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon
                    icon="mdi:check-circle"
                    className="h-4 w-4 text-[#0081FB] mt-0.5 shrink-0"
                  />
                  <span>{t('live_assist_info_2') || 'Voice call for real-time communication'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon
                    icon="mdi:check-circle"
                    className="h-4 w-4 text-[#0081FB] mt-0.5 shrink-0"
                  />
                  <span>{t('live_assist_info_3') || 'Share your screen to show issues'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon
                    icon="mdi:check-circle"
                    className="h-4 w-4 text-[#0081FB] mt-0.5 shrink-0"
                  />
                  <span>{t('live_assist_info_4') || 'Secure peer-to-peer connection'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-[#0081FB]/30 bg-[#0081FB]/10 p-4 mb-6">
            <div className="flex items-center gap-3">
              <Icon icon="mdi:alert-circle" className="h-5 w-5 text-[#0081FB] shrink-0" />
              <p className="text-sm text-[#0081FB]">{error}</p>
            </div>
          </div>
        )}

        {/* Status Cards */}
        {status === 'idle' || status === 'ended' ? (
          // Idle / Ended State
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-[#0081FB]/10 flex items-center justify-center">
              <Icon icon="mdi:headset" className="h-10 w-10 text-[#0081FB]" />
            </div>

            {status === 'ended' && (
              <div className="mb-4 text-[#0081FB] text-sm">
                <Icon icon="mdi:check-circle" className="inline h-4 w-4 mr-1" />
                {t('live_assist_session_ended') || 'Session ended'}
              </div>
            )}

            <h3 className="text-xl font-bold text-white mb-2">
              {t('live_assist_ready_title') || 'Ready to Connect'}
            </h3>
            <p className="text-sm text-white/50 mb-6">
              {t('live_assist_ready_desc') ||
                'Click the button below to request assistance from the HyperTopia team'}
            </p>

            {!user ? (
              <p className="text-sm text-[#0081FB]">
                <Icon icon="mdi:login" className="inline h-4 w-4 mr-1" />
                {t('live_assist_login_required') || 'Please login to use Live Assist'}
              </p>
            ) : (
              <button
                onClick={startSession}
                className="px-8 py-3 bg-[#0081FB] hover:bg-[#0070E0] text-white rounded-xl font-semibold transition-all flex items-center gap-2 mx-auto"
              >
                <Icon icon="mdi:phone-outgoing" className="h-5 w-5" />
                {t('live_assist_start') || 'Request Assistance'}
              </button>
            )}
          </div>
        ) : status === 'waiting' ? (
          // Waiting State
          <div className="rounded-2xl border border-[#0081FB]/30 bg-[#0081FB]/5 p-8 text-center">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-[#0081FB]/20 flex items-center justify-center animate-pulse">
              <Icon icon="mdi:headset" className="h-10 w-10 text-[#0081FB]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {t('live_assist_waiting_title') || 'Waiting for Support...'}
            </h3>
            <p className="text-sm text-white/50 mb-4">
              {t('live_assist_waiting_desc') ||
                'Our team will join shortly. Please keep this window open.'}
            </p>

            {/* Queue Position */}
            {queuePosition > 0 && (
              <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0081FB]/10 text-[#0081FB]">
                <Icon icon="mdi:account-group" className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('live_assist_queue_position') || 'Queue Position'}: #{queuePosition}
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-[#0081FB] text-sm mb-6">
              <div className="h-2 w-2 rounded-full bg-[#0081FB] animate-pulse" />
              <span>{t('live_assist_connecting') || 'Connecting...'}</span>
            </div>
            <button
              onClick={endSession}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
            >
              {t('cancel') || 'Cancel'}
            </button>
          </div>
        ) : status === 'connecting' ? (
          // Connecting State
          <div className="rounded-2xl border border-[#0081FB]/30 bg-[#0081FB]/5 p-8 text-center">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-[#0081FB]/20 flex items-center justify-center">
              <Icon icon="mdi:loading" className="h-10 w-10 text-[#0081FB] animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {t('live_assist_connecting_title') || 'Establishing Connection...'}
            </h3>
            <p className="text-sm text-white/50">
              {t('live_assist_connecting_desc') ||
                'Setting up secure connection with support agent'}
            </p>
          </div>
        ) : (
          // Connected State
          <div className="rounded-2xl border border-[#0081FB]/30 bg-[#0081FB]/5 p-6">
            {/* Connection Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#0081FB]/20 flex items-center justify-center">
                  <Icon icon="mdi:headset" className="h-6 w-6 text-[#0081FB]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {t('live_assist_connected') || 'Connected'}
                  </h3>
                  <p className="text-xs text-[#0081FB]">
                    {t('live_assist_with_support') || 'With HyperTopia Support'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono font-bold text-white">
                  {formatTime(connectionTime)}
                </p>
                <p className="text-xs text-white/50">{t('live_assist_duration') || 'Duration'}</p>
              </div>
            </div>

            {/* Screen Share Preview */}
            {isScreenSharing && (
              <div className="mb-4 p-3 rounded-lg bg-[#0081FB]/10 border border-[#0081FB]/30">
                <div className="flex items-center gap-2 text-[#0081FB] text-sm">
                  <Icon icon="mdi:monitor-share" className="h-4 w-4 animate-pulse" />
                  <span>{t('live_assist_screen_sharing') || 'You are sharing your screen'}</span>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isMuted
                    ? 'bg-[#0081FB]/20 text-[#0081FB] hover:bg-[#0081FB]/30'
                    : 'bg-[#0081FB] text-white hover:bg-[#0070E0]'
                }`}
                title={isMuted ? t('unmute') || 'Unmute' : t('mute') || 'Mute'}
              >
                <Icon
                  icon={isMuted ? 'mdi:microphone-off' : 'mdi:microphone'}
                  className="h-6 w-6"
                />
              </button>

              {/* Screen Share Button */}
              <button
                onClick={toggleScreenShare}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isScreenSharing
                    ? 'bg-[#0081FB] text-white hover:bg-[#0070E0]'
                    : 'bg-[#0081FB]/20 text-[#0081FB] hover:bg-[#0081FB]/30'
                }`}
                title={
                  isScreenSharing
                    ? t('stop_sharing') || 'Stop Sharing'
                    : t('share_screen') || 'Share Screen'
                }
              >
                <Icon
                  icon={isScreenSharing ? 'mdi:monitor-off' : 'mdi:monitor-share'}
                  className="h-6 w-6"
                />
              </button>

              {/* End Call Button */}
              <button
                onClick={endSession}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all"
                title={t('end_call') || 'End Call'}
              >
                <Icon icon="mdi:phone-hangup" className="h-6 w-6" />
              </button>
            </div>
          </div>
        )}

        {/* Remote Audio */}
        <audio ref={remoteAudioRef} autoPlay hidden />
      </div>
    </div>
  )
}

export default LiveAssist
