import { Suspense, lazy, useRef, useState } from 'react'
import type { TreeAccessory, TreeEdge, TreeNode } from '../../lib/data'

// pdf.js stays confined to this lazy chunk — nothing loads until a Verify click
const Evidence = lazy(() => import('./Evidence'))

const SHOW_CAP = 60

interface Line {
  x1: number
  y1: number
  x2: number
  y2: number
  dashed: boolean
}

interface Hover {
  k: string
  peers: Set<string>
  lines: Line[]
}

/** Hop-column view of the full lineage: latest descendants ← this device → earliest
 *  predicates, one column per generation (node `level`: -N descendants … 0 anchors … +N
 *  ancestors). Hovering a card draws its citation connectors. Branded accessory
 *  clearances render as a separate flat list — they are not part of the lineage. Below
 *  the columns, every citation edge with its quoted SE passage. */
export function PredicateTree({
  nodes,
  edges,
  accessories,
  note,
}: {
  nodes: TreeNode[]
  edges: TreeEdge[]
  accessories?: TreeAccessory[]
  note?: string
}) {
  const [verifying, setVerifying] = useState<number | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const nodeEls = useRef(new Map<string, HTMLDivElement>())

  const levels = [...new Set(nodes.map((n) => n.level ?? 0))].sort((a, b) => a - b)
  const cols = levels.map((lv) => {
    const items = nodes.filter((n) => (n.level ?? 0) === lv)
    const title =
      lv === 0
        ? 'This device'
        : lv > 0
          ? `Cited predicates · ${lv} hop${lv > 1 ? 's' : ''}`
          : `Descendants · ${-lv} hop${lv < -1 ? 's' : ''}`
    return { lv, title, items: items.slice(0, SHOW_CAP), total: items.length }
  })

  const enterCard = (k: string) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const wrapRect = wrap.getBoundingClientRect()
    const peers = new Set<string>()
    const lines: Line[] = []
    for (const e of edges) {
      if (e.from !== k && e.to !== k) continue
      const peer = e.from === k ? e.to : e.from
      peers.add(peer)
      const a = nodeEls.current.get(e.from)
      const b = nodeEls.current.get(e.to)
      if (!a || !b) continue // endpoint beyond the column cap — no line to draw
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      const leftFirst = ra.left <= rb.left
      lines.push({
        x1: (leftFirst ? ra.right : ra.left) - wrapRect.left,
        y1: ra.top + ra.height / 2 - wrapRect.top,
        x2: (leftFirst ? rb.left : rb.right) - wrapRect.left,
        y2: rb.top + rb.height / 2 - wrapRect.top,
        dashed: e.kind !== 'primary',
      })
    }
    setHover({ k, peers, lines })
  }

  const registerEl = (k: string) => (el: HTMLDivElement | null) => {
    if (el) nodeEls.current.set(k, el)
    else nodeEls.current.delete(k)
  }

  return (
    <div>
      <div className="treeWrap">
        <div className="treeCanvas" ref={wrapRef} onPointerLeave={() => setHover(null)}>
          <div className="treeCols">
            {cols.map((c) => (
              <div key={c.lv} className="treeCol">
                <div className="treeColTitle">
                  {c.title} · {c.total}
                  {c.total > c.items.length ? ` (showing ${c.items.length})` : ''}
                </div>
                {c.items.map((n) => (
                  <div
                    key={n.k}
                    ref={registerEl(n.k)}
                    className="treeNode"
                    data-anchor={n.anchor}
                    data-hot={hover ? hover.k === n.k || hover.peers.has(n.k) : undefined}
                    data-dim={hover ? !(hover.k === n.k || hover.peers.has(n.k)) : undefined}
                    onPointerEnter={() => enterCard(n.k)}
                  >
                    <div className="treeK">{n.k}</div>
                    {n.name && <div className="treeName">{n.name}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {hover && hover.lines.length > 0 && (
            <svg className="treeLinks" aria-hidden="true">
              {hover.lines.map((l, i) => {
                const bend = Math.max(24, Math.abs(l.x2 - l.x1) / 2)
                const d = `M ${l.x1} ${l.y1} C ${l.x1 + bend} ${l.y1}, ${l.x2 - bend} ${l.y2}, ${l.x2} ${l.y2}`
                return (
                  <path key={i} d={d} className="treeLink" data-dashed={l.dashed} />
                )
              })}
            </svg>
          )}
        </div>
      </div>
      {accessories && accessories.length > 0 && (
        <div className="treeAccessories">
          <div className="treeColTitle">
            Accessory devices · {accessories.length} — branded companion clearances
            (introducers, sheaths, consoles…), listed apart from the device lineage above
          </div>
          <div className="treeAccList">
            {accessories.map((a) => (
              <div key={a.k} className="treeNode" data-accessory="true">
                <div className="treeK">{a.k}</div>
                {a.name && <div className="treeName">{a.name}</div>}
                {a.date && <div className="treeDate">{a.date}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="treeEdgeList">
        <div className="treeColTitle">Citations ({edges.length})</div>
        {edges.map((e, i) => (
          <div key={i} className="treeEdge">
            <div className="treeEdgeHead">
              <span className="treeK">{e.from}</span>
              <span style={{ color: 'var(--muted)' }}>
                {e.kind === 'document-wide' ? 'names (document-wide)' : 'cites'}
              </span>
              <span className="treeK">{e.to}</span>
              <span className="confChip">{e.confidence} confidence</span>
              <span className="confChip">
                {e.dir === 'down' ? 'descendant · ' : ''}hop {e.hop}
              </span>
              {e.page != null && (
                <button
                  className="verifyBtn"
                  onClick={() => setVerifying(verifying === i ? null : i)}
                >
                  {verifying === i ? 'Close source' : `Verify — source p.${e.page}`}
                </button>
              )}
            </div>
            {e.quote && <div className="treeQuote">“{e.quote}”</div>}
            {verifying === i && e.page != null && (
              <Suspense fallback={<div className="evidenceNote">Loading viewer…</div>}>
                <Evidence k={e.from} page={e.page} quote={e.quote} terms={[e.from, e.to]} />
              </Suspense>
            )}
          </div>
        ))}
      </div>
      {note && <div className="caveat">{note}</div>}
    </div>
  )
}

export function TreeGhost() {
  return (
    <div className="treeCols" style={{ minWidth: 0 }}>
      {['Descendants', 'This device', 'Cited predicates'].map((t) => (
        <div key={t} className="treeCol">
          <div className="treeColTitle">{t}</div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="treeNode">
              <div className="treeK">K██████</div>
              <div className="treeName">Predicate device name with cited quote</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
