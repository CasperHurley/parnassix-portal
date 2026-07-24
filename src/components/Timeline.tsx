// Multi-series SVG timeline. Each series is normalized to its own max (mixed units —
// recalls vs reports vs USD), tooltips show raw values. Locked series render as legend
// chips with a lock; clicking one scrolls to the module that sells it.
import { scaleLinear } from 'd3-scale'
import { useMemo, useRef, useState } from 'react'
import type { TimelineSeries } from '../lib/data'
import { fmtNum, fmtUsdCompact } from '../lib/format'

const SERIES_COLORS: Record<string, string> = {
  recalls: '#46d0b0',
  deaths: '#ff5d5d',
  injuries: '#ff9d5d',
  payments: '#ffb020',
  patents: '#7aa2ff',
}

const W = 900
const H = 260
const PAD = { l: 14, r: 14, t: 14, b: 26 }

export function Timeline({
  series,
  unlockedKeys,
  onLockedClick,
}: {
  series: TimelineSeries[]
  unlockedKeys: Set<string>
  onLockedClick: (module: string) => void
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [tip, setTip] = useState<{ x: number; y: number; year: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const visible = series.filter(
    (s) => (!s.module || unlockedKeys.has(s.module)) && !hidden.has(s.key),
  )
  const lockedSeries = series.filter((s) => s.module && !unlockedKeys.has(s.module))

  const { years, x, paths } = useMemo(() => {
    const allYears = visible.flatMap((s) => s.points.map((p) => p.year))
    const y0 = allYears.length ? Math.min(...allYears) : 2000
    const y1 = allYears.length ? Math.max(...allYears) : 2026
    const xs = scaleLinear().domain([y0, y1]).range([PAD.l, W - PAD.r])
    const built = visible.map((s) => {
      const max = Math.max(...s.points.map((p) => p.value), 1)
      const ys = scaleLinear().domain([0, max]).range([H - PAD.b, PAD.t])
      const pts = s.points.map((p) => `${xs(p.year).toFixed(1)},${ys(p.value).toFixed(1)}`)
      const area =
        `M${xs(s.points[0]?.year ?? y0).toFixed(1)},${H - PAD.b} L` +
        pts.join(' L') +
        ` L${xs(s.points[s.points.length - 1]?.year ?? y1).toFixed(1)},${H - PAD.b} Z`
      return { s, line: 'M' + pts.join(' L'), area }
    })
    const yrTicks: number[] = []
    const span = y1 - y0
    const step = span > 30 ? 10 : span > 12 ? 5 : 2
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) yrTicks.push(y)
    return { years: yrTicks, x: xs, paths: built }
  }, [visible])

  const toggle = (key: string) =>
    setHidden((h) => {
      const next = new Set(h)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const hover = (evt: React.MouseEvent<SVGSVGElement>) => {
    const rect = evt.currentTarget.getBoundingClientRect()
    const px = ((evt.clientX - rect.left) / rect.width) * W
    const year = Math.round(x.invert(px))
    setTip({ x: evt.clientX - (wrapRef.current?.getBoundingClientRect().left ?? 0), y: 10, year })
  }

  return (
    <div className="panel" style={{ position: 'relative' }} ref={wrapRef}>
      <div className="tlLegend">
        {series.map((s) => {
          const locked = Boolean(s.module) && !unlockedKeys.has(s.module!)
          const on = !locked && !hidden.has(s.key)
          return (
            <button
              key={s.key}
              className="tlChip"
              data-on={on}
              data-locked={locked}
              onClick={() => (locked ? onLockedClick(s.module!) : toggle(s.key))}
              title={locked ? 'Unlock the module that carries this data' : 'Toggle series'}
            >
              <span
                className="tlSwatch"
                style={{ background: locked ? 'transparent' : SERIES_COLORS[s.key] ?? '#888',
                         border: locked ? '1px solid var(--border-hot)' : 'none' }}
              />
              {s.label}
              {locked && <span className="lockGlyph">🔒</span>}
            </button>
          )
        })}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block' }}
        onMouseMove={hover}
        onMouseLeave={() => setTip(null)}
      >
        {years.map((y) => (
          <g key={y}>
            <line x1={x(y)} x2={x(y)} y1={PAD.t} y2={H - PAD.b} stroke="var(--border)" strokeDasharray="2 4" />
            <text x={x(y)} y={H - 8} fill="var(--muted)" fontSize={11} textAnchor="middle">
              {y}
            </text>
          </g>
        ))}
        {paths.map(({ s, line, area }) => (
          <g key={s.key}>
            <path d={area} fill={SERIES_COLORS[s.key] ?? '#888'} opacity={0.08} />
            <path d={line} fill="none" stroke={SERIES_COLORS[s.key] ?? '#888'} strokeWidth={1.8} />
          </g>
        ))}
        {tip && (
          <line x1={x(tip.year)} x2={x(tip.year)} y1={PAD.t} y2={H - PAD.b} stroke="var(--border-hot)" />
        )}
      </svg>
      {tip && (
        <div className="tlTip" style={{ left: Math.min(tip.x + 14, 760), top: 36 }}>
          <div className="tlTipYear">{tip.year}</div>
          {visible.map((s) => {
            const p = s.points.find((pt) => pt.year === tip.year)
            if (!p) return null
            return (
              <div key={s.key} className="tlTipRow">
                <span style={{ color: SERIES_COLORS[s.key] }}>{s.label}</span>
                <span>{s.unit === 'USD' ? fmtUsdCompact(p.value) : fmtNum(p.value)}</span>
              </div>
            )
          })}
        </div>
      )}
      {lockedSeries.length > 0 && (
        <div className="tlHint">
          {lockedSeries.length} more data series accrue to this timeline as modules unlock:{' '}
          {lockedSeries.map((s) => s.label).join(', ')}.
        </div>
      )}
    </div>
  )
}
