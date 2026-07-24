// Show-your-work viewer: renders the cited page of a 510(k) summary PDF (fetched from
// the live evidence bridge) with the extracted quote highlighted + circumscribed and
// every cited K-number boxed — the same treatment the desktop citation preview gives.
// pdf.js runtime assets are served from /pdfjs/ (cmaps/wasm/fonts — scanned filings
// paint blank without them).
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useEffect, useRef, useState } from 'react'
import { getApiBase } from '../../lib/data'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const DOC_OPTIONS = {
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
  iccUrl: '/pdfjs/iccs/',
}

interface ItemBox {
  x: number
  y: number
  w: number
  h: number
  str: string
}

interface Marks {
  highlights: ItemBox[]
  ellipse: { cx: number; cy: number; rx: number; ry: number } | null
  termBoxes: ItemBox[]
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

/** Item-precision quote match: find the normalized quote (a leading slice of it) in the
 *  page's concatenated text, then return the covering items' boxes. */
function matchMarks(items: ItemBox[], quote: string | null, terms: string[]): Marks {
  const joined = items.map((i) => i.str).join(' ')
  const normJoined = norm(joined)
  // map normalized offsets back to item indices
  const itemAt: number[] = []
  {
    let pos = 0
    items.forEach((it, idx) => {
      const n = norm(it.str)
      for (let j = 0; j < n.length + 1 && pos < normJoined.length + 1; j++, pos++) itemAt[pos] = idx
    })
  }
  let highlights: ItemBox[] = []
  let ellipse: Marks['ellipse'] = null
  if (quote) {
    const q = norm(quote).slice(0, 120)
    const at = q.length >= 20 ? normJoined.indexOf(q) : -1
    if (at >= 0) {
      const a = itemAt[at] ?? 0
      const b = itemAt[Math.min(at + q.length, itemAt.length - 1)] ?? a
      highlights = items.slice(a, b + 1)
      const x0 = Math.min(...highlights.map((i) => i.x))
      const y0 = Math.min(...highlights.map((i) => i.y))
      const x1 = Math.max(...highlights.map((i) => i.x + i.w))
      const y1 = Math.max(...highlights.map((i) => i.y + i.h))
      // circumscribe: √2 axis scaling so the ellipse clears the box corners
      const cx = (x0 + x1) / 2
      const cy = (y0 + y1) / 2
      ellipse = { cx, cy, rx: ((x1 - x0) / 2) * 1.2 + 8, ry: ((y1 - y0) / 2) * 1.35 + 8 }
    }
  }
  // K-numbers: whitespace-tolerant INSIDE the term (OCR splits accessions)
  const termBoxes: ItemBox[] = []
  for (const term of terms) {
    const re = new RegExp(term.split('').map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*'), 'i')
    for (const it of items) {
      if (re.test(it.str) || re.test(norm(it.str))) termBoxes.push(it)
    }
  }
  return { highlights, ellipse, termBoxes }
}

export default function Evidence({
  k,
  page,
  quote,
  terms,
}: {
  k: string
  page: number
  quote: string | null
  terms: string[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'no-bridge' | 'error'>('loading')
  const [marks, setMarks] = useState<Marks | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [pageShown, setPageShown] = useState(page)

  useEffect(() => {
    let live = true
    async function run() {
      const base = await getApiBase()
      if (!base) {
        if (live) setState('no-bridge')
        return
      }
      try {
        const res = await fetch(`${base}/portal/evidence/${encodeURIComponent(k)}.pdf`)
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.arrayBuffer()
        const doc = await pdfjs.getDocument({ data, ...DOC_OPTIONS }).promise
        const pageNo = Math.min(Math.max(1, page), doc.numPages)
        const p = await doc.getPage(pageNo)
        if (!live) return
        setPageShown(pageNo)
        const cssWidth = wrapRef.current?.clientWidth ?? 760
        const base1 = p.getViewport({ scale: 1 })
        const scale = cssWidth / base1.width
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = p.getViewport({ scale: scale * dpr })
        const canvas = canvasRef.current!
        canvas.width = viewport.width
        canvas.height = viewport.height
        const cssH = viewport.height / dpr
        canvas.style.width = `${cssWidth}px`
        canvas.style.height = `${cssH}px`
        await p.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise
        // text geometry in CSS pixels
        const tv = p.getViewport({ scale })
        const tc = await p.getTextContent()
        const items: ItemBox[] = []
        for (const it of tc.items) {
          if (!('transform' in it) || !it.str.trim()) continue
          const tx = pdfjs.Util.transform(tv.transform, it.transform)
          const h = Math.hypot(tx[2], tx[3])
          items.push({ x: tx[4], y: tx[5] - h, w: it.width * scale, h, str: it.str })
        }
        if (!live) return
        setMarks(matchMarks(items, quote, terms))
        setSize({ w: cssWidth, h: cssH })
        setState('ready')
      } catch {
        if (live) setState('error')
      }
    }
    void run()
    return () => {
      live = false
    }
  }, [k, page, quote, terms])

  if (state === 'no-bridge')
    return (
      <div className="evidenceNote">
        Source verification needs the live evidence bridge — it is not configured on this
        deployment.
      </div>
    )
  if (state === 'error')
    return (
      <div className="evidenceNote">
        The evidence bridge is unreachable right now — the source PDF ({k}, p.{page}) will
        open here when it is back.
      </div>
    )

  return (
    <div className="evidenceWrap" ref={wrapRef}>
      <div className="evidenceHead">
        {k} — 510(k) summary, page {pageShown}
        {marks && !marks.ellipse && quote && state === 'ready' && (
          <span className="evidenceMiss"> · quote not text-matchable on this scan — passage shown below</span>
        )}
      </div>
      <div className="evidenceCanvasBox">
        <canvas ref={canvasRef} />
        {state === 'loading' && <div className="evidenceLoading">Fetching source PDF…</div>}
        {marks && size && (
          <svg
            className="evidenceMarks"
            viewBox={`0 0 ${size.w} ${size.h}`}
            style={{ width: size.w, height: size.h }}
          >
            {marks.highlights.map((b, i) => (
              <rect key={`h${i}`} x={b.x} y={b.y} width={b.w} height={b.h} className="evHl" />
            ))}
            {marks.termBoxes.map((b, i) => (
              <rect
                key={`t${i}`}
                x={b.x - 2}
                y={b.y - 2}
                width={b.w + 4}
                height={b.h + 4}
                className="evTerm"
              />
            ))}
            {marks.ellipse && (
              <ellipse
                cx={marks.ellipse.cx}
                cy={marks.ellipse.cy}
                rx={marks.ellipse.rx}
                ry={marks.ellipse.ry}
                className="evEllipse"
              />
            )}
          </svg>
        )}
      </div>
      {marks && !marks.ellipse && quote && (
        <div className="evidenceQuote">“{quote}…”</div>
      )}
    </div>
  )
}
