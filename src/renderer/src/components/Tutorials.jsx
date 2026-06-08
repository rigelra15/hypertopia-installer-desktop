import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { tutorials } from '../data/tutorials'

const isVideoUrl = (url) => /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url)

function MediaThumbnail({ src, alt, onClick }) {
  if (isVideoUrl(src)) {
    return (
      <div className="relative" onClick={onClick}>
        <video
          src={src}
          className="w-full max-w-xs rounded-lg object-cover cursor-pointer"
          muted
          playsInline
          preload="metadata"
        />
        <div className="absolute inset-0 flex items-center justify-center cursor-pointer">
          <div className="rounded-full bg-black/60 p-3 backdrop-blur-sm">
            <Icon icon="mdi:play" className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-full max-w-xs object-cover transition-transform duration-300 group-hover/image:scale-[1.01] cursor-zoom-in"
      onClick={onClick}
    />
  )
}

function MediaLightbox({ src, onClose }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.play()
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
        {isVideoUrl(src) ? (
          <video
            ref={videoRef}
            src={src}
            className="max-h-[90vh] max-w-full rounded-lg"
            controls
            autoPlay
            playsInline
          />
        ) : (
          <img
            src={src}
            alt="Preview"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        )}
        <button
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
          onClick={onClose}
        >
          <Icon icon="mdi:close" className="h-8 w-8" />
        </button>
      </div>
    </div>
  )
}

