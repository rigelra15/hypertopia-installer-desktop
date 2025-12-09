import { useEffect } from 'react'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import helpImage from '../assets/allow_usb_debugging.jpg'

export function AuthHelpModal({ isOpen, onClose }) {
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
              {t('auth_help_title')}
            </h3>

            <p className="mb-4 text-center text-sm text-white/70">{t('auth_help_desc')}</p>

            <div className="mb-6 overflow-hidden rounded-xl border border-white/10 shadow-lg">
              <img
                src={helpImage}
                alt="Allow USB Debugging"
                className="w-full h-auto object-cover opacity-90"
              />
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-[#0081FB] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0081FB]/80 active:scale-[0.98] shadow-lg shadow-[#0081FB]/20"
            >
              {t('auth_help_btn')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

AuthHelpModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}
