import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(
  resolve(process.cwd(), 'src/renderer/src/assets/main.css'),
  'utf8'
)

describe('standalone detail info spacing', () => {
  it('separates the overview, source, review, and action sections', () => {
    expect(stylesheet).toMatch(
      /\.standalone-detail-page--desktop \.standalone-detail-body\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*gap:\s*16px;/s
    )
  })

  it('uses the web video volume pill geometry', () => {
    expect(stylesheet).toMatch(
      /\.standalone-detail-video-controls__volume\s*\{[^}]*top:\s*0\.85rem;[^}]*right:\s*0\.85rem;[^}]*height:\s*2\.25rem;[^}]*border:\s*1px solid rgb\(209 213 219 \/ 72%\);[^}]*border-radius:\s*999px;/s
    )
    expect(stylesheet).toMatch(
      /\.standalone-detail-video-volume\s*\{[^}]*width:\s*4\.25rem;[^}]*min-height:\s*2rem;/s
    )
  })

  it('keeps the action buttons close without a compounded top margin', () => {
    expect(stylesheet).toMatch(
      /\.standalone-detail-request-actions\s*\{[^}]*margin-top:\s*0;/s
    )
  })
})
