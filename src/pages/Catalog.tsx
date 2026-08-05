import { useEffect, useMemo, useState } from 'react'
import { ConfirmModal, type PurchaseIntent } from '../components/ConfirmModal'
import type { CatalogDevice, Pricing } from '../lib/data'
import { fmtNum, fmtUsd } from '../lib/format'
import { usePurchases } from '../lib/purchases'

type PathwayKey = 'open' | 'mixed' | 'pma'

// classify on the label prefix only — the researched pathway strings mention
// "510k"/"mixed" in explanatory prose ("pma (pure — no 510k predicates)")
function pathwayKeyOf(pathway: string): PathwayKey | null {
  const p = pathway.toLowerCase()
  if (p.startsWith('510') || p.startsWith('de novo')) return 'open'
  if (p.startsWith('mixed')) return 'mixed'
  if (p.startsWith('pma')) return 'pma'
  return null
}

const PATHWAY_LABEL: Record<PathwayKey, string> = {
  open: '510(k) / De Novo',
  mixed: 'Mixed',
  pma: 'PMA',
}

function pathwayChip(pathway: string) {
  switch (pathwayKeyOf(pathway)) {
    case 'open':
      return <span className="chip chipOpen">510(k) / De Novo — claims open</span>
    case 'mixed':
      return <span className="chip chipAmber">Mixed pathway</span>
    case 'pma':
      return <span className="chip chipGated">PMA — preemption-gated</span>
    default:
      return <span className="chip">{pathway}</span>
  }
}

// clinical category rides the maker string's "Maker · Category" suffix
function categoryOf(maker: string): string | null {
  const i = maker.indexOf('·')
  return i >= 0 ? maker.slice(i + 1).trim() : null
}

const MATURITY_ORDER = ['early', 'maturing', 'settled', 'dormant']

