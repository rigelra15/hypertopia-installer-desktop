import { useState } from 'react'
import { Icon } from '@iconify/react'
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

const IARC_RATING_ASSETS = {
  '3+': 'https://globalratings.com/wp-content/uploads/2025/06/Generic_3_68.png',
  '7+': 'https://globalratings.com/wp-content/uploads/2025/06/Generic_7_68.png',
  '12+': 'https://globalratings.com/wp-content/uploads/2025/06/Generic_12_68.png',
  '16+': 'https://globalratings.com/wp-content/uploads/2025/06/Generic_16_68.png',
  '18+': 'https://globalratings.com/wp-content/uploads/2025/06/Generic_18_68.png'
}

const getIarcRating = (value) => {
  const match = valueOrNull(value)?.match(/^(?:IARC(?:\s+Generic)?\s*)?(3|7|12|16|18)\s*\+$/i)
  if (!match) return null
  const label = `${match[1]}+`
  return IARC_RATING_ASSETS[label] ? { label, src: IARC_RATING_ASSETS[label] } : null
}

function AgeRatingValue({ value }) {
  const badge = getIarcRating(value)
  const [imageFailed, setImageFailed] = useState(false)

  if (!badge || imageFailed) return <span>{value}</span>

  return (
    <span className="standalone-detail-age-rating" title={`Rating IARC ${badge.label}`}>
      <img
        src={badge.src}
        alt={`Rating IARC ${badge.label}`}
        width="36"
        height="44"
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    </span>
  )
}

AgeRatingValue.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
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

export default function StandaloneGameMetaOverview({ game, showDescription = true, questSupport = [] }) {
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
  const categories = Array.isArray(meta.categories) ? meta.categories.filter(Boolean) : []

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
      {(fields.length > 0 || categories.length > 0 || questSupport.length > 0) && (
        <div className="standalone-detail-bento">
          {fields.map(([label, value]) => (
            <dl className="standalone-detail-bento-card" key={label}>
              <dt>{label}</dt>
              <dd>{label === 'Rating usia' ? <AgeRatingValue value={value} /> : value}</dd>
            </dl>
          ))}
          {categories.length > 0 && (
            <div className="standalone-detail-bento-card standalone-detail-bento-card--wide">
              <h3>Kategori</h3>
              <div className="standalone-detail-tags">
                {categories.map((category) => <span key={category}>{category}</span>)}
              </div>
            </div>
          )}
          {questSupport.length > 0 && (
            <div
              className="standalone-detail-bento-card standalone-detail-bento-card--wide"
              data-testid="standalone-detail-quest-support-card"
            >
              <h3>Dukungan Quest</h3>
              <div className="standalone-detail-tags standalone-detail-tags--quest">
                {questSupport.map(({ key, label, isSelected }) => (
                  <span
                    key={key}
                    className={isSelected ? 'standalone-detail-tags__item--preferred' : undefined}
                    title={isSelected ? `Perangkat pilihan: ${label}` : label}
                  >
                    <Icon icon="ri:meta-line" width="14" aria-hidden="true" />
                    <span>{label}</span>
                    {isSelected && <Icon icon="mdi:check" width="14" aria-hidden="true" />}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

const gamePropType = PropTypes.object.isRequired

StandaloneGameMetaIdentity.propTypes = { game: gamePropType }
StandaloneGameMetaOverview.propTypes = {
  game: gamePropType,
  showDescription: PropTypes.bool,
  questSupport: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      isSelected: PropTypes.bool
    })
  )
}
