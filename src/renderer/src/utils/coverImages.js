// Simple util to centralise cover image lookups with caching
// Images are served from Cloudinary under the public_id: coverGamesImages/<gameName>

const CLOUD_NAME = 'doyks8v1c'

function getCloudinaryUrl(publicId) {
  const encoded = publicId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${encoded}`
}

const _urlCache = {} // name -> url
const TTL = 1000 * 60 * 60 // 1 hour

export async function getCoverUrl(name) {
  if (!name) return null
  if (_urlCache[name]) return _urlCache[name]

  // try localStorage cache (skip stale Firebase Storage URLs)
  try {
    const cached = localStorage.getItem(`gameBackgroundUrl_${name}`)
    const last = localStorage.getItem(`lastFetchTime_${name}`)
    if (cached && last && Date.now() - Number(last) <= TTL && !cached.includes('firebasestorage')) {
      _urlCache[name] = cached
      return cached
    }
  } catch {
    // ignore
  }

  const url = getCloudinaryUrl(`coverGamesImages/${name}`)
  _urlCache[name] = url

  try {
    localStorage.setItem(`gameBackgroundUrl_${name}`, url)
    localStorage.setItem(`lastFetchTime_${name}`, String(Date.now()))
  } catch {
    // ignore
  }

  return url
}

const CoverImages = { getCoverUrl }
export default CoverImages
