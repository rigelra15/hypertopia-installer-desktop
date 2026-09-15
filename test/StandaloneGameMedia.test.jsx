import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StandaloneGameMedia from '../src/renderer/src/components/StandaloneGameMedia'

const videoGame = {
  gameTitle: 'Click Clack Mixed Reality',
  likedCount: 3,
  metaStore: {
    rating: { value: 3.1, count: 7 },
    media: {
      coverUrl: 'https://cdn.example/poster.jpg',
      posterUrl: 'https://cdn.example/poster.jpg',
      videoUrls: ['https://cdn.example/game.mp4'],
      screenshotUrls: ['https://cdn.example/one.jpg', 'https://cdn.example/two.jpg']
    }
  },
  descriptionHtml:
    '<h2>About the game</h2><p><strong>Rich details</strong></p><video poster="https://res.cloudinary.com/demo/image/upload/poster.jpg"><source src="https://res.cloudinary.com/demo/video/upload/inline.mp4"></video>'
}

describe('StandaloneGameMedia', () => {
  it('keeps the initial view poster-only and starts video after Play', () => {
    render(<StandaloneGameMedia game={videoGame} />)

    expect(screen.getByTestId('standalone-video')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /play video/i })).toBeInTheDocument()
    expect(screen.getByTestId('standalone-media-thumbnails')).toBeInTheDocument()

    const video = screen.getByTestId('standalone-video')
    video.play = vi.fn().mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: /play video/i }))

    expect(video).toHaveAttribute(
      'poster',
      'https://cdn.example/poster.jpg'
    )
    expect(screen.getByTestId('standalone-video')).not.toHaveAttribute('controls')
  })

  it('keeps rich-description videos out of the main media gallery', () => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    render(
      <StandaloneGameMedia
        game={{
          ...videoGame,
          metaStore: {
            ...videoGame.metaStore,
            media: {
              ...videoGame.metaStore.media,
              videoUrls: [
                'https://cdn.example/game.mp4',
                'https://cdn.example/description-1.mp4',
                'https://cdn.example/description-2.mp4'
              ]
            }
          },
          descriptionHtml: `${videoGame.descriptionHtml}<video><source src="https://cdn.example/description-1.mp4" /></video>`
        }}
        descriptionHtml={`${videoGame.descriptionHtml}<video><source src="https://cdn.example/description-1.mp4" /></video>`}
      />
    )

    const thumbnails = screen.getByTestId('standalone-media-thumbnails')
    expect(within(thumbnails).getAllByRole('listitem')).toHaveLength(3)
    expect(within(thumbnails).getAllByTestId('standalone-media-video-thumb')).toHaveLength(1)
    expect(within(thumbnails).getByRole('listitem', { name: 'Screenshot 1' })).toBeInTheDocument()
    expect(within(thumbnails).getByRole('listitem', { name: 'Screenshot 2' })).toBeInTheDocument()
    expect(screen.getAllByTestId(/standalone-rich-description-video-/)).toHaveLength(2)
  })

  it('renders web-parity controls and media stat chips', () => {
    render(<StandaloneGameMedia game={videoGame} />)

    expect(screen.getByTestId('standalone-detail-rating-chip')).toHaveTextContent('3.1')
    expect(screen.getByTestId('standalone-favorite-count')).toHaveTextContent('3')

    const video = screen.getByTestId('standalone-video')
    video.play = vi.fn().mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: /play video/i }))
    fireEvent.play(video)

    const controls = screen.getByRole('group', { name: /video controls/i })
    const centerActions = screen.getByTestId('standalone-detail-video-center-actions')
    expect(within(centerActions).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Skip back 10 seconds',
      'Pause video',
      'Skip forward 10 seconds'
    ])
    expect(within(controls).getByRole('slider', { name: /video volume/i })).toBeInTheDocument()
    expect(within(controls).getByTestId('standalone-detail-video-seek')).toBeInTheDocument()
    expect(screen.getByTestId('standalone-video')).not.toHaveAttribute('controls')
  })

  it('makes the favorite chip actionable', () => {
    const onFavoriteToggle = vi.fn()
    render(<StandaloneGameMedia game={videoGame} onFavoriteToggle={onFavoriteToggle} />)

    const favorite = screen.getByRole('button', { name: /favorite/i })
    fireEvent.click(favorite)

    expect(onFavoriteToggle).toHaveBeenCalledOnce()
  })

  it('keeps controls visible before playback, on hover, and after video end', () => {
    render(<StandaloneGameMedia game={videoGame} />)

    const video = screen.getByTestId('standalone-video')
    const hero = screen.getByTestId('media-hero')
    const controls = screen.getByRole('group', { name: /video controls/i })
    video.play = vi.fn().mockResolvedValue(undefined)

    expect(controls).not.toHaveClass('is-hidden')
    fireEvent.play(video)
    expect(controls).toHaveClass('is-hidden')

    fireEvent.mouseEnter(hero)
    expect(controls).not.toHaveClass('is-hidden')
    fireEvent.mouseLeave(hero)
    expect(controls).toHaveClass('is-hidden')

    fireEvent.ended(video)
    expect(controls).not.toHaveClass('is-hidden')
  })

  it('hides thumbnails when the game has one media item', () => {
    render(
      <StandaloneGameMedia
        game={{
          gameTitle: 'One image',
          photoUrl: 'https://cdn.example/one.jpg'
        }}
      />
    )

    expect(screen.queryByTestId('standalone-media-thumbnails')).not.toBeInTheDocument()
  })

  it('renders rich description videos as muted autoplay loops without controls', () => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    render(<StandaloneGameMedia game={videoGame} descriptionHtml={videoGame.descriptionHtml} />)

    const richVideo = screen.getByTestId('standalone-rich-description-video-0')
    expect(richVideo).toHaveAttribute('autoplay')
    expect(richVideo).toHaveAttribute('loop')
    expect(richVideo).toHaveAttribute('muted')
    expect(richVideo).toHaveAttribute('playsinline')
    expect(richVideo).not.toHaveAttribute('controls')
  })
})
