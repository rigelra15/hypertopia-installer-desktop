import { useState } from 'react'
import PropTypes from 'prop-types'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@iconify/react'

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]'
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconColor = '#0081FB',
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  headerRight,
  hideTrafficLights = false,
  overlayOpacity = 70
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-root"
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity / 100})` }}
            onClick={closeOnBackdrop ? () => onClose() : undefined}
          />
          <motion.div
            className={`relative w-full ${sizeMap[size]} max-h-[80vh] bg-white dark:bg-[#111] rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* macOS Traffic Light Header */}
            {!hideTrafficLights && (
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-white/10">
                {/* Traffic Lights */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Red - Close (clickable) */}
                  <div
                    className="relative"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <button
                      onClick={() => onClose()}
                      className="w-3.5 h-3.5 rounded-full bg-[#FF5F57]/60 hover:bg-[#FF3B30] transition-colors flex items-center justify-center group"
                    >
                      <Icon
                        icon="material-symbols:close"
                        className="h-3 w-3 text-[#4A0000] opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </button>
                    {/* Custom Tooltip */}
                    {showTooltip && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-[10px] font-medium rounded-md whitespace-nowrap z-50 pointer-events-none">
                        <div className="flex items-center gap-1">
                          <Icon icon="material-symbols:close" className="h-3 w-3" />
                          <span>Close</span>
                        </div>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
                      </div>
                    )}
                  </div>
                  {/* Yellow - Grayed out */}
                  <div className="w-3.5 h-3.5 rounded-full bg-gray-400/30" />
                  {/* Green - Grayed out */}
                  <div className="w-3.5 h-3.5 rounded-full bg-gray-400/30" />
                </div>

                {/* Title */}
                {title && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {icon && (
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${iconColor}15` }}
                        >
                          <Icon icon={icon} className="h-4 w-4" style={{ color: iconColor }} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                          {title}
                        </h2>
                        {subtitle && (
                          <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                            {subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Extra header content (right side) */}
                {headerRight && <div className="shrink-0">{headerRight}</div>}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="px-5 py-4 border-t border-gray-200 dark:border-white/10">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  icon: PropTypes.string,
  iconColor: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
  children: PropTypes.node,
  footer: PropTypes.node,
  closeOnBackdrop: PropTypes.bool,
  headerRight: PropTypes.node,
  hideTrafficLights: PropTypes.bool,
  overlayOpacity: PropTypes.number
}
