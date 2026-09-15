const asStrings = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)

const asHttpUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

export function getStandaloneCoverUrl(game = {}) {
  const meta = game.metaStore?.media || {}
  const candidates = [
    meta.coverUrl,
    meta.posterUrl,
    ...asStrings(meta.screenshotUrls),
    game.photoUrl,
    game.iconUrl
  ]

  return candidates.map(asHttpUrl).find(Boolean) || null
}

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

  // The API keeps every mirrored Meta video in videoUrls because the remaining
  // clips belong to descriptionHtml. The public detail layout has one hero
  // video; rich-description videos are rendered by StandaloneGameDescription.
  const heroVideoUrl = asStrings(meta.videoUrls)[0]
  const videoUrls = heroVideoUrl
    ? [heroVideoUrl]
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
