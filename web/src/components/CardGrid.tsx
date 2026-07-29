import type { Card, Settings } from '../types'
import { Pictogram } from './Pictogram'

interface Props {
  cards: Card[]
  settings: Settings
  onPick: (card: Card) => void
  emptyMessage?: string
}

/**
 * Grade de cards.
 *
 * Regra dura de CAA: a posicao de uma celula nunca muda. Nada de reordenar por
 * frequencia de uso, nada de "recentes" no inicio — o aprendizado se apoia em
 * memoria motora, e mover a celula apaga o que a pessoa aprendeu.
 */
export function CardGrid({ cards, settings, onPick, emptyMessage }: Props) {
  if (!cards.length) {
    return <p className="grid__empty">{emptyMessage ?? 'Nada aqui.'}</p>
  }
  return (
    <div
      className="grid"
      style={{ '--cols': settings.columns } as React.CSSProperties}
      role="list"
    >
      {cards.map((card, i) => (
        <button
          key={`${card.id}-${card.label}`}
          type="button"
          role="listitem"
          className="card"
          onClick={() => onPick(card)}
          title={card.label}
        >
          <Pictogram card={card} eager={i < settings.columns * 2} />
          <span className="card__label">{card.label}</span>
        </button>
      ))}
    </div>
  )
}
