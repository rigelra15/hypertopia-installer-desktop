import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { useLanguage } from '../contexts/LanguageContext'

export function DeviceSelector({ onSelect, selectedSerial }) {
  const { t } = useLanguage()
  const [devices, setDevices] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchDevices = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await window.api.listDevices()
      setDevices(result)

      // Auto-select logic
      if (!selectedSerial && result.length > 0) {
        // Select first available
        onSelect(result[0].serial)
      } else if (selectedSerial && !result.find((d) => d.serial === selectedSerial)) {
        // Verify selected still exists, if not, reset or select new
        onSelect(result.length > 0 ? result[0].serial : null)
      }
    } catch (err) {
      console.error('Failed to list devices', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedSerial, onSelect])

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 3000) // Auto refresh every 3s
    return () => clearInterval(interval)
  }, [fetchDevices])

  return (
    <div className="flex flex-col">
      <div className="relative">
        <select
          value={selectedSerial || ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={isLoading && devices.length === 0}
          className="w-full appearance-none cursor-pointer rounded-lg border border-white/10 bg-white/5 pl-3 pr-8 py-2 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#0081FB]/50"
        >
          <option value="" disabled>
            {devices.length === 0
              ? isLoading
                ? t('scanning')
                : t('no_device')
              : t('select_device')}
          </option>
          {devices.map((dev) => (
            <option key={dev.serial} value={dev.serial} className="bg-[#0a0a0a]">
              {dev.model} - {dev.battery || 'N/A'}
            </option>
          ))}
        </select>

        {/* Chevron */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/50">
          {isLoading && devices.length === 0 ? (
            <div className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white"></div>
          ) : (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </div>

        {/* Activity Indicator / Count */}
        {devices.length > 0 && (
          <div className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
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
