import type { NarrativeCluster } from '../../lib/data'
import { fmtNum } from '../../lib/format'

export function Narratives({ clusters }: { clusters: NarrativeCluster[] }) {
  return (
    <div>
      {clusters.map((c) => (
        <div key={c.problem} className="cluster">
          <div className="clusterHead">
            <span className="clusterTerm">{c.problem}</span>
            <span className="clusterCount">{fmtNum(c.reports)} reports</span>
          </div>
          {c.narrative && <div className="clusterText">“{c.narrative}…”</div>}
        </div>
      ))}
    </div>
  )
}

/** Fake shape rendered under the blur while locked — never real narrative text. */
export function NarrativesGhost() {
  return (
    <div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="cluster">
          <div className="clusterHead">
            <span className="clusterTerm">Failure mode {i + 1}</span>
            <span className="clusterCount">••• reports</span>
          </div>
          <div className="clusterText">
            Representative de-identified adverse-event narrative text appears here, one
            cluster per distinct failure mode, with report counts per wording variant.
          </div>
        </div>
      ))}
    </div>
  )
}
