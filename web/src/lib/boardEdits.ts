import type { Board, Card } from '../types'

/**
 * Edicao de pranchas.
 *
 * PRINCIPIO: as pranchas de fabrica em `boards.json` NUNCA sao alteradas. O que
 * o usuario faz vira uma camada de sobreposicao guardada a parte, aplicada na
 * leitura. Assim uma atualizacao do app pode corrigir um pictograma errado ou
 * acrescentar vocabulario sem apagar o trabalho de quem personalizou — e
 * "restaurar a prancha de fabrica" e sempre um botao, nunca uma reinstalacao.
 *
 * POR QUE PERSONALIZAR IMPORTA
 *
 * O vocabulario de fabrica e um chute razoavel sobre uma pessoa que nao
 * existe. O nome do irmao, a comida daquela casa, o apelido do cachorro e o
 * jeito que a familia chama o banheiro nao estao — e sao justamente as
 * palavras que a pessoa mais precisa dizer. Uma prancha que nao se edita e uma
 * prancha de outra pessoa.
 *
 * O RISCO, E COMO ELE E TRATADO
 *
 * Mover uma celula apaga memoria motora (LAMP — ver LANGUAGE-SYSTEMS.md secao
 * 5). Por isso reordenar existe, mas e a operacao mais explicita do editor, com
 * aviso proprio: quem edita precisa saber que esta cobrando um preco de quem
 * usa. Acrescentar no fim e barato; mover o que ja foi aprendido nao e.
 */

export interface BoardEdit {
  /** Chaves de cards ocultados. O card de fabrica continua no JSON. */
  hidden: string[]
  /** Chave do card → rotulo novo. */
  renamed: Record<string, string>
  /** Cards acrescentados pelo usuario, sempre depois dos de fabrica. */
  added: Card[]
  /** Ordem explicita por chave. Ausente = ordem de fabrica. */
  order?: string[]
}

export type BoardEdits = Record<string, BoardEdit>

/** Prancha inteira criada pelo usuario. */
export interface CustomBoard {
  id: string
  name: string
  icon: string
  cards: Card[]
}

export const EMPTY_EDIT: BoardEdit = { hidden: [], renamed: {}, added: [] }

/**
 * Identidade de um card dentro de uma prancha. Usa id do pictograma + rotulo
 * de fabrica porque o mesmo pictograma pode aparecer com rotulos diferentes
 * (o 23710 e avo e avo), e o indice mudaria a cada edicao.
 */
export const cardKey = (card: Card): string => `${card.id}:${card.label}`

export function applyEdits(board: Board, edits: BoardEdits): Board {
  const edit = edits[board.id]
  if (!edit) return board

  const hidden = new Set(edit.hidden)
  const all = [...board.cards, ...edit.added]
    .filter((c) => !hidden.has(cardKey(c)))
    .map((c) => {
      const renamed = edit.renamed[cardKey(c)]
      return renamed ? { ...c, label: renamed } : c
    })

  if (!edit.order?.length) return { ...board, cards: all }

  // Ordem explicita: o que estiver nela vem primeiro, na ordem dada; o que
  // tiver aparecido depois (atualizacao do app) entra no fim, e nao some.
  const byKey = new Map(all.map((c) => [cardKey(c), c]))
  const ordered: Card[] = []
  for (const key of edit.order) {
    const card = byKey.get(key)
    if (card) {
      ordered.push(card)
      byKey.delete(key)
    }
  }
  return { ...board, cards: [...ordered, ...byKey.values()] }
}

/** A prancha foi tocada pelo usuario? Decide se o botao de restaurar aparece. */
export function isEdited(boardId: string, edits: BoardEdits): boolean {
  const e = edits[boardId]
  if (!e) return false
  return (
    e.hidden.length > 0 ||
    Object.keys(e.renamed).length > 0 ||
    e.added.length > 0 ||
    Boolean(e.order?.length)
  )
}

export function editOf(boardId: string, edits: BoardEdits): BoardEdit {
  return edits[boardId] ?? EMPTY_EDIT
}

/* ----------------------------------------------------------- operacoes */

const withEdit = (
  edits: BoardEdits,
  boardId: string,
  fn: (e: BoardEdit) => BoardEdit,
): BoardEdits => ({ ...edits, [boardId]: fn(editOf(boardId, edits)) })

export const hideCard = (edits: BoardEdits, boardId: string, card: Card): BoardEdits =>
  withEdit(edits, boardId, (e) => {
    const key = cardKey(card)
    // Card acrescentado pelo usuario e removido de verdade; card de fabrica e
    // so escondido, para poder voltar.
    const wasAdded = e.added.some((c) => cardKey(c) === key)
    return wasAdded
      ? { ...e, added: e.added.filter((c) => cardKey(c) !== key) }
      : { ...e, hidden: [...e.hidden, key] }
  })

export const renameCard = (
  edits: BoardEdits,
  boardId: string,
  card: Card,
  label: string,
): BoardEdits =>
  withEdit(edits, boardId, (e) => {
    const key = cardKey(card)
    const renamed = { ...e.renamed }
    // Voltar ao rotulo de fabrica apaga a entrada em vez de guardar o igual.
    if (!label.trim() || label.trim() === card.label) delete renamed[key]
    else renamed[key] = label.trim()
    return { ...e, renamed }
  })

export const addCard = (edits: BoardEdits, boardId: string, card: Card): BoardEdits =>
  withEdit(edits, boardId, (e) => {
    const key = cardKey(card)
    if (e.added.some((c) => cardKey(c) === key)) return e
    // Se o card estava so escondido, acrescentar de volta o revela na posicao
    // original — nao o joga no fim, o que moveria tudo depois dele.
    if (e.hidden.includes(key)) return { ...e, hidden: e.hidden.filter((k) => k !== key) }
    return { ...e, added: [...e.added, card] }
  })

/** Move uma celula. A operacao cara — ver o aviso no topo do arquivo. */
export const moveCard = (
  edits: BoardEdits,
  board: Board,
  from: number,
  to: number,
): BoardEdits => {
  const current = applyEdits(board, edits).cards
  if (to < 0 || to >= current.length || from === to) return edits
  const keys = current.map(cardKey)
  const [moved] = keys.splice(from, 1)
  if (!moved) return edits
  keys.splice(to, 0, moved)
  return withEdit(edits, board.id, (e) => ({ ...e, order: keys }))
}

export const resetBoard = (edits: BoardEdits, boardId: string): BoardEdits => {
  const next = { ...edits }
  delete next[boardId]
  return next
}

/* ------------------------------------------------------ pranchas proprias */

/** Id estavel sem depender de relogio nem de sorteio (que quebram em teste). */
export function customBoardId(name: string, existing: CustomBoard[]): string {
  const slug =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'prancha'
  if (!existing.some((b) => b.id === slug)) return slug
  let n = 2
  while (existing.some((b) => b.id === `${slug}-${n}`)) n++
  return `${slug}-${n}`
}
