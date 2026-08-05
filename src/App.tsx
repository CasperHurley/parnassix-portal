import { useEffect, useState } from 'react'
import { Catalog } from './pages/Catalog'
import { Dossier } from './pages/Dossier'
import {
  loadCatalog,
  loadPricing,
  onDataSource,
  type CatalogDevice,
  type DataSource,
  type Pricing,
} from './lib/data'
import { usePurchases } from './lib/purchases'

function readSlug(): string | null {
  return new URLSearchParams(window.location.search).get('d')
}

export function navigate(slug: string | null) {
  // preserve the catalog's filter params (?q=&pathway=…) across dossier open/close
  const params = new URLSearchParams(window.location.search)
  if (slug) params.set('d', slug)
  else params.delete('d')
  const qs = params.toString()
  window.history.pushState({}, '', qs ? `?${qs}` : window.location.pathname)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function App() {
  const [slug, setSlug] = useState<string | null>(readSlug())
  const [catalog, setCatalog] = useState<CatalogDevice[] | null>(null)
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<DataSource>('snapshot')
  const { owned, resetDemo } = usePurchases()

  useEffect(() => {
    const onPop = () => setSlug(readSlug())
    window.addEventListener('popstate', onPop)
    const offSource = onDataSource(setSource)
    return () => {
      window.removeEventListener('popstate', onPop)
      offSource()
    }
  }, [])

  useEffect(() => {
    Promise.all([loadCatalog(), loadPricing()])
      .then(([c, p]) => {
        setCatalog(c)
        setPricing(p)
      })
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <>
      <header className="topbar">
        <div className="brand" onClick={() => navigate(null)}>
          <span className="brandName">ANEURAL</span>
          <span className="brandSub">Device Litigation Intelligence</span>
        </div>
        <div className="topbarSpacer" />
        <span
          className="sourcePill"
          data-live={source === 'live'}
          title={
            source === 'live'
              ? 'Data served live from the Aneural corpus'
              : 'Live bridge unreachable — showing the bundled snapshot'
          }
        >
          {source === 'live' ? '● live data' : '○ snapshot'}
        </span>
        {owned.length > 0 && (
          <span className="ownedPill">
            {owned.includes('everything') ? 'Full license' : `${owned.length} purchase${owned.length > 1 ? 's' : ''}`}
          </span>
        )}
        <button className="resetBtn" onClick={resetDemo} title="Clear all mock purchases">
          Reset demo
        </button>
      </header>
      {error ? (
        <div className="loading">Failed to load portal data: {error}</div>
      ) : !catalog || !pricing ? (
        <div className="loading">Loading…</div>
      ) : slug ? (
        <Dossier slug={slug} pricing={pricing} onBack={() => navigate(null)} />
      ) : (
        <Catalog devices={catalog} pricing={pricing} onOpen={(s) => navigate(s)} />
      )}
      <footer className="footer">
        Aneural — data compiled from public FDA, CMS, and USPTO records. Purchases on this
        page are a demonstration mock; no payment is processed. Data is presented for
        investigation and is not legal advice.
      </footer>
    </>
  )
}
