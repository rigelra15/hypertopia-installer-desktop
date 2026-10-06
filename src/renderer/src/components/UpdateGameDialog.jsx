import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'
import { apiFetch } from '../utils/apiClient'

const REQUEST_API_URL = 'https://email.hypertopia.web.id/api/request-game'

const areGameVersionsEqual = (left, right) => {
  const normalizeVersion = (value) =>
    String(value || '')
      .trim()
      .toLocaleLowerCase()
      .replace(/^v(?=\d)/, '')
  const normalizedLeft = normalizeVersion(left)
  return Boolean(normalizedLeft && normalizedLeft === normalizeVersion(right))
}

const updateStatusStyles = {
  Pending:
    'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20',
  Process:
    'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
  Done: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20',
  Canceled:
    'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20'
}

const updateStatusLabels = {
  Pending: 'Menunggu',
  Process: 'Diproses',
  Done: 'Selesai',
  Canceled: 'Dibatalkan'
}

const getUpdateStatusBadge = (status) => (
  <span
    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
      updateStatusStyles[status] ||
      'border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60'
    }`}
  >
    {updateStatusLabels[status] || status}
  </span>
)

export function UpdateGameDialog({ isOpen, onClose, gameTitle, currentVersion, onSubmit }) {
  const { language } = useLanguage()
  const { user } = useAuth()
  const toast = useToast()

  const [newVersion, setNewVersion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingUpdates, setExistingUpdates] = useState([])
  const versionMatchesPrevious = areGameVersionsEqual(currentVersion, newVersion)
  const sameVersionMessage =
    language === 'en'
      ? 'The new version must differ from the previous version.'
      : 'Versi baru harus berbeda dari versi sebelumnya.'

  useEffect(() => {
    if (!isOpen || !gameTitle) {
      setExistingUpdates([])
      return undefined
    }

    let cancelled = false
    const loadExistingUpdates = async () => {
      try {
        const response = await apiFetch('/api/v1/web/games/requests')
        if (!response.ok) {
          throw new Error(`Failed to load game requests (${response.status})`)
        }

        const { requests } = await response.json()
        const updates = Object.values(requests || {}).filter(
          (request) => request?.gameTitle === gameTitle && request?.requestType === 'update'
        )
        if (!cancelled) setExistingUpdates(updates)
      } catch (error) {
        console.error('Error checking existing update requests:', error)
        if (!cancelled) setExistingUpdates([])
      }
    }

    void loadExistingUpdates()
    return () => {
      cancelled = true
    }
  }, [gameTitle, isOpen])

  useEffect(() => {
    if (!isOpen || isSubmitting) return undefined

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setNewVersion('')
      onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  const handleClose = () => {
    if (isSubmitting) return
    setNewVersion('')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user?.email) {
      toast.error(language === 'en' ? 'Please login first!' : 'Harus login terlebih dahulu!')
      return
    }

    if (!newVersion.trim()) {
      toast.error(language === 'en' ? 'New version is required!' : 'Versi baru wajib diisi!')
      return
    }

    if (versionMatchesPrevious) {
      toast.error(sameVersionMessage)
      return
    }

    setIsSubmitting(true)

    try {
      const submittedVersion = newVersion.trim()
      const response = await apiFetch('/api/v1/web/games/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameTitle,
          gameType: 'standalone',
          reason: '',
          previousVersion: currentVersion || '',
          newVersion: submittedVersion,
          requestType: 'update'
        })
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Request failed (${response.status})`)
      }

      try {
        await fetch(REQUEST_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.email,
            game: gameTitle,
            requestType: 'update',
            requestedBy: user.email
          })
        })
      } catch (err) {
        console.warn('Failed to send notification:', err)
      }

      toast.success(
        language === 'en'
          ? 'Update request submitted successfully!'
          : 'Request update berhasil dikirim!'
      )
      onSubmit?.(submittedVersion)
      setNewVersion('')
      onClose()
    } catch (err) {
      console.error('Error submitting update request:', err)
      toast.error(
        language === 'en' ? 'Failed to submit update request' : 'Gagal mengirim request update'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="update-game-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
        >
          <div className="fixed inset-0 bg-black/60" onClick={handleClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-game-dialog-title"
            className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1a1a1a]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 dark:border-white/10 dark:bg-[#1a1a1a]">
              <div>
                <h3
                  id="update-game-dialog-title"
                  className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"
                >
                  <Icon icon="mdi:update" className="text-blue-500" />
                  {language === 'en' ? 'Request Update' : 'Permintaan Pembaruan'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
                  {gameTitle} •
                  {language === 'en'
                    ? ' Found a newer version? Let us know!'
                    : ' Menemukan versi yang lebih baru? Beritahu kami!'}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                aria-label={language === 'en' ? 'Close' : 'Tutup'}
                className="hidden rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-white/60 dark:hover:bg-white/10 md:flex"
              >
                <Icon icon="mdi:close" className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
                {existingUpdates.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      {language === 'en' ? 'Existing Requests' : 'Riwayat Permintaan'}
                    </h5>
                    <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                      {existingUpdates.map((update, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-white/80">
                              <span>{update.previousVersion || '?'}</span>
                              <Icon icon="mdi:arrow-right" className="text-gray-300" width="14" />
                              <span className="text-blue-600 dark:text-blue-400">
                                {update.newVersion}
                              </span>
                            </div>
                            <span className="mt-0.5 text-[10px] text-gray-400">
                              {new Date(update.timeRequested).toLocaleDateString()} •{' '}
                              {update.requestedBy?.split('@')[0]}
                            </span>
                          </div>
                          {getUpdateStatusBadge(update.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-white/70">
                      {language === 'en' ? 'Previous Version' : 'Versi Sebelumnya'}
                    </label>
                    <div className="flex min-h-12 items-center rounded-xl border border-gray-200 bg-gray-100 px-3 text-sm font-semibold text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                      {currentVersion || '-'}
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="update-request-new-version"
                      className="mb-2 block text-sm font-medium text-gray-700 dark:text-white/70"
                    >
                      {language === 'en' ? 'New Version' : 'Versi Baru'} *
                    </label>
                    <input
                      id="update-request-new-version"
                      type="text"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder={language === 'en' ? 'e.g., v1.2.0' : 'Contoh: v1.2.0'}
                      className={`w-full rounded-xl border bg-white p-3 text-sm font-medium text-gray-700 outline-blue-500 transition-all placeholder:text-gray-400 focus:border-blue-500 dark:bg-white/5 dark:text-white ${
                        versionMatchesPrevious
                          ? 'border-red-400 dark:border-red-400'
                          : 'border-gray-300 dark:border-white/10'
                      }`}
                      required
                      disabled={isSubmitting}
                      aria-invalid={versionMatchesPrevious}
                      aria-describedby={versionMatchesPrevious ? 'update-version-error' : undefined}
                    />
                    {versionMatchesPrevious && (
                      <p
                        id="update-version-error"
                        className="mt-2 text-xs text-red-600"
                        role="alert"
                      >
                        {sameVersionMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="rounded-lg px-5 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/70 dark:hover:bg-white/10"
                >
                  {language === 'en' ? 'Cancel' : 'Batal'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newVersion.trim() || versionMatchesPrevious}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none dark:shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {language === 'en' ? 'Sending...' : 'Mengirim...'}
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:send" className="text-lg" />
                      {language === 'en' ? 'Send Request' : 'Kirim Permintaan'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

UpdateGameDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  gameTitle: PropTypes.string.isRequired,
  currentVersion: PropTypes.string,
  onSubmit: PropTypes.func
}

export default UpdateGameDialog
