import type { DeviceDossier } from '../../lib/data'
import { fmtNum } from '../../lib/format'

type CorpPayload = NonNullable<DeviceDossier['modules']['corporate']['payload']>

export function Corporate({ payload }: { payload: CorpPayload }) {
  const lit = payload.litigation
  const kvs: { label: string; value: string }[] = [
    { label: 'Parent company', value: payload.parent ?? '—' },
    { label: 'Distinct parents on record', value: fmtNum(payload.nParents) },
    { label: 'FDA inspections', value: fmtNum(payload.inspections) },
    { label: 'FDA citations', value: fmtNum(payload.citations) },
    { label: 'Warning letter on file', value: payload.warningLetter ? 'Yes' : 'No' },
    { label: 'Federal PL cases (defendant match)', value: fmtNum(lit.federalCases) },
    { label: 'Cases in an MDL', value: fmtNum(lit.inMdl) },
    {
      label: 'Termination ratio',
      value: lit.terminationRatio != null ? String(lit.terminationRatio) : '—',
    },
    {
      label: 'Filing window',
      value:
        lit.firstFiled && lit.lastFiled
          ? `${lit.firstFiled.slice(0, 10)} → ${lit.lastFiled.slice(0, 10)}`
          : '—',
    },
  ]
  return (
    <div className="kvGrid">
      {kvs.map((kv) => (
        <div key={kv.label} className="kv">
          <div className="kvLabel">{kv.label}</div>
          <div className="kvValue">{kv.value}</div>
        </div>
      ))}
    </div>
  )
}
