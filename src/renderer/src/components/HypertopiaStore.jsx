import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'

export function HypertopiaStore() {
  const { t } = useLanguage()

  const handleOpenExternal = async () => {
    await window.electron.shell.openExternal('https://hypertopia.store')
  }

  return (
    <div className="flex flex-1 flex-col bg-[#111] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#111] p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[#0081FB]/10 p-2">
            <Icon icon="mdi:store" className="h-5 w-5 text-[#0081FB]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              HyperTopia <span className="text-[#0081FB]">Store</span>
            </h2>
            <p className="text-xs text-white/40">hypertopia.store</p>
          </div>
        </div>

        <button
          onClick={handleOpenExternal}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
        >
          <Icon icon="mdi:open-in-new" className="h-4 w-4" />
          <span>{t('open_in_browser')}</span>
        </button>
      </div>

      {/* Webview */}
      <div className="flex-1 overflow-hidden">
        {/* eslint-disable react/no-unknown-property */}
        <webview
          src="https://hypertopia.store"
          className="h-full w-full"
          partition="persist:hypertopia"
          allowpopups="true"
        />
        {/* eslint-enable react/no-unknown-property */}
      </div>
    </div>
  )
}
