export const fmtNum = (n: number | string | null | undefined): string =>
  typeof n === 'number' ? n.toLocaleString('en-US') : String(n ?? '—')

export const fmtUsd = (n: number | null | undefined): string =>
  n == null ? '—' : `$${Math.round(n).toLocaleString('en-US')}`

export const fmtUsdCompact = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `$${Math.round(n / 1000)}k`
  return fmtUsd(n)
}
