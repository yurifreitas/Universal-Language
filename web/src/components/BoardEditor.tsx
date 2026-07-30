import { useEffect, useState } from 'react'
import type { Board, Card, Settings } from '../types'
import {
  addCard,
  applyEdits,
  cardKey,
  hideCard,
  isEdited,
  moveCard,
  renameCard,
  resetBoard,
  type BoardEdits,
  type CustomBoard,
} from '../lib/boardEdits'
import { regionalLabel } from '../lib/regional'
import { loadIndex, search } from '../lib/search'
import { Pictogram } from './Pictogram'
import { Dialog } from './Dialog'

interface Props {
  settings: Settings
  /** Pranchas de fabrica, sem edicao aplicada. */
  factory: Board[]
  customBoards: CustomBoard[]
  edits: BoardEdits
  baseUrl: string
  /** Prancha aberta quando o editor foi chamado. */
  initialBoardId: string
  onEdits: (edits: BoardEdits) => void
  onCustomBoards: (boards: CustomBoard[]) => void
  onClose: () => void
}

/**
 * Editor de pranchas.
 *
 * Tres operacoes baratas — renomear, esconder, acrescentar — e uma cara:
 * mover. A cara tem aviso proprio, porque quem edita raramente e quem usa, e o
 * custo de mover uma celula aprendida recai sobre quem usa.
 *
 * Nada aqui altera `boards.json`: tudo vira sobreposicao. Ver `lib/boardEdits.ts`.
 */
