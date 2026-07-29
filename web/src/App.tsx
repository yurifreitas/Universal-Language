import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Board, Card, Settings } from './types'
import { loadSettings, saveSettings } from './lib/storage'
import { speak, speechSupported } from './lib/speech'
import { SentenceBar } from './components/SentenceBar'
import { CardGrid } from './components/CardGrid'
import { SearchOverlay } from './components/SearchOverlay'
import { SettingsPanel } from './components/SettingsPanel'

const BASE = import.meta.env.BASE_URL

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeBoard, setActiveBoard] = useState(0)
  const [sentence, setSentence] = useState<Card[]>([])
  const [panel, setPanel] = useState<'none' | 'search' | 'settings'>('none')
  const unlockTimer = useRef<number | null>(null)

  useEffect(() => {
    fetch(`${BASE}data/boards.json`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<Board[]>
      })
      .then(setBoards)
      .catch(() => setError('Não foi possível carregar as pranchas.'))
  }, [])

  useEffect(() => saveSettings(settings), [settings])

  useEffect(() => {
    const root = document.documentElement
    root.dataset['theme'] = settings.theme
    root.dataset['contrast'] = settings.highContrast ? 'high' : 'normal'
  }, [settings.theme, settings.highContrast])

  const patch = useCallback((p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p })), [])

  const sentenceText = useMemo(() => sentence.map((c) => c.label).join(' '), [sentence])

  const pick = useCallback(
    (card: Card) => {
      setSentence((s) => [...s, card])
      if (settings.speakOnTap) speak(card.label, settings)
      setPanel('none')
    },
    [settings],
  )

  // Atalhos de teclado: cuidadores frequentemente usam o app num tablet com
  // teclado acoplado, ou num notebook durante a terapia.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel !== 'none') return
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return
      if (e.key === 'Enter' && sentence.length) {
        e.preventDefault()
        speak(sentenceText, settings)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        setSentence((s) => s.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, sentence.length, sentenceText, settings])

  /** Destravar exige pressao longa: um toque acidental nao tira a crianca da prancha. */
  const startUnlock = () => {
    unlockTimer.current = window.setTimeout(() => patch({ locked: false }), 2000)
  }
  const cancelUnlock = () => {
    if (unlockTimer.current) window.clearTimeout(unlockTimer.current)
    unlockTimer.current = null
  }

  if (error) {
    return (
      <div className="boot">
        <p className="boot__msg boot__msg--error">{error}</p>
      </div>
    )
  }
  if (!boards) {
    return (
      <div className="boot">
        <div className="boot__pulse" aria-hidden="true" />
        <p className="boot__msg">Carregando pranchas…</p>
      </div>
    )
  }

  const board = boards[activeBoard] ?? boards[0]

  return (
    <div className="app">
      {/* Controles do cuidador no topo, nao no rodape: longe do alcance de quem
          esta tocando os cards, e fora do caminho do polegar da crianca. */}
      <header className="topbar">
        <div className="shell topbar__inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="brand__name">Fala</span>
          </div>

          <div className="topbar__actions">
            {settings.locked ? (
              <button
                type="button"
                className="btn btn--ghost btn--locked"
                onPointerDown={startUnlock}
                onPointerUp={cancelUnlock}
                onPointerLeave={cancelUnlock}
                onContextMenu={(e) => e.preventDefault()}
                aria-label="Manter pressionado por 2 segundos para destravar"
              >
                <span aria-hidden="true">🔒</span>
                <span className="btn__text">Segure para destravar</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setPanel('search')}
                >
                  <span aria-hidden="true">🔍</span>
                  <span className="btn__text">Buscar</span>
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setPanel('settings')}
                >
                  <span aria-hidden="true">⚙</span>
                  <span className="btn__text">Ajustes</span>
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => patch({ locked: true })}
                  aria-label="Travar na prancha"
                >
                  <span aria-hidden="true">🔓</span>
                  <span className="btn__text">Travar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="shell shell--flush">
        <SentenceBar
          sentence={sentence}
          onSpeak={() => speak(sentenceText, settings)}
          onBackspace={() => setSentence((s) => s.slice(0, -1))}
          onClear={() => setSentence([])}
          onRemoveAt={(i) => setSentence((s) => s.filter((_, j) => j !== i))}
        />
      </div>

      {!speechSupported && (
        <div className="shell">
          <p className="banner">
            Este navegador não tem síntese de voz. Os cards funcionam, mas não haverá som.
          </p>
        </div>
      )}

      <nav className="tabs" aria-label="Pranchas">
        <div className="shell tabs__inner">
          {boards.map((b, i) => (
            <button
              key={b.id}
              type="button"
              className={`tab ${i === activeBoard ? 'tab--active' : ''}`}
              onClick={() => setActiveBoard(i)}
              aria-current={i === activeBoard ? 'page' : undefined}
            >
              <span className="tab__icon" aria-hidden="true">
                {b.icon}
              </span>
              <span className="tab__name">{b.name}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="board">
        <div className="shell">
          {board && <CardGrid cards={board.cards} settings={settings} onPick={pick} />}
        </div>
      </main>

      {panel === 'search' && (
        <SearchOverlay
          settings={settings}
          baseUrl={BASE}
          onPick={pick}
          onClose={() => setPanel('none')}
        />
      )}
      {panel === 'settings' && (
        <SettingsPanel settings={settings} onChange={patch} onClose={() => setPanel('none')} />
      )}
    </div>
  )
}
