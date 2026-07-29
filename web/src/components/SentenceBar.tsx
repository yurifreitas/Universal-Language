import type { Card } from '../types'
import { Pictogram } from './Pictogram'

interface Props {
  sentence: Card[]
  onSpeak: () => void
  onBackspace: () => void
  onClear: () => void
  onRemoveAt: (index: number) => void
}

/**
 * Barra da frase: os cards escolhidos, em ordem, e os controles de fala.
 *
 * Fica no topo e sempre visivel — e o "visor" do usuario, o equivalente ao que
 * ele esta prestes a dizer. Nunca deve rolar para fora da tela.
 */
export function SentenceBar({
  sentence,
  onSpeak,
  onBackspace,
  onClear,
  onRemoveAt,
}: Props) {
  const text = sentence.map((c) => c.label).join(' ')
  const empty = sentence.length === 0

  return (
    <div className="sentence">
      <div className="sentence__strip" role="list" aria-label="Frase em construção">
        {empty ? (
          <p className="sentence__hint">Toque nos cards para montar a frase</p>
        ) : (
          sentence.map((card, i) => (
            <button
              // indice no key: a mesma palavra pode repetir na frase ("mais mais")
              key={`${card.id}-${i}`}
              type="button"
              role="listitem"
              className="chip"
              onClick={() => onRemoveAt(i)}
              aria-label={`Remover ${card.label}`}
            >
              <Pictogram card={card} eager />
              <span className="chip__label">{card.label}</span>
            </button>
          ))
        )}
      </div>

      <div className="sentence__actions">
        <button
          type="button"
          className="btn btn--speak"
          onClick={onSpeak}
          disabled={empty}
          aria-label={empty ? 'Falar frase (frase vazia)' : `Falar: ${text}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" width="26" height="26">
            <path
              fill="currentColor"
              d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 2.2v2.1a7.5 7.5 0 0 1 0 15.4v2.1a9.6 9.6 0 0 0 0-19.6z"
            />
          </svg>
          <span>Falar</span>
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onBackspace}
          disabled={empty}
          aria-label="Apagar último card"
        >
          ⌫
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onClear}
          disabled={empty}
          aria-label="Limpar frase"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