export function BoardEditor({
  settings,
  factory,
  customBoards,
  edits,
  baseUrl,
  initialBoardId,
  onEdits,
  onCustomBoards,
  onClose,
}: Props) {
  const boards: Board[] = [...factory, ...customBoards]
  const [boardId, setBoardId] = useState(
    boards.some((b) => b.id === initialBoardId) ? initialBoardId : (boards[0]?.id ?? ''),
  )
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Card[]>([])
  const [ready, setReady] = useState(false)
  const [newBoard, setNewBoard] = useState('')
  /** Apagar prancha exige dois toques — destroi trabalho inteiro. */
  const [confirmar, setConfirmar] = useState<string | null>(null)

  useEffect(() => {
    loadIndex(baseUrl)
      .then(() => setReady(true))
      .catch(() => setReady(false))
  }, [baseUrl])

  useEffect(() => {
    // Debounce: a busca varre ~20 mil termos de forma sincrona, e rodar a cada
    // tecla travava o proprio campo enquanto se digitava — parte da sensacao
    // de "campo ruim".
    const t = setTimeout(
      () => setResults(ready && query.trim().length >= 2 ? search(query, 12) : []),
      140,
    )
    return () => clearTimeout(t)
  }, [query, ready])

  const isCustom = customBoards.some((b) => b.id === boardId)
  const source = boards.find((b) => b.id === boardId)
  const board = source ? (isCustom ? source : applyEdits(source, edits)) : null

  /* Uma prancha propria nao tem versao de fabrica: editar mexe nos cards
     diretamente, em vez de guardar sobreposicao. */
  const patchCustom = (fn: (cards: Card[]) => Card[]) =>
    onCustomBoards(customBoards.map((b) => (b.id === boardId ? { ...b, cards: fn(b.cards) } : b)))

  const remove = (card: Card) => {
    if (!board) return
    if (isCustom) patchCustom((cs) => cs.filter((c) => cardKey(c) !== cardKey(card)))
    else onEdits(hideCard(edits, board.id, card))
  }

  const rename = (card: Card, label: string) => {
    if (!board) return
    if (isCustom)
      patchCustom((cs) =>
        cs.map((c) => (cardKey(c) === cardKey(card) ? { ...c, label: label || c.label } : c)),
      )
    else onEdits(renameCard(edits, board.id, card, label))
  }

  const add = (card: Card) => {
    if (!board) return
    if (isCustom) {
      patchCustom((cs) => (cs.some((c) => cardKey(c) === cardKey(card)) ? cs : [...cs, card]))
    } else onEdits(addCard(edits, board.id, card))
    setQuery('')
  }

  const move = (from: number, to: number) => {
    if (!board) return
    if (isCustom) {
      patchCustom((cs) => {
        if (to < 0 || to >= cs.length) return cs
        const next = [...cs]
        const [m] = next.splice(from, 1)
        if (!m) return cs
        next.splice(to, 0, m)
        return next
      })
    } else if (source) onEdits(moveCard(edits, source, from, to))
  }

  const createBoard = () => {
    const name = newBoard.trim()
    if (!name) return
    // Import tardio evitaria ciclo, mas o modulo nao importa este arquivo:
    // manter direto e mais legivel.
    const id = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const unique = boards.some((b) => b.id === id) ? `${id}-${boards.length}` : id || 'prancha'
    onCustomBoards([...customBoards, { id: unique, name, icon: '✎', cards: [] }])
    setNewBoard('')
    setBoardId(unique)
  }

  return (
    <Dialog title="Editar pranchas" onClose={onClose}>
      <div className="shell settings">
        <section className="settings__group">
          <p className="settings__note">
            As pranchas de fábrica não são alteradas: o que você faz aqui é uma camada por cima,
            e "restaurar" desfaz tudo de uma vez. Assim uma atualização do app não apaga a sua
            personalização.
          </p>
          <label className="field">
            <span>Prancha</span>
            <select value={boardId} onChange={(e) => setBoardId(e.target.value)}>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {customBoards.some((c) => c.id === b.id) ? ' (sua)' : ''}
                </option>
              ))}
            </select>
          </label>

          {board && !isCustom && isEdited(board.id, edits) && (
            <button
              type="button"
              className="btn btn--ghost btn--wide"
              onClick={() => onEdits(resetBoard(edits, board.id))}
            >
              ↺ Restaurar a prancha de fábrica
            </button>
          )}
          {board && isCustom && (
            <button
              type="button"
              className="btn btn--ghost btn--wide btn--danger"
              onClick={() => {
                if (confirmar !== board.id) {
                  setConfirmar(board.id)
                  return
                }
                onCustomBoards(customBoards.filter((b) => b.id !== board.id))
                setConfirmar(null)
                setBoardId(factory[0]?.id ?? '')
              }}
            >
              {confirmar === board.id
                ? '✕ Tocar de novo para apagar mesmo'
                : '✕ Apagar esta prancha'}
            </button>
          )}
        </section>

        <section className="settings__group">
          <h3>Acrescentar card</h3>
          <label className="field">
            <span>Buscar no acervo ARASAAC</span>
            <input
              type="search"
              value={query}
              placeholder="cachorro, pizza, vovó…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {!ready && <p className="settings__note">Carregando o índice de busca…</p>}
          {results.length > 0 && (
            <div className="editor__results">
              {results.map((c) => (
                <button key={c.id} type="button" className="editor__result" onClick={() => add(c)}>
                  <Pictogram card={c} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          )}
          <p className="settings__note">
            O card entra <strong>no fim</strong> da prancha. É de propósito: acrescentar no fim
            não move nenhuma célula já aprendida.
          </p>
        </section>

        <section className="settings__group">
          <h3>Cards desta prancha</h3>
          <p className="settings__note">
            Renomear é a edição mais útil: o pictograma genérico de "vovó" com o nome que a
            criança usa de verdade vale mais que qualquer acervo.
          </p>
          <p className="settings__note">
            <strong>Mover custa caro.</strong> A pessoa aprende onde cada palavra fica pelo
            movimento da mão, não pelo desenho. Mover uma célula apaga esse aprendizado — use as
            setas só quando o ganho compensar.
          </p>

          {board?.cards.length === 0 && (
            <p className="settings__note">
              Prancha vazia. Use a busca <strong>Acrescentar card</strong>, logo acima, para pôr
              a primeira palavra.
            </p>
          )}

          <ul className="editor__list">
            {(board?.cards ?? []).map((card, i) => (
              <li key={cardKey(card)} className="editor__row">
                <Pictogram card={card} />
                <input
                  type="text"
                  className="editor__name"
                  defaultValue={regionalLabel(card.label, settings.region)}
                  // O rotulo tem de bater com o que esta escrito no campo: era
                  // o canonico ("mandioca") num campo mostrando o regional
                  // ("macaxeira"), e o leitor de tela anunciava outra palavra.
                  aria-label={`Nome do card ${regionalLabel(card.label, settings.region)}`}
                  onBlur={(e) => rename(card, e.target.value)}
                  // Salvar tambem no Enter: fechar o dialogo pelo ✕ podia
                  // desmontar o campo antes do blur e perder a edicao.
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      rename(card, (e.target as HTMLInputElement).value)
                      ;(e.target as HTMLInputElement).blur()
                    }
                  }}
                />
                <span className="editor__actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Mover ${card.label} para antes`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => move(i, i + 1)}
                    disabled={i === (board?.cards.length ?? 0) - 1}
                    aria-label={`Mover ${card.label} para depois`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => remove(card)}
                    aria-label={`Remover ${card.label} da prancha`}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {!board && (
            <p className="settings__note">Nenhuma prancha selecionada.</p>
          )}
        </section>

        <form
          className="settings__group"
          onSubmit={(e) => {
            e.preventDefault()
            createBoard()
          }}
        >
          <h3>Nova prancha</h3>
          <label className="field">
            <span>Nome</span>
            <input
              type="text"
              value={newBoard}
              placeholder="Casa da vó, Terapia, Futebol…"
              enterKeyHint="done"
              onChange={(e) => setNewBoard(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn--speak btn--wide" disabled={!newBoard.trim()}>
            + Criar prancha
          </button>
          <p className="settings__note">
            Pranchas próprias entram depois das de fábrica, nunca no meio delas.
          </p>
        </form>
      </div>
    </Dialog>
  )
}
