import { useEffect, useRef, useState } from 'react'
import type { Card, Settings } from '../types'
import { loadIndex, search } from '../lib/search'
import { CardGrid } from './CardGrid'
import { Dialog } from './Dialog'

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
    if (status !== 'ready') return
    // Debounce curto: a busca varre ~20 mil termos e roda na thread principal.
    const t = setTimeout(() => setResults(search(query)), 120)
    return () => clearTimeout(t)
  }, [query, status])

  const statusText =
    status === 'loading'
      ? 'Carregando índice…'
      : status === 'error'
        ? 'Índice indisponível. Verifique a conexão.'
        : query.trim().length < 2
          ? 'Digite ao menos 2 letras.'
          : `${results.length} resultado(s)`

  return (
    <Dialog
      title="Buscar pictograma"
      onClose={onClose}
      status={statusText}
      headerContent={
        <input
          ref={inputRef}
          className="overlay__input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar entre 13.800 pictogramas…"
          aria-label="Buscar pictograma"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      }
    >
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
    </Dialog>
  )
}
