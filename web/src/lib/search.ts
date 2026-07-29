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
 * Casamento aproximado por subsequencia: todas as letras da consulta aparecem
 * no alvo, na ordem, nao necessariamente juntas. Devolve `-1` quando nao casa.
 *
 * Serve ao erro de digitacao que mais acontece de verdade — letra faltando, e
 * nao letra trocada: "cachoro" continua achando "cachorro", "brincdeira" acha
 * "brincadeira". Quem digita e o cuidador, muitas vezes com o aparelho numa mao
 * so e a crianca esperando.
 *
 * Adaptado do seletor de arquivos do ycode (`web/src/components/CommandPalette.tsx`).
 * O bonus de contiguidade e o que impede "casa" de ranquear acima de "casa" em
 * "c-a-s-a" espalhado por uma frase inteira.
 */
function fuzzyScore(query: string, target: string): number {
  let ti = 0
  let score = 0
  let streak = 0
  for (const ch of query) {
    const idx = target.indexOf(ch, ti)
    if (idx === -1) return -1
    streak = idx === ti ? streak + 2 : 0
    score += 1 + streak
    ti = idx + 1
  }
  // Sobra de alvo penaliza levemente: entre dois casamentos iguais, ganha o
  // rotulo mais justo.
  return score - (target.length - ti) * 0.01
}

/**
 * Ranqueamento: prefixo exato vence, depois prefixo de qualquer palavra do
 * termo, depois substring. Dentro de cada faixa, rotulo mais curto primeiro —
 * quem digita "come" quer "comer", nao "comemorar aniversario".
 *
 * O casamento aproximado entra por ultimo e SO quando as faixas exatas nao
 * encheram a lista: ele nunca desloca um resultado literal, so preenche o vazio
 * que antes era "nenhum pictograma encontrado".
 */
export function search(query: string, limit = 60): Card[] {
  if (!entries) return []
  const q = fold(query.trim())
  if (q.length < 2) return []

  const scored: { e: Entry; score: number }[] = []
  const fuzzy: { e: Entry; score: number }[] = []
  for (const e of entries) {
    let score: number
    if (e.folded === q) score = 0
    else if (e.folded.startsWith(q)) score = 1
    else if (e.folded.includes(` ${q}`)) score = 2
    else if (e.folded.includes(q)) score = 3
    else {
      // So vale a pena tentar o aproximado em consulta com corpo: com 2 letras
      // a subsequencia casa com quase tudo e o resultado vira ruido.
      //
      // O pre-filtro pela primeira letra nao e otimizacao gratuita: sem ele o
      // custo era percorrer 260 mil termos fazendo `indexOf` por caractere, e a
      // primeira versao usava um teto de 400 candidatos que enchia de lixo
      // antes de chegar na palavra certa — "cachoro" nao achava "cachorro"
      // porque a lista ja tinha fechado. Erro de digitacao raramente e na
      // primeira letra.
      if (q.length >= 4 && e.folded.charCodeAt(0) === q.charCodeAt(0)) {
        const f = fuzzyScore(q, e.folded)
        if (f >= 0) fuzzy.push({ e, score: -f })
      }
      continue
    }
    scored.push({ e, score })
    if (scored.length > 4000) break // teto de trabalho; ja ha resultado suficiente
  }

  if (scored.length < limit) {
    fuzzy.sort((a, b) => a.score - b.score || a.e.label.length - b.e.label.length)
    // Faixa 9: sempre depois de qualquer casamento literal.
    scored.push(...fuzzy.slice(0, limit).map((x) => ({ e: x.e, score: 9 })))
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
