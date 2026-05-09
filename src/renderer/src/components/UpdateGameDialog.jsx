import { useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'

const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'
const REQUEST_API_URL = 'https://email.hypertopia.web.id/api/request-game'

export function UpdateGameDialog({ isOpen, onClose, gameTitle, currentVersion, onSubmit }) {
  const { language } = useLanguage()
  const { user } = useAuth()
  const toast = useToast()

  const [newVersion, setNewVersion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    setIsSubmitting(true)

    try {
      const updateData = {
        gameTitle,
        gameType: 'standalone',
        requestType: 'update',
        previousVersion: currentVersion || 'Unknown',
        newVersion: newVersion.trim(),
        requestedBy: user.email,
        status: 'Pending',
        timeRequested: new Date().toISOString()
      }

      await fetch(`${FIREBASE_DB_URL}/requestedVRGames/${gameTitle}_update_${Date.now()}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

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
      onSubmit?.(newVersion)
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
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Icon icon="mdi:update" className="text-yellow-500 text-lg" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              {language === 'en' ? 'Request Update' : 'Request Update'}
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
            {currentVersion && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {language === 'en' ? 'Current version:' : 'Versi sekarang:'} {currentVersion}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
              {language === 'en' ? 'New Version' : 'Versi Baru'} *
            </label>
            <input
              type="text"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              placeholder={language === 'en' ? 'e.g., v1.2.0' : 'contoh: v1.2.0'}
              className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              required
            />
          </div>

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
              className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

UpdateGameDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  gameTitle: PropTypes.string.isRequired,
  currentVersion: PropTypes.string,
  onSubmit: PropTypes.func
}

export default UpdateGameDialog
