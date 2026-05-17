import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { Modal } from './ui/Modal'

const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'

const devices = [
  { id: 'quest1', label: 'Meta Quest 1', icon: 'bi:headset-vr' },
  { id: 'quest2', label: 'Meta Quest 2', icon: 'bi:headset-vr' },
  { id: 'quest3', label: 'Meta Quest 3', icon: 'bi:headset-vr' },
  { id: 'quest3s', label: 'Meta Quest 3S', icon: 'bi:headset-vr' },
  { id: 'questPro', label: 'Meta Quest Pro', icon: 'bi:headset-vr' }
]

export function DevicePreferenceModal({ isOpen, onClose, onSave, currentDevice }) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [selectedDevice, setSelectedDevice] = useState(currentDevice || null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedDevice(currentDevice || null)
    }
  }, [isOpen, currentDevice])

  const handleSave = async () => {
    if (!selectedDevice) return

    setIsSaving(true)
    try {
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

  const footer = (
    <div className="space-y-2">
      <button
        onClick={handleSave}
        disabled={!selectedDevice || isSaving}
        className={`w-full py-3 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all ${
          !selectedDevice || isSaving
            ? 'bg-gray-100 dark:bg-white/10 cursor-not-allowed text-gray-400 dark:text-white/50'
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
          className="w-full py-2 px-4 rounded-xl text-sm text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {t('device_preference_clear') || 'Clear preference (show all games)'}
        </button>
      )}
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('device_preference_title') || 'Select Your Device'}
      subtitle={t('device_preference_desc') || 'Filter games for your Quest model'}
      icon="bi:headset-vr"
      iconColor="#0081FB"
      size="md"
      footer={footer}
    >
      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
        {devices.map((device) => (
          <button
            key={device.id}
            onClick={() => setSelectedDevice(device.id)}
            className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${
              selectedDevice === device.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50 dark:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon
                icon={device.icon}
                className={`h-6 w-6 ${
                  selectedDevice === device.id
                    ? 'text-blue-400'
                    : 'text-gray-400 dark:text-white/50'
                }`}
              />
              <span
                className={`font-medium ${
                  selectedDevice === device.id
                    ? 'text-blue-400'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {device.label}
              </span>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedDevice === device.id
                  ? 'border-blue-500'
                  : 'border-gray-300 dark:border-white/30'
              }`}
            >
              {selectedDevice === device.id && (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              )}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}

DevicePreferenceModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  currentDevice: PropTypes.string
}

export default DevicePreferenceModal
