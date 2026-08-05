import { useEffect, useMemo, useState } from 'react'
import { ConfirmModal, type PurchaseIntent } from '../components/ConfirmModal'
import { ModuleCard } from '../components/ModuleCard'
import { SummaryTable } from '../components/SummaryTable'
import { Timeline } from '../components/Timeline'
import { Corporate } from '../components/modules/Corporate'
import { Experts } from '../components/modules/Experts'
import { IcpMap } from '../components/modules/IcpMap'
import { Ip } from '../components/modules/Ip'
import { Narratives, NarrativesGhost } from '../components/modules/Narratives'
import { TrialAes } from '../components/modules/TrialAes'
import { GlobalActions, GlobalActionsGhost } from '../components/modules/GlobalActions'
import { PredicateTree, TreeGhost } from '../components/modules/PredicateTree'
import { loadDevice, type DeviceDossier, type Pricing } from '../lib/data'
import { fmtNum, fmtUsd, fmtUsdCompact } from '../lib/format'
import { usePurchases } from '../lib/purchases'

const MODULE_ORDER = ['narratives', 'trial-aes', 'global-actions', 'predicate-tree', 'experts', 'icp-map', 'corporate', 'ip'] as const

function priceOf(pricing: Pricing, id: string): number {
  return pricing.items.find((i) => i.id === id)?.price ?? 0
}

