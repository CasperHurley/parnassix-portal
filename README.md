# parnassix-portal

The public face of **Parnassix Legal**: a static site presenting verified litigation intelligence for the top revenue-ranked medical devices. Each device gets a dossier assembled from named public datasets, with every figure cited and every caveat presented alongside the number it qualifies.

Live at [aneural-portal.pages.dev](https://aneural-portal.pages.dev). The hostname predates the project's rename and will change when the Cloudflare project does.

## What a dossier contains

| Module           | Anchor                | Source                                                                            |
| ---------------- | --------------------- | --------------------------------------------------------------------------------- |
| Narratives       | `#mod-narratives`     | MAUDE adverse-event exhibit, untangled by problem cluster                         |
| Trial AEs        | `#mod-trial-aes`      | Sponsor-reported adverse-event tables from ClinicalTrials.gov via AACT            |
| Global actions   | `#mod-global-actions` | Regulatory footprint across seven jurisdictions plus EUDAMED registration status  |
| Predicate tree   | `#mod-predicate-tree` | 510(k) predicate family tree, ancestors and citing descendants, with PDF evidence |
| Experts          | `#mod-experts`        | Paid key-opinion-leader overlap from CMS Open Payments, ranked and graded         |
| Demand map       | `#mod-icp-map`        | County and facility procedure volumes from CMS as a geographic proxy              |
| Corporate        | `#mod-corporate`      | Corporate context panel                                                           |
| IP               | `#mod-ip`             | USPTO filings portfolio and PTAB filings viewer                                   |

The catalog page lists the devices with their regulatory pathway, adverse-event counts, and dossier price. A device opens at `/?d=<slug>`, and a module deep-links at `/?d=<slug>#mod-<id>`.

Expert and litigation matches are made by name, because registry identities cannot be linked across these datasets. Each item is graded corroborated or name-only, and nothing is silently excluded.

## Data flow

Nothing is computed in the browser. The dossier JSON under `public/data/` is pre-computed and human-verified by the ingest pipeline, and the site only renders it.

At load, the app reads `/live-config.json` for the address of the live relay on the corpus machine. If the relay answers within five seconds, the site serves from it and shows a "live data" pill. Otherwise it falls back to the baked snapshot in `public/data/`. Both serve the same JSON shapes, defined in `src/lib/data.ts`, which mirror the generator contract exactly.

Purchases are a demo. `src/lib/purchases.ts` records unlocks in `localStorage` and the top bar has a reset button.

## For agents

`public/llms.txt` and `public/agent.json` describe the site for machine readers: the device list, module ids and prices, data URLs, the caveats that must accompany the data, and the corpus machine's MCP endpoint. Agents should present the data with its caveats and never recompose or extrapolate it.

## Development

```sh
npm ci
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build → dist/
npm run preview
```

Vite 5, React 18, TypeScript 5.6. Maps use d3-geo with the us-atlas TopoJSON. The evidence viewers use pdf.js, pinned to the v4 legacy line for mobile Safari, with its cmaps and standard fonts served from `public/pdfjs/`.

## Deployment

The site deploys to Cloudflare Pages from `dist/`. `public/_headers` sets cache policy: hashed `/assets/*` are immutable, while `index.html`, the data files, and the agent manifests must revalidate on every request because the edge cache does not reliably purge on deploy.
