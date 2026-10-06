import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeviceBadges } from '../src/renderer/src/components/StandaloneGames'

describe('StandaloneGames Quest support list', () => {
  const originalScrollTo = HTMLElement.prototype.scrollTo

  afterEach(() => {
    if (originalScrollTo) HTMLElement.prototype.scrollTo = originalScrollTo
    else delete HTMLElement.prototype.scrollTo
  })

  it('scrolls the preferred headset badge into view', () => {
    const scrollTo = vi.fn()
    HTMLElement.prototype.scrollTo = scrollTo

    render(
      <DeviceBadges
        supportedEntries={[
          ['supportMetaQuest1', true],
          ['supportMetaQuest2', true],
          ['supportMetaQuest3', true],
          ['supportMetaQuest3S', true],
          ['supportMetaQuestPro', true]
        ]}
        selectedKey="supportMetaQuestPro"
        t={(key) => key}
      />
    )

    expect(screen.getByTitle('Quest Pro')).toHaveClass('bg-blue-500')
    expect(scrollTo).toHaveBeenCalledWith({
      left: expect.any(Number),
      behavior: 'smooth'
    })
  })
})
