import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StandaloneGameDescription from '../src/renderer/src/components/StandaloneGameDescription'

describe('StandaloneGameDescription', () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  })

  it('keeps rich text and configures inline videos for ambient playback', () => {
    render(
      <StandaloneGameDescription
        html={'<h2>About</h2><p><strong>Bold</strong> details.</p><video poster="https://res.cloudinary.com/demo/image/upload/poster.jpg"><source src="https://res.cloudinary.com/demo/video/upload/inline.mp4" /></video>'}
      />
    )

    expect(screen.getByTestId('standalone-rich-description')).toHaveTextContent('About')
    expect(screen.getByTestId('standalone-rich-description')).toHaveTextContent('Bold')
    expect(screen.queryByRole('heading', { name: 'Deskripsi' })).not.toBeInTheDocument()

    const video = screen.getByTestId('standalone-rich-description-video-0')
    expect(video).toHaveAttribute('autoplay')
    expect(video).toHaveAttribute('loop')
    expect(video).toHaveAttribute('muted')
    expect(video).toHaveAttribute('playsinline')
    expect(video).not.toHaveAttribute('controls')
  })

  it('flattens Meta wrapper markup into ordered blocks and keeps more on its own line', () => {
    render(
      <StandaloneGameDescription
        html={`
          <div><div><span><div>
            <div><h3>Love, Play, Bond - Like Never Before!</h3></div>
            <div><strong>Forever Pets is more than a pet simulator.</strong><span> It's a heartfelt sanctuary </span><strong>crafted for animal lovers.</strong></div>
            <div><div><video><source src="https://res.cloudinary.com/demo/video/upload/inline-1.mp4" /></video></div></div>
            <div><h3>Your Adventure Starts Now!</h3></div>
            <div>This is just the beginning - stay tuned for more mini-games.</div>
            <span><div>more...</div></span>
          </div></span></div></div>
        `}
      />
    )

    const root = screen.getByTestId('standalone-rich-description')
    expect(Array.from(root.children).map((element) => element.tagName)).toEqual([
      'H3', 'P', 'VIDEO', 'H3', 'P', 'P'
    ])
    expect(root.querySelector('h3')).toHaveTextContent('Love, Play, Bond - Like Never Before!')
    expect(root.querySelector('p')).toHaveTextContent('Forever Pets is more than a pet simulator.')
    expect(root.lastElementChild).toHaveTextContent('more...')
  })
})
