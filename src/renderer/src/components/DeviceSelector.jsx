import { useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { AuthHelpModal } from './AuthHelpModal'

export function DeviceSelector({ onSelect, selectedSerial }) {
  const { t } = useLanguage()
  const [devices, setDevices] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAuthHelp, setShowAuthHelp] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const authHelpDismissed = useRef(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Helper function to get battery icon based on percentage
  const getBatteryIcon = (batteryStr) => {
    if (!batteryStr || batteryStr === 'N/A') return 'fluent:battery-charge-0-20-regular'
    const percent = parseInt(batteryStr.replace('%', ''), 10)
    if (isNaN(percent)) return 'fluent:battery-charge-0-20-regular'

    if (percent >= 95) return 'fluent:battery-charge-10-20-regular'
    if (percent >= 85) return 'fluent:battery-charge-9-20-regular'
    if (percent >= 75) return 'fluent:battery-charge-8-20-regular'
    if (percent >= 65) return 'fluent:battery-charge-7-20-regular'
    if (percent >= 55) return 'fluent:battery-charge-6-20-regular'
    if (percent >= 45) return 'fluent:battery-charge-5-20-regular'
    if (percent >= 35) return 'fluent:battery-charge-4-20-regular'
    if (percent >= 25) return 'fluent:battery-charge-3-20-regular'
    if (percent >= 15) return 'fluent:battery-charge-2-20-regular'
    if (percent >= 5) return 'fluent:battery-charge-1-20-regular'
    return 'fluent:battery-charge-0-20-regular'
  }

  // Helper function to get battery color based on percentage
  const getBatteryColor = (batteryStr) => {
    if (!batteryStr || batteryStr === 'N/A') return 'text-white/40'
    const percent = parseInt(batteryStr.replace('%', ''), 10)
    if (isNaN(percent)) return 'text-white/40'

    if (percent < 20) return 'text-red-500'
    if (percent < 50) return 'text-yellow-500'
    return 'text-green-500'
  }

  const fetchDevices = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await window.api.listDevices()
      setDevices(result)

      // Check for unauthorized devices
      const hasUnauthorized = result.some((d) => d.state === 'unauthorized')
      if (hasUnauthorized && !authHelpDismissed.current) {
        setShowAuthHelp(true)
      }
      // Note: We no longer auto-close the modal. The user must click "Mengerti" button.

      // Auto-select logic
      if (!selectedSerial && result.length > 0) {
        // Select first available (prefer authorized)
        const valid = result.find((d) => d.state === 'device') || result[0]
        onSelect(valid.serial)
      } else if (selectedSerial && !result.find((d) => d.serial === selectedSerial)) {
        // Verify selected still exists, if not, reset or select new
        const valid =
          result.length > 0 ? result.find((d) => d.state === 'device') || result[0] : null
        onSelect(valid ? valid.serial : null)
      }
    } catch (err) {
      console.error('Failed to list devices', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedSerial, onSelect])

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 1500) // Auto refresh every 1.5s
    return () => clearInterval(interval)
  }, [fetchDevices])

  const handleCloseAuthHelp = () => {
    setShowAuthHelp(false)
    authHelpDismissed.current = true
  }

  const handleSelectDevice = (serial) => {
    onSelect(serial)
    setIsOpen(false)
  }

  // Check if device is authorized (no unauthorized devices when modal is showing)
  const isDeviceAuthorized = showAuthHelp && !devices.some((d) => d.state === 'unauthorized')

  // Get selected device for display
  const selectedDevice = devices.find((d) => d.serial === selectedSerial)

  return (
    <div className="flex flex-col">
      <AuthHelpModal
        isOpen={showAuthHelp}
        onClose={handleCloseAuthHelp}
        isAuthorized={isDeviceAuthorized}
      />

      {/* Custom Dropdown */}
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading && devices.length === 0}
          className="w-full flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#0081FB]/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* Selected Device Display */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedDevice ? (
              <>
                <span className="truncate">
                  {selectedDevice.model}
                  {selectedDevice.state === 'unauthorized' ? ' (Unauthorized)' : ''}
                </span>
                <span className="text-white/30">-</span>
                <Icon
                  icon={getBatteryIcon(selectedDevice.battery)}
                  className={`h-4 w-4 shrink-0 ${getBatteryColor(selectedDevice.battery)}`}
                />
                <span className={`shrink-0 text-[10px] ${getBatteryColor(selectedDevice.battery)}`}>
                  {selectedDevice.battery || 'N/A'}
                </span>
              </>
            ) : (
              <span className="text-white/40">
                {devices.length === 0
                  ? isLoading
                    ? t('scanning')
                    : t('no_device')
                  : t('select_device')}
              </span>
            )}
          </div>

          {/* Chevron / Loading */}
          {isLoading && devices.length === 0 ? (
            <div className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white"></div>
          ) : (
            <Icon
              icon="line-md:chevron-down"
              className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          )}
        </button>

        {/* Activity Indicator */}
        {devices.length > 0 && (
          <div className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
        )}

        {/* Dropdown Menu */}
        {isOpen && devices.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#0a0a0a] py-1 shadow-xl">
            {devices.map((dev) => (
              <button
                key={dev.serial}
                onClick={() => handleSelectDevice(dev.serial)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-all hover:bg-white/10 ${
                  dev.serial === selectedSerial
                    ? 'bg-[#0081FB]/20 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {/* Device Info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="truncate font-medium">
                    {dev.model}
                    {dev.state === 'unauthorized' && (
                      <span className="ml-1 text-[10px] text-yellow-500">(Unauthorized)</span>
                    )}
                  </div>
                </div>

                <span className="text-white/30">-</span>

                {/* Battery Icon */}
                <Icon
                  icon={getBatteryIcon(dev.battery)}
                  className={`h-4 w-4 shrink-0 ${getBatteryColor(dev.battery)}`}
                />

                {/* Battery Percentage */}
                <span
                  className={`shrink-0 text-[10px] font-medium ${getBatteryColor(dev.battery)}`}
                >
                  {dev.battery || 'N/A'}
                </span>

                {/* Selected Indicator */}
                {dev.serial === selectedSerial && (
                  <Icon icon="mdi:check" className="h-3 w-3 shrink-0 text-[#0081FB]" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Storage Info Card */}
      {selectedSerial &&
        devices.find((d) => d.serial === selectedSerial)?.storage?.total !== '0' && (
          <div className="mt-3 rounded-lg border border-white/5 bg-white/5 p-3">
            <div className="flex items-center justify-between text-[10px] text-white/70 mb-1">
              <span>{t('storage_label')}</span>
              <span>
                {devices.find((d) => d.serial === selectedSerial).storage.free}{' '}
                {t('storage_free_of')}{' '}
                {devices.find((d) => d.serial === selectedSerial).storage.total}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${(() => {
                  const percent = parseInt(
                    devices.find((d) => d.serial === selectedSerial).storage.percent
                  )
                  if (percent > 90) return 'bg-red-500' // Critical
                  if (percent > 70) return 'bg-yellow-500' // Warning
                  return 'bg-[#0081FB]' // Safe
                })()}`}
                style={{ width: devices.find((d) => d.serial === selectedSerial).storage.percent }}
              ></div>
            </div>
            <div className="mt-1 text-right text-[9px] text-white/40">
              {devices.find((d) => d.serial === selectedSerial).storage.percent} {t('storage_used')}
            </div>
          </div>
        )}
    </div>
  )
}

DeviceSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  selectedSerial: PropTypes.string
}
