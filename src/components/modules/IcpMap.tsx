// Demand Map: US choropleth of CMS procedure volumes. v2 adds a county layer with
// named-facility bubbles (hospital DRG/APC volumes) over a state basemap; DME families
// (no hospital-billed signal) fall back to the v1 state view. Topology from us-atlas
// (lazy-loaded so the catalog page never pays for it); no tiles, no network beyond the
// static imports. us-atlas 3.0.1 ships lon/lat geometry (NOT pre-projected), so we
// project through geoAlbersUsa at the canonical 975x610 frame; territories outside the
// projection drop out.
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { useEffect, useMemo, useState } from 'react'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { IcpFacility, IcpPayload } from '../../lib/data'
import { fmtNum, fmtUsd } from '../../lib/format'

interface StatesTopo {
  states: FeatureCollection<Geometry, { name: string }>
}

interface CountiesTopo {
  counties: FeatureCollection<Geometry, { name: string }>
  states: FeatureCollection<Geometry, { name: string }>
}

type TopoInput = Parameters<typeof import('topojson-client').feature>[0]
type TopoObject = Parameters<typeof import('topojson-client').feature>[1]

let statesCache: Promise<StatesTopo> | null = null
function loadStates(): Promise<StatesTopo> {
  if (!statesCache) {
    statesCache = Promise.all([import('topojson-client'), import('us-atlas/states-10m.json')]).then(
      ([tj, atlas]) => {
        const topo = ((atlas as { default?: unknown }).default ?? atlas) as TopoInput
        const objects = topo.objects as Record<string, TopoObject>
        const states = tj.feature(topo, objects.states) as unknown as FeatureCollection<
          Geometry,
          { name: string }
        >
        return { states }
      },
    )
  }
  return statesCache
}

let countiesCache: Promise<CountiesTopo> | null = null
function loadCounties(): Promise<CountiesTopo> {
  if (!countiesCache) {
    countiesCache = Promise.all([
      import('topojson-client'),
      import('us-atlas/counties-10m.json'),
    ]).then(([tj, atlas]) => {
      const topo = ((atlas as { default?: unknown }).default ?? atlas) as TopoInput
      const objects = topo.objects as Record<string, TopoObject>
      const counties = tj.feature(topo, objects.counties) as unknown as FeatureCollection<
        Geometry,
        { name: string }
      >
      const states = tj.feature(topo, objects.states) as unknown as FeatureCollection<
        Geometry,
        { name: string }
      >
      return { counties, states }
    })
  }
  return countiesCache
}

const facilityVolume = (f: IcpFacility) => f.discharges + (f.outpatientServices ?? 0)

