import { apiFetch } from './apiClient'

const asText = (value) => (typeof value === 'string' ? value : '')

export const normalizeReleaseVersion = (version) => asText(version).trim().replace(/^v/, '')

export function releaseDateForDisplay(value) {
  const dateText = asText(value)
  if (!dateText) return null

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText)
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(dateText)

  return Number.isNaN(date.getTime()) ? null : date
}

export function getLocalizedReleaseNote(note, language) {
  const selectedLanguage = language === 'en' ? 'en' : 'id'
  const fallbackLanguage = selectedLanguage === 'en' ? 'id' : 'en'
  const localizedValue = (field) => {
    const selected = asText(note?.[field]?.[selectedLanguage])
    const fallback = asText(note?.[field]?.[fallbackLanguage])
    return selected.trim() ? selected : fallback
  }

  return {
    title: localizedValue('title'),
    body: localizedValue('body')
  }
}

export async function fetchDesktopReleaseNotes() {
  const response = await apiFetch('/api/v1/release-notes?platform=desktop')
  if (!response.ok) throw new Error('Release notes could not be loaded.')

  const payload = await response.json()
  if (!payload?.success || !Array.isArray(payload.notes)) {
    throw new Error('Release notes response was invalid.')
  }

  return payload.notes.filter((note) => note?.status === 'published')
}

export function mergeDesktopReleaseNotes(releases, notes, language) {
  const publishedNotes = (Array.isArray(notes) ? notes : []).filter(
    (note) =>
      note?.status === 'published' &&
      note.platform === 'desktop' &&
      normalizeReleaseVersion(note.version)
  )
  const releaseList = Array.isArray(releases) ? releases : []

  const listedVersions = new Set(
    releaseList.map((release) => normalizeReleaseVersion(release.tag_name))
  )
  const mergedReleases = releaseList.map((release) => {
    const matchedNote = publishedNotes.find(
      (note) => normalizeReleaseVersion(note.version) === normalizeReleaseVersion(release.tag_name)
    )

    if (!matchedNote) {
      return {
        ...release,
        releaseNoteTitle: asText(release.tag_name),
        releaseNoteBody: '',
        releaseNoteDate: asText(release.published_at),
        hasAuthoredReleaseNote: false
      }
    }

    const localized = getLocalizedReleaseNote(matchedNote, language)
    return {
      ...release,
      releaseNoteTitle: localized.title.trim() || asText(release.tag_name),
      releaseNoteBody: localized.body,
      releaseNoteDate: asText(matchedNote.releaseDate) || asText(release.published_at),
      hasAuthoredReleaseNote: true
    }
  })

  const authoredVersionsNotInHistory = publishedNotes
    .filter((note) => !listedVersions.has(normalizeReleaseVersion(note.version)))
    .map((note) => {
      const localized = getLocalizedReleaseNote(note, language)
      const version = asText(note.version).trim()
      return {
        id: `authored-${note.id || normalizeReleaseVersion(version)}`,
        tag_name: version,
        name: version,
        body: '',
        published_at: asText(note.releaseDate),
        html_url: null,
        assets: [],
        releaseNoteTitle: localized.title || version,
        releaseNoteBody: localized.body,
        releaseNoteDate: asText(note.releaseDate),
        hasAuthoredReleaseNote: true
      }
    })

  return [...mergedReleases, ...authoredVersionsNotInHistory].sort((first, second) =>
    asText(second.releaseNoteDate || second.published_at).localeCompare(
      asText(first.releaseNoteDate || first.published_at)
    )
  )
}
