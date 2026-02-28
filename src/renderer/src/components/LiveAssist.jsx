import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'

// Firebase REST API URL
const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'

// Admin email
const ADMIN_EMAIL = 'hypertopiaid@gmail.com'

// TeamViewer download URL
const TEAMVIEWER_DOWNLOAD_URL = 'https://www.teamviewer.com/apac/download'

// Generate random request ID
function generateRequestId() {
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
  const [status, setStatus] = useState('idle') // idle, form, waiting, in_progress, ended
  const [requestId, setRequestId] = useState(null)
  const [teamviewerId, setTeamviewerId] = useState('')
  const [teamviewerPassword, setTeamviewerPassword] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState(null)
  const [queuePosition, setQueuePosition] = useState(0)
  const [totalInQueue, setTotalInQueue] = useState(0)

  // Admin-specific state
  const [pendingRequests, setPendingRequests] = useState([])
  const [activeRequest, setActiveRequest] = useState(null)

  // Refs
  const pollIntervalRef = useRef(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    setQueuePosition(0)
    setTotalInQueue(0)
    setActiveRequest(null)
  }, [])

  // ============ USER FUNCTIONS ============

  // Show form to fill in TeamViewer details
  const showRequestForm = () => {
    if (!user) {
      setError(t('live_assist_login_required') || 'Please login to use Live Assist')
      return
    }
    setError(null)
    setStatus('form')
  }

  // Submit request with TeamViewer details
  const submitRequest = async () => {
    if (!teamviewerId.trim()) {
      setError(t('live_assist_tv_id_required') || 'Please enter your TeamViewer ID')
      return
    }
    if (!teamviewerPassword.trim()) {
      setError(t('live_assist_tv_password_required') || 'Please enter your TeamViewer password')
      return
    }

    try {
      setError(null)
      setStatus('waiting')

      const newRequestId = generateRequestId()
      setRequestId(newRequestId)

      const requestData = {
        id: newRequestId,
        userEmail: user.email,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        teamviewerId: teamviewerId.trim(),
        teamviewerPassword: teamviewerPassword.trim(),
        description: description.trim() || null,
        status: 'waiting', // waiting, in_progress, completed
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      }

      const response = await fetch(`${FIREBASE_DB_URL}/liveAssistQueue/${newRequestId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error('Failed to submit request')
      }

      // Start polling for queue position & status updates
      pollIntervalRef.current = setInterval(async () => {
        try {
          const allRes = await fetch(`${FIREBASE_DB_URL}/liveAssistQueue.json`)
          const allData = await allRes.json()

          if (allData) {
            const waitingRequests = Object.values(allData)
              .filter((r) => r && r.status === 'waiting')
              .sort((a, b) => a.timestamp - b.timestamp)

            const myPosition = waitingRequests.findIndex((r) => r.id === newRequestId) + 1
            setQueuePosition(myPosition)
            setTotalInQueue(waitingRequests.length)
          }

          // Check my request status
          const myRes = await fetch(`${FIREBASE_DB_URL}/liveAssistQueue/${newRequestId}.json`)
          const myData = await myRes.json()

          if (!myData) {
            // Request deleted/completed
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
            setStatus('ended')
            return
          }

          if (myData.status === 'in_progress') {
            setStatus('in_progress')
          } else if (myData.status === 'completed') {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
            setStatus('ended')
          }
        } catch (err) {
          console.error('Error polling request:', err)
        }
      }, 3000)
    } catch (err) {
      console.error('Failed to submit request:', err)
      setError(err.message || 'Failed to submit request')
      setStatus('form')
      cleanup()
    }
  }

  // Cancel request (as user)
  const cancelRequest = useCallback(() => {
    if (requestId) {
      fetch(`${FIREBASE_DB_URL}/liveAssistQueue/${requestId}.json`, {
        method: 'DELETE'
      }).catch(() => {})
    }
    cleanup()
    setStatus('idle')
    setRequestId(null)
    setTeamviewerId('')
    setTeamviewerPassword('')
    setDescription('')
  }, [requestId, cleanup])

  // ============ ADMIN FUNCTIONS ============

  // Fetch pending requests (admin only)
  const fetchPendingRequests = useCallback(async () => {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/liveAssistQueue.json`)
      const data = await res.json()

      if (data) {
        const requests = Object.values(data)
          .filter((r) => r && (r.status === 'waiting' || r.status === 'in_progress'))
          .sort((a, b) => a.timestamp - b.timestamp)
        setPendingRequests(requests)

        // Check if there's an active request
        const active = requests.find((r) => r.status === 'in_progress')
        if (active) {
          setActiveRequest(active)
        }
      } else {
        setPendingRequests([])
      }
    } catch (err) {
      console.error('Error fetching requests:', err)
    }
  }, [])

  // Start polling for requests (admin only)
  useEffect(() => {
    if (isAdmin && status === 'idle') {
      fetchPendingRequests()
      pollIntervalRef.current = setInterval(fetchPendingRequests, 3000)

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    }
  }, [isAdmin, status, fetchPendingRequests])

  // Accept request (admin)
  const acceptRequest = async (request) => {
    try {
      setError(null)
      setActiveRequest(request)

      // Update status to in_progress
      await fetch(`${FIREBASE_DB_URL}/liveAssistQueue/${request.id}/status.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('in_progress')
      })

      // Add admin info
      await fetch(`${FIREBASE_DB_URL}/liveAssistQueue/${request.id}/adminEmail.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ADMIN_EMAIL)
      })

      setStatus('in_progress')
    } catch (err) {
      console.error('Failed to accept request:', err)
      setError(err.message || 'Failed to accept request')
    }
  }

  // Complete request (admin)
  const completeRequest = async () => {
    if (activeRequest) {
      try {
        await fetch(`${FIREBASE_DB_URL}/liveAssistQueue/${activeRequest.id}.json`, {
          method: 'DELETE'
        })
      } catch {
        // Ignore error
      }
    }
    setActiveRequest(null)
    setStatus('idle')
    cleanup()
    fetchPendingRequests()
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

  // Open TeamViewer download page
  const openTeamViewerDownload = () => {
    window.open(TEAMVIEWER_DOWNLOAD_URL, '_blank')
  }

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
            {t('live_assist_admin_subtitle') ||
              'Manage and respond to user support requests via TeamViewer'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 mb-6">
              <div className="flex items-center gap-3">
                <Icon icon="mdi:alert-circle" className="h-5 w-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          {status === 'idle' ? (
            <>
              {/* Admin Dashboard */}
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
                        'View and respond to incoming TeamViewer support requests'}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="rounded-xl bg-[#0081FB]/10 p-4">
                    <p className="text-2xl font-bold text-[#0081FB]">
                      {pendingRequests.filter((r) => r.status === 'waiting').length}
                    </p>
                    <p className="text-xs text-white/50">
                      {t('live_assist_pending') || 'Pending Requests'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 p-4">
                    <p className="text-2xl font-bold text-emerald-400">
                      {pendingRequests.filter((r) => r.status === 'in_progress').length}
                    </p>
                    <p className="text-xs text-white/50">
                      {t('live_assist_active') || 'Active Sessions'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pending Requests List */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Icon icon="mdi:clock-outline" className="h-5 w-5 text-[#0081FB]" />
                  {t('live_assist_waiting_list') || 'Waiting Queue'}
                </h3>

                {pendingRequests.length === 0 ? (
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
                    {pendingRequests.map((request, index) => (
                      <div
                        key={request.id}
                        className={`p-4 rounded-xl border transition-all ${
                          request.status === 'in_progress'
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#0081FB]/20 flex items-center justify-center text-[#0081FB] font-bold text-sm shrink-0">
                              {index + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{request.userName}</p>
                              <p className="text-xs text-white/50 truncate">{request.userEmail}</p>
                              {/* TeamViewer Info */}
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <Icon
                                    icon="mdi:monitor-dashboard"
                                    className="h-3.5 w-3.5 text-[#0081FB] shrink-0"
                                  />
                                  <span className="text-white/70">ID: {request.teamviewerId}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <Icon
                                    icon="mdi:key"
                                    className="h-3.5 w-3.5 text-amber-400 shrink-0"
                                  />
                                  <span className="text-white/70">
                                    Pass: {request.teamviewerPassword}
                                  </span>
                                </div>
                                {request.description && (
                                  <div className="flex items-start gap-2 text-xs mt-1">
                                    <Icon
                                      icon="mdi:message-text"
                                      className="h-3.5 w-3.5 text-white/40 shrink-0 mt-0.5"
                                    />
                                    <span className="text-white/50">{request.description}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-xs text-white/30">
                              {formatDate(request.createdAt)}
                            </span>
                            {request.status === 'in_progress' ? (
                              <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {t('live_assist_in_progress') || 'In Progress'}
                              </span>
                            ) : index === 0 ||
                              !pendingRequests.some((r) => r.status === 'in_progress') ? (
                              <button
                                onClick={() => acceptRequest(request)}
                                className="px-4 py-2 bg-[#0081FB] hover:bg-[#0070E0] text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2"
                              >
                                <Icon icon="mdi:play" className="h-4 w-4" />
                                {t('live_assist_accept') || 'Accept'}
                              </button>
                            ) : (
                              <span className="px-3 py-1.5 bg-white/5 text-white/40 rounded-lg text-xs">
                                {t('live_assist_in_queue') || 'In Queue'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : status === 'in_progress' && activeRequest ? (
            // Active Session (Admin connecting via TeamViewer)
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Icon icon="mdi:account" className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{activeRequest.userName}</h3>
                  <p className="text-xs text-emerald-400">{activeRequest.userEmail}</p>
                </div>
                <div className="ml-auto flex items-center gap-2 text-emerald-400 text-sm">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{t('live_assist_in_progress') || 'In Progress'}</span>
                </div>
              </div>

              {/* TeamViewer Connection Info */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-5 mb-6">
                <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Icon icon="simple-icons:teamviewer" className="h-4 w-4 text-[#0081FB]" />
                  TeamViewer Connection Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">TeamViewer ID</label>
                    <div className="bg-white/5 rounded-lg px-4 py-3 text-white font-mono text-lg select-all border border-white/10">
                      {activeRequest.teamviewerId}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Password</label>
                    <div className="bg-white/5 rounded-lg px-4 py-3 text-white font-mono text-lg select-all border border-white/10">
                      {activeRequest.teamviewerPassword}
                    </div>
                  </div>
                </div>
                {activeRequest.description && (
                  <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-xs text-white/40 mb-1">
                      {t('live_assist_issue_desc') || 'Issue Description'}
                    </p>
                    <p className="text-sm text-white/70">{activeRequest.description}</p>
                  </div>
                )}
              </div>

              {/* Complete Button */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={completeRequest}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2"
                >
                  <Icon icon="mdi:check-circle" className="h-5 w-5" />
                  {t('live_assist_complete') || 'Mark as Complete'}
                </button>
              </div>
            </div>
          ) : null}
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
          {t('live_assist_subtitle') || 'Get remote help from HyperTopia team via TeamViewer'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {/* Info Card - How it Works */}
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
                    icon="mdi:numeric-1-circle"
                    className="h-4 w-4 text-[#0081FB] mt-0.5 shrink-0"
                  />
                  <span>
                    {t('live_assist_step_1') || 'Download & open TeamViewer on your computer'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon
                    icon="mdi:numeric-2-circle"
                    className="h-4 w-4 text-[#0081FB] mt-0.5 shrink-0"
                  />
                  <span>
                    {t('live_assist_step_2') ||
                      'Enter your TeamViewer ID and password in the form below'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon
                    icon="mdi:numeric-3-circle"
                    className="h-4 w-4 text-[#0081FB] mt-0.5 shrink-0"
                  />
                  <span>
                    {t('live_assist_step_3') ||
                      'Wait in queue — our team will connect to help you remotely'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* TeamViewer Download Banner */}
        <div className="rounded-2xl border border-[#0081FB]/20 bg-[#0081FB]/5 p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0081FB]/20 flex items-center justify-center shrink-0">
                <Icon icon="simple-icons:teamviewer" className="h-5 w-5 text-[#0081FB]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {t('live_assist_need_tv') || "Don't have TeamViewer yet?"}
                </p>
                <p className="text-xs text-white/50">
                  {t('live_assist_tv_desc') ||
                    'Download TeamViewer for free to enable remote assistance'}
                </p>
              </div>
            </div>
            <button
              onClick={openTeamViewerDownload}
              className="px-4 py-2 bg-[#0081FB] hover:bg-[#0070E0] text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2 shrink-0"
            >
              <Icon icon="mdi:download" className="h-4 w-4" />
              {t('download') || 'Download'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 mb-6">
            <div className="flex items-center gap-3">
              <Icon icon="mdi:alert-circle" className="h-5 w-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
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
              <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm">
                <Icon icon="mdi:check-circle" className="h-4 w-4" />
                {t('live_assist_session_ended') || 'Session completed. Thank you!'}
              </div>
            )}

            <h3 className="text-xl font-bold text-white mb-2">
              {t('live_assist_ready_title') || 'Ready to Connect'}
            </h3>
            <p className="text-sm text-white/50 mb-6">
              {t('live_assist_ready_desc') ||
                'Click the button below to request remote assistance from our team'}
            </p>

            {!user ? (
              <p className="text-sm text-[#0081FB]">
                <Icon icon="mdi:login" className="inline h-4 w-4 mr-1" />
                {t('live_assist_login_required') || 'Please login to use Live Assist'}
              </p>
            ) : (
              <button
                onClick={showRequestForm}
                className="px-8 py-3 bg-[#0081FB] hover:bg-[#0070E0] text-white rounded-xl font-semibold transition-all flex items-center gap-2 mx-auto"
              >
                <Icon icon="mdi:hand-wave" className="h-5 w-5" />
                {t('live_assist_start') || 'Request Assistance'}
              </button>
            )}
          </div>
        ) : status === 'form' ? (
          // TeamViewer Form
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#0081FB]/10 flex items-center justify-center">
                <Icon icon="simple-icons:teamviewer" className="h-6 w-6 text-[#0081FB]" />
              </div>
              <div>
                <h3 className="font-bold text-white">
                  {t('live_assist_form_title') || 'Enter TeamViewer Details'}
                </h3>
                <p className="text-xs text-white/50">
                  {t('live_assist_form_desc') ||
                    'Open TeamViewer and enter your ID and password below'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* TeamViewer ID */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  <Icon
                    icon="mdi:monitor-dashboard"
                    className="inline h-4 w-4 mr-1 text-[#0081FB]"
                  />
                  TeamViewer ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={teamviewerId}
                  onChange={(e) => setTeamviewerId(e.target.value)}
                  placeholder="e.g. 123 456 789"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#0081FB]/50 focus:ring-1 focus:ring-[#0081FB]/30 transition-all font-mono text-lg"
                />
              </div>

              {/* TeamViewer Password */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  <Icon icon="mdi:key" className="inline h-4 w-4 mr-1 text-amber-400" />
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={teamviewerPassword}
                  onChange={(e) => setTeamviewerPassword(e.target.value)}
                  placeholder={
                    t('live_assist_tv_password_placeholder') || 'Password from TeamViewer'
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#0081FB]/50 focus:ring-1 focus:ring-[#0081FB]/30 transition-all font-mono text-lg"
                />
              </div>

              {/* Issue Description (Optional) */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  <Icon icon="mdi:message-text" className="inline h-4 w-4 mr-1 text-white/50" />
                  {t('live_assist_desc_label') || 'Describe your issue'}{' '}
                  <span className="text-white/30">({t('optional') || 'optional'})</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    t('live_assist_desc_placeholder') ||
                    'Briefly describe what you need help with...'
                  }
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#0081FB]/50 focus:ring-1 focus:ring-[#0081FB]/30 transition-all resize-none text-sm"
                />
              </div>

              {/* Info Note */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-start gap-2">
                  <Icon icon="mdi:shield-lock" className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400/80 leading-relaxed">
                    {t('live_assist_security_note') ||
                      'Your TeamViewer credentials are only used for this session and will be deleted after the session is completed.'}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setStatus('idle')
                    setError(null)
                  }}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl font-medium transition-all"
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  onClick={submitRequest}
                  className="flex-1 px-6 py-3 bg-[#0081FB] hover:bg-[#0070E0] text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Icon icon="mdi:send" className="h-5 w-5" />
                  {t('live_assist_submit') || 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        ) : status === 'waiting' ? (
          // Waiting State
          <div className="rounded-2xl border border-[#0081FB]/30 bg-[#0081FB]/5 p-8 text-center">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-[#0081FB]/20 flex items-center justify-center">
              <Icon icon="mdi:loading" className="h-10 w-10 text-[#0081FB] animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {t('live_assist_waiting_title') || 'Waiting in Queue...'}
            </h3>
            <p className="text-sm text-white/50 mb-4">
              {t('live_assist_waiting_desc') ||
                'Our team will connect to your computer via TeamViewer shortly.'}
            </p>

            {/* Queue Position */}
            {queuePosition > 0 && (
              <div className="mb-4 inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-[#0081FB]">
                  <Icon icon="mdi:account-group" className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {t('live_assist_queue_position') || 'Queue Position'}:
                  </span>
                </div>
                <span className="text-2xl font-bold text-white">#{queuePosition}</span>
                <span className="text-xs text-white/40">/ {totalInQueue}</span>
              </div>
            )}

            {/* TeamViewer reminder */}
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 max-w-md mx-auto text-left">
              <p className="text-xs text-white/60 mb-2 flex items-center gap-2">
                <Icon icon="mdi:information" className="h-4 w-4 text-[#0081FB]" />
                {t('live_assist_keep_open') ||
                  'Make sure TeamViewer is open and running on your computer'}
              </p>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Icon icon="mdi:monitor-dashboard" className="h-3.5 w-3.5" />
                <span>ID: {teamviewerId}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-[#0081FB] text-sm mb-6">
              <div className="h-2 w-2 rounded-full bg-[#0081FB] animate-pulse" />
              <span>{t('live_assist_waiting_agent') || 'Waiting for available agent...'}</span>
            </div>

            <button
              onClick={cancelRequest}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
            >
              {t('cancel') || 'Cancel'}
            </button>
          </div>
        ) : status === 'in_progress' ? (
          // In Progress State
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Icon icon="mdi:monitor-share" className="h-10 w-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {t('live_assist_connected_title') || 'Support is Connected!'}
            </h3>
            <p className="text-sm text-white/50 mb-4">
              {t('live_assist_connected_desc') ||
                'Our team is now connecting to your computer via TeamViewer. Please stay on your computer.'}
            </p>

            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm mb-6">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('live_assist_session_active') || 'Session Active'}</span>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 max-w-md mx-auto mb-6">
              <p className="text-xs text-white/50">
                {t('live_assist_tv_connected_info') ||
                  'If you see a TeamViewer window pop up, please accept the connection from our support agent.'}
              </p>
            </div>

            <button
              onClick={cancelRequest}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
            >
              {t('live_assist_end_session') || 'End Session'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default LiveAssist
