// Types mirror the generator contract (build_portal_data.py) exactly.

export interface DeviceStats {
  deaths: number
  injuries: number
  malfunctions: number
  recalls: number
  classI: number
}

export interface CatalogDevice {
  slug: string
  name: string
  maker: string
  rank: number
  pathway: string
  maturity: string
  stats: DeviceStats
  dossierPrice: number
  hasTree: boolean
  hasIcp: boolean
}

export interface SummaryRow {
  label: string
  value: string | number
  format?: 'number' | 'usd'
  module?: string
}

export interface SeriesPoint {
  year: number
  value: number
}

export interface TimelineSeries {
  key: string
  label: string
  unit: string
  module?: string
  points: SeriesPoint[]
}

export interface RecentRecall {
  date: string
  classification: string
  reason: string
  status: string
}

export interface NarrativeCluster {
  problem: string
  reports: number
  narrative: string | null
}

export interface TreeNode {
  k: string
  name: string
  anchor: boolean
}

export interface TreeEdge {
  from: string
  to: string
  kind: string
  confidence: string
  quote: string | null
  hop: number
  /** 1-indexed page of the citing summary PDF the quote was extracted from */
  page?: number | null
}

export interface ExpertCard {
  id: string
  name?: string
  specialty: string | null
  state: string | null
  total: number
  payments: number
  years: string
  topNature: string | null
}

export interface IcpState {
  state: string
  services: number
  beneficiaries: number
}

export interface IcpCounty {
  fips: string
  name: string
  state: string
  services: number
  facilities: number
  per10k65: number | null
}

export interface IcpFacility {
  ccn: string
  name: string
  city: string
  state: string
  countyFips: string | null
  lat: number | null
  lon: number | null
  discharges: number
  outpatientServices: number | null
  rating: string | null
  topDrgs: { code: string; desc: string; n: number }[]
}

export interface IcpTrialSite {
  name: string
  city: string | null
  state: string | null // full state name as registered (not an abbreviation)
  lat: number
  lon: number
  trials: number
}

export interface IcpPayload {
  dataYear: number
  codes: { code: string; description: string; services: number }[]
  states: IcpState[]
  // county/facility grain ships only for hospital-billed families (absent for DME
  // devices and pre-v2 snapshots — all optional by design)
  counties?: IcpCounty[]
  facilities?: IcpFacility[]
  hospitalYears?: { inpatient: number; outpatient: number | null }
  paidPhysicians?: { byState: { state: string; physicians: number; totalUsd: number }[]; scope: string }
  // registered-trial sites (AACT) — the manufacturer's own trial geography
  trialSites?: IcpTrialSite[]
  trialSiteTotals?: { sites: number; usSites: number; trials: number; scope: string }
}

// ---- expert profile sidecar (devices/<slug>-experts.json) ----

export interface SourceObj {
  dataset: string
  match?: string
  caveat?: string
  signals?: {
    topicKeywords?: string[]
    affiliationGeo?: string[]
    deviceTrials?: string
    geo?: string
  }
}

export interface PayBucket {
  total: number | null
  records: number
}

export interface ExpertProfileData {
  name: string
  identity: {
    npi: string | null
    registryName?: string
    credential?: string | null
    taxonomyCode?: string | null
    licenseState?: string | null
    opState: string | null
    opCity: string | null
    specialty: string | null
    source: SourceObj
  }
  payments: {
    yearly: SeriesPoint[]
    byNature: { nature: string | null; total: number; records: number }[]
    byCompany: { company: string; total: number; records: number }[]
    research?: PayBucket | null
    researchPi?: PayBucket | null
    ownership?: PayBucket | null
    source: SourceObj
  }
  literature: {
    counts: { corroborated: number; nameOnly: number }
    articles: { title: string; journal: string; year: number; pmid: string; tier: string }[]
    source: SourceObj
  }
  practice: {
    dataYear: number | null
    procedures: { code: string; description: string; services: number; beneficiaries: number }[]
    source: SourceObj
  }
  litigation: {
    pending?: boolean
    note?: string
    counts?: Record<string, number>
    cites?: LitCite[]
    source?: SourceObj
  }
  aactTrials?: {
    counts: { corroborated: number; nameOnly: number }
    roles: AactRole[]
    source: SourceObj
  }
  inventory: {
    onFile: { label: string; detail: string }[]
    onCommission: { label: string; price?: number }[]
  }
}

