import type { Card, SearchRecord } from '../types'

/** Minusculas sem acento — espelha o `remove_diacritics 2` do FTS do SQLite. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

interface Entry {
  id: number
  label: string
  folded: string
}

let entries: Entry[] | null = null
let loading: Promise<Entry[]> | null = null

/**
 * O indice (513 KB, 13.800 pictogramas) so e baixado quando a busca abre pela
 * primeira vez. Colocar isso no carregamento inicial atrasaria a prancha, que e
 * o que 99% dos usos precisam.
 */
export function loadIndex(baseUrl: string): Promise<Entry[]> {
  if (entries) return Promise.resolve(entries)
  loading ??= fetch(`${baseUrl}data/search.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`indice indisponivel (${r.status})`)
      return r.json() as Promise<SearchRecord[]>
    })
    .then((recs) => {
      entries = recs.flatMap((r) =>
        r.k.map((label) => ({ id: r.i, label, folded: fold(label) })),
      )
      return entries
    })
    .catch((e: unknown) => {
      loading = null // permite nova tentativa se a rede voltar
      throw e
    })
  return loading
}

/**
 * Ranqueamento: prefixo exato vence, depois prefixo de qualquer palavra do
 * termo, depois substring. Dentro de cada faixa, rotulo mais curto primeiro —
 * quem digita "come" quer "comer", nao "comemorar aniversario".
 */
export function search(query: string, limit = 60): Card[] {
  if (!entries) return []
  const q = fold(query.trim())
  if (q.length < 2) return []

  const scored: { e: Entry; score: number }[] = []
  for (const e of entries) {
    let score: number
    if (e.folded === q) score = 0
    else if (e.folded.startsWith(q)) score = 1
    else if (e.folded.includes(` ${q}`)) score = 2
    else if (e.folded.includes(q)) score = 3
    else continue
    scored.push({ e, score })
    if (scored.length > 4000) break // teto de trabalho; ja ha resultado suficiente
  }

  scored.sort((a, b) => a.score - b.score || a.e.label.length - b.e.label.length)

  const seen = new Set<number>()
  const out: Card[] = []
  for (const { e } of scored) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    out.push({ id: e.id, label: e.label })
    if (out.length >= limit) break
  }
  return out
}
