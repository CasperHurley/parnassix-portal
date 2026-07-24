// Show-your-work viewer: renders the cited page of a 510(k) summary PDF (fetched from
// the live evidence bridge) with the extracted quote highlighted + circumscribed and
// every cited K-number boxed — the same treatment the desktop citation preview gives.
// pdf.js runtime assets are served from /pdfjs/ (cmaps/wasm/fonts — scanned filings
// paint blank without them).
// LEGACY build on purpose (the desktop-app lesson): the modern build assumes
// bleeding-edge engine features (Promise.try …) that older mobile Safari lacks —
// the failure mode is a phone that fetched the PDF fine and then can't render it.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { useEffect, useRef, useState } from 'react'
import { getApiBase } from '../../lib/data'
import { DOC_OPTIONS, matchMarks, type ItemBox, type Marks } from '../../lib/pdfMarks'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [errDetail, setErrDetail] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    async function run() {
      const base = await getApiBase()
      if (!base) {
        if (live) setState('no-bridge')
        return
      }
      const url = `${base}/portal/evidence/${encodeURIComponent(k)}.pdf`
      if (live) setPdfUrl(url)
      let phase = 'fetch'
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.arrayBuffer()
        phase = 'render'
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
        await p.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
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
      } catch (err) {
        if (live) {
          setErrDetail(`${phase}: ${String(err).slice(0, 160)}`)
          setState('error')
        }
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
        The inline viewer couldn't render this source here ({k}, p.{page}).{' '}
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noreferrer">
            Open the source PDF directly ↗
          </a>
        )}
        {errDetail && <div className="evidenceErrDetail">{errDetail}</div>}
      </div>
    )

  return (
    <div className="evidenceWrap" ref={wrapRef}>
      <div className="evidenceHead">
        {k} — 510(k) summary, page {pageShown}
        {pdfUrl && (
          <a className="evidenceOpen" href={pdfUrl} target="_blank" rel="noreferrer">
            open PDF ↗
          </a>
        )}
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