export interface TrialAesPayload {
  scope: string
  trialsMatched: number
  trialsWithAeTables: number
  trialsWithSerious: number
  totals: {
    serious: { rows: number; subjects: number }
    other: { rows: number; subjects: number }
    deathTermSubjects: number
  }
  topSeriousTerms: { term: string; organSystem: string; rows: number; subjectsAffected: number }[]
  trials: {
    nctId: string
    title: string
    phase: string | null
    status: string | null
    startYear: string | null
    seriousRows: number
    seriousSubjects: number
  }[]
}

export interface AactRole {
  kind: string // 'site-investigator' | 'overall-official'
  nameAsWritten: string
  role: string
  nctId: string
  place: string | null
  tier: string // 'corroborated' | 'name-only'
  deviceTrial: boolean
  trialTitle?: string | null
}

export interface LitCite {
  source: string
  ref: string
  case: string | null
  date: string | null
  snippet: string | null
  matchedForm?: string | null
  signals?: string[]
  court?: string | null
  url?: string | null
  docId?: string | null
}

const expertsCache = new Map<string, Promise<Record<string, ExpertProfileData>>>()
export function loadExpertsDetail(slug: string): Promise<Record<string, ExpertProfileData>> {
  if (!expertsCache.has(slug)) {
    expertsCache.set(
      slug,
      fetchJson<{ profiles: Record<string, ExpertProfileData> }>(
        `/devices/${slug}-experts.json`,
      ).then((d) => d.profiles),
    )
  }
  return expertsCache.get(slug)!
}

// ---- global regulatory footprint module ----

export interface GlobalActionRow {
  date: string | null
  source: string
  actionType: string | null
  classification: string | null
  product: string
  reason: string | null
  url: string | null
}

export interface GlobalActionsCountry {
  code: string
  name: string
  total: number
  actions: GlobalActionRow[]
}

export interface GlobalActionsEuStatus {
  pending: boolean
  absent: boolean
  registrations: number
  onMarket: number
  noLongerOnMarket: number
  riskClasses: Record<string, number> | null
  manufacturers: string[] | null
  note: string | null
}

export interface GlobalActionsCallout {
  text: string
  foreign?: { country?: string; date: string; class?: string }
  us?: { date: string; class?: string }
}

export interface GlobalActionsTeaser {
  actions: number
  countries: number
  sources: number
  firstForeignDate: string | null
  latestAction: { country: string; date: string; classification: string | null } | null
  screenedOut: number
}

export interface GlobalActionsPayload {
  countries: GlobalActionsCountry[]
  series: SeriesPoint[]
  euStatus: GlobalActionsEuStatus | null
  callouts: GlobalActionsCallout[]
  screenedOut: number
  screenedNote: string
  sourceLabels: Record<string, string>
  attribution: string
}

export interface Module<T, U> {
  teaser?: T
  payload?: U
  notApplicable?: boolean
  reason?: string
  caveat?: string
  source?: string
}