export function Dossier({
  slug,
  pricing,
  onBack,
}: {
  slug: string
  pricing: Pricing
  onBack: () => void
}) {
  const [device, setDevice] = useState<DeviceDossier | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [intent, setIntent] = useState<PurchaseIntent | null>(null)
  const { has, ownsDossier, unlock, owned } = usePurchases()

  useEffect(() => {
    setDevice(null)
    loadDevice(slug)
      .then(setDevice)
      .catch((e) => setError(String(e)))
  }, [slug])

  const unlockedKeys = useMemo(() => {
    const s = new Set<string>()
    for (const m of MODULE_ORDER) if (device && has(device.slug, m)) s.add(m)
    return s
  }, [device, has, owned])

  if (error) return <div className="loading">Failed to load dossier: {error}</div>
  if (!device) return <div className="loading">Loading dossier…</div>

  const m = device.modules
  const dossierOwned = ownsDossier(device.slug)
  const scrollToModule = (moduleId: string) =>
    document.getElementById(`mod-${moduleId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const buy = (label: string, price: number, keys: string[], note?: string, suffix?: string) =>
    setIntent({ label, price, keys, note, suffix })

  const moduleBuy = (moduleId: string, label: string) =>
    buy(`${device.name} — ${label}`, priceOf(pricing, moduleId), [`${device.slug}:${moduleId}`])

  const expTeaser = m.experts.teaser
  const treeApplies = !m['predicate-tree'].notApplicable
  const icpApplies = !m['icp-map'].notApplicable

  return (
    <main className="page">
      <div className="crumb" onClick={onBack}>
        ← All devices
      </div>
      <div className="dossierHead">
        <div>
          <h1 className="dossierTitle">{device.name}</h1>
          <div className="dossierMaker">
            {device.maker} · {device.maturity} litigation
          </div>
        </div>
        <div className="dossierBuy">
          {dossierOwned ? (
            <span className="ownedTag">Dossier licensed ✓</span>
          ) : (
            <button
              className="buyBtn"
              onClick={() =>
                buy(
                  `${device.name} — CORE dossier`,
                  device.dossierPrice,
                  [`dossier:${device.slug}`],
                  pricing.dossierNote,
                )
              }
            >
              Buy CORE dossier — {fmtUsd(device.dossierPrice)}
            </button>
          )}
          <span className="chip">{device.pathway}</span>
        </div>
      </div>

      <div className="statBand">
        <div className="bandCell">
          <div className="bandValue danger">{fmtNum(device.stats.deaths)}</div>
          <div className="bandLabel">Death reports</div>
        </div>
        <div className="bandCell">
          <div className="bandValue">{fmtNum(device.stats.injuries)}</div>
          <div className="bandLabel">Injury reports</div>
        </div>
        <div className="bandCell">
          <div className="bandValue">{fmtNum(device.stats.malfunctions)}</div>
          <div className="bandLabel">Malfunctions</div>
        </div>
        <div className="bandCell">
          <div className="bandValue amber">{fmtNum(device.stats.recalls)}</div>
          <div className="bandLabel">Recalls</div>
        </div>
        <div className="bandCell">
          <div className="bandValue amber">{fmtNum(device.stats.classI)}</div>
          <div className="bandLabel">Class I recalls</div>
        </div>
      </div>

      <div className="sectionTitle">Timeline — accrues data as modules unlock</div>
      <Timeline
        series={device.timeline}
        unlockedKeys={unlockedKeys}
        onLockedClick={scrollToModule}
      />

      <div className="sectionTitle">Summary</div>
      <SummaryTable
        rows={device.summary}
        unlockedKeys={unlockedKeys}
        onLockedClick={scrollToModule}
      />

      <div className="sectionTitle">Recent recalls (included)</div>
      <div className="panel">
        {device.recentRecalls.map((r, i) => (
          <div key={i} className="recallRow">
            <span className="recallDate">{String(r.date).slice(0, 10)}</span>
            <span className="recallClass" data-c={r.classification}>
              {r.classification}
            </span>
            <span className="recallReason">{r.reason}</span>
          </div>
        ))}
      </div>

      <div className="alertsStrip">
        <span className="alertsBadge">Recall alerting</span>
        <span>
          Standing alerts when FDA posts a new recall on this device family — included
          with a Demand Map subscription, not sold per-device.
        </span>
      </div>

      <div className="sectionTitle">Modules</div>
      <div className="moduleGrid">
        <ModuleCard
          anchorId="mod-narratives"
          title="Untangled adverse-event narratives"          teaserStats={
            m.narratives.teaser
              ? `${fmtNum(m.narratives.teaser.narratives)} narratives · ${fmtNum(
                  m.narratives.teaser.distinctProblemCodes,
                )} problem codes · ${m.narratives.teaser.clusters} failure modes`
              : undefined
          }
          locked={!has(device.slug, 'narratives')}
          price={priceOf(pricing, 'narratives')}
          onUnlock={() => moduleBuy('narratives', 'adverse-event narratives')}
          source={m.narratives.source}
          blurPreview={<NarrativesGhost />}
        >
          {m.narratives.payload && <Narratives clusters={m.narratives.payload.clusters} />}
        </ModuleCard>

        {m['trial-aes'] && (
          <ModuleCard
            anchorId="mod-trial-aes"
            title="Sponsor trial adverse events (registry)"            teaserStats={
              m['trial-aes'].teaser
                ? `${fmtNum(m['trial-aes'].teaser.trialsMatched)} trials · ${fmtNum(m['trial-aes'].teaser.seriousEventRows)} serious-event rows · ${fmtNum(m['trial-aes'].teaser.deathTermSubjects)} death-term subjects (${m['trial-aes'].teaser.scope}-scope)`
                : undefined
            }
            locked={!has(device.slug, 'trial-aes')}
            price={priceOf(pricing, 'trial-aes')}
            onUnlock={() => moduleBuy('trial-aes', 'sponsor trial adverse events')}
            notApplicable={m['trial-aes'].notApplicable}
            reason={m['trial-aes'].reason}
            caveat={m['trial-aes'].caveat}
            source={m['trial-aes'].source}
            blurPreview={
              <div className="kvGrid">
                {['Trials', 'Serious rows', 'Subjects', 'Death terms'].map((s) => (
                  <div key={s} className="kv">
                    <div className="kvLabel">{s}</div>
                    <div className="kvValue">•••</div>
                  </div>
                ))}
              </div>
            }
          >
            {m['trial-aes'].payload && <TrialAes payload={m['trial-aes'].payload} />}
          </ModuleCard>
        )}

        {m['global-actions'] && (
          <ModuleCard
            anchorId="mod-global-actions"
            title="Global regulatory footprint"            teaserStats={
              m['global-actions'].teaser
                ? `${fmtNum(m['global-actions'].teaser.actions)} foreign actions · ${
                    m['global-actions'].teaser.countries
                  } countries · ${m['global-actions'].teaser.sources} regulators` +
                  (m['global-actions'].teaser.latestAction
                    ? ` · latest: ${m['global-actions'].teaser.latestAction.country} ${m['global-actions'].teaser.latestAction.date}`
                    : '')
                : undefined
            }
            locked={!has(device.slug, 'global-actions')}
            price={priceOf(pricing, 'global-actions')}
            onUnlock={() => moduleBuy('global-actions', 'global regulatory footprint')}
            notApplicable={m['global-actions'].notApplicable}
            reason={m['global-actions'].reason}
            caveat={m['global-actions'].caveat}
            source={m['global-actions'].source}
            blurPreview={<GlobalActionsGhost />}
          >
            {m['global-actions'].payload && (
              <GlobalActions payload={m['global-actions'].payload} />
            )}
          </ModuleCard>
        )}

        <ModuleCard
          anchorId="mod-predicate-tree"
          title="510(k) predicate lineage"          teaserStats={
            treeApplies && m['predicate-tree'].teaser
              ? `${m['predicate-tree'].teaser.devices} devices · ${m['predicate-tree'].teaser.citations} cited claims · ${m['predicate-tree'].teaser.generationsUp} generations back · ${m['predicate-tree'].teaser.generationsDown} forward`
              : undefined
          }
          locked={!has(device.slug, 'predicate-tree')}
          price={priceOf(pricing, 'predicate-tree')}
          onUnlock={() => moduleBuy('predicate-tree', '510(k) predicate lineage')}
          notApplicable={m['predicate-tree'].notApplicable}
          reason={m['predicate-tree'].reason}
          source={m['predicate-tree'].source}
          blurPreview={<TreeGhost />}
        >
          {m['predicate-tree'].payload && (
            <PredicateTree
              nodes={m['predicate-tree'].payload.nodes}
              edges={m['predicate-tree'].payload.edges}
              accessories={m['predicate-tree'].payload.accessories}
              note={m['predicate-tree'].payload.note}
            />
          )}
        </ModuleCard>

        <ModuleCard
          anchorId="mod-experts"
          title="Paid expert profiles"          teaserStats={
            expTeaser
              ? `${fmtNum(expTeaser.physicians)} physicians · ${fmtUsdCompact(expTeaser.totalPaid)} total (${expTeaser.scope}-scope)`
              : undefined
          }
          locked={false /* the card grid itself handles per-card locking */}
          hideStatus={!has(device.slug, 'experts')}
          price={priceOf(pricing, 'experts')}
          caveat={m.experts.caveat}
          source={m.experts.source}
        >
          {expTeaser && m.experts.payload && (
            <>
              {!has(device.slug, 'experts') && (
                <div style={{ marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button
                    className="unlockBtn"
                    onClick={() => moduleBuy('experts', 'all expert profiles')}
                  >
                    Unlock all remaining profiles — {fmtUsd(priceOf(pricing, 'experts'))}
                  </button>
                  <span className="moduleTeaserStats">
                    or unlock any single full profile below at{' '}
                    {fmtUsd(priceOf(pricing, 'expert-single'))}
                  </span>
                </div>
              )}
              <Experts
                slug={device.slug}
                teaserCards={expTeaser.cards}
                payloadCards={m.experts.payload.cards}
                moduleUnlocked={has(device.slug, 'experts')}
                isCardUnlocked={(id) => has(device.slug, 'experts', id)}
                singlePrice={priceOf(pricing, 'expert-single')}
                onUnlockCard={(card) =>
                  buy(
                    `${device.name} — single expert full profile (${fmtUsd(card.total)} recipient)`,
                    priceOf(pricing, 'expert-single'),
                    [`${device.slug}:experts:${card.id}`],
                    'Unlocks the complete profile: payments deep-dive incl. research and ownership interests, authored literature, Medicare practice profile, and litigation/PTAB mentions — every section showing its source.',
                  )
                }
              />
            </>
          )}
        </ModuleCard>

        <ModuleCard
          anchorId="mod-icp-map"
          title="Demand Map — targeting intelligence"          teaserStats={
            icpApplies && m['icp-map'].teaser
              ? (m['icp-map'].teaser.facilities
                  ? `${m['icp-map'].teaser.facilities} named facilities · ${m['icp-map'].teaser.counties} counties · ${m['icp-map'].teaser.states} states · CMS ${m['icp-map'].teaser.dataYear} · refreshed monthly`
                  : `${m['icp-map'].teaser.states} states · ${m['icp-map'].teaser.procedureCodes} procedure codes · CMS ${m['icp-map'].teaser.dataYear} · refreshed monthly`)
              : undefined
          }
          locked={!has(device.slug, 'icp-map')}
          price={priceOf(pricing, 'icp-map')}
          priceSuffix="/mo"
          unlockVerb="Subscribe"
          onUnlock={() =>
            buy(
              `${device.name} — Demand Map subscription (single device family)`,
              priceOf(pricing, 'icp-map'),
              [`${device.slug}:icp-map`],
              `${fmtUsd(priceOf(pricing, 'icp-map'))}/month, refreshed monthly. ` +
                pricing.demandMap.tiers
                  .slice(1)
                  .map((t) => `${t.label}: ${fmtUsd(t.monthly)}/mo`)
                  .join(' · ') +
                '. Recurring — never bundled into a one-time license.',
              '/mo',
            )
          }
          notApplicable={m['icp-map'].notApplicable}
          reason={m['icp-map'].reason}
          caveat={m['icp-map'].caveat}
          source={m['icp-map'].source}
          blurPreview={
            <div className="kvGrid">
              {['CA', 'TX', 'FL', 'NY'].map((s) => (
                <div key={s} className="kv">
                  <div className="kvLabel">{s}</div>
                  <div className="kvValue">••,••• services</div>
                </div>
              ))}
            </div>
          }
        >
          {m['icp-map'].payload && <IcpMap payload={m['icp-map'].payload} />}
        </ModuleCard>

        <ModuleCard
          anchorId="mod-corporate"
          title="Corporate family & enforcement"
          teaserStats="Bundled — unlocks with any purchase on this device"
          locked={!has(device.slug, 'corporate')}
          onUnlock={() =>
            buy(
              `${device.name} — CORE dossier`,
              device.dossierPrice,
              [`dossier:${device.slug}`],
              'The corporate panel is bundled — it unlocks with any purchase on this device.',
            )
          }
          source={m.corporate.source}
          blurPreview={
            <div className="kvGrid">
              {['Parent company', 'FDA inspections', 'Federal PL cases', 'MDL status'].map((l) => (
                <div key={l} className="kv">
                  <div className="kvLabel">{l}</div>
                  <div className="kvValue">•••••</div>
                </div>
              ))}
            </div>
          }
        >
          {m.corporate.payload && <Corporate payload={m.corporate.payload} />}
        </ModuleCard>

        <ModuleCard
          anchorId="mod-ip"
          title="USPTO filings"          teaserStats={
            m.ip.teaser ? `${fmtNum(m.ip.teaser.patents)} granted patents (assignee match)` : undefined
          }
          locked={!has(device.slug, 'ip')}
          price={priceOf(pricing, 'ip')}
          onUnlock={() => moduleBuy('ip', 'USPTO filings portfolio')}
          notApplicable={m.ip.notApplicable}
          reason={m.ip.reason}
          source={m.ip.source}
          blurPreview={
            <div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="patentRow">
                  <span className="patentId">US••••••••</span>
                  <span>Patent title related to this device family</span>
                  <span className="patentYear">20••</span>
                </div>
              ))}
            </div>
          }
        >
          {m.ip.payload && <Ip payload={m.ip.payload} />}
        </ModuleCard>
      </div>

      <div className="sourceLine" style={{ marginTop: 20 }}>
        Compiled from: {device.sources.join(' · ')}
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
