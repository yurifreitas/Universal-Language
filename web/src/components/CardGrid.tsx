import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card, Settings } from '../types'
import { Pictogram } from './Pictogram'
import { wordClassOf } from '../lib/lexicon'
import type { ScanState } from '../lib/useScanning'

interface Props {
  cards: Card[]
  settings: Settings
  onPick: (card: Card) => void
  /** Toque longo: fala sem inserir na frase — exploracao sem consequencia. */
  onPreview?: (card: Card) => void
  onToggleFavorite?: (card: Card) => void
  isFavorite?: (card: Card) => boolean
  scan?: ScanState
  emptyMessage?: string
  /**
   * Celulas menores e rotulo de varias linhas. Para frases prontas: o texto e
   * longo e o alvo nao precisa do tamanho de um card de palavra, que existe
   * para quem toca com dificuldade motora fina durante uma frase inteira.
   */
  dense?: boolean
  /** Verbo da acao secundaria ("Favoritar" na prancha, "Remover" nas frases). */
  favoriteLabel?: string
}

const LONG_PRESS_MS = 550

/**
 * Grade de cards.
 *
 * Regra dura de CAA: a posicao de uma celula nunca muda. Nada de reordenar por
 * frequencia de uso, nada de "recentes" no inicio — o aprendizado se apoia em
 * memoria motora, e mover a celula apaga o que a pessoa aprendeu.
 *
 * Navegacao por teclado segue o padrao Grid do WAI-ARIA APG: um unico elemento
 * tabulavel por vez (roving tabindex), setas movem o foco.
 */
export function CardGrid({
  cards,
  settings,
  onPick,
  onPreview,
  onToggleFavorite,
  isFavorite,
  scan,
  emptyMessage,
  dense,
  favoriteLabel,
}: Props) {
  const [focus, setFocus] = useState(0)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const longPress = useRef<{ timer: number; fired: boolean } | null>(null)
  // No modo denso a coluna nao segue o ajuste da prancha: aquele numero foi
  // calibrado para o tamanho do alvo de uma palavra, e frases precisam de
  // largura, nao de altura.
  const cols = dense ? Math.max(2, Math.min(3, settings.columns)) : settings.columns

  // A prancha mudou: o foco volta ao inicio, senao apontaria para celula ausente.
  useEffect(() => setFocus(0), [cards])

  const moveFocus = useCallback(
    (next: number) => {
      const i = Math.max(0, Math.min(cards.length - 1, next))
      setFocus(i)
      refs.current[i]?.focus()
    },
    [cards.length],
  )

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    // Na varredura, Espaco/Enter pertencem ao switch, nao a navegacao.
    if (settings.scanning && (e.key === ' ' || e.key === 'Enter')) return

    const map: Record<string, number> = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      ArrowDown: i + cols,
      ArrowUp: i - cols,
      Home: 0,
      End: cards.length - 1,
      PageDown: i + cols * 3,
      PageUp: i - cols * 3,
    }
    const next = map[e.key]
    if (next === undefined) return
    e.preventDefault()
    moveFocus(next)
  }

  const startPress = (card: Card) => {
    if (!onPreview) return
    longPress.current = {
      fired: false,
      timer: window.setTimeout(() => {
        if (longPress.current) longPress.current.fired = true
        onPreview(card)
      }, LONG_PRESS_MS),
    }
  }
  const endPress = () => {
    if (longPress.current) window.clearTimeout(longPress.current.timer)
  }
  const wasLongPress = () => {
    const fired = longPress.current?.fired ?? false
    longPress.current = null
    return fired
  }

  if (!cards.length) {
    return <p className="grid__empty">{emptyMessage ?? 'Nada aqui.'}</p>
  }

  return (
    <div
      className={`grid ${dense ? 'grid--dense' : ''} ${scan && scan.phase !== 'idle' ? 'grid--scanning' : ''}`}
      style={{ '--cols': cols } as React.CSSProperties}
      // Deliberadamente NAO usa role="grid": o padrao ARIA exige elementos
      // role="row" entre a grade e as celulas, e aqui as celulas sao filhas
      // diretas do CSS Grid. Declarar grid sem linhas produz arvore de
      // acessibilidade invalida. Como `group` de botoes nativos, o leitor de
      // tela anuncia "botao, agua" — que e exatamente o util aqui. A navegacao
      // por setas continua funcionando.
      role="group"
      aria-label="Cards da prancha"
    >
      {cards.map((card, i) => {
        const scanRow = scan?.phase === 'rows' && Math.floor(i / cols) === scan.row
        const scanCell = scan?.phase === 'cells' && scan.index === i
        const fav = isFavorite?.(card) ?? false
        // Chave de Fitzgerald: a cor da celula codifica a CLASSE da palavra, e
        // nao a categoria tematica. Nao e decoracao — e a pista que sustenta a
        // construcao de frase quando a leitura ainda nao esta formada. Fica
        // atras de um ajuste porque cor a mais tambem e estimulo a mais.
        // Frase pronta nao tem classe gramatical — e uma oracao inteira. Colorir
        // pela primeira palavra seria pior que nao colorir.
        const wordClass =
          settings.wordColors === 'off' || dense ? null : wordClassOf(card.label)
        return (
          <button
            key={`${card.id}-${card.label}`}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            className={`card ${scanRow ? 'card--scan-row' : ''} ${scanCell ? 'card--scan-cell' : ''}`}
            {...(wordClass ? { 'data-class': wordClass } : {})}
            // Roving tabindex: so uma celula entra na ordem de tabulacao, para
            // que Tab pule a grade inteira em vez de 149 paradas.
            tabIndex={i === focus ? 0 : -1}
            onFocus={() => setFocus(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => {
              if (!wasLongPress()) onPick(card)
            }}
            onPointerDown={() => startPress(card)}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onContextMenu={(e) => e.preventDefault()}
            title={card.label}
            aria-label={fav ? `${card.label} (favorito)` : card.label}
          >
            <Pictogram card={card} eager={i < cols * 2} />
            <span className="card__label">{card.label}</span>
            {onToggleFavorite && (
              <span
                className={`card__fav ${fav ? 'card__fav--on' : ''}`}
                role="button"
                tabIndex={-1}
                aria-label={
                  favoriteLabel
                    ? `${favoriteLabel}: ${card.label}`
                    : fav
                      ? `Remover ${card.label} dos favoritos`
                      : `Favoritar ${card.label}`
                }
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite(card)
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {favoriteLabel ? '✕' : '★'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
