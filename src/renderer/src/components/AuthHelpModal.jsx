import { useEffect } from 'react'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import helpImage from '../assets/allow_usb_debugging.jpg'

export function AuthHelpModal({ isOpen, onClose, isAuthorized }) {
  const { t } = useLanguage()

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isAuthorized) onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose, isAuthorized])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md transform rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl"
          >
            <h3 className="mb-2 text-center text-lg font-bold text-white">
              {isAuthorized ? (t('auth_help_success_title') || 'Perangkat Terotorisasi!') : t('auth_help_title')}
            </h3>

            <p className="mb-4 text-center text-sm text-white/70">
              {isAuthorized ? (t('auth_help_success_desc') || 'Perangkat Quest Anda sudah terhubung dan siap digunakan.') : t('auth_help_desc')}
            </p>

            <div className="mb-6 overflow-hidden rounded-xl border border-white/10 shadow-lg">
              <img
                src={helpImage}
                alt="Allow USB Debugging"
                className="w-full h-auto object-cover opacity-90"
              />
            </div>

            <div className="flex flex-col items-center gap-3">
              {isAuthorized ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <Icon icon="mdi:check-circle" className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {t('auth_help_connected') || 'Terhubung'}
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="mt-2 w-full rounded-xl bg-[#0081FB] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#0070e0] focus:outline-none focus:ring-2 focus:ring-[#0081FB]/50"
                  >
                    {t('auth_help_understand') || 'Mengerti'}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0081FB]/30 border-t-[#0081FB]"></div>
                    <span className="text-sm font-medium text-white/70">
                      {t('auth_help_waiting') || 'Menunggu Otorisasi...'}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 text-center">
                    {t('auth_help_waiting_desc') || 'Tekan "Allow" pada headset Quest Anda'}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

AuthHelpModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  isAuthorized: PropTypes.bool
}
