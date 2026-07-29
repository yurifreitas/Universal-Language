import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Board, Card, Settings } from './types'
import {
  HISTORY_LIMIT,
  loadFavorites,
  loadHistory,
  loadMyPhrases,
  loadSettings,
  saveFavorites,
  saveHistory,
  saveMyPhrases,
  saveSettings,
} from './lib/storage'
import { speak, speakCue, speechSupported } from './lib/speech'
import { compose, NO_MARKS, type GrammarMarks } from './lib/grammar'
import { earcon } from './lib/audio'
import { useScanning } from './lib/useScanning'
import { useRovingFocus } from './lib/useRovingFocus'
import { SentenceBar } from './components/SentenceBar'
import { BoardTabs, panelId, tabId } from './components/BoardTabs'
import { CardGrid } from './components/CardGrid'
import { SearchOverlay } from './components/SearchOverlay'
import { SettingsPanel } from './components/SettingsPanel'
import { PhrasesPanel } from './components/PhrasesPanel'
import { HelpOverlay } from './components/HelpOverlay'

const BASE = import.meta.env.BASE_URL

type Panel = 'none' | 'search' | 'settings' | 'help' | 'phrases'

const TOOLS = [
  { key: 'phrases', icon: '💬', label: 'Frases', aria: 'Frases prontas' },
  { key: 'search', icon: '🔍', label: 'Buscar', aria: 'Buscar pictograma' },
  { key: 'help', icon: '?', label: 'Ajuda', aria: 'Atalhos e acesso' },
  { key: 'settings', icon: '⚙', label: 'Ajustes', aria: 'Configurações' },
  { key: 'lock', icon: '🔓', label: 'Travar', aria: 'Travar na prancha' },
] as const

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [favorites, setFavorites] = useState<Card[]>(loadFavorites)
  const [myPhrases, setMyPhrases] = useState<Card[]>(loadMyPhrases)
  const [history, setHistory] = useState<Card[]>(loadHistory)
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeBoard, setActiveBoard] = useState(0)
  const [sentence, setSentence] = useState<Card[]>([])
  // Marcadores gramaticais valem para a frase corrente, nao sao preferencia:
  // zeram junto com ela.
  const [marks, setMarks] = useState<GrammarMarks>(NO_MARKS)
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
  useEffect(() => saveMyPhrases(myPhrases), [myPhrases])
  useEffect(() => saveHistory(history), [history])

  useEffect(() => {
    const root = document.documentElement
    root.dataset['theme'] = settings.theme
    root.dataset['contrast'] = settings.highContrast ? 'high' : 'normal'
    root.dataset['dyslexia'] = settings.dyslexia ? 'on' : 'off'
    root.dataset['colors'] = settings.wordColors
    root.dataset['font'] = settings.font

    // Conforto sensorial continuo: um unico numero 0–1 que o CSS usa para
    // interpolar acento, fundo do card e alerta. Nao ha modo "ligado" — ha
    // quanto. Ver SENSORY.md secao 1.
    const s = Math.min(100, Math.max(0, settings.sensory)) / 100
    root.style.setProperty('--sensory', String(s))
    root.dataset['sensory'] = s > 0 ? 'on' : 'off'

    // Tipografia: `0` significa "deixa como o tema define", entao a variavel e
    // removida em vez de escrita com um valor neutro qualquer.
    root.style.setProperty('--text-scale', String(settings.textScale))
    if (settings.letterSpacing > 0) {
      root.style.setProperty('--letter-spacing', `${settings.letterSpacing}em`)
    } else root.style.removeProperty('--letter-spacing')
    if (settings.lineHeight > 0) {
      root.style.setProperty('--line-height', String(settings.lineHeight))
    } else root.style.removeProperty('--line-height')
  }, [
    settings.theme,
    settings.highContrast,
    settings.dyslexia,
    settings.wordColors,
    settings.font,
    settings.sensory,
    settings.textScale,
    settings.letterSpacing,
    settings.lineHeight,
  ])

  const patch = useCallback((p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p })), [])
  const tools = useRovingFocus(TOOLS.length)

  /** Favoritos entram como prancha extra, no fim: as posicoes fixas nao se movem. */
  const allBoards = useMemo<Board[]>(() => {
    if (!boards) return []
    if (!favorites.length) return boards
    return [...boards, { id: 'favoritos', name: 'Favoritos', icon: '★', cards: favorites }]
  }, [boards, favorites])

  const board = allBoards[activeBoard] ?? allBoards[0]
  const cards = board?.cards ?? []

  /**
   * A frase, nas duas formas. `composed` e null com a gramatica desligada — e
   * so entao que o app fala a selecao literal. Ver GRAMMAR.md: a saida
   * flexionada e camada de apoio, nunca a unica fala possivel.
   */
  const composed = useMemo(
    () =>
      settings.grammar
        ? compose(sentence, { marks, speakerGender: settings.speakerGender })
        : null,
    [settings.grammar, settings.speakerGender, sentence, marks],
  )
  const sentenceText = useMemo(
    () => composed?.text ?? sentence.map((c) => c.label).join(' '),
    [composed, sentence],
  )

  const clearSentence = useCallback(() => {
    setSentence([])
    setMarks(NO_MARKS)
  }, [])

  /**
   * Toda fala de frase — montada ou pronta — passa por aqui e entra no
   * historico. Repetir e uma das operacoes mais frequentes numa conversa real:
   * o parceiro nao ouviu, chegou alguem novo, o ambiente estava barulhento.
   */
  const say = useCallback(
    (phrase: Card) => {
      if (!phrase.label.trim()) return
      speak(phrase.label, settings)
      setHistory((h) => {
        // Repetir a mesma frase nao cria entrada nova: o historico e atalho,
        // e uma lista com a mesma frase seis vezes nao ajuda ninguem.
        if (h[0]?.label === phrase.label) return h
        return [phrase, ...h.filter((x) => x.label !== phrase.label)].slice(0, HISTORY_LIMIT)
      })
    },
    [settings],
  )

  /** A frase montada como um card unico — icone do primeiro pictograma dela. */
  const currentPhrase = useMemo<Card | null>(
    () => (sentence.length && sentence[0] ? { id: sentence[0].id, label: sentenceText } : null),
    [sentence, sentenceText],
  )

  const pick = useCallback(
    (card: Card) => {
      setSentence((s) => [...s, card])
      if (settings.sounds) earcon.select()
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

  const onScanStep = useCallback(
    (phase: 'rows' | 'cells', index: number) => {
      if (settings.sounds) (phase === 'rows' ? earcon.scanRow : earcon.scanCell)()
      if (!settings.auditoryScanning) return
      if (phase === 'cells') {
        const c = cards[index]
        if (c) speakCue(c.label, settings)
      } else {
        // Na fase de linhas anuncia a primeira palavra da linha como pista —
        // ler a linha inteira nao caberia no passo da varredura.
        const c = cards[index]
        if (c) speakCue(`linha, ${c.label}`, settings)
      }
    },
    [cards, settings],
  )

  const scan = useScanning({
    enabled: settings.scanning,
    speed: settings.scanSpeed,
    total: cards.length,
    columns: settings.columns,
    onSelect: pickByIndex,
    onStep: onScanStep,
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
      if (!settings.scanning && (e.key === 'Enter' || e.key === ' ') && currentPhrase) {
        e.preventDefault()
        say(currentPhrase)
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
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setPanel('phrases')
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
  }, [panel, currentPhrase, say, settings, allBoards.length])

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
      {/* WCAG 2.4.1 Bypass Blocks: quem navega por teclado nao deve reatravessar
          cabecalho, barra da frase e 9 abas para chegar nos cards. */}
      <a className="skip" href={board ? `#${panelId(board.id)}` : '#'}>
        Pular para a prancha
      </a>

      {/* Regiao viva: anuncia a frase em construcao a quem nao ve a tela. Como
          `polite`, espera a leitura corrente terminar em vez de interromper. */}
      <p className="sr-only" role="status" aria-live="polite">
        {sentence.length ? `Frase: ${sentenceText}` : 'Frase vazia'}
      </p>

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

          {/* Padrao Toolbar do APG: conjunto de controles agrupados, com roving
              tabindex e navegacao por setas. Tab entra e sai do grupo inteiro. */}
          <div className="topbar__actions" role="toolbar" aria-label="Controles do cuidador">
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
                {TOOLS.map((t, i) => (
                  <button
                    key={t.key}
                    ref={tools.setRef(i)}
                    type="button"
                    className="btn btn--ghost"
                    tabIndex={i === tools.focused ? 0 : -1}
                    onFocus={() => tools.setFocused(i)}
                    onKeyDown={(e) => tools.onKeyDown(e, i)}
                    onClick={() => (t.key === 'lock' ? patch({ locked: true }) : setPanel(t.key))}
                    aria-label={t.aria}
                  >
                    <span aria-hidden="true">{t.icon}</span>
                    <span className="btn__text">{t.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </header>

      <div className="shell shell--flush">
        <SentenceBar
          sentence={sentence}
          composed={composed}
          marks={marks}
          onMark={(p) => setMarks((m) => ({ ...m, ...p }))}
          onSpeak={() => currentPhrase && say(currentPhrase)}
          onBackspace={() => setSentence((s) => s.slice(0, -1))}
          onClear={clearSentence}
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

      <BoardTabs
        boards={allBoards}
        active={activeBoard}
        onChange={(i) => {
          setActiveBoard(i)
          if (settings.sounds) earcon.board()
        }}
      />

      <main
        className="board"
        // O painel da aba selecionada. tabIndex=0 porque o painel nao tem
        // focavel proprio antes dos cards, e o APG pede que ele seja alcancavel
        // por Tab a partir da aba.
        role="tabpanel"
        tabIndex={0}
        {...(board ? { id: panelId(board.id), 'aria-labelledby': tabId(board.id) } : {})}
      >
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
      {panel === 'phrases' && (
        <PhrasesPanel
          settings={settings}
          mine={myPhrases}
          history={history}
          current={currentPhrase}
          onSpeak={say}
          onSave={(p) =>
            setMyPhrases((list) =>
              list.some((x) => x.label === p.label) ? list : [...list, p],
            )
          }
          onRemoveMine={(p) => setMyPhrases((list) => list.filter((x) => x.label !== p.label))}
          onClearHistory={() => setHistory([])}
          onClose={() => setPanel('none')}
        />
      )}
      {panel === 'settings' && (
        <SettingsPanel
          settings={settings}
          favorites={favorites}
          phrases={myPhrases}
          onChange={patch}
          onImport={(p) => {
            setSettings((s) => ({ ...s, ...p.settings }))
            setFavorites(p.favorites)
            setMyPhrases(p.phrases)
          }}
          onClose={() => setPanel('none')}
        />
      )}
      {panel === 'help' && <HelpOverlay onClose={() => setPanel('none')} />}
    </div>
  )
}