export function Tutorials({ onNavigate }) {
  const { t } = useLanguage()
  const [selectedTutorial, setSelectedTutorial] = useState(null)
  const [previewMedia, setPreviewMedia] = useState(null)
  const [activeTabId, setActiveTabId] = useState(null)

  if (selectedTutorial) {
    return (
      <div className="flex flex-1 flex-col bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden">
        {/* Detail Header */}
        <div className="flex items-center gap-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] p-4">
          <button
            onClick={() => {
              setSelectedTutorial(null)
              setActiveTabId(null)
            }}
            className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-white/70 transition-all hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
          >
            <Icon icon="mdi:arrow-left" className="h-4 w-4" />
            <span>{t('tutorial_back')}</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/50">
            <span>{t('tab_tutorials')}</span>
            <Icon icon="mdi:chevron-right" className="h-4 w-4" />
            <span className="text-gray-900 dark:text-white">{t(selectedTutorial.titleKey)}</span>
          </div>
        </div>

        {/* Detail Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto w-full">
            <div className="mb-8 flex items-start gap-4">
              <div className="rounded-xl bg-[#0081FB]/10 p-3 text-[#0081FB]">
                <Icon icon={selectedTutorial.icon} className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t(selectedTutorial.titleKey)}
                </h2>
                <p className="mt-2 text-gray-600 dark:text-white/60">
                  {t(selectedTutorial.descriptionKey)}
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-6">
                {/* Warning Section */}
                {selectedTutorial.warningKey && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                    <div className="flex gap-3">
                      <Icon
                        icon="mdi:alert-circle-outline"
                        className="h-6 w-6 shrink-0 text-red-500"
                      />
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-red-500 mb-1">
                          {t('warning')}
                        </h4>
                        <p className="text-sm leading-relaxed text-red-500/90">
                          {t(selectedTutorial.warningKey)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Note Section */}
                {selectedTutorial.noteKey && (
                  <div className="rounded-xl border border-amber-600/30 bg-amber-50 dark:bg-amber-900/20 p-5">
                    <div className="flex gap-3">
                      <Icon
                        icon="mdi:information-outline"
                        className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400"
                      />
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
                          {t('note')}
                        </h4>
                        <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                          {t(selectedTutorial.noteKey)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Icon icon="mdi:format-list-numbered" className="text-[#0081FB]" />
                  {t('tutorial_steps')}
                </h3>

                {selectedTutorial.tabs && (
                  <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 w-fit">
                    {selectedTutorial.tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          activeTabId === tab.id
                            ? 'bg-[#0081FB] text-white'
                            : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'
                        }`}
                      >
                        {t(tab.titleKey)}
                      </button>
                    ))}
                  </div>
                )}

                {(selectedTutorial.tabs
                  ? selectedTutorial.tabs.find((tb) => tb.id === activeTabId)?.steps || []
                  : selectedTutorial.steps || []
                ).map((step, index, array) => (
                  <div key={index}>
                    {/* Step Content */}
                    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 transition-all hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/10">
                      <div className="flex gap-3">
                        {/* Step Number Bubble */}
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0081FB] text-xs font-bold text-white">
                          {index + 1}
                        </div>

                        <div className="flex-1 pt-0.5">
                          <p className="text-sm leading-relaxed text-gray-700 dark:text-white/90">
                            {t(step.textKey)}
                          </p>

                          {step.link && (
                            <button
                              onClick={() => onNavigate(step.link.url)}
                              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0081FB]/10 px-3 py-1 text-xs font-medium text-[#0081FB] hover:bg-[#0081FB]/20 transition-colors"
                            >
                              <Icon icon="mdi:link-variant" className="h-3.5 w-3.5" />
                              {t(step.link.labelKey)}
                            </button>
                          )}

                          {(step.image || step.imageUrl) && (
                            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-white/10 group/image w-fit">
                              <MediaThumbnail
                                src={step.image || step.imageUrl}
                                alt={`Step ${index + 1}`}
                                onClick={() => setPreviewMedia(step.image || step.imageUrl)}
                              />
                            </div>
                          )}

                          {/* Sub Steps (Nested Content) */}
                          {step.subSteps &&
                            step.subSteps.map((subStep, subIndex) => (
                              <div
                                key={subIndex}
                                className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10"
                              >
                                {subStep.textKey && (
                                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/90">
                                    {t(subStep.textKey)}
                                  </p>
                                )}

                                {subStep.link && (
                                  <button
                                    onClick={() => onNavigate(subStep.link.url)}
                                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0081FB]/10 px-3 py-1 text-xs font-medium text-[#0081FB] hover:bg-[#0081FB]/20 transition-colors"
                                  >
                                    <Icon icon="mdi:link-variant" className="h-3.5 w-3.5" />
                                    {t(subStep.link.labelKey)}
                                  </button>
                                )}

                                {(subStep.image || subStep.imageUrl) && (
                                  <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-white/10 group/image w-fit">
                                    <MediaThumbnail
                                      src={subStep.image || subStep.imageUrl}
                                      alt={`Sub Step ${subIndex + 1}`}
                                      onClick={() => setPreviewMedia(subStep.image || subStep.imageUrl)}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Media Lightbox */}
        {previewMedia && <MediaLightbox src={previewMedia} onClose={() => setPreviewMedia(null)} />}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0081FB]/10">
            <Icon icon="mdi:book-open-page-variant" className="h-5 w-5 text-[#0081FB]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <span className="text-[#0081FB]">HyperTopia</span>{' '}
              {t('tutorials_title') || 'Tutorials'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-white/50">
              {t('tutorials_subtitle') || 'Guides and help for using the installer'}
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner - Read Tutorials First */}
      <div className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#191919] p-4">
        <div className="p-4 bg-[#0081FB]/10 border-l-4 border-[#0081FB] rounded">
          <div className="flex items-start gap-2">
            <Icon icon="mdi:lightbulb-outline" className="h-4 w-4 shrink-0 text-[#0081FB] mt-0.5" />
            <p className="text-sm text-gray-800 dark:text-white/90 leading-relaxed">
              <span className="font-semibold text-[#0081FB]">{t('tutorials_info_title')}</span>{' '}
              {t('tutorials_info_desc')}
            </p>
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {tutorials.map((tutorial) => {
            // Count total steps
            const stepCount = tutorial.tabs
              ? tutorial.tabs.reduce((sum, tab) => sum + (tab.steps?.length || 0), 0)
              : tutorial.steps?.length || 0

            return (
              <button
                key={tutorial.id}
                onClick={() => {
                  setSelectedTutorial(tutorial)
                  setActiveTabId(tutorial.tabs?.[0]?.id || null)
                }}
                className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f0f0f] text-left transition-colors hover:border-[#0081FB]/30 flex flex-col"
              >
                {/* Top accent strip */}
                <div className="h-0.5 w-full bg-gradient-to-r from-[#0081FB] to-[#00C2FF]" />

                {/* Card Content */}
                <div className="p-4 flex flex-col flex-1">
                  {/* Icon Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#0081FB]/10 flex items-center justify-center transition-colors group-hover:bg-[#0081FB]/20">
                      <Icon icon={tutorial.icon} className="h-5 w-5 text-[#0081FB]" />
                    </div>
                    {/* Step Count Badge */}
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0081FB]/10 text-[#0081FB]">
                      {stepCount} {t('steps') || 'steps'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-[13px] text-gray-900 dark:text-white mb-1.5 line-clamp-2">
                    {t(tutorial.titleKey)}
                  </h3>

                  {/* Description */}
                  <p className="text-[11px] text-gray-500 dark:text-white/50 line-clamp-2 flex-1 leading-relaxed">
                    {t(tutorial.descriptionKey)}
                  </p>

                  {/* Read More CTA */}
                  <div className="flex items-center text-xs font-semibold text-[#0081FB] mt-4 pt-3 border-t border-gray-200 dark:border-white/10">
                    <span>{t('tutorial_read_guide')}</span>
                    <Icon
                      icon="mdi:arrow-right"
                      className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1.5 transition-transform duration-300"
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

Tutorials.propTypes = {
  onNavigate: PropTypes.func
}
