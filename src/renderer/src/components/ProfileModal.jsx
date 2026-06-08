import { useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { Modal } from './ui/Modal'
import { apiFetch } from '../utils/apiClient'

export function ProfileModal({ isOpen, onClose, user }) {
  const { t } = useLanguage()
  const { accessTypes } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [imageError, setImageError] = useState(false)
  const fetchCancelledRef = useRef(false)

  const fetchProfile = useCallback(async () => {
    try {
      if (fetchCancelledRef.current) return
      setLoading(true)
      setError(null)
      if (fetchCancelledRef.current) return

      // 1. Fetch profile metadata from API (accessTypes, registrationDate, etc.)
      const response = await apiFetch(
        `/api/v1/user-profile?email=${encodeURIComponent(user.email)}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Unknown error')
      }

      const baseProfile = data.profile

      // The API already returns fully enriched transactions (shopee + direct),
      // including live product data joined server-side. No need for direct RTDB fetch.
      const enrichedTransactions = baseProfile.transactions || []

      if (fetchCancelledRef.current) return
      setProfile({
        ...baseProfile,
        transactions: enrichedTransactions,
        transactionCount: enrichedTransactions.length
      })
    } catch (err) {
      if (fetchCancelledRef.current) return
      console.error('Error fetching profile:', err)
      setError(err.message)
    } finally {
      if (!fetchCancelledRef.current) {
        setLoading(false)
      }
    }
  }, [user?.email])

  useEffect(() => {
    fetchCancelledRef.current = false

    if (isOpen && user?.email) {
      fetchProfile()
    }

    return () => {
      fetchCancelledRef.current = true
    }
  }, [isOpen, user?.email, fetchProfile])

  const formatDate = (dateString) => {
    if (!dateString) return t('profile_not_registered') || 'Belum terdaftar'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return t('profile_not_registered') || 'Belum terdaftar'
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getAccessTypeColor = () => {
    return 'bg-[#0081FB]/10 text-[#0081FB] border-[#0081FB]/25'
  }

  const footer = (
    <button
      onClick={onClose}
      className="w-full py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white rounded-xl transition-colors text-sm font-medium"
    >
      {t('close') || 'Close'}
    </button>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('profile_title') || 'Profile'}
      subtitle={t('profile_subtitle') || 'Your account information'}
      icon="mdi:account"
      iconColor="#0081FB"
      size="lg"
      footer={footer}
    >
      <div className="px-6 pb-6 pt-4">
        {/* Profile Photo + Name + Email */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative shrink-0">
            {user?.photoURL && !imageError ? (
              <img
                src={user.photoURL}
                alt={user.displayName || user.email}
                className="h-16 w-16 rounded-xl object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-[#0081FB]/10 flex items-center justify-center">
                <Icon icon="mdi:account" className="h-8 w-8 text-[#0081FB]" />
              </div>
            )}
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 rounded-full border-2 border-white dark:border-[#111]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {user?.displayName || user?.email?.split('@')[0]}
            </h3>
            <p className="text-sm text-gray-500 dark:text-white/50 truncate">{user?.email}</p>
          </div>
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
              className="mt-3 text-sm text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t('retry') || 'Try again'}
            </button>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Access Types */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-3">
                {t('profile_access_types') || 'Access Types'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {accessTypes && accessTypes.length > 0 ? (
                  accessTypes.map((type) => (
                    <span
                      key={type}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border uppercase ${getAccessTypeColor()}`}
                    >
                      {type}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 dark:text-white/40 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg">
                    {t('no_access') || 'No Access'}
                  </span>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Order Number */}
              {profile.orderNumber && (
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon icon="mdi:tag" className="h-4 w-4 text-gray-400 dark:text-white/40" />
                    <span className="text-xs text-gray-400 dark:text-white/40">
                      {t('profile_order') || 'Order #'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {profile.orderNumber}
                  </p>
                </div>
              )}

              {/* Source */}
              {profile.source && (
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon icon="mdi:store" className="h-4 w-4 text-gray-400 dark:text-white/40" />
                    <span className="text-xs text-gray-400 dark:text-white/40">
                      {t('profile_source') || 'Source'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {profile.source}
                  </p>
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            {profile.transactions && profile.transactions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-3">
                  {t('profile_recent_transactions') || 'Recent Transactions'}
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {profile.transactions.slice(0, 5).map((tx) => {
                    const items =
                      Array.isArray(tx.items) && tx.items.length > 0
                        ? tx.items
                        : [
                            {
                              productName:
                                tx.product || tx.accessTypes?.join(', ') || 'Transaction',
                              variantName: null,
                              productImage: null,
                              quantity: tx.quantity || 1,
                              priceAtPurchase: 0,
                              subtotal: 0
                            }
                          ]
                    const totalPrice =
                      tx.totalPrice ?? items.reduce((s, i) => s + (i.subtotal || 0), 0)

                    const statusConfig = {
                      redeemed: {
                        label: 'Selesai',
                        icon: 'mdi:check-circle',
                        cls: 'bg-[#0081FB]/15 text-[#0081FB] border-[#0081FB]/30'
                      },
                      success: {
                        label: 'Berhasil',
                        icon: 'mdi:check-circle',
                        cls: 'bg-[#0081FB]/15 text-[#0081FB] border-[#0081FB]/30'
                      },
                      paid: {
                        label: 'Berhasil',
                        icon: 'mdi:check-circle',
                        cls: 'bg-[#0081FB]/15 text-[#0081FB] border-[#0081FB]/30'
                      },
                      pending: {
                        label: 'Diproses',
                        icon: 'mdi:clock-outline',
                        cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }
                    }
                    const status = statusConfig[tx.status] || {
                      label: tx.status || 'Unknown',
                      icon: 'mdi:help-circle',
                      cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }

                    return (
                      <div
                        key={tx.id}
                        className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] overflow-hidden"
                      >
                        {/* Header: Order ID + status */}
                        <div className="px-3 py-2.5 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1 bg-white dark:bg-[#0a0a0a] rounded-md border border-gray-200 dark:border-white/10 shrink-0">
                              <Icon
                                icon="mdi:package-variant-closed"
                                className="h-3.5 w-3.5 text-[#0081FB]"
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] text-gray-500 dark:text-white/40 leading-tight">
                                Order ID
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                  {tx.orderNumber || tx.id}
                                </span>
                                {tx.source === 'shopee' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
                                    <Icon icon="simple-icons:shopee" className="h-2.5 w-2.5" />
                                    Shopee
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 shrink-0 ${status.cls}`}
                          >
                            <Icon icon={status.icon} className="h-3 w-3" />
                            {status.label}
                          </div>
                        </div>

                        {/* Body: items */}
                        <div className="p-3 space-y-3">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex gap-3">
                              <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                {item.productImage ? (
                                  <img
                                    src={item.productImage}
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <Icon
                                    icon="mdi:package-variant-closed"
                                    className="h-6 w-6 text-gray-300 dark:text-white/20"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1">
                                  {item.productName}
                                </p>
                                {item.variantName && (
                                  <p className="text-[11px] text-[#0081FB] mb-1 truncate">
                                    {item.variantName}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-white/50">
                                  <span>{item.quantity} barang</span>
                                  {item.priceAtPurchase > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        Rp {Number(item.priceAtPurchase).toLocaleString('id-ID')}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer: total + date */}
                        <div className="px-3 py-2.5 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 dark:text-white/40">
                              Total Pesanan
                            </span>
                            <span className="text-sm font-bold text-[#0081FB]">
                              Rp {Number(totalPrice).toLocaleString('id-ID')}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-white/40">
                            {formatDate(tx.createdAt)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Login History */}
            <LoginHistorySection user={user} t={t} />
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

ProfileModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
    photoURL: PropTypes.string
  })
}

export default ProfileModal

// ─────────────────────────────────────────────────────────────────────────────
// Login History Section
// ─────────────────────────────────────────────────────────────────────────────

function LoginHistorySection({ user, t }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const formatLoginDate = (ts) => {
    if (!ts) return '-'
    try {
      return new Date(ts).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '-'
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        // Fetch login history via API proxy (server reads with Admin SDK)
        const res = await apiFetch(`/api/v1/login-history?uid=${encodeURIComponent(user.uid)}`)
        if (!res.ok) throw new Error('failed')
        const result = await res.json()
        const data = result.success ? result.events || {} : {}
        const list = Object.entries(data).map(([id, v]) => ({
          id,
          timestamp: v?.timestamp || 0,
          method: v?.method || 'unknown',
          platform: v?.platform || 'unknown',
          userAgent: v?.userAgent || null,
          deviceInfo: v?.deviceInfo || null,
          appVersion: v?.appVersion || null
        }))
        list.sort((a, b) => b.timestamp - a.timestamp)
        if (!cancelled) setEvents(list)
      } catch (err) {
        console.warn('LoginHistory load failed:', err)
        if (!cancelled) setEvents([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  const platformInfo = (p) => {
    switch (p) {
      case 'web':
        return { icon: 'mdi:web', label: 'Web' }
      case 'desktop':
        return { icon: 'mdi:monitor', label: 'Desktop' }
      case 'android':
        return { icon: 'mdi:android', label: 'Android' }
      default:
        return { icon: 'mdi:devices', label: p }
    }
  }

  const methodLabel = (m) => {
    switch (m) {
      case 'google':
        return 'Google'
      case 'google-onetap':
        return 'Google One Tap'
      case 'device-code':
        return t('login_method_device_code') || 'Device Code'
      case 'browser-deep-link':
        return 'Browser'
      default:
        return m
    }
  }

  const deviceLabel = (ev) => {
    const di = ev.deviceInfo
    if (!di) return null
    if (ev.platform === 'android') {
      const brand = di.manufacturer || di.brand
      const model = di.model
      const v = di.androidVersion
      const parts = [brand, model].filter(Boolean).join(' ')
      if (!parts) return null
      return v ? `${parts} · Android ${v}` : parts
    }
    if (ev.platform === 'desktop') {
      const platform = di.platform
      let osName
      switch (platform) {
        case 'darwin':
          osName = 'macOS'
          break
        case 'win32':
          osName = 'Windows'
          break
        case 'linux':
          osName = 'Linux'
          break
        default:
          osName = platform || 'Desktop'
      }
      const host = di.hostname
      return host ? `${osName} · ${host}` : osName
    }
    return null
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-3">
        {t('profile_login_history') || 'Login History'}
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Icon icon="mdi:loading" className="h-6 w-6 animate-spin text-[#0081FB]" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-6 text-center">
          <Icon
            icon="mdi:history"
            className="h-8 w-8 mx-auto text-gray-300 dark:text-white/20 mb-2"
          />
          <p className="text-sm text-gray-500 dark:text-white/50">
            {t('profile_login_history_empty') || 'No login activity yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.slice(0, 3).map((ev, idx) => {
            const p = platformInfo(ev.platform)
            const dev = deviceLabel(ev)
            return (
              <div
                key={ev.id}
                className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] p-3 flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#0081FB]/10 border border-[#0081FB]/20">
                  <Icon icon={p.icon} className="text-[#0081FB] text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {p.label}
                    </span>
                    {idx === 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/15 text-green-500 border border-green-500/30">
                        {t('login_history_latest') || 'LATEST'}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-white/40">
                    {formatLoginDate(ev.timestamp)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60">
                      <Icon icon="mdi:login" className="w-3 h-3" />
                      {methodLabel(ev.method)}
                    </span>
                    {dev && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 max-w-full truncate">
                        <Icon icon="mdi:memory" className="w-3 h-3 shrink-0" />
                        <span className="truncate">{dev}</span>
                      </span>
                    )}
                    {ev.appVersion && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60">
                        <Icon icon="mdi:tag-outline" className="w-3 h-3" />v{ev.appVersion}
                      </span>
                    )}
                  </div>
                  {ev.userAgent && ev.platform === 'web' && (
                    <p
                      className="mt-1 text-[10px] text-gray-400 dark:text-white/30 line-clamp-1"
                      title={ev.userAgent}
                    >
                      {ev.userAgent}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

LoginHistorySection.propTypes = {
  user: PropTypes.shape({ uid: PropTypes.string, email: PropTypes.string }),
  t: PropTypes.func.isRequired
}
