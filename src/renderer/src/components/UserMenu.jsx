import { useState } from 'react'
import { Icon } from '@iconify/react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'
import ProfileModal from './ProfileModal'
import RedeemModal from './RedeemModal'

export function UserMenu({ onLiveAssist }) {
  const { t } = useLanguage()
  const {
    user,
    accessTypes,
    loading,
    eligibilityLoading,
    checkEligibility,
    cancelDeviceCodeLogin,
    logout
  } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [loginModalRequested, setLoginModalRequested] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [browserLoginLoading, setBrowserLoginLoading] = useState(false)
  const [browserLoginError, setBrowserLoginError] = useState(null)

  const showLoginModal = loginModalRequested && !user

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
    setBrowserLoginError(null)
  }

  const handleBrowserLogin = async () => {
    setBrowserLoginLoading(true)
    setBrowserLoginError(null)

    try {
      const result = await window.api?.googleSignIn?.()
      if (result?.success === false) {
        setBrowserLoginError(result.error || t('deep_link_failed') || 'Browser login failed')
      }
    } catch (error) {
      console.error('Browser login failed:', error)
      setBrowserLoginError(t('deep_link_failed') || 'Browser login failed')
    } finally {
      setBrowserLoginLoading(false)
    }
  }

  const handleCancelLogin = () => {
    cancelDeviceCodeLogin()
    setLoginModalRequested(false)
    setBrowserLoginLoading(false)
    setBrowserLoginError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
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
          disabled={browserLoginLoading}
          className="flex items-center gap-2 rounded-lg bg-[#0081FB] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#0070E0] disabled:opacity-50 shadow-sm"
        >
          {browserLoginLoading ? (
            <>
              <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
              <span>{t('opening_browser') || 'Opening browser...'}</span>
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
            <div className="fixed inset-0 z-50 bg-black/70" onClick={handleCancelLogin} />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={handleCancelLogin}
                  className="absolute top-4 right-4 text-gray-400 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Icon icon="mdi:close" className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0081FB]/10">
                    <Icon icon="mdi:web" className="h-7 w-7 text-[#0081FB]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('login_title') || 'Login to HyperTopia'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-white/60 mt-1">
                    {t('login_browser_description') || 'Login securely using your web browser.'}
                  </p>
                </div>

                <button
                  onClick={handleBrowserLogin}
                  disabled={browserLoginLoading}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0081FB] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#0070E0] disabled:opacity-50"
                >
                  <Icon
                    icon={browserLoginLoading ? 'mdi:loading' : 'mdi:web'}
                    className={`h-5 w-5 ${browserLoginLoading ? 'animate-spin' : ''}`}
                  />
                  <span>{t('login_with_browser') || 'Login with Browser'}</span>
                </button>

                {browserLoginError && (
                  <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">
                    {browserLoginError}
                  </div>
                )}

                {/* Cancel Button */}
                <button
                  onClick={handleCancelLogin}
                  className="w-full py-3 text-sm text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70 transition-colors"
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
        className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-white/5 px-3 py-2 transition-all hover:bg-gray-200 dark:hover:bg-white/10"
      >
        {user.photoURL && !imageError ? (
          <img
            src={user.photoURL}
            alt={user.displayName || user.email}
            className="h-7 w-7 rounded-full border border-gray-200 dark:border-white/20"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0081FB]">
            <Icon icon="mdi:account" className="h-4 w-4 text-white" />
          </div>
        )}
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
            {user.displayName || user.email?.split('@')[0]}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-white/40 flex items-center gap-1">
            {eligibilityLoading ? (
              <Icon icon="mdi:loading" className="h-3 w-3 animate-spin" />
            ) : accessTypes.length > 0 ? (
              <span className="flex items-center gap-1">
                {accessTypes.map((type) => (
                  <span
                    key={type}
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0081FB]/10 text-[#0081FB] border border-[#0081FB]/20 uppercase"
                  >
                    {type}
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-gray-400 dark:text-white/40">
                {t('no_access') || 'No Access'}
              </span>
            )}
          </span>
        </div>
        <Icon
          icon="mdi:chevron-down"
          className={`h-4 w-4 text-gray-400 dark:text-white/50 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

          {/* Menu */}
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl bg-white dark:bg-[#1a1a1a] p-2 shadow-xl">
            {/* User Info */}
            <div className="border-b border-gray-200 dark:border-white/10 px-3 py-3 mb-2">
              <div className="flex items-center gap-3">
                {user.photoURL && !imageError ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || user.email}
                    className="h-10 w-10 rounded-full border border-gray-200 dark:border-white/20"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0081FB]">
                    <Icon icon="mdi:account" className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {user.displayName && (
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.displayName}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-white/50 truncate">{user.email}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 flex-wrap">
                {eligibilityLoading ? (
                  <span className="text-xs text-gray-400 dark:text-white/40 flex items-center gap-1">
                    <Icon icon="mdi:loading" className="h-3 w-3 animate-spin" />
                    {t('checking_eligibility') || 'Checking access...'}
                  </span>
                ) : accessTypes.length > 0 ? (
                  <>
                    {accessTypes.map((type) => (
                      <span
                        key={type}
                        className="text-xs flex items-center gap-1 bg-[#0081FB]/10 text-[#0081FB] border border-[#0081FB]/20 px-2 py-1 rounded-full uppercase font-semibold"
                      >
                        {type}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-white/40 flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-full">
                    {t('no_access') || 'No Download Access'}
                  </span>
                )}
              </div>
            </div>

            {/* Profile Button */}
            <button
              onClick={() => {
                setShowDropdown(false)
                setShowProfileModal(true)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-white/70 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <Icon icon="mdi:account-circle" className="h-4 w-4" />
              <span>{t('profile') || 'Profile'}</span>
            </button>

            {/* Refresh Access Button */}
            <button
              onClick={() => checkEligibility(user.email)}
              disabled={eligibilityLoading}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-white/70 transition-colors hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50"
            >
              <Icon
                icon={eligibilityLoading ? 'mdi:loading' : 'mdi:refresh'}
                className={`h-4 w-4 ${eligibilityLoading ? 'animate-spin' : ''}`}
              />
              <span>{t('refresh_access') || 'Refresh Access'}</span>
            </button>

            {/* Redeem Button */}
            <button
              onClick={() => {
                setShowDropdown(false)
                setShowRedeemModal(true)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#0081FB] transition-colors hover:bg-blue-50 dark:hover:bg-[#0081FB]/10"
            >
              <Icon icon="mdi:ticket-confirmation" className="h-4 w-4" />
              <span>{t('redeem') || 'Redeem Akses'}</span>
            </button>

            {/* Live Assist Button */}
            <button
              onClick={() => {
                setShowDropdown(false)
                onLiveAssist?.()
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-white/70 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <Icon icon="mdi:headset" className="h-4 w-4" />
              <span>{t('tab_live_assist') || 'Live Assist'}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <Icon icon="mdi:logout" className="h-4 w-4" />
              <span>{t('logout_btn') || 'Sign out'}</span>
            </button>
          </div>
        </>
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
      />

      {/* Redeem Modal */}
      <RedeemModal
        isOpen={showRedeemModal}
        onClose={() => setShowRedeemModal(false)}
        user={user}
        onSuccess={() => checkEligibility(user.email)}
      />
    </div>
  )
}

UserMenu.propTypes = {
  onLiveAssist: PropTypes.func
}

export default UserMenu
