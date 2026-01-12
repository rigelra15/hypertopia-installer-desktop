import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hypertopia.my.id'

export function ProfileModal({ isOpen, onClose, user }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (isOpen && user?.email) {
      fetchProfile()
    }
  }, [isOpen, user?.email])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/user-profile?email=${encodeURIComponent(user.email)}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      
      const data = await response.json()
      if (data.success) {
        setProfile(data.profile)
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getAccessTypeColor = (type) => {
    const colors = {
      standalone: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      pcvr: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      qgo: 'bg-green-500/20 text-green-400 border-green-500/30',
      firmware: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    }
    return colors[type?.toLowerCase()] || 'bg-white/10 text-white/70 border-white/20'
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient background */}
          <div className="relative h-28 bg-gradient-to-br from-[#0081FB] via-[#0070E0] to-[#00BFFF]">
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '20px 20px'
              }} />
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/20 rounded-full p-1.5"
            >
              <Icon icon="mdi:close" className="h-5 w-5" />
            </button>
          </div>

          {/* Profile Photo - overlapping header */}
          <div className="relative -mt-14 px-6">
            <div className="relative inline-block">
              {user?.photoURL && !imageError ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || user.email}
                  className="h-24 w-24 rounded-2xl border-4 border-[#1a1a1a] shadow-xl object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="h-24 w-24 rounded-2xl border-4 border-[#1a1a1a] bg-gradient-to-br from-[#0081FB] to-[#00BFFF] flex items-center justify-center shadow-xl">
                  <Icon icon="mdi:account" className="h-12 w-12 text-white" />
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-4 border-[#1a1a1a]" />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 pt-4">
            {/* User Name & Email */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                {user?.displayName || user?.email?.split('@')[0]}
              </h2>
              <p className="text-sm text-white/50">{user?.email}</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-[#0081FB]" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Icon icon="mdi:alert-circle" className="h-6 w-6 text-red-400" />
                </div>
                <p className="text-sm text-red-400">{error}</p>
                <button
                  onClick={fetchProfile}
                  className="mt-3 text-sm text-white/50 hover:text-white transition-colors"
                >
                  {t('retry') || 'Try again'}
                </button>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                {/* Access Types */}
                <div>
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                    {t('profile_access_types') || 'Access Types'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.accessTypes && profile.accessTypes.length > 0 ? (
                      profile.accessTypes.map((type) => (
                        <span
                          key={type}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border uppercase ${getAccessTypeColor(type)}`}
                        >
                          {type}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-white/40 bg-white/5 px-3 py-1.5 rounded-lg">
                        {t('no_access') || 'No Access'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Registration Date */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:calendar" className="h-4 w-4 text-white/40" />
                      <span className="text-xs text-white/40">
                        {t('profile_registered') || 'Registered'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {formatDate(profile.registrationDate)}
                    </p>
                  </div>

                  {/* Transaction Count */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:receipt" className="h-4 w-4 text-white/40" />
                      <span className="text-xs text-white/40">
                        {t('profile_transactions') || 'Transactions'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {profile.transactionCount || 0}
                    </p>
                  </div>

                  {/* Order Number */}
                  {profile.orderNumber && (
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon icon="mdi:tag" className="h-4 w-4 text-white/40" />
                        <span className="text-xs text-white/40">
                          {t('profile_order') || 'Order #'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white truncate">
                        {profile.orderNumber}
                      </p>
                    </div>
                  )}

                  {/* Source */}
                  {profile.source && (
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon icon="mdi:store" className="h-4 w-4 text-white/40" />
                        <span className="text-xs text-white/40">
                          {t('profile_source') || 'Source'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white capitalize">
                        {profile.source}
                      </p>
                    </div>
                  )}
                </div>

                {/* Recent Transactions */}
                {profile.transactions && profile.transactions.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                      {t('profile_recent_transactions') || 'Recent Transactions'}
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {profile.transactions.slice(0, 5).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {/* Source Icon */}
                            {tx.source === 'shopee' ? (
                              <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center" title="Shopee">
                                <Icon icon="simple-icons:shopee" className="h-3 w-3 text-orange-400" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center" title="Website">
                                <Icon icon="mdi:web" className="h-3 w-3 text-blue-400" />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm text-white/70 truncate max-w-[130px]">
                                {tx.product || tx.accessType || (tx.accessTypes?.join(', ')) || 'Transaction'}
                              </span>
                              {tx.orderNumber && (
                                <span className="text-[10px] text-white/40 truncate max-w-[130px]">
                                  {tx.orderNumber}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              tx.status === 'success' || tx.status === 'paid' || tx.status === 'redeemed'
                                ? 'bg-green-500/20 text-green-400' 
                                : tx.status === 'pending' 
                                  ? 'bg-yellow-500/20 text-yellow-400' 
                                  : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {tx.status === 'redeemed' ? 'Redeemed' : tx.status || 'Unknown'}
                            </div>
                            <span className="text-[10px] text-white/40">
                              {formatDate(tx.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition-colors text-sm font-medium"
            >
              {t('close') || 'Close'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

ProfileModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  user: PropTypes.shape({
    email: PropTypes.string,
    displayName: PropTypes.string,
    photoURL: PropTypes.string,
  }),
}

export default ProfileModal
