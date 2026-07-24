import type { SummaryRow } from '../lib/data'
import { fmtNum, fmtUsd } from '../lib/format'

export function SummaryTable({
  rows,
  unlockedKeys,
  onLockedClick,
}: {
  rows: SummaryRow[]
  unlockedKeys: Set<string>
  onLockedClick: (module: string) => void
}) {
  return (
    <div className="panel">
      <table className="summaryTable">
        <tbody>
          {rows.map((r) => {
            const locked = Boolean(r.module) && !unlockedKeys.has(r.module!)
            return (
              <tr key={r.label} className={locked ? 'lockedRow' : undefined}>
                <td className="sumLabel">{r.label}</td>
                <td className="sumValue">
                  {locked ? (
                    <span
                      className="lockedValue"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onLockedClick(r.module!)}
                      title="Unlocks with the module that carries this data"
                    >
                      <span className="blurredBar" />
                      <span className="lockGlyph">🔒</span>
                    </span>
                  ) : r.format === 'usd' ? (
                    fmtUsd(Number(r.value))
                  ) : r.format === 'number' ? (
                    fmtNum(r.value)
                  ) : (
                    String(r.value)
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
