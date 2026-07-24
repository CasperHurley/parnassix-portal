// In-app "read the mention in context": the full CourtListener opinion text (held
// locally, served by the live bridge), every occurrence of the expert's name highlighted,
// prev/next stepping between mentions. Plain DOM — phone-safe, no pdf.js involved.
import { useEffect, useMemo, useRef, useState } from 'react'
import { getApiBase } from '../../lib/data'

interface OpinionDoc {
  id: number
  case: string | null
  date: string | null
  court: string | null
  truncated: boolean
  text: string
}

function markRegex(terms: string[]): RegExp | null {
  const parts = terms
    .filter(Boolean)
    .map((t) =>
      t
        .trim()
        .split(/\s+/)
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('\\s+'),
    )
  if (!parts.length) return null
  return new RegExp(`(${parts.join('|')})`, 'gi')
}

export default function OpinionReader({
  opinionId,
  terms,
  publicUrl,
}: {
  opinionId: string
  terms: string[]
  publicUrl: string | null
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'no-bridge' | 'error'>('loading')
  const [doc, setDoc] = useState<OpinionDoc | null>(null)
  const [active, setActive] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const markEls = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    let live = true
    async function run() {
      const base = await getApiBase()
      if (!base) {
        if (live) setState('no-bridge')
        return
      }
      try {
        const res = await fetch(`${base}/portal/opinion/${encodeURIComponent(opinionId)}.json`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const d = (await res.json()) as OpinionDoc & { error?: string }
        if (d.error) throw new Error(d.error)
        if (live) {
          setDoc(d)
          setState('ready')
        }
      } catch {
        if (live) setState('error')
      }
    }
    void run()
    return () => {
      live = false
    }
  }, [opinionId])

  const segments = useMemo(() => {
    if (!doc) return null
    const re = markRegex(terms)
    if (!re) return [{ text: doc.text, hit: false }]
    const out: { text: string; hit: boolean }[] = []
    let last = 0
    for (const m of doc.text.matchAll(re)) {
      const at = m.index ?? 0
      // word boundaries by hand (no lookbehind — old-phone WebKit throws at construction):
      // "Eric Rose" must not light up inside "Eric Rosen"
      const end = at + m[0].length
      const beforeOk = at === 0 || !/[a-z]/i.test(doc.text[at - 1])
      const afterOk = end >= doc.text.length || !/[a-z]/i.test(doc.text[end])
      if (!beforeOk || !afterOk || at < last) continue
      if (at > last) out.push({ text: doc.text.slice(last, at), hit: false })
      out.push({ text: m[0], hit: true })
      last = end
    }
    if (last < doc.text.length) out.push({ text: doc.text.slice(last), hit: false })
    return out
  }, [doc, terms])

  const nHits = segments?.filter((s) => s.hit).length ?? 0

  function scrollToMark(idx: number) {
    const el = markEls.current[idx]
    const box = scrollRef.current
    if (!el || !box) return
    box.scrollTop = el.offsetTop - box.clientHeight / 2
  }

  // first mention centered once the text is in
  useEffect(() => {
    if (state === 'ready' && nHits > 0) {
      setActive(0)
      requestAnimationFrame(() => scrollToMark(0))
    }
  }, [state, nHits])

  function step(d: number) {
    if (!nHits) return
    const n = (active + d + nHits) % nHits
    setActive(n)
    scrollToMark(n)
  }

  if (state === 'no-bridge' || state === 'error')
    return (
      <div className="evidenceNote">
        {state === 'no-bridge'
          ? 'Reading the opinion in-app needs the live evidence bridge.'
          : "The opinion text couldn't be loaded right now."}{' '}
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noreferrer">
            Open it on CourtListener ↗
          </a>
        )}
      </div>
    )
  if (state === 'loading') return <div className="evidenceNote">Fetching opinion text…</div>

  let hitIdx = -1
  return (
    <div className="opReader">
      <div className="opHead">
        <span className="opCase">
          {doc?.case ?? `Opinion ${opinionId}`}
          {doc?.court && <span className="chip litCourt">{doc.court.toUpperCase()}</span>}
          {doc?.date && <span className="litDate">{doc.date}</span>}
        </span>
        <span className="opNav">
          <span className="opCount">
            {nHits ? `mention ${active + 1} of ${nHits}` : 'name not in this text'}
          </span>
          {nHits > 1 && (
            <>
              <button className="evNavBtn" onClick={() => step(-1)}>
                ‹
              </button>
              <button className="evNavBtn" onClick={() => step(1)}>
                ›
              </button>
            </>
          )}
          {publicUrl && (
            <a className="litOpenLink" href={publicUrl} target="_blank" rel="noreferrer">
              CourtListener ↗
            </a>
          )}
        </span>
      </div>
      <div className="opText" ref={scrollRef}>
        {segments?.map((s, i) => {
          if (!s.hit) return <span key={i}>{s.text}</span>
          hitIdx += 1
          const idx = hitIdx
          return (
            <mark
              key={i}
              ref={(el) => {
                markEls.current[idx] = el
              }}
              className="litMark"
              data-active={idx === active}
            >
              {s.text}
            </mark>
          )
        })}
        {doc?.truncated && <div className="epEmpty">— text truncated for display —</div>}
      </div>
    </div>
  )
}
