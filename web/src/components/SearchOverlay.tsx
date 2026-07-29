import { useEffect, useRef, useState } from 'react'
import type { Card, Settings } from '../types'
import { loadIndex, search } from '../lib/search'
import { CardGrid } from './CardGrid'

interface Props {
  settings: Settings
  baseUrl: string
  onPick: (card: Card) => void
  onClose: () => void
}

/** Busca sobre os 13.800 pictogramas. Indice carregado sob demanda. */
export function SearchOverlay({ settings, baseUrl, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Card[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadIndex(baseUrl)
      .then(() => setStatus('ready'))
      .catch(() => setStatus('error'))
  }, [baseUrl])

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (status !== 'ready') return
    // Debounce curto: a busca varre ~20 mil termos e roda na thread principal.
    const t = setTimeout(() => setResults(search(query)), 120)
    return () => clearTimeout(t)
  }, [query, status])

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Buscar pictograma">
      <header className="overlay__head">
        <div className="shell">
          <input
            ref={inputRef}
            className="overlay__input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar entre 13.800 pictogramas…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby="search-status"
          />
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            aria-label="Fechar busca"
          >
            ✕
          </button>
        </div>
      </header>

      <p id="search-status" className="overlay__status">
        <span className="shell">
          {status === 'loading' && 'Carregando índice…'}
          {status === 'error' && 'Índice indisponível. Verifique a conexão.'}
          {status === 'ready' && query.trim().length < 2 && 'Digite ao menos 2 letras.'}
          {status === 'ready' && query.trim().length >= 2 && `${results.length} resultado(s)`}
        </span>
      </p>

      <div className="overlay__body">
        <div className="shell">
          <CardGrid
            cards={results}
            settings={settings}
            onPick={onPick}
            emptyMessage={
              status === 'ready' && query.trim().length >= 2 ? 'Nenhum pictograma encontrado.' : ''
            }
          />
        </div>
      </div>
    </div>
  )
}
