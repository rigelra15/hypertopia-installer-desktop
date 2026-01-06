import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'

const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'

const devices = [
  { id: 'quest1', label: 'Meta Quest 1', icon: 'bi:headset-vr' },
  { id: 'quest2', label: 'Meta Quest 2', icon: 'bi:headset-vr' },
  { id: 'quest3', label: 'Meta Quest 3', icon: 'bi:headset-vr' },
  { id: 'quest3s', label: 'Meta Quest 3S', icon: 'bi:headset-vr' },
  { id: 'questPro', label: 'Meta Quest Pro', icon: 'bi:headset-vr' }
]

export function DevicePreferenceModal({ isOpen, onClose, onSave, currentDevice, totalGames = 0 }) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [selectedDevice, setSelectedDevice] = useState(currentDevice || null)
  const [isSaving, setIsSaving] = useState(false)

  // Sync with current device when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDevice(currentDevice || null)
    }
  }, [isOpen, currentDevice])

  const handleSave = async () => {
    if (!selectedDevice) return

    setIsSaving(true)
    try {
      // Save to Firebase if user has uid
      if (user?.uid) {
        await fetch(`${FIREBASE_DB_URL}/usersData/preferences/${user.uid}/device.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selectedDevice)
        })
      }

      onSave(selectedDevice)
      onClose()
    } catch (error) {
      console.error('Error saving device preference:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    setIsSaving(true)
    try {
      // Clear from Firebase
      if (user?.uid) {
        await fetch(`${FIREBASE_DB_URL}/usersData/preferences/${user.uid}/device.json`, {
          method: 'DELETE'
        })
      }

      onSave(null)
      onClose()
    } catch (error) {
      console.error('Error clearing device preference:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <Icon icon="bi:headset-vr" className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {t('device_preference_title') || 'Select Your Device'}
                  </h2>
                  <p className="text-xs text-white/50">
                    {t('device_preference_desc') || 'Filter games for your Quest model'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Device List */}
          <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => setSelectedDevice(device.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${
                  selectedDevice === device.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    icon={device.icon}
                    className={`h-6 w-6 ${
                      selectedDevice === device.id ? 'text-blue-400' : 'text-white/50'
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      selectedDevice === device.id ? 'text-blue-400' : 'text-white'
                    }`}
                  >
                    {device.label}
                  </span>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedDevice === device.id ? 'border-blue-500' : 'border-white/30'
                  }`}
                >
                  {selectedDevice === device.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 space-y-2">
            <button
              onClick={handleSave}
              disabled={!selectedDevice || isSaving}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all ${
                !selectedDevice || isSaving
                  ? 'bg-white/10 cursor-not-allowed text-white/50'
                  : 'bg-blue-500 hover:bg-blue-600 shadow-lg'
              }`}
            >
              {isSaving ? (
                <>
                  <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                  {t('saving') || 'Saving...'}
                </>
              ) : (
                <>
                  <Icon icon="mdi:content-save" className="h-4 w-4" />
                  {t('device_preference_save') || 'Save Preference'}
                </>
              )}
            </button>

            {currentDevice && (
              <button
                onClick={handleClear}
                disabled={isSaving}
                className="w-full py-2 px-4 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
              >
                {t('device_preference_clear') || 'Clear preference (show all games)'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

DevicePreferenceModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  currentDevice: PropTypes.string,
  totalGames: PropTypes.number
}

export default DevicePreferenceModal
