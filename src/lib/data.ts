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
    'icp-map': Module<
      { states: number; procedureCodes: number; dataYear: number; topStateServices: number },
      { dataYear: number; codes: { code: string; description: string; services: number }[]; states: IcpState[] }
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
