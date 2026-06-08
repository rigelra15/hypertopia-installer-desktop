import { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import PropTypes from 'prop-types'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'

function ScrollingTitle({ children, className }) {
  const containerRef = useRef(null)
  const textRef = useRef(null)
  const [needsScroll, setNeedsScroll] = useState(false)

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const overflow = textRef.current.scrollWidth > containerRef.current.clientWidth
      setNeedsScroll(overflow)
    }
  }, [children])

  return (
    <h3 ref={containerRef} className={`${className} overflow-hidden`}>
      {needsScroll ? (
        <span
          ref={textRef}
          className="inline-block whitespace-nowrap"
          style={{
            animation: needsScroll ? 'scroll-title 8s linear infinite' : undefined
          }}
        >
          {children}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{children}
        </span>
      ) : (
        <span ref={textRef} className="inline-block whitespace-nowrap">
          {children}
        </span>
      )}
    </h3>
  )
}

ScrollingTitle.propTypes = {
  children: PropTypes.string,
  className: PropTypes.string
}

function Tooltip({ children, text }) {
  const [show, setShow] = useState(false)
  if (!text) return children
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-[10px] font-medium rounded-lg whitespace-normal break-words max-w-[200px] text-center z-50 pointer-events-none"
          >
            {text}
            <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-900 dark:border-t-gray-700" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

Tooltip.propTypes = {
  children: PropTypes.node,
  text: PropTypes.string
}

const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'

const getThemeConfig = (requestType) => {
  switch (requestType) {
    case 'update':
      return {
        gradient: 'from-amber-500 via-orange-500 to-amber-600',
        icon: 'material-symbols:system-update-alt-rounded',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-700',
        lightGradient: 'from-amber-50 to-orange-50',
        label: { en: 'Update', id: 'Update' }
      }
    case 'new':
      return {
        gradient: 'from-[#0081FB] via-[#0070e0] to-[#0081FB]',
        icon: 'material-symbols:add-circle-rounded',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700',
        lightGradient: 'from-blue-50 to-[#0081FB]/5',
        label: { en: 'New Game', id: 'Game Baru' }
      }
    case 'report':
      return {
        gradient: 'from-rose-500 via-red-500 to-rose-600',
        icon: 'material-symbols:bug-report-rounded',
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-600',
        borderColor: 'border-rose-200',
        textColor: 'text-rose-700',
        lightGradient: 'from-rose-50 to-red-50',
        label: { en: 'Report', id: 'Laporan' }
      }
    default:
      return {
        gradient: 'from-gray-500 via-slate-500 to-gray-600',
        icon: 'material-symbols:help-rounded',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-600',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-700',
        lightGradient: 'from-gray-50 to-slate-50',
        label: { en: 'Unknown', id: 'Tidak Diketahui' }
      }
  }
}

const getStatusConfig = (status) => {
  switch (status) {
    case 'Pending':
      return {
        bg: 'bg-orange-500',
        text: 'text-white',
        border: 'border-orange-600',
        pulse: true,
        label: { en: 'Pending', id: 'Menunggu' }
      }
    case 'Process':
      return {
        bg: 'bg-blue-500',
        text: 'text-white',
        border: 'border-blue-600',
        pulse: true,
        label: { en: 'In Process', id: 'Proses' }
      }
    case 'Done':
      return {
        bg: 'bg-emerald-500',
        text: 'text-white',
        border: 'border-emerald-600',
        pulse: false,
        label: { en: 'Completed', id: 'Selesai' }
      }
    case 'Canceled':
      return {
        bg: 'bg-red-500',
        text: 'text-white',
        border: 'border-red-600',
        pulse: false,
        label: { en: 'Canceled', id: 'Dibatalkan' }
      }
    default:
      return {
        bg: 'bg-gray-500',
        text: 'text-white',
        border: 'border-gray-600',
        pulse: false,
        label: { en: 'Unknown', id: 'Tidak Diketahui' }
      }
  }
}

const getReportText = (reportKey, language) => {
  const map = {
    file_no_longer: { en: 'File No Longer Available', id: 'File tidak tersedia lagi' },
    game_not_launching: { en: 'Game Not Launching', id: 'Game Tidak Bisa Dijalankan' },
    game_stuck_loading: { en: 'Game Stuck on Loading', id: 'Game Macet di Loading' },
    game_crashing: { en: 'Game Crashing', id: 'Game Crash' },
    game_performance_issues: { en: 'Performance Issues', id: 'Masalah Performa' },
    game_visual_glitches: { en: 'Visual Glitches', id: 'Glitch Visual' },
    others: { en: 'Others', id: 'Lainnya' }
  }
  return map[reportKey]?.[language] || reportKey
}

function RequestCard({ req, language, isAdmin, onEdit, onDelete, onStatusChange }) {
  const { user } = useAuth()
  const theme = getThemeConfig(req.requestType)
  const statusCfg = getStatusConfig(req.status)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const formatDate = (iso) => {
    if (!iso) return null
    return new Date(iso).toLocaleString(language === 'en' ? 'en-US' : 'id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const canModify = user && (user.email === req.requestedBy || isAdmin)

  return (
    <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 overflow-visible flex flex-col">
      {/* Status Badge - absolute top right outside card */}
      <div className="absolute -top-2 -right-2 z-20" ref={menuRef}>
        <button
          onClick={(e) => {
            if (isAdmin && onStatusChange) {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusCfg.bg} border-[1.5px] border-white shadow-md transition-all ${
            isAdmin ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
          }`}
        >
          <span className={`text-[10px] font-bold ${statusCfg.text}`}>
            {statusCfg.label[language]}
          </span>
          {isAdmin && (
            <Icon icon="fa6-solid:chevron-down" className="text-[8px] text-white/70 ml-0.5" />
          )}
        </button>

        <AnimatePresence>
          {menuOpen && isAdmin && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-[#222] rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 z-50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-1.5 flex flex-col gap-0.5">
                {['Pending', 'Process', 'Done', 'Canceled'].map((s) => {
                  const sCfg = getStatusConfig(s)
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        onStatusChange(req.id, s)
                        setMenuOpen(false)
                      }}
                      className={`flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg transition-all ${
                        req.status === s
                          ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${sCfg.bg}`} />
                      {sCfg.label[language]}
                      {req.status === s && (
                        <Icon
                          icon="material-symbols:check"
                          className="ml-auto text-gray-400 text-xs"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className={`relative shrink-0 bg-gradient-to-r ${theme.gradient} p-4 pb-5 rounded-t-2xl`}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-28 h-28 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Icon icon={theme.icon} className="text-white text-base" />
            </div>
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              {theme.label[language]}
            </span>
          </div>

          <ScrollingTitle className="text-base font-bold text-white leading-tight drop-shadow-sm">
            {req.gameTitle}
          </ScrollingTitle>

          <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/20 shrink-0">
              <Icon
                icon={
                  req.gameType === 'standalone' ? 'bi:headset-vr' : 'material-symbols:headset-mic'
                }
                className="text-white text-sm shrink-0"
              />
              <span className="text-white/95 text-[10px] font-semibold truncate">
                {req.gameType === 'standalone' ? 'Standalone' : 'PC VR'}
              </span>
            </span>

            {req.requestType !== 'update' && req.version && (
              <Tooltip text={req.version}>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-white/90 text-[10px] font-semibold max-w-[100px] shrink-0">
                  <Icon icon="material-symbols:tag" className="text-[10px] shrink-0" />
                  <span className="truncate">{req.version}</span>
                </span>
              </Tooltip>
            )}

            {req.requestType === 'update' && (req.previousVersion || req.newVersion) && (
              <Tooltip text={`${req.previousVersion || '?'} → ${req.newVersion || '?'}`}>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/20 text-white/90 text-[10px] font-semibold max-w-[140px] shrink-0">
                  <Icon
                    icon="material-symbols:system-update-alt-rounded"
                    className="text-[10px] shrink-0"
                  />
                  <span className="truncate">
                    {req.previousVersion || '?'} → {req.newVersion || '?'}
                  </span>
                </span>
              </Tooltip>
            )}

            {req.requestType === 'report' && req.report && (
              <Tooltip text={getReportText(req.report, language)}>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-white/90 text-[10px] font-semibold max-w-[140px] shrink-0">
                  <Icon icon="material-symbols:error-outline" className="text-[10px] shrink-0" />
                  <span className="truncate">{getReportText(req.report, language)}</span>
                </span>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="absolute -bottom-1 left-0 right-0 h-3 bg-white dark:bg-[#1a1a1a] rounded-t-3xl" />
      </div>

      <div className="flex-1 min-h-0 p-4 pt-2">
        {formatDate(req.timeRequested) && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-white/30">
            <Icon icon="material-symbols:schedule" className="text-xs" />
            {formatDate(req.timeRequested)}
          </div>
        )}
      </div>

      {canModify && (
        <div
          className={`p-3 bg-gradient-to-r ${theme.lightGradient} dark:from-white/5 dark:to-white/5 border-t ${theme.borderColor} dark:border-white/5 shrink-0`}
        >
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(req)
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-white/10 border ${theme.borderColor} dark:border-white/10 text-gray-700 dark:text-white text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/15 transition-all active:scale-95`}
              >
                <Icon icon="material-symbols:edit-outline-rounded" className="text-sm" />
                {language === 'en' ? 'Edit' : 'Edit'}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (
                  window.confirm(language === 'en' ? 'Delete this request?' : 'Hapus request ini?')
                ) {
                  onDelete(req.id)
                }
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white text-xs font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all active:scale-95"
            >
              <Icon icon="material-symbols:delete-outline-rounded" className="text-sm" />
              {language === 'en' ? 'Delete' : 'Hapus'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function RequestGameList({ onEdit }) {
  const { language } = useLanguage()
  const { user } = useAuth()
  const toast = useToast()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showAllRequests, setShowAllRequests] = useState(false)

  const isAdmin = user?.email?.toLowerCase() === 'hypertopiaid@gmail.com'

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${FIREBASE_DB_URL}/requestedVRGames.json`)
      const data = await res.json()
      if (data) {
        const requestsArray = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }))
        setRequests(
          requestsArray.sort((a, b) => new Date(b.timeRequested) - new Date(a.timeRequested))
        )
      } else {
        setRequests([])
      }
    } catch (err) {
      console.error('Error fetching requests:', err)
      toast.error(language === 'en' ? 'Failed to load requests' : 'Gagal memuat request')
    } finally {
      setLoading(false)
    }
  }, [language, toast])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        timeProcessed: newStatus !== 'Pending' ? new Date().toISOString() : null,
        timeCompleted: ['Done', 'Canceled'].includes(newStatus) ? new Date().toISOString() : null
      }

      await fetch(`${FIREBASE_DB_URL}/requestedVRGames/${requestId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      toast.success(language === 'en' ? 'Status updated!' : 'Status diupdate!')
      fetchRequests()
    } catch (err) {
      console.error('Error updating status:', err)
      toast.error(language === 'en' ? 'Failed to update status' : 'Gagal mengupdate status')
    }
  }

  const handleDelete = async (requestId) => {
    try {
      await fetch(`${FIREBASE_DB_URL}/requestedVRGames/${requestId}.json`, {
        method: 'DELETE'
      })
      toast.success(language === 'en' ? 'Request deleted!' : 'Request dihapus!')
      fetchRequests()
    } catch (err) {
      console.error('Error deleting request:', err)
      toast.error(language === 'en' ? 'Failed to delete request' : 'Gagal menghapus request')
    }
  }

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = req.gameTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const userRequests =
    showAllRequests || isAdmin
      ? filteredRequests
      : filteredRequests.filter((req) => req.requestedBy === user?.email)

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-[#111]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#0081FB]/30 border-t-[#0081FB]" />
        <p className="mt-4 text-gray-500 dark:text-white/50">
          {language === 'en' ? 'Loading requests...' : 'Memuat request...'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-[#111] overflow-hidden">
      <div className="border-b border-gray-200 dark:border-white/10 p-3 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[160px]">
          <div className="relative">
            <Icon
              icon="material-symbols:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
            />
            <input
              type="text"
              placeholder={language === 'en' ? 'Search game...' : 'Cari game...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:border-[#0081FB] focus:ring-1 focus:ring-[#0081FB]/30"
            />
          </div>
        </div>
        <span className="px-2 py-1 bg-[#0081FB]/20 text-[#0081FB] text-xs rounded-full font-medium shrink-0">
          {userRequests.length}
        </span>
        {!isAdmin && (
          <button
            onClick={() => setShowAllRequests((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              showAllRequests
                ? 'bg-[#0081FB] text-white'
                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/15'
            }`}
          >
            <Icon icon={showAllRequests ? 'mdi:eye-off' : 'mdi:eye'} className="text-sm" />
            {showAllRequests
              ? language === 'en'
                ? 'My Requests'
                : 'Request Saya'
              : language === 'en'
                ? 'All Requests'
                : 'Semua Request'}
          </button>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white text-sm"
        >
          <option value="All">{language === 'en' ? 'All Status' : 'Semua Status'}</option>
          <option value="Pending">{language === 'en' ? 'Pending' : 'Menunggu'}</option>
          <option value="Process">{language === 'en' ? 'In Progress' : 'Proses'}</option>
          <option value="Done">{language === 'en' ? 'Done' : 'Selesai'}</option>
          <option value="Canceled">{language === 'en' ? 'Canceled' : 'Dibatalkan'}</option>
        </select>
        <button
          onClick={fetchRequests}
          className="px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/70 rounded-lg transition-all"
        >
          <Icon icon="material-symbols:refresh" className="text-sm" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {userRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <Icon
                icon="material-symbols:inbox"
                className="text-4xl text-gray-300 dark:text-white/20"
              />
            </div>
            <p className="text-gray-500 dark:text-white/50 text-center text-sm">
              {searchTerm || statusFilter !== 'All'
                ? language === 'en'
                  ? 'No requests match your filters'
                  : 'Tidak ada request yang cocok'
                : showAllRequests
                  ? language === 'en'
                    ? 'No game requests from anyone yet'
                    : 'Belum ada request game dari siapapun'
                  : language === 'en'
                    ? 'No game requests yet'
                    : 'Belum ada request game'}
            </p>
          </div>
        ) : (
          <>
            {[
              {
                type: 'new',
                icon: 'material-symbols:add-circle-rounded',
                label: language === 'en' ? 'New Game' : 'Game Baru',
                color: '#0081FB',
                bg: 'bg-[#0081FB]/10',
                text: 'text-[#0081FB]'
              },
              {
                type: 'update',
                icon: 'material-symbols:system-update-alt-rounded',
                label: language === 'en' ? 'Update' : 'Update',
                color: '#f59e0b',
                bg: 'bg-amber-500/10',
                text: 'text-amber-600 dark:text-amber-400'
              },
              {
                type: 'report',
                icon: 'material-symbols:bug-report-rounded',
                label: language === 'en' ? 'Report' : 'Laporan',
                color: '#ef4444',
                bg: 'bg-rose-500/10',
                text: 'text-rose-600 dark:text-rose-400'
              }
            ].map(({ type, icon, label, bg, text }) => {
              const sectionRequests = userRequests.filter((r) => r.requestType === type)
              if (sectionRequests.length === 0) return null
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-lg ${bg} flex items-center justify-center`}>
                      <Icon icon={icon} className={`${text} text-sm`} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{label}</h3>
                    <span
                      className={`px-1.5 py-0.5 ${bg} ${text} text-[10px] rounded-full font-bold`}
                    >
                      {sectionRequests.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {sectionRequests.map((req) => (
                      <RequestCard
                        key={req.id}
                        req={req}
                        language={language}
                        isAdmin={isAdmin}
                        onEdit={onEdit}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

RequestCard.propTypes = {
  req: PropTypes.shape({
    id: PropTypes.string,
    gameTitle: PropTypes.string,
    gameType: PropTypes.string,
    requestType: PropTypes.string,
    status: PropTypes.string,
    version: PropTypes.string,
    previousVersion: PropTypes.string,
    newVersion: PropTypes.string,
    report: PropTypes.string,
    reason: PropTypes.string,
    requestedBy: PropTypes.string,
    timeRequested: PropTypes.string
  }).isRequired,
  language: PropTypes.string.isRequired,
  isAdmin: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onStatusChange: PropTypes.func
}

RequestGameList.propTypes = {
  onEdit: PropTypes.func
}

export default RequestGameList
