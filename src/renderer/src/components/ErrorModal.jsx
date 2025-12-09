import { useEffect } from 'react'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

export function ErrorModal({ isOpen, onClose, error }) {
  const { t } = useLanguage()

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Friendly error mapping
  let friendlyMessage = error
  if (error && error.includes('no devices/emulators found')) {
    friendlyMessage = t('err_no_device') || 'No device found. Please connect your headset.'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, x: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              x: [0, -10, 10, -10, 10, 0]
            }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
              scale: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.3 },
              x: { duration: 0.5, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
            }}
            className="w-full max-w-sm transform rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-center rounded-full bg-red-500/10 p-4 text-red-500">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h3 className="mb-2 text-center text-lg font-bold text-white">
              {t('error_title') || 'Oops! Something went wrong'}
            </h3>

            <p className="mb-6 text-center text-sm text-white/70">{friendlyMessage}</p>

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-white/10 py-3 text-sm font-semibold text-white transition-all hover:bg-white/20 active:scale-[0.98]"
            >
              {t('btn_close') || 'Close'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

ErrorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  error: PropTypes.string
}
