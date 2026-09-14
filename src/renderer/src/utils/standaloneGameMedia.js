const asStrings = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)

export function getStandaloneMedia(game = {}) {
  const meta = game.metaStore?.media || {}
  const legacyCover = game.photoUrl || game.iconUrl || ''
  const posterUrl = meta.posterUrl || meta.coverUrl || legacyCover || null
  const seen = new Set()
  const items = []

  const add = (item) => {
    if (!item.url || seen.has(item.url)) return
    seen.add(item.url)
    items.push(item)
  }

  const metaVideos = asStrings(meta.videoUrls)
  const videoUrls = metaVideos.length
    ? metaVideos
    : typeof game.videoUrlMetaStore === 'string' && game.videoUrlMetaStore.trim()
      ? [game.videoUrlMetaStore.trim()]
      : []

  videoUrls.forEach((url) => add({ kind: 'video', url, posterUrl }))
  asStrings(meta.screenshotUrls).forEach((url) => add({ kind: 'image', url, posterUrl: null }))

  if (items.length === 0 && legacyCover) {
    add({ kind: 'image', url: legacyCover, posterUrl: null })
  }

  if (items.length === 0 && typeof game.videoIdYouTube === 'string' && game.videoIdYouTube) {
    add({ kind: 'youtube', url: game.videoIdYouTube, posterUrl: null })
  }

  return items
}

export const getMediaPoster = (item, game = {}) =>
  item?.posterUrl || game.metaStore?.media?.coverUrl || game.photoUrl || game.iconUrl || ''
