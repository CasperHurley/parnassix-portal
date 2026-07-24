import { useEffect, useState } from 'react'
import type { ExpertCard, ExpertProfileData } from '../../lib/data'
import { loadExpertsDetail } from '../../lib/data'
import { fmtNum, fmtUsd } from '../../lib/format'
import { ExpertProfile } from './ExpertProfile'

/** Expert cards + expandable full profiles. The TEASER dataset carries no names —
 *  locked cards show real dollar amounts over a blurred name bar. An unlock (single
 *  $500 or the all-profiles module purchase) always reveals the FULL profile: tap an
 *  unlocked card to expand it (accordion, one open at a time). */
export function Experts({
  slug,
  teaserCards,
  payloadCards,
  moduleUnlocked,
  isCardUnlocked,
  singlePrice,
  onUnlockCard,
}: {
  slug: string
  teaserCards: ExpertCard[]
  payloadCards: ExpertCard[]
  moduleUnlocked: boolean
  isCardUnlocked: (id: string) => boolean
  singlePrice: number
  onUnlockCard: (card: ExpertCard) => void
}) {
  const byId = new Map(payloadCards.map((c) => [c.id, c]))
  const [openId, setOpenId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Record<string, ExpertProfileData> | null>(null)
  const [profErr, setProfErr] = useState(false)

  const anyOpenable = moduleUnlocked || teaserCards.some((t) => isCardUnlocked(t.id))
  useEffect(() => {
    if (!anyOpenable || profiles || profErr) return
    loadExpertsDetail(slug)
      .then(setProfiles)
      .catch(() => setProfErr(true))
  }, [anyOpenable, profiles, profErr, slug])

  const openProfile = openId ? profiles?.[openId] : undefined

  return (
    <div>
      <div className="expertGrid">
        {teaserCards.map((t) => {
          const open = moduleUnlocked || isCardUnlocked(t.id)
          const full = open ? byId.get(t.id) : undefined
          const expanded = openId === t.id
          return (
            <div
              key={t.id}
              className="expertCard"
              data-openable={open}
              data-expanded={expanded}
              onClick={() => open && setOpenId(expanded ? null : t.id)}
              role={open ? 'button' : undefined}
            >
              {full ? (
                <span className="expertName">{full.name}</span>
              ) : (
                <span className="expertNameLocked" aria-label="Name locked" />
              )}
              <span className="expertMeta">
                {t.specialty ?? 'Specialty n/a'}
                {t.state ? ` · ${t.state}` : ''}
              </span>
              <span className="expertTotal">{fmtUsd(t.total)}</span>
              <span className="expertMeta">
                {fmtNum(t.payments)} payments · {t.years}
                {t.topNature ? ` · mostly ${t.topNature.toLowerCase()}` : ''}
              </span>
              {open ? (
                <span className="expertExpandHint">
                  {expanded ? 'Close profile ▴' : 'Full profile ▾'}
                </span>
              ) : (
                <div className="expertFoot">
                  <button
                    className="miniUnlock"
                    onClick={(e) => {
                      e.stopPropagation()
                      onUnlockCard(t)
                    }}
                  >
                    Unlock full profile — {fmtUsd(singlePrice)}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {openId && (
        <div className="expertProfileWrap">
          {openProfile ? (
            <ExpertProfile p={openProfile} />
          ) : profErr ? (
            <div className="epEmpty">Profile data unavailable right now.</div>
          ) : (
            <div className="epEmpty">Loading profile…</div>
          )}
        </div>
      )}
    </div>
  )
}
