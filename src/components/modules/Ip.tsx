import type { DeviceDossier } from '../../lib/data'
import { fmtNum } from '../../lib/format'

type IpPayload = NonNullable<DeviceDossier['modules']['ip']['payload']>

export function Ip({ payload }: { payload: IpPayload }) {
  return (
    <div>
      <div className="kvGrid" style={{ marginBottom: 14 }}>
        <div className="kv">
          <div className="kvLabel">Granted US patents (assignee match)</div>
          <div className="kvValue">{fmtNum(payload.patents)}</div>
        </div>
      </div>
      {payload.recent.map((p) => (
        <div key={p.id} className="patentRow">
          <span className="patentId">{p.id}</span>
          <span>{p.title}</span>
          <span className="patentYear">{p.year}</span>
        </div>
      ))}
      <div className="caveat">{payload.caveat}</div>
    </div>
  )
}
