import { useState, useEffect, useReducer } from 'react'
import { Icon } from '@iconify/react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

// Timer reducer - avoids setState sync in effect
function timerReducer(state, action) {
  switch (action.type) {
    case 'tick':
      return action.expiresAt ? Math.max(0, Math.floor((action.expiresAt - Date.now()) / 1000)) : 0
    case 'reset':
      return 0
    default:
      return state
  }
}

export function UserMenu() {
  const { t } = useLanguage()
  const {
    user,
    accessTypes,
    loading,
    eligibilityLoading,
    checkEligibility,
    deviceCode,
    deviceCodeLoading,
    deviceCodeError,
    startDeviceCodeLogin,
    cancelDeviceCodeLogin,
    logout
  } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [loginModalRequested, setLoginModalRequested] = useState(false)
  const [timeLeft, dispatchTimer] = useReducer(timerReducer, 0)
  const [imageError, setImageError] = useState(false)

  // Derive showLoginModal from state - modal shows only if requested AND (has code OR loading OR error)
  const showLoginModal = loginModalRequested && !user && (deviceCode || deviceCodeLoading || deviceCodeError)

  // Countdown timer using reducer
  const expiresAt = deviceCode?.expiresAt
  useEffect(() => {
    if (!expiresAt) return undefined

    dispatchTimer({ type: 'tick', expiresAt })
    const interval = setInterval(() => {
      dispatchTimer({ type: 'tick', expiresAt })
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  const handleLogout = async () => {
    try {
      await logout()
      setShowDropdown(false)
      setLoginModalRequested(false)
      cancelDeviceCodeLogin()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleStartLogin = () => {
    setLoginModalRequested(true)
    startDeviceCodeLogin()
  }

  const handleCancelLogin = () => {
    cancelDeviceCodeLogin()
    setLoginModalRequested(false)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
      </div>
    )
  }

  // Not logged in - show login button
  if (!user) {
    return (
      <>
        {/* Login Button */}
        <button
          onClick={handleStartLogin}
          disabled={deviceCodeLoading}
          className="flex items-center gap-2 rounded-lg bg-[#0081FB] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#0070E0] disabled:opacity-50 shadow-sm"
        >
          {deviceCodeLoading ? (
            <>
              <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
              <span>{t('generating_code') || 'Generating...'}</span>
            </>
          ) : (
            <>
              <Icon icon="mdi:account" className="h-4 w-4" />
              <span>{t('login_btn') || 'Login'}</span>
            </>
          )}
        </button>

        {/* Login Modal */}
        {showLoginModal && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={handleCancelLogin}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={handleCancelLogin}
                  className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                >
                  <Icon icon="mdi:close" className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg">
                    <Icon icon="mdi:link-variant" className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {t('login_title') || 'Login to HyperTopia'}
                  </h2>
                  <p className="text-sm text-white/60 mt-1">
                    {t('device_code_instruction') || 'Go to website and enter this code:'}
                  </p>
                </div>

                {deviceCode ? (
                  <>
                    {/* Website Link */}
                    <a
                      href="https://hypertopia.store/link-device"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center mb-4"
                    >
                      <span className="text-sm text-blue-400 hover:text-blue-300 underline">
                        hypertopia.store/link-device
                      </span>
                    </a>

                    {/* Code Display */}
                    <div className="flex justify-center gap-2 mb-6">
                      {deviceCode.code.split('').map((char, i) => (
                        <div
                          key={i}
                          className="w-12 h-14 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] border border-white/20 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                        >
                          {char}
                        </div>
                      ))}
                    </div>

                    {/* Timer */}
                    <div className="flex items-center justify-center gap-2 text-sm mb-4">
                      <Icon icon="mdi:clock-outline" className="h-4 w-4 text-white/50" />
                      <span className={timeLeft < 60 ? 'text-red-400' : 'text-white/50'}>
                        {t('expires_in') || 'Expires in'} {formatTime(timeLeft)}
                      </span>
                    </div>

                    {/* Waiting Indicator */}
                    <div className="flex items-center justify-center gap-2 text-xs text-white/40 mb-6">
                      <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                      <span>{t('waiting_for_link') || 'Waiting for website link...'}</span>
                    </div>
                  </>
                ) : deviceCodeError ? (
                  <div className="text-center py-4 mb-4">
                    <div className="w-12 h-12 mx-auto mb-3 bg-red-500/20 rounded-full flex items-center justify-center">
                      <Icon icon="mdi:alert-circle" className="h-6 w-6 text-red-400" />
                    </div>
                    <p className="text-red-400 text-sm">{deviceCodeError}</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-white/50 mx-auto" />
                  </div>
                )}

                {/* Cancel Button */}
                <button
                  onClick={handleCancelLogin}
                  className="w-full py-3 text-sm text-white/50 hover:text-white/70 transition-colors"
                >
                  {t('cancel') || 'Cancel'}
                </button>
              </div>
            </div>
          </>
        )}
      </>
    )
  }

  // Logged in - show user menu
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 transition-all hover:bg-white/10"
      >
        {user.photoURL && !imageError ? (
          <img
            src={user.photoURL}
            alt={user.displayName || user.email}
            className="h-7 w-7 rounded-full border border-white/20"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0081FB]">
            <Icon icon="mdi:account" className="h-4 w-4 text-white" />
          </div>
        )}
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-white leading-tight">
            {user.displayName || user.email?.split('@')[0]}
          </span>
          <span className="text-[10px] text-white/40 flex items-center gap-1">
            {eligibilityLoading ? (
              <Icon icon="mdi:loading" className="h-3 w-3 animate-spin" />
            ) : accessTypes.length > 0 ? (
              <span className="flex items-center gap-1">
                {accessTypes.map((type) => (
                  <span
                    key={type}
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 uppercase"
                  >
                    {type}
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-white/40">{t('no_access') || 'No Access'}</span>
            )}
          </span>
        </div>
        <Icon
          icon="mdi:chevron-down"
          className={`h-4 w-4 text-white/50 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

          {/* Menu */}
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/10 bg-[#1a1a1a] p-2 shadow-xl">
            {/* User Info */}
            <div className="border-b border-white/10 px-3 py-3 mb-2">
              <div className="flex items-center gap-3">
                {user.photoURL && !imageError ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || user.email}
                    className="h-10 w-10 rounded-full border border-white/20"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0081FB]">
                    <Icon icon="mdi:account" className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {user.displayName && (
                    <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                  )}
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 flex-wrap">
                {eligibilityLoading ? (
                  <span className="text-xs text-white/40 flex items-center gap-1">
                    <Icon icon="mdi:loading" className="h-3 w-3 animate-spin" />
                    {t('checking_eligibility') || 'Checking access...'}
                  </span>
                ) : accessTypes.length > 0 ? (
                  <>
                    {accessTypes.map((type) => (
                      <span
                        key={type}
                        className="text-xs text-blue-300 flex items-center gap-1 bg-blue-500/20 px-2 py-1 rounded-full uppercase font-semibold"
                      >
                        {type}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-xs text-white/40 flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full">
                    {t('no_access') || 'No Download Access'}
                  </span>
                )}
              </div>
            </div>

            {/* Refresh Access Button */}
            <button
              onClick={() => checkEligibility(user.email)}
              disabled={eligibilityLoading}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              <Icon
                icon={eligibilityLoading ? 'mdi:loading' : 'mdi:refresh'}
                className={`h-4 w-4 ${eligibilityLoading ? 'animate-spin' : ''}`}
              />
              <span>{t('refresh_access') || 'Refresh Access'}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Icon icon="mdi:logout" className="h-4 w-4" />
              <span>{t('logout_btn') || 'Sign out'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default UserMenu
