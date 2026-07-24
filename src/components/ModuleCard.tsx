import type { ReactNode } from 'react'
import { fmtUsd } from '../lib/format'

/** The paywall mock: locked = teaser stats + blurred preview under a veil with an
 *  Unlock button; unlocked = the real renderer. notApplicable renders a plain note. */
export function ModuleCard({
  title,
  teaserStats,
  locked,
  price,
  onUnlock,
  notApplicable,
  reason,
  source,
  caveat,
  children,
  blurPreview,
  anchorId,
  hideStatus,
}: {
  title: string
  teaserStats?: string
  locked: boolean
  price?: number
  onUnlock?: () => void
  notApplicable?: boolean
  reason?: string
  source?: string
  caveat?: string
  children?: ReactNode
  blurPreview?: ReactNode
  anchorId: string
  /** module renders its own unlock affordances in the body (per-card pricing) */
  hideStatus?: boolean
}) {
  return (
    <section className="module" id={anchorId}>
      <div className="moduleHead">
        <span className="moduleTitle">{title}</span>
        {teaserStats && <span className="moduleTeaserStats">{teaserStats}</span>}
        {notApplicable || hideStatus ? null : locked ? (
          <span className="priceChip">
            {price != null && fmtUsd(price)}
            <button className="unlockBtn" onClick={onUnlock}>
              Unlock
            </button>
          </span>
        ) : (
          <span className="unlockedBadge">Unlocked ✓</span>
        )}
      </div>
      {notApplicable ? (
        <div className="moduleBody">
          <div className="naBody">{reason}</div>
          {source && <div className="sourceLine">Source: {source}</div>}
        </div>
      ) : locked ? (
        <div className="moduleBody locked">
          <div className="teaserBlur" aria-hidden>
            {blurPreview}
          </div>
          <div className="lockVeil">
            <span className="lockVeilText">🔒 {teaserStats ?? 'Purchase to unlock'}</span>
            <button className="unlockBtn" onClick={onUnlock}>
              Unlock — {price != null ? fmtUsd(price) : ''}
            </button>
          </div>
        </div>
      ) : (
        <div className="moduleBody">
          {children}
          {caveat && <div className="caveat">{caveat}</div>}
          {source && <div className="sourceLine">Source: {source}</div>}
        </div>
      )}
    </section>
  )
}