export function IcpMap({ payload }: { payload: IcpPayload }) {
  const hasCounties = (payload.counties?.length ?? 0) > 0
  const [view, setView] = useState<'facilities' | 'states'>(hasCounties ? 'facilities' : 'states')
  const [statesTopo, setStatesTopo] = useState<StatesTopo | null>(null)
  const [countiesTopo, setCountiesTopo] = useState<CountiesTopo | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    if (view === 'states') void loadStates().then((t) => live && setStatesTopo(t))
    else void loadCounties().then((t) => live && setCountiesTopo(t))
    return () => {
      live = false
    }
  }, [view])

  const proj = useMemo(() => geoAlbersUsa().scale(1300).translate([487.5, 305]), [])
  const path = useMemo(() => geoPath(proj), [proj])

  const byName = useMemo(
    () => new Map(payload.states.map((s) => [s.state.toLowerCase(), s])),
    [payload.states],
  )
  const stateMax = Math.max(...payload.states.map((s) => s.services), 1)
  const stateOpacity = scaleLinear().domain([0, stateMax]).range([0.06, 0.95])

  const countyByFips = useMemo(
    () => new Map((payload.counties ?? []).map((c) => [c.fips, c])),
    [payload.counties],
  )
  const countyMax = Math.max(...(payload.counties ?? []).map((c) => c.services), 1)
  const countyOpacity = scaleLinear().domain([0, countyMax]).range([0.18, 0.95])

  const facilities = payload.facilities ?? []
  const facMax = Math.max(...facilities.map(facilityVolume), 1)
  const trialSites = payload.trialSites ?? []
  const [showTrials, setShowTrials] = useState(true)

  const renderCountyView = () => {
    if (!countiesTopo) return <div className="loading">Loading map…</div>
    const countyFeatures = countiesTopo.counties.features.filter((f) =>
      countyByFips.has(String(f.id)),
    )
    return (
      <svg viewBox="0 0 975 610" style={{ width: '100%', display: 'block' }}>
        {countiesTopo.states.features.map((f, i) => (
          <path
            key={`s${i}`}
            d={path(f) ?? undefined}
            fill="var(--accent)"
            fillOpacity={0.03}
            stroke="var(--border)"
            strokeWidth={0.6}
          />
        ))}
        {countyFeatures.map((f) => {
          const row = countyByFips.get(String(f.id))!
          return (
            <path
              key={String(f.id)}
              d={path(f) ?? undefined}
              fill="var(--accent)"
              fillOpacity={countyOpacity(row.services)}
              stroke="var(--border)"
              strokeWidth={0.4}
            >
              <title>
                {`${row.name} County, ${row.state} — ${fmtNum(row.services)} procedures · ${fmtNum(row.facilities)} ${row.facilities === 1 ? 'facility' : 'facilities'}${row.per10k65 != null ? ` · ${row.per10k65} per 10k seniors` : ''}`}
              </title>
            </path>
          )
        })}
        {renderTrialDots()}
        {facilities.map((f) => {
          if (f.lat == null || f.lon == null) return null
          const pt = proj([f.lon, f.lat])
          if (!pt) return null
          const r = 2.5 + Math.sqrt(facilityVolume(f) / facMax) * 12
          return (
            <circle
              key={f.ccn}
              className="facDot"
              cx={pt[0]}
              cy={pt[1]}
              r={r}
              onMouseEnter={() => setHover(f.ccn)}
              onMouseLeave={() => setHover(null)}
              style={hover === f.ccn ? { strokeWidth: 2 } : undefined}
            >
              <title>
                {`${f.name} — ${f.city}, ${f.state} · ${fmtNum(f.discharges)} discharges${f.outpatientServices != null ? ` · ${fmtNum(f.outpatientServices)} outpatient services` : ''}${f.rating ? ` · CMS ${f.rating}★` : ''}`}
              </title>
            </circle>
          )
        })}
      </svg>
    )
  }

  const renderTrialDots = () =>
    showTrials &&
    trialSites.map((s, i) => {
      const pt = proj([s.lon, s.lat])
      if (!pt) return null
      return (
        <circle key={`t${i}`} className="trialDot" cx={pt[0]} cy={pt[1]} r={3.2}>
          <title>
            {`${s.name} — ${[s.city, s.state].filter(Boolean).join(', ')} · site on ${fmtNum(s.trials)} registered ${s.trials === 1 ? 'trial' : 'trials'}`}
          </title>
        </circle>
      )
    })

  const renderStateView = () => {
    if (!statesTopo) return <div className="loading">Loading map…</div>
    return (
      <svg viewBox="0 0 975 610" style={{ width: '100%', display: 'block' }}>
        {statesTopo.states.features.map((f: Feature<Geometry, { name: string }>, i) => {
          const row = byName.get((f.properties?.name ?? '').toLowerCase())
          const isHover = hover === f.properties?.name
          return (
            <path
              key={i}
              d={path(f) ?? undefined}
              fill="var(--accent)"
              fillOpacity={row ? stateOpacity(row.services) : 0.03}
              stroke={isHover ? 'var(--text)' : 'var(--border)'}
              strokeWidth={isHover ? 1.4 : 0.6}
              onMouseEnter={() => setHover(f.properties?.name ?? null)}
              onMouseLeave={() => setHover(null)}
            >
              <title>
                {f.properties?.name}
                {row
                  ? ` — ${fmtNum(row.services)} services, ${fmtNum(row.beneficiaries)} beneficiaries (${payload.dataYear})`
                  : ' — no matched volume'}
              </title>
            </path>
          )
        })}
        {renderTrialDots()}
      </svg>
    )
  }

  const paid = payload.paidPhysicians
  return (
    <div>
      {(hasCounties || trialSites.length > 0) && (
        <div className="mapToggle" role="tablist">
          {hasCounties && (
            <>
              <button
                role="tab"
                aria-selected={view === 'facilities'}
                className={view === 'facilities' ? 'on' : ''}
                onClick={() => setView('facilities')}
              >
                Counties + hospitals
              </button>
              <button
                role="tab"
                aria-selected={view === 'states'}
                className={view === 'states' ? 'on' : ''}
                onClick={() => setView('states')}
              >
                States
              </button>
            </>
          )}
          {trialSites.length > 0 && (
            <button
              className={`mapTrialToggle${showTrials ? ' on' : ''}`}
              onClick={() => setShowTrials((v) => !v)}
              title={
                payload.trialSiteTotals
                  ? `${fmtNum(payload.trialSiteTotals.usSites)} US sites across ${fmtNum(payload.trialSiteTotals.trials)} registered trials (${payload.trialSiteTotals.sites} worldwide)`
                  : undefined
              }
            >
              <span className="trialSwatch" /> trial sites
            </button>
          )}
          {payload.hospitalYears && view === 'facilities' && (
            <span className="mapYears">
              inpatient FY{payload.hospitalYears.inpatient}
              {payload.hospitalYears.outpatient
                ? ` · outpatient CY${payload.hospitalYears.outpatient}`
                : ''}
            </span>
          )}
        </div>
      )}
      <div className="mapRow">
        <div className="mapSvgWrap">
          {view === 'facilities' && hasCounties ? renderCountyView() : renderStateView()}
        </div>
        <div className="mapTable">
          {view === 'facilities' && facilities.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Facility</th>
                  <th style={{ textAlign: 'right' }}>Discharges</th>
                  <th style={{ textAlign: 'right' }}>CMS stars</th>
                </tr>
              </thead>
              <tbody>
                {facilities.slice(0, 12).map((f) => (
                  <tr
                    key={f.ccn}
                    onMouseEnter={() => setHover(f.ccn)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <td>
                      {f.name}
                      <span className="facCity">
                        {f.city}, {f.state}
                      </span>
                    </td>
                    <td className="num">{fmtNum(f.discharges)}</td>
                    <td className="num">{f.rating ? `${f.rating}★` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>State</th>
                  <th style={{ textAlign: 'right' }}>Services</th>
                  <th style={{ textAlign: 'right' }}>Beneficiaries</th>
                </tr>
              </thead>
              <tbody>
                {payload.states.slice(0, 12).map((s) => (
                  <tr key={s.state}>
                    <td>{s.state}</td>
                    <td className="num">{fmtNum(s.services)}</td>
                    <td className="num">{fmtNum(s.beneficiaries)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {paid && paid.byState.length > 0 && (
        <div className="mapPaidLine">
          Paid physicians ({paid.scope} scope) concentrate in:{' '}
          {paid.byState
            .slice(0, 5)
            .map((s) => `${s.state} (${fmtNum(s.physicians)} · ${fmtUsd(s.totalUsd)})`)
            .join(' · ')}
        </div>
      )}
    </div>
  )
}
