// Shared pure geometry for the PDF evidence viewers (510(k) Evidence + PTAB filings):
// quote/term matching over pdf.js text items → highlight boxes / circumscribed ellipse.
// No pdf.js import here — keep pdf.js confined to the lazy viewer chunk.

export const DOC_OPTIONS = {
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
}

export interface ItemBox {
  x: number
  y: number
  w: number
  h: number
  str: string
}

export interface Marks {
  highlights: ItemBox[]
  ellipse: { cx: number; cy: number; rx: number; ry: number } | null
  termBoxes: ItemBox[]
}

export const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

/** Item-precision quote match: find the normalized quote (a leading slice of it) in the
 *  page's concatenated text, then return the covering items' boxes. */
export function matchMarks(items: ItemBox[], quote: string | null, terms: string[]): Marks {
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
  // terms: whitespace-tolerant INSIDE the term (OCR splits accessions and names)
  const termBoxes: ItemBox[] = []
  for (const term of terms) {
    const re = new RegExp(term.split('').map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*'), 'i')
    for (const it of items) {
      if (re.test(it.str) || re.test(norm(it.str))) termBoxes.push(it)
    }
  }
  return { highlights, ellipse, termBoxes }
}
