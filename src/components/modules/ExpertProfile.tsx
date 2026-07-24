// The expanded per-physician profile — every layer local-corpus, every section carrying
// its "How we know" fine print (dataset + match keys + caveat), with two-tier name-match
// labeling (corroborated vs name-only) surfaced, never hidden.
import { Suspense, lazy, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import type { ExpertProfileData, LitCite, SourceObj } from '../../lib/data'
import { fmtNum, fmtUsd, fmtUsdCompact } from '../../lib/format'
import OpinionReader from './OpinionReader'

// pdf.js stays confined to the lazy evidence chunk (the Evidence.tsx precedent)
const PtabEvidence = lazy(() => import('./PtabEvidence'))

function HowWeKnow({ source }: { source?: SourceObj }) {
  if (!source) return null
  return (
    <details className="howKnow">
      <summary>How we know</summary>
      <div className="howKnowBody">
        <div>Dataset: {source.dataset}</div>
        {source.match && <div>Match: {source.match}</div>}
        {source.signals?.topicKeywords && (
          <div>Topic signals: {source.signals.topicKeywords.join(', ')}</div>
        )}
        {source.signals?.affiliationGeo && source.signals.affiliationGeo.length > 0 && (
          <div>Geo signals: {source.signals.affiliationGeo.join(', ')}</div>
        )}
        {source.caveat && <div className="howKnowCaveat">{source.caveat}</div>}
      </div>
    </details>
  )
}

function TierChip({ tier }: { tier: string }) {
  return (
    <span className="tierChip" data-tier={tier}>
      {tier === 'corroborated' ? 'corroborated' : 'name-only'}
    </span>
  )
}

const SIGNAL_LABELS: Record<string, string> = {
  'credential-adjacent': 'Dr./M.D. attached to name',
  'device-keyword': 'device-topic context',
  geo: 'geography match',
  'declaration-title': 'named declaration',
}

function Highlighted({ text, term }: { text: string; term?: string | null }) {
  if (!term) return <>{text}</>
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${esc})`, 'ig'))
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === term.toLowerCase() ? (
          <mark key={i} className="litMark">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  )
}

function citeTerms(ci: LitCite, expertName: string): string[] {
  const parts = expertName.trim().split(/\s+/)
  const lastFirst =
    parts.length >= 2 ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}` : null
  return [...new Set([ci.matchedForm, expertName, lastFirst].filter((x): x is string => !!x))]
}

function LitCiteCard({ ci, expertName }: { ci: LitCite; expertName: string }) {
  const [open, setOpen] = useState(false)
  const [evidence, setEvidence] = useState(false)
  const canRead = ci.source === 'courtlistener'
  const canView = ci.source === 'ptab' && !!ci.docId
  return (
    <div className="litCard" data-open={open}>
      <div
        className="litCardMain"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(!open)}
      >
        <div className="litCardHead">
          <span className="litCase">{ci.case ?? ci.ref}</span>
          <span className="litMeta">
            {ci.court && <span className="chip litCourt">{ci.court.toUpperCase()}</span>}
            {ci.date && <span className="litDate">{ci.date}</span>}
          </span>
        </div>
        <div className="chipRow litSignals">
          <span className="chip">{ci.source === 'ptab' ? 'PTAB' : 'CourtListener'}</span>
          {(ci.signals ?? []).map((s) => (
            <span key={s} className="chip chipSignal">
              {SIGNAL_LABELS[s] ?? s}
            </span>
          ))}
        </div>
        {ci.snippet && (
          <div className="litSnippet" data-clamped={!open}>
            “…
            <Highlighted text={ci.snippet} term={ci.matchedForm} />
            …”
          </div>
        )}
      </div>
      <div className="litCardFoot">
        {(canRead || canView) && (
          <button
            className="litEvidenceBtn"
            onClick={() => setEvidence(!evidence)}
          >
            {evidence ? 'hide evidence ▴' : canRead ? 'read in context ▾' : 'view filing ▾'}
          </button>
        )}
        {ci.url && (
          <a href={ci.url} target="_blank" rel="noreferrer" className="litOpenLink">
            {ci.source === 'ptab' ? 'USPTO ↗' : 'CourtListener ↗'}
          </a>
        )}
      </div>
      {evidence && canRead && (
        <OpinionReader
          opinionId={ci.ref}
          terms={citeTerms(ci, expertName)}
          publicUrl={ci.url ?? null}
        />
      )}
      {evidence && canView && (
        <Suspense fallback={<div className="evidenceNote">Loading viewer…</div>}>
          <PtabEvidence
            trial={ci.ref}
            doc={ci.docId!}
            terms={citeTerms(ci, expertName)}
            fallbackUrl={ci.url ?? null}
          />
        </Suspense>
      )}
    </div>
  )
}

