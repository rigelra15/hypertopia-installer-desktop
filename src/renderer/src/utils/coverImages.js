import { getDownloadURL, listAll, ref } from 'firebase/storage'
import { storage } from './firebase'

// Simple util to centralize cover image lookups with caching + dedupe
const _listCache = { timestamp: 0, items: null }
let _listPromise = null
const _urlCache = {} // name -> url

const TTL = 1000 * 60 * 60 // 1 hour
const LIST_CACHE_KEY = 'coverImages_list_cache'
const LIST_CACHE_TIME_KEY = 'coverImages_list_time'

async function ensureListLoaded() {
  const now = Date.now()

  // 1. Try memory cache first
  if (_listCache.items && now - _listCache.timestamp <= TTL) return _listCache.items

  // 2. Try localStorage cache
  try {
    const cachedList = localStorage.getItem(LIST_CACHE_KEY)
    const cachedTime = localStorage.getItem(LIST_CACHE_TIME_KEY)

    if (cachedList && cachedTime && now - Number(cachedTime) <= TTL) {
      const parsedItems = JSON.parse(cachedList)
      _listCache.items = parsedItems.map((item) => ({ name: item.name, fullPath: item.fullPath }))
      _listCache.timestamp = Number(cachedTime)
      return _listCache.items
    }
  } catch (e) {
    console.warn('coverImages: failed to read list from localStorage', e)
  }

  // 3. Fetch from network if no cache or expired
  if (_listPromise) return _listPromise

  _listPromise = listAll(ref(storage, 'coverGamesImages/'))
    .then((res) => {
      const items = res.items || []
      _listCache.items = items
      _listCache.timestamp = Date.now()

      // Save to localStorage (only store essential data to save space)
      try {
        const serializableItems = items.map((item) => ({
          name: item.name,
          fullPath: item.fullPath
        }))
        localStorage.setItem(LIST_CACHE_KEY, JSON.stringify(serializableItems))
        localStorage.setItem(LIST_CACHE_TIME_KEY, String(Date.now()))
      } catch (e) {
        console.warn('coverImages: failed to save list to localStorage', e)
      }

      return _listCache.items
    })
    .catch((err) => {
      console.warn('coverImages util: listAll failed', err?.message || err)
      _listCache.items = []
      return _listCache.items
    })
    .finally(() => {
      _listPromise = null
    })

  return _listPromise
}

export async function getCoverUrl(name) {
  if (!name) return null
  if (_urlCache[name]) return _urlCache[name]

  // try localStorage for individual URL
  try {
    const cached = localStorage.getItem(`gameBackgroundUrl_${name}`)
    const last = localStorage.getItem(`lastFetchTime_${name}`)
    if (cached && last && Date.now() - Number(last) <= TTL) {
      _urlCache[name] = cached
      return cached
    }
  } catch (e) {
    // ignore
  }

  const items = await ensureListLoaded()
  console.log(`[CoverImages] Looking for "${name}" in ${items.length} items`)
  const found = items.find((it) => it.name === name)

  if (found) {
    try {
      let storageRef = found
      if (!found.root) {
        storageRef = ref(storage, found.fullPath)
      }

      const url = await getDownloadURL(storageRef)
      _urlCache[name] = url
      try {
        localStorage.setItem(`gameBackgroundUrl_${name}`, url)
        localStorage.setItem(`lastFetchTime_${name}`, String(Date.now()))
      } catch (e) {
        // ignore
      }
      return url
    } catch (err) {
      // fallback to UnknownPicture if available
    }
  }

  // try UnknownPicture
  const unknown = items.find((it) => it.name === 'UnknownPicture')
  if (unknown) {
    try {
      let storageRef = unknown
      if (!unknown.root) {
        storageRef = ref(storage, unknown.fullPath)
      }
      const url = await getDownloadURL(storageRef)
      _urlCache[name] = url
      return url
    } catch (e) {
      // ignore
    }
  }

  return null
}

const CoverImages = { getCoverUrl }
export default CoverImages
