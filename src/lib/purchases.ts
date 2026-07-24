// Mock purchase state — localStorage only, no backend. A real deployment replaces this
// module with the billing service; every consumer goes through isUnlocked().
import { useSyncExternalStore } from 'react'

const KEY = 'aneural-portal-unlocks'
const listeners = new Set<() => void>()
let cache: string[] | null = null

function read(): string[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    cache = []
  }
  return cache
}

function write(keys: string[]) {
  cache = keys
  localStorage.setItem(KEY, JSON.stringify(keys))
  listeners.forEach((fn) => fn())
}

export function unlock(...keys: string[]) {
  write([...new Set([...read(), ...keys])])
}

export function resetDemo() {
  write([])
}

export function ownedKeys(): string[] {
  return read()
}

/** Hierarchy: everything ⊃ dossier:<slug> ⊃ per-module ⊃ per-card.
 *  The CORE dossier (price_dossier.py model) covers narratives, the ranked expert
 *  overlap, the predicate family tree (priced into the dossier where the pathway
 *  carries one), and the corporate panel; the ICP pack and USPTO portfolio are
 *  à-la-carte add-ons. Corporate also unlocks with any purchase touching the
 *  device (bundled, never sold alone). */
export function isUnlocked(owned: string[], slug: string, module: string, cardId?: string): boolean {
  if (owned.includes('everything')) return true
  const dossier = owned.includes(`dossier:${slug}`)
  const inDossier = ['narratives', 'experts', 'predicate-tree', 'corporate'].includes(module)
  if (dossier && inDossier) return true
  if (owned.includes(`${slug}:${module}`)) return true
  if (module === 'corporate' && owned.some((k) => k === `dossier:${slug}` || k.startsWith(`${slug}:`)))
    return true
  if (cardId && owned.includes(`${slug}:${module}:${cardId}`)) return true
  return false
}

export function usePurchases() {
  const owned = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => read(),
  )
  return {
    owned,
    has: (slug: string, module: string, cardId?: string) => isUnlocked(owned, slug, module, cardId),
    ownsDossier: (slug: string) => owned.includes('everything') || owned.includes(`dossier:${slug}`),
    ownsEverything: owned.includes('everything'),
    unlock,
    resetDemo,
  }
}
