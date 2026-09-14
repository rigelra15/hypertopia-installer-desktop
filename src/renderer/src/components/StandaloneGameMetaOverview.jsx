import PropTypes from 'prop-types'

const valueOrNull = (value) => {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized || null
}

const formatRating = (rating) => {
  const value = Number(rating?.value)
  if (!Number.isFinite(value)) return null
  const count = Number(rating?.count)
  return `${value.toFixed(1)}${Number.isFinite(count) ? ` (${count} ratings)` : ''}`
}

export function StandaloneGameMetaIdentity({ game }) {
  const meta = game?.metaStore
  if (!meta) return null

  const publisher = valueOrNull(meta.publisher) || valueOrNull(meta.developer)
  const rating = formatRating(meta.rating)
  const categories = Array.isArray(meta.categories) ? meta.categories.filter(Boolean) : []
  const platforms = Array.isArray(meta.platforms) ? meta.platforms.filter(Boolean) : []

  return (
    <div data-testid="standalone-meta-identity" className="mt-4 space-y-3">
      {publisher && <p className="text-sm text-gray-500 dark:text-white/50">{publisher}</p>}
      {rating && (
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <span className="text-amber-400">★</span>
          {rating}
        </p>
      )}
      {(categories.length > 0 || platforms.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {[...categories, ...platforms].map((label) => (
            <span
              key={label}
              className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-white/60"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StandaloneGameMetaOverview({ game, showDescription = true }) {
  const meta = game?.metaStore
  if (!meta) return null

  const fields = [
    ['Rating usia', meta.ageRating],
    ['Ruang yang dibutuhkan', meta.spaceRequired],
    ['Tanggal rilis', meta.releaseDate],
    ['Internet', meta.internetRequirement],
    ['Mode', Array.isArray(meta.modes) ? meta.modes.join(', ') : null],
    ['Bahasa', Array.isArray(meta.languages) ? meta.languages.join(', ') : null],
    ['Ukuran unduhan', game.gameSize]
  ].filter(([, value]) => valueOrNull(value))

  return (
    <section data-testid="standalone-meta-overview" className="standalone-detail-meta-overview">
      {showDescription && valueOrNull(meta.description) && (
        <div className="standalone-detail-copy">
          <h3>Deskripsi</h3>
          <p>
            {meta.description}
          </p>
        </div>
      )}
      {fields.length > 0 && (
        <div className="standalone-detail-bento">
          {fields.map(([label, value]) => (
            <dl className="standalone-detail-bento-card" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </dl>
          ))}
        </div>
      )}
    </section>
  )
}

const gamePropType = PropTypes.object.isRequired

StandaloneGameMetaIdentity.propTypes = { game: gamePropType }
StandaloneGameMetaOverview.propTypes = { game: gamePropType, showDescription: PropTypes.bool }
