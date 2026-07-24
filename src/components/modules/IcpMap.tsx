// US choropleth of state-grain CMS procedure volumes. Topology from us-atlas (lazy-loaded
// so the catalog page never pays for it); no tiles, no network beyond the static import.
// us-atlas 3.0.1 ships lon/lat geometry (NOT pre-projected), so we project through
// geoAlbersUsa at the canonical 975x610 frame; territories outside the projection drop out.
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { useEffect, useMemo, useState } from 'react'
import type { FeatureCollection, Geometry } from 'geojson'
import type { IcpState } from '../../lib/data'
import { fmtNum } from '../../lib/format'

interface StatesTopo {
  states: FeatureCollection<Geometry, { name: string }>
}

let topoCache: Promise<StatesTopo> | null = null
function loadStates(): Promise<StatesTopo> {
  if (!topoCache) {
    topoCache = Promise.all([import('topojson-client'), import('us-atlas/states-10m.json')]).then(
      ([tj, atlas]) => {
        const topo = (atlas as { default?: unknown }).default ?? atlas
        const t = topo as Parameters<typeof tj.feature>[0]
        const states = tj.feature(
          t,
          (t.objects as Record<string, Parameters<typeof tj.feature>[1]>).states,
        ) as unknown as FeatureCollection<Geometry, { name: string }>
        return { states }
      },
    )
  }
  return topoCache
}

export function IcpMap({ states, dataYear }: { states: IcpState[]; dataYear: number }) {
  const [topo, setTopo] = useState<StatesTopo | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void loadStates().then((t) => live && setTopo(t))
    return () => {
      live = false
    }
  }, [])

  const byName = useMemo(
    () => new Map(states.map((s) => [s.state.toLowerCase(), s])),
    [states],
  )
  const max = Math.max(...states.map((s) => s.services), 1)
  const opacity = scaleLinear().domain([0, max]).range([0.06, 0.95])
  const path = useMemo(() => geoPath(geoAlbersUsa().scale(1300).translate([487.5, 305])), [])

  return (
    <div className="mapRow">
      <div className="mapSvgWrap">
        {topo ? (
          <svg viewBox="0 0 975 610" style={{ width: '100%', display: 'block' }}>
            {topo.states.features.map((f, i) => {
              const row = byName.get((f.properties?.name ?? '').toLowerCase())
              const isHover = hover === f.properties?.name
              return (
                <path
                  key={i}
                  d={path(f) ?? undefined}
                  fill="var(--accent)"
                  fillOpacity={row ? opacity(row.services) : 0.03}
                  stroke={isHover ? 'var(--text)' : 'var(--border)'}
                  strokeWidth={isHover ? 1.4 : 0.6}
                  onMouseEnter={() => setHover(f.properties?.name ?? null)}
                  onMouseLeave={() => setHover(null)}
                >
                  <title>
                    {f.properties?.name}
                    {row
                      ? ` — ${fmtNum(row.services)} services, ${fmtNum(row.beneficiaries)} beneficiaries (${dataYear})`
                      : ' — no matched volume'}
                  </title>
                </path>
              )
            })}
          </svg>
        ) : (
          <div className="loading">Loading map…</div>
        )}
      </div>
      <div className="mapTable">
        <table>
          <thead>
            <tr>
              <th>State</th>
              <th style={{ textAlign: 'right' }}>Services</th>
              <th style={{ textAlign: 'right' }}>Beneficiaries</th>
            </tr>
          </thead>
          <tbody>
            {states.slice(0, 12).map((s) => (
              <tr key={s.state}>
                <td>{s.state}</td>
                <td className="num">{fmtNum(s.services)}</td>
                <td className="num">{fmtNum(s.beneficiaries)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
