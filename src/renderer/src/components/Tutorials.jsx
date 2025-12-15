import { useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { tutorials } from '../data/tutorials'

export function Tutorials({ onNavigate }) {
  const { t } = useLanguage()
  const [selectedTutorial, setSelectedTutorial] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)

  if (selectedTutorial) {
    return (
      <div className="flex flex-1 flex-col bg-[#111] overflow-hidden">
        {/* Detail Header */}
        <div className="flex items-center gap-4 border-b border-white/10 bg-[#111] p-4">
          <button
            onClick={() => setSelectedTutorial(null)}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
          >
            <Icon icon="mdi:arrow-left" className="h-4 w-4" />
            <span>{t('tutorial_back')}</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span>{t('tab_tutorials')}</span>
            <Icon icon="mdi:chevron-right" className="h-4 w-4" />
            <span className="text-white">{t(selectedTutorial.titleKey)}</span>
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
                <h2 className="text-2xl font-bold text-white">{t(selectedTutorial.titleKey)}</h2>
                <p className="mt-2 text-white/60">{t(selectedTutorial.descriptionKey)}</p>
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
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                    <div className="flex gap-3">
                      <Icon
                        icon="mdi:information-outline"
                        className="h-6 w-6 shrink-0 text-yellow-500"
                      />
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-yellow-500 mb-1">
                          {t('note')}
                        </h4>
                        <p className="text-sm leading-relaxed text-yellow-500/90">
                          {t(selectedTutorial.noteKey)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Icon icon="mdi:format-list-numbered" className="text-[#0081FB]" />
                  {t('tutorial_steps')}
                </h3>

                {selectedTutorial.steps.map((step, index) => (
                  <div key={index} className="relative pl-8">
                    {/* Step Connector Line */}
                    {index !== selectedTutorial.steps.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-[-24px] w-0.5 bg-white/10"></div>
                    )}

                    {/* Step Number Bubble */}
                    <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#0081FB] text-xs font-bold text-white ring-4 ring-[#111]">
                      {index + 1}
                    </div>

                    {/* Step Content */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-white/20 hover:bg-white/10">
                      <p className="text-sm leading-relaxed text-white/90">{t(step.textKey)}</p>

                      {step.link && (
                        <button
                          onClick={() => onNavigate(step.link.url)}
                          className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0081FB]/10 px-3 py-1 text-xs font-medium text-[#0081FB] hover:bg-[#0081FB]/20 transition-colors"
                        >
                          <Icon icon="mdi:link-variant" className="h-3.5 w-3.5" />
                          {t(step.link.labelKey)}
                        </button>
                      )}

                      {step.image && (
                        <div
                          className="mt-4 overflow-hidden rounded-lg border border-white/10 cursor-zoom-in group/image w-fit"
                          onClick={() => setPreviewImage(step.image)}
                        >
                          <img
                            src={step.image}
                            alt={`Step ${index + 1}`}
                            className="w-full max-w-xs object-cover transition-transform duration-300 group-hover/image:scale-[1.01]"
                          />
                        </div>
                      )}

                      {/* Sub Steps (Nested Content) */}
                      {step.subSteps &&
                        step.subSteps.map((subStep, subIndex) => (
                          <div key={subIndex} className="mt-6 pt-6 border-t border-white/10">
                            {subStep.textKey && (
                              <p className="text-sm leading-relaxed text-white/90">
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

                            {subStep.image && (
                              <div
                                className="mt-4 overflow-hidden rounded-lg border border-white/10 cursor-zoom-in group/image w-fit"
                                onClick={() => setPreviewImage(subStep.image)}
                              >
                                <img
                                  src={subStep.image}
                                  alt={`Sub Step ${subIndex + 1}`}
                                  className="w-full max-w-xs object-cover transition-transform duration-300 group-hover/image:scale-[1.01]"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Image Lightbox */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-h-full max-w-full">
              <img
                src={previewImage}
                alt="Preview"
                className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
              <button
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                onClick={() => setPreviewImage(null)}
              >
                <Icon icon="mdi:close" className="h-8 w-8" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-[#111] overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#111] p-4 text-center md:text-left">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 justify-center md:justify-start">
          <Icon icon="mdi:book-open-page-variant" className="text-[#0081FB] hidden md:block" />
          <span className="text-[#0081FB]">HyperTopia</span> {t('tutorials_title') || 'Tutorials'}
        </h2>
        <p className="text-xs text-white/40">
          {t('tutorials_subtitle') || 'Guides and help for using the installer'}
        </p>
      </div>

      {/* Info Banner - Read Tutorials First */}
      <div className="flex items-start gap-2 border-b border-green-500/20 bg-green-500/5 px-4 py-3">
        <Icon icon="mdi:lightbulb-outline" className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-white/80 leading-relaxed">
            <span className="font-semibold text-green-400">{t('tutorials_info_title')}</span>{' '}
            {t('tutorials_info_desc')}
          </p>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {tutorials.map((tutorial) => (
            <button
              key={tutorial.id}
              onClick={() => setSelectedTutorial(tutorial)}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 text-left transition-all hover:border-[#0081FB]/50 hover:bg-[#0081FB]/5 hover:translate-y-[-2px]"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-[#0081FB]/10 p-2 text-[#0081FB] group-hover:bg-[#0081FB] group-hover:text-white transition-colors">
                  <Icon icon={tutorial.icon} className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-white">{t(tutorial.titleKey)}</h3>
              </div>
              <p className="text-sm text-white/60 line-clamp-2">{t(tutorial.descriptionKey)}</p>

              <div className="mt-4 flex items-center text-xs font-medium text-[#0081FB] opacity-0 group-hover:opacity-100 transition-opacity">
                <span>{t('tutorial_read_guide')}</span>
                <Icon icon="mdi:arrow-right" className="ml-1 h-3 w-3" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

Tutorials.propTypes = {
  onNavigate: PropTypes.func
}