function urlParam(key: string): string {
  return new URLSearchParams(window.location.search).get(key) ?? ''
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

  const [q, setQ] = useState(() => urlParam('q'))
  const [pathway, setPathway] = useState<PathwayKey | null>(() => {
    const v = urlParam('pathway')
    return v === 'open' || v === 'mixed' || v === 'pma' ? v : null
  })
  const [maturity, setMaturity] = useState<string | null>(() => urlParam('maturity') || null)
  const [cat, setCat] = useState<string | null>(() => urlParam('cat') || null)

  // keep filter state in the query string (replaceState — no history spam) so it
  // survives opening a dossier and coming back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const entries: [string, string | null][] = [
      ['q', q.trim() || null],
      ['pathway', pathway],
      ['maturity', maturity],
      ['cat', cat],
    ]
    for (const [k, v] of entries) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    const qs = params.toString()
    window.history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname)
  }, [q, pathway, maturity, cat])

  const maturities = useMemo(() => {
    const rank = (m: string) => {
      const i = MATURITY_ORDER.indexOf(m)
      return i === -1 ? 99 : i
    }
    return [...new Set(devices.map((d) => d.maturity))].sort(
      (a, b) => rank(a) - rank(b) || a.localeCompare(b),
    )
  }, [devices])
  const cats = useMemo(
    () =>
      [...new Set(devices.map((d) => categoryOf(d.maker)).filter((c): c is string => !!c))].sort(),
    [devices],
  )
  const pathways = useMemo(
    () =>
      (['open', 'mixed', 'pma'] as PathwayKey[]).filter((k) =>
        devices.some((d) => pathwayKeyOf(d.pathway) === k),
      ),
    [devices],
  )

  const matches = (d: CatalogDevice, skip?: 'pathway' | 'maturity' | 'cat') => {
    const needle = q.trim().toLowerCase()
    if (needle && !`${d.name} ${d.maker}`.toLowerCase().includes(needle)) return false
    if (skip !== 'pathway' && pathway && pathwayKeyOf(d.pathway) !== pathway) return false
    if (skip !== 'maturity' && maturity && d.maturity !== maturity) return false
    if (skip !== 'cat' && cat && categoryOf(d.maker) !== cat) return false
    return true
  }
  const shown = devices.filter((d) => matches(d))
  const anyActive = !!(q.trim() || pathway || maturity || cat)
  const clearAll = () => {
    setQ('')
    setPathway(null)
    setMaturity(null)
    setCat(null)
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="heroKicker">Dossier storefront</div>
        <h1 className="heroTitle">
          The public record on {devices.length} devices — compiled, cited, verifiable.
        </h1>
        <p className="heroBlurb">
          Adverse-event narratives untangled, recall history, 510(k) lineage with cited
          quotes, physician payment profiles, and procedure geography — compiled from FDA,
          CMS, and USPTO records, priced by the claim we stand behind.
        </p>
      </section>

      <aside className="heroDisclaimer">
        <div className="heroDisclaimerTitle">Read this first</div>
        <ul>
          <li>
            These dossiers map public signals — FDA, CMS, USPTO, and registry records. They
            do not establish causation, defect, or what any manufacturer knew; that comes
            from discovery.
          </li>
          <li>
            MAUDE figures are counts of self-reported adverse-event reports, not
            adjudicated device failures.
          </li>
          <li>
            Physician payments are lawful, publicly disclosed CMS Open Payments facts;
            co-occurrence with authorship is a starting point for inquiry, not a claim of
            influence.
          </li>
          <li>
            Name-based matches are graded corroborated vs. name-only and labeled; known
            gaps are stated on each module, not papered over.
          </li>
        </ul>
      </aside>

      <div className="everythingBanner">
        <div>
          <div className="everythingTitle">
            Everything — the full {devices.length}-device library
          </div>
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

      <div className="filterBar">
        <input
          className="searchInput"
          type="search"
          placeholder="Search devices or makers…"
          aria-label="Search devices"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="filterGroup" aria-label="Filter by pathway">
          {pathways.map((k) => {
            const n = devices.filter((d) => matches(d, 'pathway') && pathwayKeyOf(d.pathway) === k).length
            return (
              <button
                key={k}
                className="filterChip"
                data-active={pathway === k || undefined}
                data-empty={n === 0 || undefined}
                onClick={() => setPathway(pathway === k ? null : k)}
              >
                {PATHWAY_LABEL[k]} <span className="chipCount">{n}</span>
              </button>
            )
          })}
        </div>
        <div className="filterGroup" aria-label="Filter by litigation maturity">
          {maturities.map((m) => {
            const n = devices.filter((d) => matches(d, 'maturity') && d.maturity === m).length
            return (
              <button
                key={m}
                className="filterChip"
                data-active={maturity === m || undefined}
                data-empty={n === 0 || undefined}
                onClick={() => setMaturity(maturity === m ? null : m)}
              >
                {m} <span className="chipCount">{n}</span>
              </button>
            )
          })}
        </div>
        <div className="filterGroup" aria-label="Filter by clinical category">
          {cats.map((c) => {
            const n = devices.filter((d) => matches(d, 'cat') && categoryOf(d.maker) === c).length
            return (
              <button
                key={c}
                className="filterChip"
                data-active={cat === c || undefined}
                data-empty={n === 0 || undefined}
                onClick={() => setCat(cat === c ? null : c)}
              >
                {c} <span className="chipCount">{n}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="filterMeta">
        <span>
          {shown.length} of {devices.length} devices
        </span>
        {anyActive && (
          <button className="clearFilters" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="emptyState">
          No devices match —{' '}
          <button className="clearFilters" onClick={clearAll}>
            clear filters
          </button>
        </div>
      ) : (
      <div className="grid">
        {shown.map((d) => {
          const owned = ownsDossier(d.slug)
          return (
            <div key={d.slug} className="card" onClick={() => onOpen(d.slug)}>
              <div className="cardHead">
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
      )}

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