function YearBars({ points }: { points: { year: number; value: number }[] }) {
  if (!points.length) return null
  const W = 420
  const H = 90
  const max = Math.max(...points.map((p) => p.value), 1)
  const y = scaleLinear().domain([0, max]).range([0, H - 24])
  const bw = Math.min(34, (W - 10) / points.length - 6)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="payBars">
      {points.map((p, i) => {
        const h = Math.max(2, y(p.value))
        const x = 6 + i * (bw + 6)
        return (
          <g key={p.year}>
            <rect x={x} y={H - 18 - h} width={bw} height={h} rx={2} className="payBar">
              <title>{`${p.year}: ${fmtUsd(p.value)}`}</title>
            </rect>
            <text x={x + bw / 2} y={H - 5} textAnchor="middle" className="payBarLabel">
              {String(p.year).slice(2)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function ExpertProfile({ p }: { p: ExpertProfileData }) {
  const id = p.identity
  const pay = p.payments
  const lit = p.litigation
  return (
    <div className="expertProfile">
      <div className="epSection">
        <div className="epHead">Identity</div>
        <div className="epIdentity">
          <span className="epName">{p.name}</span>
          {id.credential && <span className="chip">{id.credential}</span>}
          {id.specialty && <span className="chip">{id.specialty}</span>}
          <span className="chip">
            {[id.opCity, id.opState].filter(Boolean).join(', ') || 'location n/a'}
          </span>
          {id.npi ? <span className="chip">NPI {id.npi}</span> : (
            <span className="chip chipAmber">no NPI on payment records</span>
          )}
          {id.registryName && (
            <span className="epRegistry">NPPES registry: {id.registryName}</span>
          )}
        </div>
        <HowWeKnow source={id.source} />
      </div>

      <div className="epSection">
        <div className="epHead">Payments</div>
        <YearBars points={pay.yearly} />
        <div className="chipRow">
          {pay.byNature.slice(0, 4).map((n) => (
            <span key={n.nature ?? '?'} className="chip">
              {(n.nature ?? 'other').toLowerCase()} · {fmtUsdCompact(n.total)}
            </span>
          ))}
        </div>
        <div className="epCompanies">
          {pay.byCompany.map((co) => (
            <div key={co.company} className="epRow">
              <span>{co.company}</span>
              <span className="epRowVal">
                {fmtUsd(co.total)} · {fmtNum(co.records)} payments
              </span>
            </div>
          ))}
          {pay.research?.records ? (
            <div className="epRow">
              <span>Research payments (all companies)</span>
              <span className="epRowVal">
                {pay.research.total != null ? fmtUsd(pay.research.total) : '—'} ·{' '}
                {fmtNum(pay.research.records)} records
              </span>
            </div>
          ) : null}
          {pay.researchPi?.records ? (
            <div className="epRow">
              <span>Named principal investigator</span>
              <span className="epRowVal">{fmtNum(pay.researchPi.records)} research records</span>
            </div>
          ) : null}
          {pay.ownership?.records ? (
            <div className="epRow epRowHot">
              <span>Ownership / investment interests</span>
              <span className="epRowVal">
                {pay.ownership.total != null ? `${fmtUsd(pay.ownership.total)} invested · ` : ''}
                {fmtNum(pay.ownership.records)} records
              </span>
            </div>
          ) : null}
        </div>
        <HowWeKnow source={pay.source} />
      </div>

      <div className="epSection">
        <div className="epHead">
          Authored literature{' '}
          <span className="epHeadNote">
            {fmtNum(p.literature.counts.corroborated)} corroborated ·{' '}
            {fmtNum(p.literature.counts.nameOnly)} name-only matches
          </span>
        </div>
        {p.literature.articles.length === 0 && (
          <div className="epEmpty">No author-name matches in the local PubMed corpus.</div>
        )}
        {p.literature.articles.map((a) => (
          <div key={a.pmid} className="epRow">
            <span>
              {a.title} <span className="epMuted">— {a.journal || 'journal n/a'}, {a.year}</span>{' '}
              <TierChip tier={a.tier} />
            </span>
            <span className="epRowVal epMuted">PMID {a.pmid}</span>
          </div>
        ))}
        <HowWeKnow source={p.literature.source} />
      </div>

      <div className="epSection">
        <div className="epHead">
          Clinical practice{' '}
          {p.practice.dataYear && <span className="epHeadNote">Medicare {p.practice.dataYear}</span>}
        </div>
        {p.practice.procedures.length === 0 ? (
          <div className="epEmpty">
            {id.npi
              ? 'No Medicare billing under this NPI in the latest data year (not all physicians bill Medicare directly).'
              : 'No NPI on the payment records — Medicare utilization not linkable.'}
          </div>
        ) : (
          p.practice.procedures.map((pr) => (
            <div key={pr.code} className="epRow">
              <span>
                <span className="treeK">{pr.code}</span> {pr.description}
              </span>
              <span className="epRowVal">
                {fmtNum(pr.services)} services · {fmtNum(pr.beneficiaries)} patients
              </span>
            </div>
          ))
        )}
        <HowWeKnow source={p.practice.source} />
      </div>

      <div className="epSection">
        <div className="epHead">
          Litigation &amp; PTAB mentions{' '}
          {!lit.pending && (
            <span className="epHeadNote">
              {fmtNum((lit.cites ?? []).length)} corroborated shown
            </span>
          )}
        </div>
        {lit.pending ? (
          <div className="epEmpty">{lit.note}</div>
        ) : (
          <>
            {(lit.cites ?? []).length === 0 && (
              <div className="epEmpty">
                No corroborated mentions — every full-name hit in the swept subsets lacked a
                physician-specific signal (likely namesakes; listed below).
              </div>
            )}
            {(lit.cites ?? []).map((ci, i) => (
              <LitCiteCard key={i} ci={ci} expertName={p.name} />
            ))}
            {(lit.nameOnly ?? []).length > 0 && (
              <details className="litNameOnly">
                <summary>
                  {fmtNum(
                    Object.entries(lit.counts ?? {})
                      .filter(([k]) => k.endsWith(':name-only'))
                      .reduce((a, [, v]) => a + v, 0),
                  )}{' '}
                  name-only matches — likely people sharing the name, shown for completeness
                </summary>
                <div className="litNameOnlyNote">
                  Graded name-only because nothing physician-specific (credential, device
                  topic, geography) appeared near the name. Nothing is attributed from these.
                </div>
                {(lit.nameOnly ?? []).map((n, i) => (
                  <div key={i} className="epRow">
                    <span>
                      <span className="epMuted">[{n.source}]</span> {n.case ?? '(untitled)'}
                      {n.url && (
                        <>
                          {' '}
                          <a
                            href={n.url}
                            target="_blank"
                            rel="noreferrer"
                            className="litOpenLink"
                          >
                            open ↗
                          </a>
                        </>
                      )}
                    </span>
                    <span className="epRowVal epMuted">{n.date ?? ''}</span>
                  </div>
                ))}
              </details>
            )}
          </>
        )}
        <HowWeKnow source={lit.source} />
      </div>

      <div className="epSection">
        <div className="epHead">Data inventory</div>
        <div className="epInvGrid">
          <div>
            <div className="epInvTitle">On file (local corpus)</div>
            {p.inventory.onFile.map((it) => (
              <div key={it.label} className="epRow">
                <span>{it.label}</span>
                <span className="epRowVal epMuted">{it.detail}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="epInvTitle">On commission (external work)</div>
            {p.inventory.onCommission.map((it) => (
              <div key={it.label} className="epRow">
                <span>{it.label}</span>
                <span className="epRowVal">{it.price ? fmtUsd(it.price) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
