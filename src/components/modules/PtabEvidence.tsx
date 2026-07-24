// Show-your-work viewer for PTAB filings: fetches the actual filing PDF from the local
// archive via the live bridge, asks the bridge which page carries the expert's name
// (server-side locate against the extraction campaign's page-delimited text artifact),
// and renders that page with every name occurrence boxed. Page stepper included —
// declarations get skimmed, not just spot-checked. Same pinned pdf.js v4 LEGACY build as
// Evidence.tsx (real-phone WebKit lesson — never bump without device testing).
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { useEffect, useRef, useState } from 'react'
import { getApiBase } from '../../lib/data'
import { DOC_OPTIONS, matchMarks, type ItemBox, type Marks } from '../../lib/pdfMarks'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

type PdfDoc = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>

export default function PtabEvidence({
  trial,
  doc,
  terms,
  fallbackUrl,
}: {
  trial: string
  doc: string
  terms: string[]
  fallbackUrl: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<PdfDoc | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'no-bridge' | 'error'>('loading')
  const [marks, setMarks] = useState<Marks | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [pageNo, setPageNo] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [located, setLocated] = useState<number | null>(null)
  const [locNote, setLocNote] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [errDetail, setErrDetail] = useState<string | null>(null)

  async function renderPage(n: number) {
    const pdoc = docRef.current
    if (!pdoc) return
    const p = await pdoc.getPage(Math.min(Math.max(1, n), pdoc.numPages))
    const cssWidth = wrapRef.current?.clientWidth ?? 760
    const base1 = p.getViewport({ scale: 1 })
    const scale = cssWidth / base1.width
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const viewport = p.getViewport({ scale: scale * dpr })
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = viewport.width
    canvas.height = viewport.height
    const cssH = viewport.height / dpr
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${cssH}px`
    await p.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
    const tv = p.getViewport({ scale })
    const tc = await p.getTextContent()
    const items: ItemBox[] = []
    for (const it of tc.items) {
      if (!('transform' in it) || !it.str.trim()) continue
      const tx = pdfjs.Util.transform(tv.transform, it.transform)
      const h = Math.hypot(tx[2], tx[3])
      items.push({ x: tx[4], y: tx[5] - h, w: it.width * scale, h, str: it.str })
    }
    // the text layer splits "Georg Wieselthaler" across items, so a full-name-per-item
    // test never fires — box the name's distinctive words (≥4 chars) too
    const wordTerms = terms.flatMap((t) => t.split(/[\s,]+/)).filter((w) => w.length >= 4)
    setMarks(matchMarks(items, null, [...new Set([...terms, ...wordTerms])]))
    setSize({ w: cssWidth, h: cssH })
  }

  useEffect(() => {
    let live = true
    async function run() {
      const base = await getApiBase()
      if (!base) {
        if (live) setState('no-bridge')
        return
      }
      const url = `${base}/portal/ptab/${encodeURIComponent(trial)}/${encodeURIComponent(doc)}.pdf`
      if (live) setPdfUrl(url)
      let phase = 'locate'
      try {
        let target = 1
        try {
          const loc = await fetch(
            `${base}/portal/ptab/${encodeURIComponent(trial)}/${encodeURIComponent(doc)}/locate.json?q=${encodeURIComponent(terms[0] ?? '')}`,
          ).then((r) => (r.ok ? r.json() : null))
          if (loc?.page) {
            target = loc.page
            if (live) setLocated(loc.page)
          } else if (loc?.note && live) setLocNote(loc.note)
        } catch {
          /* locate is best-effort — page 1 fallback */
        }
        phase = 'fetch'
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.arrayBuffer()
        phase = 'render'
        const pdoc = await pdfjs.getDocument({ data, ...DOC_OPTIONS }).promise
        if (!live) return
        docRef.current = pdoc
        setNumPages(pdoc.numPages)
        const n = Math.min(target, pdoc.numPages)
        setPageNo(n)
        await renderPage(n)
        if (live) setState('ready')
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
      docRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial, doc])

  function step(d: number) {
    const n = Math.min(Math.max(1, pageNo + d), numPages || 1)
    if (n === pageNo) return
    setPageNo(n)
    void renderPage(n)
  }

  if (state === 'no-bridge')
    return (
      <div className="evidenceNote">
        Viewing the filing needs the live evidence bridge — it is not configured on this
        deployment.
        {fallbackUrl && (
          <>
            {' '}
            <a href={fallbackUrl} target="_blank" rel="noreferrer">
              Open the filing at the USPTO ↗
            </a>
          </>
        )}
      </div>
    )
  if (state === 'error')
    return (
      <div className="evidenceNote">
        The inline viewer couldn't render this filing ({trial}).{' '}
        {fallbackUrl && (
          <a href={fallbackUrl} target="_blank" rel="noreferrer">
            Open the filing at the USPTO ↗
          </a>
        )}
        {errDetail && <div className="evidenceErrDetail">{errDetail}</div>}
      </div>
    )

  return (
    <div className="evidenceWrap" ref={wrapRef}>
      <div className="evidenceHead">
        {trial} filing — page {pageNo}
        {numPages ? ` of ${numPages}` : ''}
        {located != null && located === pageNo && ' · name located on this page'}
        {locNote && ` · ${locNote}`}
        <span className="evidenceNav">
          <button className="evNavBtn" onClick={() => step(-1)} disabled={pageNo <= 1}>
            ‹ prev
          </button>
          <button
            className="evNavBtn"
            onClick={() => step(1)}
            disabled={pageNo >= (numPages || 1)}
          >
            next ›
          </button>
        </span>
        {(fallbackUrl ?? pdfUrl) && (
          <a
            className="evidenceOpen"
            href={fallbackUrl ?? pdfUrl ?? '#'}
            target="_blank"
            rel="noreferrer"
          >
            open PDF ↗
          </a>
        )}
      </div>
      <div className="evidenceCanvasBox">
        <canvas ref={canvasRef} />
        {state === 'loading' && <div className="evidenceLoading">Fetching filing PDF…</div>}
        {marks && size && (
          <svg
            className="evidenceMarks"
            viewBox={`0 0 ${size.w} ${size.h}`}
            style={{ width: size.w, height: size.h }}
          >
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
          </svg>
        )}
      </div>
    </div>
  )
}
