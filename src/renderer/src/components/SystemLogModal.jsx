import PropTypes from 'prop-types'
import { Modal } from './ui/Modal'

export function SystemLogModal({ isOpen, onClose, logHistory }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="System Logs"
      icon="mdi:console-line"
      iconColor="#0081FB"
      size="lg"
    >
      <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-black/50">
        <div className="space-y-1.5 font-mono text-xs">
          {logHistory.length > 0 ? (
            logHistory.map((entry, idx) => (
              <div key={idx} className="flex gap-3 text-gray-700 dark:text-white/80">
                <span className="shrink-0 text-gray-400 dark:text-white/30">[{entry.time}]</span>
                <span className="break-all">{entry.message}</span>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 dark:text-white/30 py-8">No logs available</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

SystemLogModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  logHistory: PropTypes.array.isRequired
}
