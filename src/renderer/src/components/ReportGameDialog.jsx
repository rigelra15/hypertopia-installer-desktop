import { useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'

const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'
const REQUEST_API_URL = 'https://email.hypertopia.web.id/api/request-game'

const reportOptions = [
  {
    value: 'file_no_longer',
    labelEn: 'File no longer available',
    labelId: 'File tidak tersedia lagi'
  },
  { value: 'game_not_launching', labelEn: 'Game not launching', labelId: 'Game tidak bisa dibuka' },
  {
    value: 'game_stuck_loading',
    labelEn: 'Game stuck on loading screen',
    labelId: 'Game macet di loading'
  },
  { value: 'game_crashing', labelEn: 'Game crashing', labelId: 'Game crash' },
  { value: 'game_performance_issues', labelEn: 'Performance issues', labelId: 'Masalah performa' },
  { value: 'game_visual_glitches', labelEn: 'Visual glitches', labelId: 'Glitch visual' },
  { value: 'others', labelEn: 'Others', labelId: 'Lainnya' }
]

export function ReportGameDialog({ isOpen, onClose, gameTitle, gameVersion, onSubmit }) {
  const { language } = useLanguage()
  const { user } = useAuth()
  const toast = useToast()

  const [selectedIssue, setSelectedIssue] = useState('')
  const [customReport, setCustomReport] = useState('')
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

    if (selectedIssue === 'others' && !customReport.trim()) {
      toast.error(language === 'en' ? 'Please describe the issue!' : 'Jelaskan masalahnya!')
      return
    }

    setIsSubmitting(true)

    try {
      const reportData = {
        gameTitle,
        gameType: 'standalone',
        requestType: 'report',
        report: selectedIssue === 'others' ? customReport : selectedIssue,
        version: gameVersion || 'Unknown',
        requestedBy: user.email,
        status: selectedIssue === 'file_no_longer' ? 'Pending' : 'Done',
        timeRequested: new Date().toISOString()
      }

      await fetch(`${FIREBASE_DB_URL}/requestedVRGames/${gameTitle}_report_${Date.now()}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      })

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
      onSubmit?.(selectedIssue === 'others' ? customReport : selectedIssue)
      setSelectedIssue('')
      setCustomReport('')
      onClose()
    } catch (err) {
      console.error('Error submitting report:', err)
      toast.error(language === 'en' ? 'Failed to submit report' : 'Gagal mengirim laporan')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/60" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Icon icon="mdi:alert-circle" className="text-red-500 text-lg" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              {language === 'en' ? 'Report Issue' : 'Lapor Masalah'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <Icon icon="mdi:close" className="w-5 h-5 text-gray-500 dark:text-white/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <Icon icon="mdi:gamepad-variant" className="inline mr-1" />
              <span className="font-medium">{gameTitle}</span>
            </p>
            {gameVersion && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {language === 'en' ? 'Version:' : 'Versi:'} {gameVersion}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
              {language === 'en' ? 'Issue Type' : 'Tipe Masalah'} *
            </label>
            <select
              value={selectedIssue}
              onChange={(e) => setSelectedIssue(e.target.value)}
              className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              required
            >
              <option value="">{language === 'en' ? 'Select issue...' : 'Pilih masalah...'}</option>
              {reportOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {language === 'en' ? opt.labelEn : opt.labelId}
                </option>
              ))}
            </select>
          </div>

          {selectedIssue === 'others' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
                {language === 'en' ? 'Describe the Issue' : 'Jelaskan Masalahnya'} *
              </label>
              <textarea
                value={customReport}
                onChange={(e) => setCustomReport(e.target.value)}
                placeholder={
                  language === 'en' ? 'Describe the issue in detail...' : 'Jelaskan masalahnya...'
                }
                rows={3}
                className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
                required
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/70 rounded-xl font-medium transition-all"
            >
              {language === 'en' ? 'Cancel' : 'Batal'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {language === 'en' ? 'Submitting...' : 'Mengirim...'}
                </>
              ) : (
                <>
                  <Icon icon="mdi:send" className="text-lg" />
                  {language === 'en' ? 'Submit' : 'Kirim'}
                </>
              )}
            </button>
          </div>
        </form>
        </motion.div>
      </motion.div>
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
