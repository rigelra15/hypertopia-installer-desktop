import { useState } from 'react'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import RequestGameModal from './RequestGameModal'
import RequestGameList from './RequestGameList'

export function RequestGame() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState(null)

  const handleOpenModal = () => {
    setEditingRequest(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingRequest(null)
  }

  const handleEdit = (request) => {
    setEditingRequest(request)
    setShowModal(true)
  }

  const handleSuccess = () => {
    setShowModal(false)
    setEditingRequest(null)
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col bg-white dark:bg-[#111] overflow-hidden">
        <div className="border-b border-gray-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0081FB]/10">
              <Icon icon="mdi:gamepad-square" className="h-5 w-5 text-[#0081FB]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('request_game_title') || 'Request Game'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-white/50">
                {t('request_game_subtitle') || 'Submit a new game request or report an issue'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <Icon icon="material-symbols:person" className="text-4xl text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('request_login_required') || 'Login Required'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-white/50 text-center max-w-sm">
            {t('request_login_desc') || 'Please login to request games and track your requests'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-[#111] overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0081FB]/10">
            <Icon icon="mdi:gamepad-square" className="h-5 w-5 text-[#0081FB]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('request_game_title') || 'Request Game'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
              {t('request_game_subtitle') || 'Submit a new game request or report an issue'}
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 rounded-lg bg-[#0081FB] hover:bg-[#006fd6] px-4 py-2 text-sm text-white font-medium transition-all"
        >
          <Icon icon="mdi:plus" className="h-4 w-4" />
          <span className="hidden sm:inline">
            {t('request_new_game') || 'New Request'}
          </span>
        </button>
      </div>

      <RequestGameList onEdit={handleEdit} />

      <RequestGameModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        gameData={editingRequest}
      />
    </div>
  )
}

export default RequestGame
