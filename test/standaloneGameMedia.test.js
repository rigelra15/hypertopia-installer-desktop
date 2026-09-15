import { describe, expect, it } from 'vitest'
import {
  getStandaloneCoverUrl,
  getStandaloneMedia
} from '../src/renderer/src/utils/standaloneGameMedia'

describe('standalone media normalization', () => {
  it('uses the injected Meta cover before poster, screenshot, and legacy cover fallbacks', () => {
    expect(
      getStandaloneCoverUrl({
        photoUrl: 'https://legacy.example/cover.jpg',
        metaStore: {
          media: {
            coverUrl: 'https://cdn.example/meta-cover.jpg',
            posterUrl: 'https://cdn.example/meta-poster.jpg',
            screenshotUrls: ['https://cdn.example/screenshot.jpg']
          }
        }
      })
    ).toBe('https://cdn.example/meta-cover.jpg')

    expect(
      getStandaloneCoverUrl({
        metaStore: {
          media: {
            posterUrl: 'https://cdn.example/meta-poster.jpg',
            screenshotUrls: ['https://cdn.example/screenshot.jpg']
          }
        }
      })
    ).toBe('https://cdn.example/meta-poster.jpg')

    expect(
      getStandaloneCoverUrl({
        metaStore: {
          media: { screenshotUrls: ['https://cdn.example/screenshot.jpg'] }
        }
      })
    ).toBe('https://cdn.example/screenshot.jpg')
  })

  it('puts Meta video first and deduplicates URLs in first-seen order', () => {
    const media = getStandaloneMedia({
      photoUrl: 'https://legacy.example/cover.jpg',
      metaStore: {
        media: {
          coverUrl: 'https://cdn.example/poster.jpg',
          posterUrl: 'https://cdn.example/poster.jpg',
          videoUrls: ['https://cdn.example/game.mp4', 'https://cdn.example/game.mp4'],
          screenshotUrls: [
            'https://cdn.example/one.jpg',
            'https://cdn.example/poster.jpg',
            'https://cdn.example/two.jpg'
          ]
        }
      }
    })

    expect(media.map((item) => item.url)).toEqual([
      'https://cdn.example/game.mp4',
      'https://cdn.example/one.jpg',
      'https://cdn.example/poster.jpg',
      'https://cdn.example/two.jpg'
    ])
    expect(media[0]).toMatchObject({ kind: 'video', posterUrl: 'https://cdn.example/poster.jpg' })
  })

  it('falls back to legacy cover and YouTube media when Meta media is absent', () => {
    expect(getStandaloneMedia({ photoUrl: 'https://legacy.example/cover.jpg' })).toEqual([
      { kind: 'image', url: 'https://legacy.example/cover.jpg', posterUrl: null }
    ])
    expect(getStandaloneMedia({ videoIdYouTube: 'abc123' })).toEqual([
      { kind: 'youtube', url: 'abc123', posterUrl: null }
    ])
  })
})
