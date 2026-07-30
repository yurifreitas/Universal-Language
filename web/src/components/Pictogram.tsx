import { useState } from 'react'
import type { Card } from '../types'
import { pictogramUrl } from '../lib/pictogram'

interface Props {
  card: Card
  eager?: boolean
}

/**
 * Imagem do pictograma com estado de carregamento e de falha.
 *
 * O fallback importa mais aqui do que num app comum: se a imagem nao carrega, a
 * pessoa perde a capacidade de dizer aquela palavra. Entao a celula continua
 * utilizavel mostrando as primeiras letras do rotulo em texto grande.
 */
export function Pictogram({ card, eager = false }: Props) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  // Celula de texto: o rotulo E a figura. Sem requisicao, sem fallback, sem
  // espera — ver `Card.texto`.
  if (card.texto) {
    return (
      <div className="picto picto--texto" aria-hidden="true">
        <span>{card.label}</span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="picto picto--fallback" aria-hidden="true">
        <span>{card.label.slice(0, 2)}</span>
      </div>
    )
  }

  return (
    <div className={`picto ${state === 'loading' ? 'picto--loading' : ''}`}>
      <img
        src={pictogramUrl(card)}
        width={320}
        height={320}
        alt=""
        aria-hidden="true"
        draggable={false}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setState('ok')}
        onError={() => setState('error')}
      />
    </div>
  )
}