export interface DeviceDossier {
  slug: string
  name: string
  maker: string
  rank: number
  pathway: string
  maturity: string
  stats: DeviceStats
  dossierPrice: number
  summary: SummaryRow[]
  recentRecalls: RecentRecall[]
  timeline: TimelineSeries[]
  modules: {
    narratives: Module<
      { narratives: number; distinctProblemCodes: number; clusters: number },
      { clusters: NarrativeCluster[] }
    >
    'predicate-tree': Module<
      { devices: number; citations: number; hops: number; anchors: string[] },
      { anchors: string[]; nodes: TreeNode[]; edges: TreeEdge[]; hopCap: number; hopCapNote: string }
    >
    experts: Module<
      { physicians: number; totalPaid: number; scope: string; cards: ExpertCard[] },
      { cards: ExpertCard[]; scope: string }
    >
    corporate: Module<
      never,
      {
        parent: string | null
        nParents: number | null
        inspections: number | null
        citations: number | null
        warningLetter: boolean
        litigation: {
          federalCases: number | null
          inMdl: number | null
          terminationRatio: number | null
          firstFiled: string | null
          lastFiled: string | null
        }
      }
    >
    ip: Module<
      { patents: number; assignees: string[] },
      { patents: number; recent: { id: string; title: string; year: number; assignee: string }[]; caveat: string }
    >
    'global-actions': Module<GlobalActionsTeaser, GlobalActionsPayload>
    'icp-map': Module<
      {
        states: number
        procedureCodes: number
        dataYear: number
        topStateServices: number
        counties?: number
        facilities?: number
        topFacilityCity?: string | null
      },
      IcpPayload
    >
    // optional: pre-AACT snapshots (and a stale live relay) may not carry it
    'trial-aes'?: Module<
      {
        trialsMatched: number
        trialsWithAeTables: number
        seriousEventRows: number
        seriousSubjectsAffected: number
        deathTermSubjects: number
        scope: string
      },
      TrialAesPayload
    >
  }
  sources: string[]
}

export interface PricingItem {
  id: string
  label: string
  price: number
  cls: string
  cadence?: 'monthly'
  basis: string
}

export interface TokenClass {
  cls: string
  name: string
  price: number
  scope: string
}

export interface Pricing {
  currency: string
  dossierBase: number
  dossierIncludes: string[]
  dossierNote: string
  items: PricingItem[]
  tokenClasses: TokenClass[]
  surcharge: { label: string; multiplier: number; note: string }
  demandMap: { tiers: { label: string; monthly: number }[]; note: string }
  everything: { price: number; listSum: number; note: string }
  retainer: { label: string; blurb: string }
  basis: string
}

// ---------------------------------------------------------------- live API bridge
// The deployed site prefers CURRENT data from the workspace machine (read-only FastAPI
// tunneled via Tailscale Funnel — the Edition B pattern); the baked /data snapshot is the
// fallback when the tunnel is down. site root /live-config.json carries the api base.

export type DataSource = 'live' | 'snapshot'
let dataSource: DataSource = 'snapshot'
const sourceListeners = new Set<(s: DataSource) => void>()

export function onDataSource(fn: (s: DataSource) => void): () => void {
  sourceListeners.add(fn)
  fn(dataSource)
  return () => sourceListeners.delete(fn)
}

function setSource(s: DataSource) {
  if (s !== dataSource) {
    dataSource = s
    sourceListeners.forEach((fn) => fn(s))
  }
}

let apiBasePromise: Promise<string | null> | null = null
function apiBase(): Promise<string | null> {
  if (!apiBasePromise) {
    apiBasePromise = fetch('/live-config.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: { apiBase?: string } | null) => {
        const base = cfg?.apiBase?.replace(/\/$/, '') ?? null
        return base && /^https?:\/\//.test(base) ? base : null
      })
      .catch(() => null)
  }
  return apiBasePromise
}

/** Base URL of the live bridge, or null when unconfigured — the evidence viewer needs it. */
export const getApiBase = (): Promise<string | null> => apiBase()

const LIVE_TIMEOUT_MS = 5000

async function fetchJson<T>(path: string): Promise<T> {
  const base = await apiBase()
  if (base) {
    try {
      const ctl = new AbortController()
      const timer = setTimeout(() => ctl.abort(), LIVE_TIMEOUT_MS)
      const res = await fetch(`${base}/portal${path}`, { signal: ctl.signal })
      clearTimeout(timer)
      if (res.ok) {
        const body = (await res.json()) as T & { error?: string }
        if (!body || (body as { error?: string }).error) throw new Error('live error payload')
        setSource('live')
        return body
      }
    } catch {
      // fall through to the baked snapshot
    }
  }
  setSource('snapshot')
  const res = await fetch(`/data${path}`)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return (await res.json()) as T
}

export const loadCatalog = () =>
  fetchJson<{ devices: CatalogDevice[] }>('/catalog.json').then((d) => d.devices)
export const loadPricing = () => fetchJson<Pricing>('/pricing.json')
export const loadDevice = (slug: string) =>
  fetchJson<DeviceDossier>(`/devices/${slug}.json`)
