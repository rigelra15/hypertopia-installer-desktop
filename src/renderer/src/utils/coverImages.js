// Simple util to centralise cover image lookups with caching
// Images are served from Cloudinary under the public_id: coverGamesImages/<gameName>

const CLOUD_NAME = 'doyks8v1c'
// Bump this whenever the URL format changes to automatically invalidate old cache entries
const CACHE_VERSION = 'v2'

function getCloudinaryUrl(publicId) {
  const encoded = publicId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${encoded}`
}

// Replace all non-alphanumeric/non-space/non-dash characters with "-"
// e.g. "Peaky Blinders: The King's Ransom" → "Peaky Blinders- The King-s Ransom"
function sanitizeTitle(name) {
  if (!name) return name
  return name
    .replace(/[^a-zA-Z0-9 -]/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim()
}

function buildUrl(name) {
  return getCloudinaryUrl(`coverGamesImages/${sanitizeTitle(name)}`)
}

const _urlCache = {} // name -> url
const TTL = 1000 * 60 * 60 // 1 hour

export async function getCoverUrl(name) {
  if (!name) return null
  if (_urlCache[name]) return _urlCache[name]

  // try localStorage cache (skip stale Firebase Storage URLs and old-format URLs)
  try {
    const cached = localStorage.getItem(`gameBackgroundUrl_${CACHE_VERSION}_${name}`)
    const last = localStorage.getItem(`lastFetchTime_${CACHE_VERSION}_${name}`)
    if (cached && last && Date.now() - Number(last) <= TTL && !cached.includes('firebasestorage')) {
      _urlCache[name] = cached
      return cached
    }
  } catch {
    // ignore
  }

  const url = buildUrl(name)
  _urlCache[name] = url

  try {
    localStorage.setItem(`gameBackgroundUrl_${CACHE_VERSION}_${name}`, url)
    localStorage.setItem(`lastFetchTime_${CACHE_VERSION}_${name}`, String(Date.now()))
  } catch {
    // ignore
  }

  return url
}

const CoverImages = { getCoverUrl }
export default CoverImages
