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
  }
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
})
