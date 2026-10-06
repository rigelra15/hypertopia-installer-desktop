import { useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'
import { apiFetch } from '../utils/apiClient'

const REQUEST_API_URL = 'https://email.hypertopia.web.id/api/request-game'
const GAME_REQUEST_API_URL = '/api/v1/web/games/requests'

const reportOptions = [
  {
    value: 'file_no_longer',
    labelEn: 'File No Longer Available / Link Error',
    labelId: 'File Tidak Tersedia / Tautan Rusak',
    icon: 'mdi:link-variant-off'
  },
  {
    value: 'game_not_launching',
    labelEn: 'Game Not Launching',
    labelId: 'Game Tidak Dapat Dijalankan',
    icon: 'mdi:rocket-launch-outline'
  }
]

export function ReportGameDialog({ isOpen, onClose, gameTitle, gameVersion, onSubmit }) {
  const { language } = useLanguage()
  const { user } = useAuth()
  const toast = useToast()

  const [selectedIssue, setSelectedIssue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user?.email) {
      toast.error(language === 'en' ? 'Please login first!' : 'Harus login terlebih dahulu!')
      return
    }

    if (!selectedIssue) {
      toast.error(language === 'en' ? 'Please select an issue!' : 'Pilih masalah!')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await apiFetch(GAME_REQUEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameTitle,
          gameType: 'standalone',
          requestType: 'report',
          report: selectedIssue,
          version: gameVersion || 'Unknown',
          reason: ''
        })
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error || 'Failed to submit report')
      }

      try {
        await fetch(REQUEST_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.email,
            game: gameTitle,
            requestType: 'report',
            requestedBy: user.email
          })
        })
      } catch (err) {
        console.warn('Failed to send notification:', err)
      }

      toast.success(
        language === 'en' ? 'Report submitted successfully!' : 'Laporan berhasil dikirim!'
      )
      onSubmit?.(selectedIssue)
      setSelectedIssue('')
      onClose()
    } catch (err) {
      console.error('Error submitting report:', err)
      toast.error(language === 'en' ? 'Failed to submit report' : 'Gagal mengirim laporan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="report-game-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose()} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-game-dialog-title"
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1a1a1a]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#1a1a1a] sm:px-6">
              <div>
                <h3 id="report-game-dialog-title" className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                  <Icon icon="mdi:alert-circle-outline" className="text-red-500" />
                  {language === 'en' ? 'Report Issue' : 'Lapor Masalah'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
                  {gameTitle} • {language === 'en' ? 'Help us improve this game' : 'Bantu kami meningkatkan game ini'}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label={language === 'en' ? 'Close report' : 'Tutup laporan'} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/10">
                <Icon icon="mdi:close" className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="grid min-h-full grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                  <div className="min-w-0 space-y-6 p-5 sm:p-6">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <Icon icon="mdi:gamepad-variant" className="mr-1 inline" />
                        <span className="font-medium">{gameTitle}</span>
                      </p>
                      {gameVersion && <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">{language === 'en' ? 'Version:' : 'Versi:'} {gameVersion}</p>}
                    </div>

                    <div>
                      <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-white/70">
                        {language === 'en' ? 'Issue Type' : 'Tipe Masalah'} <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {reportOptions.map((opt) => {
                          const selected = selectedIssue === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setSelectedIssue(opt.value)}
                              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${selected ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'border-gray-200 text-gray-700 hover:border-red-200 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5'}`}
                            >
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/60'}`}>
                                <Icon icon={opt.icon} className="text-lg" />
                              </span>
                              <span className="text-sm font-medium">{language === 'en' ? opt.labelEn : opt.labelId}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {selectedIssue && (
                      <p className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm leading-relaxed ${selectedIssue === 'game_not_launching' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300'}`} role="status" aria-live="polite">
                        <Icon icon="mdi:information-outline" className="mt-0.5 shrink-0" />
                        <span>
                          {selectedIssue === 'game_not_launching'
                            ? language === 'en'
                              ? 'This is a community report only. The admin team will not process it.'
                              : 'Laporan ini hanya menjadi informasi komunitas dan tidak diproses oleh admin.'
                            : language === 'en'
                              ? 'Unavailable files or broken links are reviewed and handled by the admin team.'
                              : 'File yang tidak tersedia atau tautan rusak akan ditinjau dan ditindaklanjuti oleh admin.'}
                        </span>
                      </p>
                    )}
                  </div>

                  <aside className="min-w-0 border-t border-gray-100 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.03] sm:p-6 lg:border-l lg:border-t-0">
                    <div className="mb-5 flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                        <Icon icon="mdi:account-group-outline" aria-hidden="true" />
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">{language === 'en' ? 'Community Reports' : 'Laporan Komunitas'}</h4>
                        <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-white/50">
                          {language === 'en' ? 'Reports help the team identify game issues and prioritize fixes.' : 'Laporan membantu tim menemukan masalah game dan menentukan prioritas perbaikan.'}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white/80">{language === 'en' ? 'Before submitting' : 'Sebelum mengirim'}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/55">
                        {language === 'en' ? 'Choose the issue that best describes your experience. Your report will be associated with the game version shown.' : 'Pilih masalah yang paling sesuai dengan pengalaman Anda. Laporan akan dikaitkan dengan versi game yang tertera.'}
                      </p>
                      <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500 dark:border-white/10 dark:text-white/45">
                        {language === 'en' ? 'Please provide accurate information so we can investigate effectively.' : 'Berikan informasi yang akurat agar kami dapat menyelidikinya dengan baik.'}
                      </p>
                    </div>
                  </aside>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:text-white/70 dark:hover:bg-white/10">
                  {language === 'en' ? 'Cancel' : 'Batal'}
                </button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none dark:shadow-none">
                  {isSubmitting && <Icon icon="eos-icons:loading" />}
                  {isSubmitting ? (language === 'en' ? 'Submitting...' : 'Mengirim...') : (
                    <>
                      <Icon icon="mdi:send" />
                      {language === 'en' ? 'Submit' : 'Kirim'}
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

ReportGameDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  gameTitle: PropTypes.string.isRequired,
  gameVersion: PropTypes.string,
  onSubmit: PropTypes.func
}

export default ReportGameDialog
