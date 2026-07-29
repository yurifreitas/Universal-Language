import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Board, Card, Settings } from './types'
import { loadFavorites, loadSettings, saveFavorites, saveSettings } from './lib/storage'
import { speak, speechSupported } from './lib/speech'
import { useScanning } from './lib/useScanning'
import { SentenceBar } from './components/SentenceBar'
import { CardGrid } from './components/CardGrid'
import { SearchOverlay } from './components/SearchOverlay'
import { SettingsPanel } from './components/SettingsPanel'
import { HelpOverlay } from './components/HelpOverlay'

const BASE = import.meta.env.BASE_URL

type Panel = 'none' | 'search' | 'settings' | 'help'

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [favorites, setFavorites] = useState<Card[]>(loadFavorites)
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeBoard, setActiveBoard] = useState(0)
  const [sentence, setSentence] = useState<Card[]>([])
  const [panel, setPanel] = useState<Panel>('none')
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
  useEffect(() => saveFavorites(favorites), [favorites])

  useEffect(() => {
    const root = document.documentElement
    root.dataset['theme'] = settings.theme
    root.dataset['contrast'] = settings.highContrast ? 'high' : 'normal'
  }, [settings.theme, settings.highContrast])

  const patch = useCallback((p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p })), [])

  /** Favoritos entram como prancha extra, no fim: as posicoes fixas nao se movem. */
  const allBoards = useMemo<Board[]>(() => {
    if (!boards) return []
    if (!favorites.length) return boards
    return [...boards, { id: 'favoritos', name: 'Favoritos', icon: '★', cards: favorites }]
  }, [boards, favorites])

  const board = allBoards[activeBoard] ?? allBoards[0]
  const cards = board?.cards ?? []

  const sentenceText = useMemo(() => sentence.map((c) => c.label).join(' '), [sentence])

  const pick = useCallback(
    (card: Card) => {
      setSentence((s) => [...s, card])
      if (settings.speakOnTap) speak(card.label, settings)
      setPanel('none')
    },
    [settings],
  )

  const pickByIndex = useCallback(
    (i: number) => {
      const c = cards[i]
      if (c) pick(c)
    },
    [cards, pick],
  )

  const scan = useScanning({
    enabled: settings.scanning,
    speed: settings.scanSpeed,
    total: cards.length,
    columns: settings.columns,
    onSelect: pickByIndex,
    active: panel === 'none',
  })

  const toggleFavorite = useCallback((card: Card) => {
    setFavorites((f) =>
      f.some((x) => x.id === card.id && x.label === card.label)
        ? f.filter((x) => !(x.id === card.id && x.label === card.label))
        : [...f, card],
    )
  }, [])

  const isFavorite = useCallback(
    (card: Card) => favorites.some((x) => x.id === card.id && x.label === card.label),
    [favorites],
  )

  // Atalhos globais. Cuidadores usam o app em tablet com teclado acoplado ou em
  // notebook durante a terapia.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel !== 'none' || settings.locked) return
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return
      if (e.ctrlKey || e.altKey || e.metaKey) return

      // Na varredura, Espaco/Enter sao do switch — nao devem falar a frase.
      if (!settings.scanning && (e.key === 'Enter' || e.key === ' ') && sentence.length) {
        e.preventDefault()
        speak(sentenceText, settings)
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        setSentence((s) => s.slice(0, -1))
        return
      }
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setPanel('search')
        return
      }
      if (/^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1
        if (i < allBoards.length) {
          e.preventDefault()
          setActiveBoard(i)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, sentence.length, sentenceText, settings, allBoards.length])

  // A prancha de favoritos some quando o ultimo favorito e removido; sem isto o
  // indice ativo apontaria para fora do array.
  useEffect(() => {
    if (activeBoard >= allBoards.length && allBoards.length) setActiveBoard(allBoards.length - 1)
  }, [activeBoard, allBoards.length])

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

  return (
    <div className="app">
      {/* Controles do cuidador no topo, nao no rodape: longe do alcance de quem
          esta tocando os cards, e fora do caminho do polegar da crianca. */}
      <header className="topbar">
        <div className="shell topbar__inner">
          {/* h1 real: leitores de tela navegam por cabecalhos, e uma pagina sem
              nenhum h1 nao tem ponto de entrada nessa navegacao. */}
          <h1 className="brand">
            <span className="brand__mark" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="brand__name">Fala</span>
            <span className="sr-only"> — prancha de comunicação alternativa</span>
          </h1>

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
                {settings.scanning && (
                  <span className="pill" title="Varredura ativa — acione com Espaço ou Enter">
                    ⟳ Varredura
                  </span>
                )}
                <button type="button" className="btn btn--ghost" onClick={() => setPanel('search')}>
                  <span aria-hidden="true">🔍</span>
                  <span className="btn__text">Buscar</span>
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setPanel('help')}
                  aria-label="Atalhos e acesso"
                >
                  <span aria-hidden="true">?</span>
                  <span className="btn__text">Ajuda</span>
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
          {allBoards.map((b, i) => (
            <button
              key={b.id}
              type="button"
              className={`tab ${i === activeBoard ? 'tab--active' : ''}`}
              onClick={() => setActiveBoard(i)}
              aria-current={i === activeBoard ? 'page' : undefined}
              title={i < 9 ? `${b.name} (tecla ${i + 1})` : b.name}
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
          <CardGrid
            cards={cards}
            settings={settings}
            onPick={pick}
            onPreview={(c) => speak(c.label, settings)}
            {...(settings.locked ? {} : { onToggleFavorite: toggleFavorite })}
            isFavorite={isFavorite}
            scan={scan}
          />
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
      {panel === 'help' && <HelpOverlay onClose={() => setPanel('none')} />}
    </div>
  )
}
