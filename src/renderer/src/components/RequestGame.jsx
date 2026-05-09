import { useState } from 'react'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import RequestGameModal from './RequestGameModal'
import RequestGameList from './RequestGameList'

export function RequestGame() {
  const { language } = useLanguage()
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
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon icon="material-symbols:gamepad" className="text-blue-500" />
            <span className="text-blue-500">{language === 'en' ? 'Request' : 'Request'}</span>{' '}
            {language === 'en' ? 'Game' : 'Game'}
          </h2>
          <p className="text-xs text-gray-400 dark:text-white/40 mt-1">
            {language === 'en'
              ? 'Request new games or report issues'
              : 'Request game baru atau lapor masalah'}
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <Icon icon="material-symbols:person" className="text-4xl text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {language === 'en' ? 'Login Required' : 'Harus Login'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-white/50 text-center max-w-sm">
            {language === 'en'
              ? 'Please login to request games and track your requests'
              : 'Silakan login untuk request game dan pantau request Anda'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-[#111] overflow-hidden">
      <div className="border-b border-gray-200 dark:border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon icon="material-symbols:gamepad" className="text-blue-500" />
              <span className="text-blue-500">
                {language === 'en' ? 'Request' : 'Request'}
              </span>{' '}
              {language === 'en' ? 'Game' : 'Game'}
            </h2>
            <p className="text-xs text-gray-400 dark:text-white/40 mt-1">
              {language === 'en'
                ? 'Request new games or report issues'
                : 'Request game baru atau lapor masalah'}
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            <Icon icon="material-symbols:add" className="text-lg" />
            <span className="hidden sm:inline">
              {language === 'en' ? 'New Request' : 'Request Baru'}
            </span>
          </button>
        </div>
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
