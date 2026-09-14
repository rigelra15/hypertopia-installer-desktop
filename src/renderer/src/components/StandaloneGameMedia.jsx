import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { getMediaPoster, getStandaloneMedia } from '../utils/standaloneGameMedia'

const formatVideoTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${remainingSeconds}`
}

const getRatingScore = (game) => {
  const value = Number(game?.metaStore?.rating?.value ?? game?.rating?.value ?? game?.rating)
  return Number.isFinite(value) && value > 0 ? value.toFixed(1) : null
}

const formatStatCount = (value) => {
  const count = Math.max(0, Number(value) || 0)
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return String(count)
}

export default function StandaloneGameMedia({ game, description }) {
  const media = useMemo(() => getStandaloneMedia(game), [game])
  const [activeIndex, setActiveIndex] = useState(0)
  const [videoStarted, setVideoStarted] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isVideoEnded, setIsVideoEnded] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [videoVolume, setVideoVolume] = useState(0.5)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [isVideoPointerInside, setIsVideoPointerInside] = useState(false)
  const [isVideoControlsFocused, setIsVideoControlsFocused] = useState(false)
  const [seekTooltip, setSeekTooltip] = useState(null)
  const activeItem = media[activeIndex]
  const poster = getMediaPoster(activeItem, game)
  const videoRef = useRef(null)
  const youtubeRef = useRef(null)
  const ratingScore = getRatingScore(game)
  const favoriteCount = Math.max(0, Number(game?.likedCount) || 0)
  const gameTitle = game.gameTitle || game.name || 'Game'
  const shouldShowVideoControls =
    !videoStarted || isVideoPointerInside || isVideoControlsFocused || isVideoEnded

  const syncVideoMetadata = useCallback((video) => {
    if (!video) return

    const duration = Number(video.duration)
    if (Number.isFinite(duration) && duration > 0) setVideoDuration(duration)

    const currentTime = Number(video.currentTime)
    if (Number.isFinite(currentTime) && currentTime >= 0) setVideoProgress(currentTime)
  }, [])

  const postYoutubeCommand = useCallback((command, args = []) => {
    if (!youtubeRef.current?.contentWindow) return
    youtubeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: command, args }),
      '*'
    )
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || activeItem?.kind !== 'video') return undefined

    video.volume = 0.5
    video.muted = false
    const syncMetadata = () => syncVideoMetadata(video)
    syncMetadata()
    video.addEventListener('loadedmetadata', syncMetadata)
    video.addEventListener('loadeddata', syncMetadata)
    video.addEventListener('durationchange', syncMetadata)
    video.addEventListener('canplay', syncMetadata)

    return () => {
      video.removeEventListener('loadedmetadata', syncMetadata)
      video.removeEventListener('loadeddata', syncMetadata)
      video.removeEventListener('durationchange', syncMetadata)
      video.removeEventListener('canplay', syncMetadata)
    }
  }, [activeItem?.kind, activeItem?.url, syncVideoMetadata])

  const handleVideoToggle = async () => {
    if (activeItem?.kind === 'video' && videoRef.current) {
      const video = videoRef.current
      if (video.paused) {
        if (video.ended) video.currentTime = 0
        try {
          await video.play()
        } catch (error) {
          console.error('Could not play Meta Store video:', error)
        }
      } else {
        video.pause()
      }
      return
    }

    if (activeItem?.kind === 'youtube') {
      postYoutubeCommand(isVideoPlaying ? 'pauseVideo' : 'playVideo')
      setVideoStarted(true)
      setIsVideoEnded(false)
      setIsVideoPlaying((playing) => !playing)
    }
  }

  const handleVideoSkip = (offsetSeconds) => {
    const currentTime = Number(videoRef.current?.currentTime) || videoProgress
    const duration = Number(videoRef.current?.duration) || videoDuration
    const nextTime = Math.max(
      0,
      Math.min(duration > 0 ? duration : Number.MAX_SAFE_INTEGER, currentTime + offsetSeconds)
    )

    setVideoProgress(nextTime)
    setIsVideoEnded(false)
    if (activeItem?.kind === 'video' && videoRef.current) {
      videoRef.current.currentTime = nextTime
    } else if (activeItem?.kind === 'youtube') {
      postYoutubeCommand('seekTo', [nextTime, true])
    }
  }

  const handleMuteToggle = () => {
    if (activeItem?.kind === 'video' && videoRef.current) {
      videoRef.current.muted = !isVideoMuted
    } else if (activeItem?.kind === 'youtube') {
      postYoutubeCommand(isVideoMuted ? 'unMute' : 'mute')
      if (isVideoMuted) postYoutubeCommand('setVolume', [videoVolume * 100])
    }
    setIsVideoMuted((muted) => !muted)
  }

  const handleVideoVolumeChange = (event) => {
    const nextVolume = Number(event.target.value)
    setVideoVolume(nextVolume)
    setIsVideoMuted(nextVolume === 0)

    if (activeItem?.kind === 'video' && videoRef.current) {
      videoRef.current.volume = nextVolume
      videoRef.current.muted = nextVolume === 0
    } else if (activeItem?.kind === 'youtube') {
      postYoutubeCommand('setVolume', [nextVolume * 100])
      postYoutubeCommand(nextVolume === 0 ? 'mute' : 'unMute')
    }
  }

  const handleVideoSeek = (event) => {
    const nextProgress = Number(event.target.value)
    setVideoProgress(nextProgress)
    setIsVideoEnded(false)
    if (activeItem?.kind === 'video' && videoRef.current) {
      videoRef.current.currentTime = nextProgress
    }
  }

  const handleSeekTooltipMove = (event) => {
    if (!videoDuration) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width) return

    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    setSeekTooltip({
      percent: Math.min(96, Math.max(4, ratio * 100)),
      time: ratio * videoDuration
    })
  }

  if (!activeItem) {
    return (
      <div className="standalone-detail-hero standalone-detail-media-empty">
        <Icon icon="mdi:image-off-outline" aria-hidden="true" />
        <span>Belum ada media publik untuk game ini.</span>
      </div>
    )
  }

  const selectMedia = (index) => {
    if (videoRef.current) videoRef.current.pause()
    setActiveIndex(index)
    setVideoStarted(false)
    setIsVideoPlaying(false)
    setIsVideoEnded(false)
    setIsVideoMuted(false)
    setVideoVolume(0.5)
    setVideoProgress(0)
    setVideoDuration(0)
    setIsVideoPointerInside(false)
    setIsVideoControlsFocused(false)
    setSeekTooltip(null)
  }

  return (
    <section aria-label="Game media" className="standalone-detail-media-content">
      <div
        className="standalone-detail-hero"
        data-testid="media-hero"
        onMouseEnter={() => setIsVideoPointerInside(true)}
        onMouseMove={() => setIsVideoPointerInside(true)}
        onMouseLeave={() => {
          setIsVideoPointerInside(false)
          setIsVideoControlsFocused(false)
        }}
        onFocusCapture={() => setIsVideoControlsFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsVideoControlsFocused(false)
        }}
      >
        {activeItem.kind === 'video' ? (
          <video
            ref={videoRef}
            data-testid="standalone-video"
            className="standalone-detail-hero__asset"
            playsInline
            preload="metadata"
            muted={isVideoMuted}
            poster={poster || undefined}
            src={activeItem.url}
            aria-label={`${gameTitle} video`}
            onLoadedMetadata={(event) => syncVideoMetadata(event.currentTarget)}
            onLoadedData={(event) => syncVideoMetadata(event.currentTarget)}
            onDurationChange={(event) => syncVideoMetadata(event.currentTarget)}
            onCanPlay={(event) => syncVideoMetadata(event.currentTarget)}
            onTimeUpdate={(event) => setVideoProgress(event.currentTarget.currentTime || 0)}
            onPlay={() => {
              setVideoStarted(true)
              setIsVideoPlaying(true)
              setIsVideoEnded(false)
            }}
            onPause={() => setIsVideoPlaying(false)}
            onEnded={() => {
              setIsVideoPlaying(false)
              setIsVideoEnded(true)
              setIsVideoPointerInside(false)
              setIsVideoControlsFocused(false)
            }}
          />
        ) : activeItem.kind === 'youtube' ? (
          <>
            <iframe
              ref={youtubeRef}
              className="standalone-detail-hero__asset"
              src={`https://www.youtube.com/embed/${activeItem.url}?autoplay=0&playsinline=1&controls=0&enablejsapi=1`}
              title={`${gameTitle} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => {
                postYoutubeCommand('setVolume', [50])
                postYoutubeCommand('unMute')
              }}
            />
            {!videoStarted && (
              <div className="standalone-detail-youtube-poster">
                {poster ? <img src={poster} alt="" /> : <span>Preview video</span>}
              </div>
            )}
          </>
        ) : (
          <img
            className="standalone-detail-hero__asset"
            src={activeItem.url}
            alt={`${gameTitle} screenshot ${activeIndex + 1}`}
          />
        )}

        {(activeItem.kind === 'video' || activeItem.kind === 'youtube') && (
          <div
            className={`standalone-detail-video-controls standalone-detail-video-controls--compact ${shouldShowVideoControls ? '' : 'is-hidden'}`}
            role="group"
            aria-label="Video controls"
          >
            <div className="standalone-detail-video-controls__volume" data-testid="standalone-detail-video-volume-control">
              <button
                type="button"
                className="standalone-detail-video-control standalone-detail-video-control--compact standalone-detail-video-control--volume"
                onClick={handleMuteToggle}
                aria-label={isVideoMuted ? 'Unmute video' : 'Mute video'}
                title={isVideoMuted ? 'Unmute video' : 'Mute video'}
              >
                <Icon icon={isVideoMuted ? 'mdi:volume-off' : 'mdi:volume-high'} aria-hidden="true" />
              </button>
              <label className="standalone-detail-video-volume">
                <span className="standalone-detail-visually-hidden">Video volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isVideoMuted ? 0 : videoVolume}
                  onChange={handleVideoVolumeChange}
                  aria-label="Video volume"
                />
              </label>
            </div>

            <div className="standalone-detail-video-controls__center" data-testid="standalone-detail-video-center-actions">
              <button
                type="button"
                className="standalone-detail-video-control standalone-detail-video-control--compact"
                onClick={() => handleVideoSkip(-10)}
                aria-label="Skip back 10 seconds"
                title="Skip back 10 seconds"
              >
                <Icon icon="mdi:rewind-10" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="standalone-detail-video-control standalone-detail-video-control--compact standalone-detail-video-control--play"
                onClick={handleVideoToggle}
                aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                title={isVideoPlaying ? 'Pause video' : 'Play video'}
              >
                <Icon icon={isVideoPlaying ? 'mdi:pause' : 'mdi:play'} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="standalone-detail-video-control standalone-detail-video-control--compact"
                onClick={() => handleVideoSkip(10)}
                aria-label="Skip forward 10 seconds"
                title="Skip forward 10 seconds"
              >
                <Icon icon="mdi:fast-forward-10" aria-hidden="true" />
              </button>
            </div>

            {activeItem.kind === 'video' && (
              <div className="standalone-detail-video-progress" data-testid="standalone-detail-video-progress">
                <span className="standalone-detail-video-time standalone-detail-video-time--current" aria-hidden="true">
                  {formatVideoTime(videoProgress)}
                </span>
                <div
                  className="standalone-detail-video-seek"
                  data-testid="standalone-detail-video-seek"
                  onMouseEnter={handleSeekTooltipMove}
                  onMouseMove={handleSeekTooltipMove}
                  onMouseLeave={() => setSeekTooltip(null)}
                >
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 0}
                    step="0.1"
                    value={Math.min(videoProgress, videoDuration || 0)}
                    onChange={handleVideoSeek}
                    disabled={!videoDuration}
                    aria-label={`Video position: ${formatVideoTime(videoProgress)} / ${formatVideoTime(videoDuration)}`}
                  />
                  {seekTooltip && (
                    <span
                      className="standalone-detail-video-seek-tooltip"
                      data-testid="standalone-detail-video-seek-tooltip"
                      style={{ left: `${seekTooltip.percent}%` }}
                      aria-hidden="true"
                    >
                      {formatVideoTime(seekTooltip.time)}
                    </span>
                  )}
                </div>
                <span className="standalone-detail-video-time standalone-detail-video-time--duration" aria-hidden="true">
                  {formatVideoTime(videoDuration)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="standalone-detail-hero-stats" data-testid="standalone-detail-hero-stats">
          {ratingScore && (
            <span
              className="standalone-detail-hero-stat standalone-detail-hero-stat--rating"
              data-testid="standalone-detail-rating-chip"
              aria-label={`${ratingScore} out of 5 stars`}
            >
              <span className="standalone-detail-hero-stat__content">
                <Icon icon="mdi:star" aria-hidden="true" />
                <span>{ratingScore}</span>
              </span>
            </span>
          )}
          <span
            className="standalone-detail-hero-stat standalone-detail-hero-stat--favorite"
            aria-label={`${favoriteCount} favorites`}
          >
            <span className="standalone-detail-hero-stat__content">
              <Icon icon={favoriteCount > 0 ? 'mdi:heart' : 'mdi:heart-outline'} aria-hidden="true" />
              <span data-testid="standalone-favorite-count">{formatStatCount(favoriteCount)}</span>
            </span>
          </span>
        </div>
      </div>

      {media.length > 1 && (
        <div
          data-testid="standalone-media-thumbnails"
          className="standalone-detail-gallery-shell"
          role="list"
          aria-label="Media thumbnails"
        >
          <div className="standalone-detail-gallery">
            {media.map((item, index) => {
              const thumbnail = item.kind === 'video' ? getMediaPoster(item, game) : item.url
              const selected = activeIndex === index
              return (
                <button
                  key={`${item.kind}-${item.url}`}
                  type="button"
                  role="listitem"
                  aria-label={item.kind === 'video' ? 'Video preview' : `Screenshot ${index + 1}`}
                  aria-pressed={selected}
                  onClick={() => selectMedia(index)}
                  className={`standalone-detail-gallery__item ${selected ? 'is-active' : ''}`}
                >
                  {thumbnail ? (
                    <img src={thumbnail} alt="" aria-hidden="true" loading="lazy" />
                  ) : (
                    <span className="standalone-detail-gallery__video-icon">
                      <Icon icon={item.kind === 'video' ? 'mdi:play-circle' : 'mdi:image'} aria-hidden="true" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {description && (
        <section className="standalone-detail-copy" aria-labelledby="standalone-description-heading">
          <h2 id="standalone-description-heading">Deskripsi</h2>
          <p>{description}</p>
        </section>
      )}
    </section>
  )
}

StandaloneGameMedia.propTypes = {
  game: PropTypes.object.isRequired,
  description: PropTypes.string
}
