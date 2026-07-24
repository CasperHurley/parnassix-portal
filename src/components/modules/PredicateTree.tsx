import { Suspense, lazy, useState } from 'react'
import type { TreeEdge, TreeNode } from '../../lib/data'

// pdf.js stays confined to this lazy chunk — nothing loads until a Verify click
const Evidence = lazy(() => import('./Evidence'))

const SHOW_CAP = 60

/** Hop-column view of the 2-hop lineage: anchors → their predicates → theirs.
 *  Below the columns, every citation edge with its quoted SE passage. */
export function PredicateTree({
  nodes,
  edges,
  hopCapNote,
}: {
  nodes: TreeNode[]
  edges: TreeEdge[]
  hopCapNote: string
}) {
  const [verifying, setVerifying] = useState<number | null>(null)
  const anchors = nodes.filter((n) => n.anchor)
  const anchorSet = new Set(anchors.map((n) => n.k))
  const hop1 = new Set(edges.filter((e) => e.hop === 1).map((e) => e.to))
  const hop2 = new Set(
    edges.filter((e) => e.hop === 2).map((e) => e.to).filter((k) => !hop1.has(k)),
  )
  const byK = new Map(nodes.map((n) => [n.k, n]))
  const col = (ks: Set<string> | string[]) =>
    [...ks]
      .filter((k) => !anchorSet.has(k))
      .slice(0, SHOW_CAP)
      .map((k) => byK.get(k) ?? { k, name: '', anchor: false })

  const cols: { title: string; items: TreeNode[] }[] = [
    { title: 'This device', items: anchors },
    { title: 'Cited predicates (1 hop)', items: col(hop1) },
    { title: 'Their predicates (2 hops)', items: col(hop2) },
  ]

  return (
    <div>
      <div className="treeWrap">
        <div className="treeCols">
          {cols.map((c) => (
            <div key={c.title} className="treeCol">
              <div className="treeColTitle">
                {c.title} · {c.items.length}
              </div>
              {c.items.map((n) => (
                <div key={n.k} className="treeNode" data-anchor={n.anchor}>
                  <div className="treeK">{n.k}</div>
                  {n.name && <div className="treeName">{n.name}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
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
              <span className="confChip">hop {e.hop}</span>
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
      <div className="caveat">{hopCapNote}</div>
    </div>
  )
}

export function TreeGhost() {
  return (
    <div className="treeCols" style={{ minWidth: 0 }}>
      {['This device', '1 hop', '2 hops'].map((t) => (
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
