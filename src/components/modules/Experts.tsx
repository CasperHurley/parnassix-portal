import type { ExpertCard } from '../../lib/data'
import { fmtNum, fmtUsd } from '../../lib/format'

/** Expert cards. The TEASER dataset carries no names — locked cards show real dollar
 *  amounts over a blurred name bar, each individually purchasable; the bulk module
 *  unlock reveals the full payload. */
export function Experts({
  teaserCards,
  payloadCards,
  moduleUnlocked,
  isCardUnlocked,
  singlePrice,
  onUnlockCard,
}: {
  teaserCards: ExpertCard[]
  payloadCards: ExpertCard[]
  moduleUnlocked: boolean
  isCardUnlocked: (id: string) => boolean
  singlePrice: number
  onUnlockCard: (card: ExpertCard) => void
}) {
  const byId = new Map(payloadCards.map((c) => [c.id, c]))
  return (
    <div className="expertGrid">
      {teaserCards.map((t) => {
        const open = moduleUnlocked || isCardUnlocked(t.id)
        const full = open ? byId.get(t.id) : undefined
        return (
          <div key={t.id} className="expertCard">
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
            {!open && (
              <div className="expertFoot">
                <button className="miniUnlock" onClick={() => onUnlockCard(t)}>
                  Commission full profile — {fmtUsd(singlePrice)}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
