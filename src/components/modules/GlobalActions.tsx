import { useState } from 'react'
import type { GlobalActionsPayload, GlobalActionRow } from '../../lib/data'

// ISO-3 (the ICIJ historic layer) → ISO-2 so every country row gets a flag.
const ISO3_TO_2: Record<string, string> = {
  DEU: 'DE', CHE: 'CH', GBR: 'GB', FRA: 'FR', ESP: 'ES', ITA: 'IT', IRL: 'IE',
  SWE: 'SE', DNK: 'DK', NLD: 'NL', BEL: 'BE', AUT: 'AT', FIN: 'FI', NOR: 'NO',
  POL: 'PL', PRT: 'PT', CZE: 'CZ', GRC: 'GR', TUR: 'TR', AUS: 'AU', CAN: 'CA',
  NZL: 'NZ', JPN: 'JP', KOR: 'KR', BRA: 'BR', MEX: 'MX', IND: 'IN', CHN: 'CN',
  SGP: 'SG', HKG: 'HK', ZAF: 'ZA', ISR: 'IL', SAU: 'SA', ARE: 'AE', RUS: 'RU',
  HUN: 'HU', SVK: 'SK', SVN: 'SI', HRV: 'HR', ROU: 'RO', BGR: 'BG', EST: 'EE',
  LVA: 'LV', LTU: 'LT', LUX: 'LU', ISL: 'IS', CYP: 'CY', MLT: 'MT', ARG: 'AR',
  CHL: 'CL', COL: 'CO', PER: 'PE', TWN: 'TW', THA: 'TH', MYS: 'MY', PHL: 'PH',
  VNM: 'VN', IDN: 'ID', EGY: 'EG', TUN: 'TN', PAK: 'PK', UKR: 'UA', SRB: 'RS',
}

function flag(code: string): string {
  const iso2 = code.length === 2 ? code : ISO3_TO_2[code]
  if (!iso2 || !/^[A-Z]{2}$/.test(iso2)) return '🌐'
  return String.fromCodePoint(...[...iso2].map((c) => 0x1f1a5 + c.charCodeAt(0)))
}

function ActionRow({ a }: { a: GlobalActionRow }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="gaRow" onClick={() => a.reason && setOpen((v) => !v)}>
      <span className="recallDate">{a.date ? a.date.slice(0, 10) : '—'}</span>
      {a.classification && (
        <span className="recallClass" data-c={a.classification}>
          {a.classification}
        </span>
      )}
      <span className="gaBody">
        <span className="gaProduct">{a.product}</span>
        {a.actionType && <span className="gaType"> · {a.actionType}</span>}
        {a.reason && (
          <span className="gaReason" data-open={open}>
            {open ? a.reason : ' — tap for reason'}
          </span>
        )}
      </span>
      {a.url && (
        <a
          className="litOpenLink"
          href={a.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          source ↗
        </a>
      )}
    </div>
  )
}

export function GlobalActions({ payload }: { payload: GlobalActionsPayload }) {
  const eu = payload.euStatus
  return (
    <div>
      {payload.callouts.length > 0 && (
        <div className="gaCallouts">
          {payload.callouts.map((c, i) => (
            <div key={i} className="gaCallout">
              ⚠ {c.text}
            </div>
          ))}
        </div>
      )}

      {eu && !eu.pending && (
        <div className="gaEu">
          <div className="gaEuHead">
            {flag('EU')} EU registration status (EUDAMED)
          </div>
          {eu.absent ? (
            <div className="gaEuAbsent">{eu.note}</div>
          ) : (
            <div className="kvGrid">
              <div className="kv">
                <div className="kvLabel">UDI registrations</div>
                <div className="kvValue">{eu.registrations.toLocaleString()}</div>
              </div>
              <div className="kv">
                <div className="kvLabel">On the market</div>
                <div className="kvValue">{eu.onMarket.toLocaleString()}</div>
              </div>
              <div className="kv">
                <div className="kvLabel">No longer marketed</div>
                <div className="kvValue">{eu.noLongerOnMarket.toLocaleString()}</div>
              </div>
              {eu.riskClasses && (
                <div className="kv">
                  <div className="kvLabel">EU risk classes</div>
                  <div className="kvValue">
                    {Object.entries(eu.riskClasses)
                      .map(([k, n]) => `${k.replace('class-', '').toUpperCase()} ×${n}`)
                      .join(' · ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {payload.countries.map((c) => (
        <div key={c.code} className="gaCountry">
          <div className="gaCountryHead">
            <span className="gaFlag">{flag(c.code)}</span>
            <span className="gaCountryName">{c.name}</span>
            <span className="gaCountryCount">
              {c.total.toLocaleString()} action{c.total === 1 ? '' : 's'}
              {c.total > c.actions.length ? ` · newest ${c.actions.length} shown` : ''}
            </span>
          </div>
          {c.actions.map((a, i) => (
            <ActionRow key={i} a={a} />
          ))}
        </div>
      ))}

      {payload.screenedOut > 0 && <div className="litScreenNote">{payload.screenedNote}</div>}
      <div className="gaAttribution">{payload.attribution}</div>
    </div>
  )
}

export function GlobalActionsGhost() {
  return (
    <div>
      {['🇨🇦 Canada', '🇬🇧 United Kingdom', '🇨🇭 Switzerland', '🇦🇺 Australia'].map((c) => (
        <div key={c} className="gaCountry">
          <div className="gaCountryHead">
            <span className="gaCountryName">{c}</span>
            <span className="gaCountryCount">•• actions</span>
          </div>
          <div className="gaRow">
            <span className="recallDate">20••-••-••</span>
            <span className="gaBody">••••••••••• — regulator action detail</span>
          </div>
        </div>
      ))}
    </div>
  )
}
