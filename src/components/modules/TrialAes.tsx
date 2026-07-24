// Sponsor trial adverse events (AACT/ClinicalTrials.gov): the manufacturer's own
// published results-section AE tables for this device's registered trials — a
// pre-market/peri-market harm record MAUDE cannot provide.
import type { TrialAesPayload } from '../../lib/data'
import { fmtNum } from '../../lib/format'

export function TrialAes({ payload }: { payload: TrialAesPayload }) {
  const t = payload.totals
  return (
    <div>
      <div className="kvGrid">
        <div className="kv">
          <div className="kvLabel">Trials matched ({payload.scope} scope)</div>
          <div className="kvValue">{fmtNum(payload.trialsMatched)}</div>
        </div>
        <div className="kv">
          <div className="kvLabel">With posted AE tables</div>
          <div className="kvValue">{fmtNum(payload.trialsWithAeTables)}</div>
        </div>
        <div className="kv">
          <div className="kvLabel">Serious-event rows · subjects</div>
          <div className="kvValue">
            {fmtNum(t.serious.rows)} · {fmtNum(t.serious.subjects)}
          </div>
        </div>
        <div className="kv">
          <div className="kvLabel">Death-worded terms, subjects</div>
          <div className="kvValue">{fmtNum(t.deathTermSubjects)}</div>
        </div>
      </div>

      {payload.topSeriousTerms.length > 0 && (
        <>
          <div className="sectionSub">Top serious adverse-event terms (sponsor-reported)</div>
          <table className="aeTermTable">
            <thead>
              <tr>
                <th>Term</th>
                <th>Organ system</th>
                <th style={{ textAlign: 'right' }}>Arm rows</th>
                <th style={{ textAlign: 'right' }}>Subjects affected</th>
              </tr>
            </thead>
            <tbody>
              {payload.topSeriousTerms.map((tm, i) => (
                <tr key={i}>
                  <td>{tm.term}</td>
                  <td className="epMuted">{tm.organSystem}</td>
                  <td className="num">{fmtNum(tm.rows)}</td>
                  <td className="num">{fmtNum(tm.subjectsAffected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {payload.trials.length > 0 && (
        <>
          <div className="sectionSub">
            Trials by serious-event volume ({fmtNum(payload.trialsWithSerious)} trials posted
            serious events)
          </div>
          {payload.trials.map((tr) => (
            <div key={tr.nctId} className="epRow">
              <span>
                <span className="treeK">{tr.nctId}</span> {tr.title}
                {tr.status && <span className="epMuted"> · {tr.status.toLowerCase()}</span>}
                {tr.startYear && <span className="epMuted"> · {tr.startYear}</span>}
              </span>
              <span className="epRowVal">
                {fmtNum(tr.seriousRows)} serious rows · {fmtNum(tr.seriousSubjects)} subjects
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
