import { useState } from 'react'
import { ConfirmModal, type PurchaseIntent } from '../components/ConfirmModal'
import type { CatalogDevice, Pricing } from '../lib/data'
import { fmtNum, fmtUsd } from '../lib/format'
import { usePurchases } from '../lib/purchases'

function pathwayChip(pathway: string) {
  // classify on the label prefix only — the researched pathway strings mention
  // "510k"/"mixed" in explanatory prose ("pma (pure — no 510k predicates)")
  const p = pathway.toLowerCase()
  if (p.startsWith('510') || p.startsWith('de novo'))
    return <span className="chip chipOpen">510(k) / De Novo — claims open</span>
  if (p.startsWith('mixed')) return <span className="chip chipAmber">Mixed pathway</span>
  if (p.startsWith('pma')) return <span className="chip chipGated">PMA — preemption-gated</span>
  return <span className="chip">{pathway}</span>
}

export function Catalog({
  devices,
  pricing,
  onOpen,
}: {
  devices: CatalogDevice[]
  pricing: Pricing
  onOpen: (slug: string) => void
}) {
  const { ownsDossier, ownsEverything, unlock } = usePurchases()
  const [intent, setIntent] = useState<PurchaseIntent | null>(null)

  return (
    <main className="page">
      <section className="hero">
        <div className="heroKicker">Dossier storefront</div>
        <h1 className="heroTitle">Ten devices. Every public record, already read.</h1>
        <p className="heroBlurb">
          Adverse-event narratives untangled, recall history, 510(k) lineage with cited
          quotes, physician payment profiles, and procedure geography — compiled from FDA,
          CMS, and USPTO records, priced by the claim we stand behind.
        </p>
      </section>

      <div className="everythingBanner">
        <div>
          <div className="everythingTitle">Everything — the full ten-device library</div>
          <div className="everythingNote">{pricing.everything.note}</div>
        </div>
        <div className="everythingPrice">
          <div className="strikeSum">{fmtUsd(pricing.everything.listSum)} itemized</div>
          <div className="bigPrice">{fmtUsd(pricing.everything.price)}</div>
        </div>
        {ownsEverything ? (
          <span className="ownedTag">Licensed ✓</span>
        ) : (
          <button
            className="buyBtn gold"
            onClick={() =>
              setIntent({
                label: 'Everything — all dossiers, all modules',
                price: pricing.everything.price,
                keys: ['everything'],
                note: pricing.everything.note,
              })
            }
          >
            License everything
          </button>
        )}
      </div>

      <div className="grid">
        {devices.map((d) => {
          const owned = ownsDossier(d.slug)
          return (
            <div key={d.slug} className="card" onClick={() => onOpen(d.slug)}>
              <div className="cardHead">
                <span className="rankChip">#{d.rank}</span>
                <span className="cardName">{d.name}</span>
              </div>
              <div className="cardMaker">{d.maker}</div>
              <div className="chipRow">
                {pathwayChip(d.pathway)}
                <span className="chip">{d.maturity} litigation</span>
                {d.hasTree && <span className="chip chipAmber">predicate tree</span>}
              </div>
              <div className="statRow">
                <div className="stat">
                  <span className="statValue danger">{fmtNum(d.stats.deaths)}</span>
                  <span className="statLabel">Deaths</span>
                </div>
                <div className="stat">
                  <span className="statValue">{fmtNum(d.stats.injuries)}</span>
                  <span className="statLabel">Injuries</span>
                </div>
                <div className="stat">
                  <span className="statValue">{fmtNum(d.stats.recalls)}</span>
                  <span className="statLabel">Recalls</span>
                </div>
                <div className="stat">
                  <span className="statValue">{fmtNum(d.stats.classI)}</span>
                  <span className="statLabel">Class I</span>
                </div>
              </div>
              <div className="cardFoot">
                {owned ? (
                  <span className="cardOwned">Dossier licensed ✓</span>
                ) : (
                  <span className="cardPrice">Dossier {fmtUsd(d.dossierPrice)}</span>
                )}
                <span className="cardCta">Open →</span>
              </div>
            </div>
          )
        })}
      </div>

      {intent && (
        <ConfirmModal
          intent={intent}
          onCancel={() => setIntent(null)}
          onConfirm={() => {
            unlock(...intent.keys)
            setIntent(null)
          }}
        />
      )}
    </main>
  )
}
