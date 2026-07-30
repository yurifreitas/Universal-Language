import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Board, Card, Settings } from './types'
import {
  HISTORY_LIMIT,
  loadCustomBoards,
  loadEdits,
  loadFavorites,
  loadHistory,
  loadMyPhrases,
  loadScripts,
  loadSettings,
  saveCustomBoards,
  saveEdits,
  saveFavorites,
  saveHistory,
  saveMyPhrases,
  saveScripts,
  saveSettings,
} from './lib/storage'
import { applyEdits, type BoardEdits, type CustomBoard } from './lib/boardEdits'
import type { Script } from './lib/scripts'
import { speak, speakCue, speechSupported } from './lib/speech'
import { compose, NO_MARKS, type ArticleMode, type GrammarMarks } from './lib/grammar'
import { regionalLabel } from './lib/regional'
import { CORE_STRIP } from './lib/coreStrip'
import { learn, loadModel, saveModel, suggest, type PredictModel } from './lib/predict'
import { comecar, elogio, pista, responder, type GameState } from './lib/game'
import { earcon } from './lib/audio'
import { useScanning } from './lib/useScanning'
import { useRovingFocus } from './lib/useRovingFocus'
import { usePanelHistory } from './lib/usePanelHistory'
import { SentenceBar } from './components/SentenceBar'
import { BoardTabs, panelId, tabId } from './components/BoardTabs'
import { CardGrid } from './components/CardGrid'
import { Pictogram } from './components/Pictogram'
import { SearchOverlay } from './components/SearchOverlay'
import { SettingsPanel } from './components/SettingsPanel'
import { PhrasesPanel } from './components/PhrasesPanel'
import { ScriptsPanel } from './components/ScriptsPanel'
import { BoardEditor } from './components/BoardEditor'
import { HelpOverlay } from './components/HelpOverlay'

const BASE = import.meta.env.BASE_URL

/** Tempo de pressao para destravar. Longo o bastante para nao ser acidental. */
const UNLOCK_MS = 2000

/**
 * O array de artigos pode ser mais curto que a frase (posicoes nunca tocadas
 * ficam ausentes). Antes de mover, ele precisa alcancar as duas posicoes
 * envolvidas, senao o `splice` mexe no lugar errado.
 */
function padArticles(a: ArticleMode[], ...idx: number[]): ArticleMode[] {
  const need = Math.max(...idx) + 1
  if (a.length >= need) return a
  return [...a, ...Array<ArticleMode>(need - a.length).fill('auto')]
}

type Panel = 'none' | 'search' | 'settings' | 'help' | 'phrases' | 'scripts' | 'editor'

/**
 * A barra superior tem dois grupos com donos diferentes, e misturar os dois
 * fazia sete botoes iguais em fila.
 *
 * - **Falar** e de quem usa a prancha: frases prontas e roteiros sao fala, e
 *   ficam junto, primeiro, e continuam visiveis no modo bloqueado.
 * - **Ajustar** e de quem acompanha: buscar, editar, ajuda e configuracoes.
 *
 * Um separador visual entre eles custa 1px e poupa uma leitura de sete itens
 * toda vez que a pessoa procura um botao.
 */
const TOOLS = [
  { key: 'phrases', icon: '💬', label: 'Frases', aria: 'Frases prontas', group: 'falar' },
  { key: 'scripts', icon: '📋', label: 'Roteiros', aria: 'Roteiros de situações', group: 'falar' },
  { key: 'jogo', icon: '🎯', label: 'Achar', aria: 'Jogo de achar a palavra', group: 'falar' },
  { key: 'search', icon: '🔍', label: 'Buscar', aria: 'Buscar pictograma', group: 'ajustar' },
  { key: 'editor', icon: '✎', label: 'Editar', aria: 'Editar pranchas e cards', group: 'ajustar' },
  { key: 'help', icon: '?', label: 'Ajuda', aria: 'Atalhos e acesso', group: 'ajustar' },
  { key: 'settings', icon: '⚙', label: 'Ajustes', aria: 'Configurações', group: 'ajustar' },
  { key: 'lock', icon: '🔓', label: 'Travar', aria: 'Travar na prancha', group: 'ajustar' },
] as const

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [favorites, setFavorites] = useState<Card[]>(loadFavorites)
  const [myPhrases, setMyPhrases] = useState<Card[]>(loadMyPhrases)
  const [history, setHistory] = useState<Card[]>(loadHistory)
  const [edits, setEdits] = useState<BoardEdits>(loadEdits)
  const [customBoards, setCustomBoards] = useState<CustomBoard[]>(loadCustomBoards)
  const [scripts, setScripts] = useState<Script[]>(loadScripts)
  /** Modelo de sugestao: pares de palavras que a propria pessoa ja disse. */
  const [predict, setPredict] = useState<PredictModel>(loadModel)
  /** Jogo de achar a palavra. `null` quando nao esta jogando. */
  const [jogo, setJogo] = useState<GameState | null>(null)
  const [jogoFim, setJogoFim] = useState(false)
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeBoard, setActiveBoard] = useState(0)
  const [sentence, setSentence] = useState<Card[]>([])
  // Marcadores gramaticais valem para a frase corrente, nao sao preferencia:
  // zeram junto com ela.
  const [marks, setMarks] = useState<GrammarMarks>(NO_MARKS)
  /**
   * Artigo escolhido para cada posicao da frase, em passo com `sentence`.
   *
   * Array paralelo e nao mapa por id: a mesma palavra pode repetir na frase, e
   * o que identifica o bloco e a POSICAO. Toda operacao que mexe na frase mexe
   * aqui junto — senao o artigo de "bolo" passa a valer para "sorvete" depois
   * de uma remocao, que e o pior tipo de bug: silencioso e so aparece falando.
   */
  const [articles, setArticles] = useState<ArticleMode[]>([])
  const [panel, setPanel] = useState<Panel>('none')
  const unlockTimer = useRef<number | null>(null)
  const [unlocking, setUnlocking] = useState(false)

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
  useEffect(() => saveEdits(edits), [edits])
  useEffect(() => saveCustomBoards(customBoards), [customBoards])
  useEffect(() => saveScripts(scripts), [scripts])
  useEffect(() => saveModel(predict), [predict])

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

  /**
   * O botao "voltar" do Android fecha o painel aberto, e nao o app.
   * Sem isto, voltar mata a sessao com a frase montada dentro — fazendo
   * exatamente o gesto que o sistema inteiro ensinou a fazer.
   */
  const closePanel = useCallback(() => setPanel('none'), [])
  usePanelHistory(panel !== 'none', closePanel)
  const tools = useRovingFocus(TOOLS.length)

  /**
   * Ordem das pranchas: fabrica (com as edicoes do usuario aplicadas), depois
   * as pranchas proprias, depois favoritos. Tudo que o usuario cria entra no
   * FIM — a posicao das pranchas de fabrica nunca depende do que ele fez.
   */
  const allBoards = useMemo<Board[]>(() => {
    if (!boards) return []
    const base = boards.map((b) => applyEdits(b, edits))
    const custom: Board[] = customBoards.map((b) => ({ ...b, icon: b.icon || '✎' }))
    const favs: Board[] = favorites.length
      ? [{ id: 'favoritos', name: 'Favoritos', icon: '★', cards: favorites }]
      : []
    return [...base, ...custom, ...favs]
  }, [boards, edits, customBoards, favorites])

  const board = allBoards[activeBoard] ?? allBoards[0]
  const cards = board?.cards ?? []

  /**
   * Rotulo → card, de TODAS as pranchas mais a faixa de nucleo.
   *
   * A sugestao so vale se puder trazer palavra de qualquer prancha: se ela
   * ficasse restrita a prancha aberta, sugeriria justamente o que ja esta na
   * tela — e o custo que ela existe para cortar e o de trocar de prancha.
   */
  const vocabulario = useMemo(() => {
    const m = new Map<string, Card>()
    for (const c of CORE_STRIP) m.set(c.label, c)
    for (const b of allBoards) for (const c of b.cards) if (!m.has(c.label)) m.set(c.label, c)
    return m
  }, [allBoards])

  const sugestoes = useMemo(
    () =>
      settings.suggestions
        ? suggest(predict, sentence.at(-1)?.label ?? null, vocabulario).filter(
            (c) => c.label !== sentence.at(-1)?.label,
          )
        : [],
    [settings.suggestions, predict, sentence, vocabulario],
  )

  /**
   * A frase, nas duas formas. `composed` e null com a gramatica desligada — e
   * so entao que o app fala a selecao literal. Ver GRAMMAR.md: a saida
   * flexionada e camada de apoio, nunca a unica fala possivel.
   */
  const composed = useMemo(
    () =>
      settings.grammar
        ? compose(sentence, {
            marks,
            articles,
            speakerGender: settings.speakerGender,
            region: settings.region,
            register: settings.register,
          })
        : null,
    [
      settings.grammar,
      settings.speakerGender,
      settings.region,
      settings.register,
      sentence,
      marks,
      articles,
    ],
  )
  const sentenceText = useMemo(
    () => composed?.text ?? sentence.map((c) => regionalLabel(c.label, settings.region)).join(' '),
    [composed, sentence, settings.region],
  )

  /** Uma palavra solta, dita na variedade escolhida. */
  const word = useCallback(
    (card: Card) => regionalLabel(card.label, settings.region),
    [settings.region],
  )

  /**
   * Reordenar a frase no proprio bloco.
   *
   * Antes, corrigir a ordem de uma frase montada exigia apagar tudo depois do
   * erro e refazer. Numa prancha onde cada palavra custa um toque — e para
   * quem usa varredura, varios segundos — isso e caro o bastante para a pessoa
   * preferir dizer a frase errada.
   */
  const moveInSentence = useCallback((from: number, to: number) => {
    const mover = <T,>(arr: T[]): T[] => {
      const next = [...arr]
      const [moved] = next.splice(from, 1)
      if (moved === undefined) return arr
      next.splice(to, 0, moved)
      return next
    }
    setSentence((s) => (to < 0 || to >= s.length || from === to ? s : mover(s)))
    setArticles((a) => (to < 0 || from === to ? a : mover(padArticles(a, from, to))))
  }, [])

  const removeAt = useCallback((i: number) => {
    setSentence((s) => s.filter((_, j) => j !== i))
    setArticles((a) => a.filter((_, j) => j !== i))
  }, [])

  const clearSentence = useCallback(() => {
    setSentence([])
    setArticles([])
    setMarks(NO_MARKS)
  }, [])

  /** Percorre auto → o/a → um/uma → nenhum, e volta. */
  const cycleArticle = useCallback((index: number) => {
    setArticles((a) => {
      const next = [...a]
      const atual = next[index] ?? 'auto'
      const ordem: ArticleMode[] = ['auto', 'def', 'indef', 'none']
      next[index] = ordem[(ordem.indexOf(atual) + 1) % ordem.length]!
      return next
    })
  }, [])

  /**
   * Toda fala de frase — montada ou pronta — passa por aqui e entra no
   * historico. Repetir e uma das operacoes mais frequentes numa conversa real:
   * o parceiro nao ouviu, chegou alguem novo, o ambiente estava barulhento.
   */
  const say = useCallback(
    (phrase: Card, onEnd?: () => void) => {
      if (!phrase.label.trim()) return
      speak(phrase.label, settings, onEnd)
      // Aprende no momento em que a pessoa FALA — frase montada e desfeita sem
      // ser dita nao e fala, e aprender com ela ensinaria o modelo a sugerir os
      // enganos.
      if (sentence.length > 1) setPredict((m) => learn(m, sentence))
      setHistory((h) => {
        // Repetir a mesma frase nao cria entrada nova: o historico e atalho,
        // e uma lista com a mesma frase seis vezes nao ajuda ninguem.
        if (h[0]?.label === phrase.label) return h
        return [phrase, ...h.filter((x) => x.label !== phrase.label)].slice(0, HISTORY_LIMIT)
      })
    },
    [settings, sentence],
  )

  /** A frase montada como um card unico — icone do primeiro pictograma dela. */
  const currentPhrase = useMemo<Card | null>(
    () => (sentence.length && sentence[0] ? { id: sentence[0].id, label: sentenceText } : null),
    [sentence, sentenceText],
  )

  const pick = useCallback(
    (card: Card) => {
      // Com o jogo ativo, tocar um card e uma RESPOSTA — nao entra na frase.
      // Errar nao penaliza: o app so repete a pista.
      if (jogo) {
        const r = responder(jogo, card, cards)
        if (!r.acertou) {
          speak(pista(regionalLabel(jogo.target.label, settings.region), jogo.acertos), settings)
          return
        }
        if (settings.sounds) earcon.select()
        if (r.terminou) {
          setJogo(null)
          setJogoFim(true)
          speak('Você achou todas! Muito bem.', settings)
        } else if (r.proximo) {
          setJogo(r.proximo)
          const fala = `${elogio(jogo.acertos)} ${pista(
            regionalLabel(r.proximo.target.label, settings.region),
            r.proximo.acertos,
          )}`
          speak(fala, settings)
        }
        return
      }

      setSentence((s) => [...s, card])
      setArticles((a) => [...a, 'auto'])
      if (settings.sounds) earcon.select()
      if (settings.speakOnTap) speak(regionalLabel(card.label, settings.region), settings)
      setPanel('none')
    },
    [settings, jogo, cards],
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
      // Indice negativo = linha de acoes; ela tem nome proprio, nao card.
      if (index < 0) {
        speakCue('comandos', settings)
        return
      }
      if (phase === 'cells') {
        const c = cards[index]
        if (c) speakCue(regionalLabel(c.label, settings.region), settings)
      } else {
        // Na fase de linhas anuncia a primeira palavra da linha como pista —
        // ler a linha inteira nao caberia no passo da varredura.
        const c = cards[index]
        if (c) speakCue(`linha, ${regionalLabel(c.label, settings.region)}`, settings)
      }
    },
    [cards, settings],
  )

  /**
   * A linha zero da varredura.
   *
   * Sem ela, quem usa switch montava a frase e nunca conseguia falar: a
   * varredura so alcancava a grade, e Espaco/Enter — que seriam o atalho de
   * falar — pertencem ao switch. A frase morria na tela.
   */
  const scanActions = useMemo(
    () => [
      { label: 'Falar', run: () => currentPhrase && say(currentPhrase), disabled: !currentPhrase },
      {
        label: 'Apagar o último',
        run: () => {
          setSentence((x) => x.slice(0, -1))
          setArticles((a) => a.slice(0, -1))
        },
        disabled: sentence.length === 0,
      },
      { label: 'Limpar a frase', run: clearSentence, disabled: sentence.length === 0 },
      {
        label: 'Próxima prancha',
        run: () => setActiveBoard((i) => (i + 1) % Math.max(1, allBoards.length)),
        disabled: allBoards.length < 2,
      },
    ],
    [currentPhrase, say, sentence.length, clearSentence, allBoards.length],
  )

  const scan = useScanning({
    enabled: settings.scanning,
    actions: scanActions,
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
  /**
   * Destravar exige pressao longa, e a pressao longa precisa ser VISIVEL.
   *
   * Antes o botao ficava dois segundos inerte: quem apertava nao tinha como
   * saber que algo estava contando, soltava antes e concluia que o app nao
   * destrava. Agora a barra enche enquanto se segura.
   *
   * Em toque havia um segundo problema: o gesto longo do navegador dispara
   * `pointerleave` no meio do caminho e cancelava a contagem. `setPointerCapture`
   * prende o ponteiro ao botao ate soltar, e `pointercancel` passa a ser o
   * unico cancelamento real.
   */
  const startUnlock = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    beginUnlock()
  }
  const beginUnlock = () => {
    if (unlockTimer.current) return
    setUnlocking(true)
    unlockTimer.current = window.setTimeout(() => {
      unlockTimer.current = null
      setUnlocking(false)
      patch({ locked: false })
    }, UNLOCK_MS)
  }
  const cancelUnlock = () => {
    if (unlockTimer.current) window.clearTimeout(unlockTimer.current)
    unlockTimer.current = null
    setUnlocking(false)
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
              <>
                {/* O modo bloqueado esconde controle de cuidador — busca e
                    ajustes. As frases prontas nao sao controle de cuidador: sao
                    fala, e incluem "preciso de ajuda" e "estou com dor". Tirar
                    isso da crianca justamente no modo em que ela fica sozinha
                    com a prancha seria o inverso do objetivo. */}
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setPanel('phrases')}
                  aria-label="Frases prontas"
                >
                  <span aria-hidden="true">💬</span>
                  <span className="btn__text">Frases</span>
                </button>
                <button
                  type="button"
                  className={`btn btn--ghost btn--locked ${unlocking ? 'btn--unlocking' : ''}`}
                  style={{ '--unlock-ms': `${UNLOCK_MS}ms` } as React.CSSProperties}
                  onPointerDown={startUnlock}
                  onPointerUp={cancelUnlock}
                  onPointerCancel={cancelUnlock}
                  // Teclado tambem destrava: segurar Enter ou Espaco dispara
                  // repeticoes de keydown, e soltar cancela. Quem navega por
                  // teclado ou switch nao tem como fazer "pressao longa" com o
                  // ponteiro.
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      beginUnlock()
                    }
                  }}
                  onKeyUp={cancelUnlock}
                  onBlur={cancelUnlock}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label="Manter pressionado por 2 segundos para destravar"
                >
                  <span aria-hidden="true">🔒</span>
                  <span className="btn__text">
                    {unlocking ? 'Segurando…' : 'Segure para destravar'}
                  </span>
                </button>
              </>
            ) : (
              <>
                {settings.scanning && (
                  <span className="pill" title="Varredura ativa — acione com Espaço ou Enter">
                    ⟳ Varredura
                  </span>
                )}
                {TOOLS.map((t, i) => (
                  <Fragment key={t.key}>
                    {/* Separador entre o grupo de fala e o de ajustes. Como e
                        puramente visual, sai da arvore de acessibilidade: o
                        leitor de tela ja tem o rotulo de cada botao. */}
                    {t.group === 'ajustar' && TOOLS[i - 1]?.group === 'falar' && (
                      <span className="topbar__split" aria-hidden="true" />
                    )}
                  <button
                    ref={tools.setRef(i)}
                    type="button"
                    className="btn btn--ghost"
                    tabIndex={i === tools.focused ? 0 : -1}
                    onFocus={() => tools.setFocused(i)}
                    onKeyDown={(e) => tools.onKeyDown(e, i)}
                    onClick={() => {
                      if (t.key === 'lock') return patch({ locked: true })
                      if (t.key === 'jogo') {
                        const inicio = comecar(cards)
                        setJogoFim(false)
                        setJogo(inicio)
                        if (inicio) {
                          speak(pista(regionalLabel(inicio.target.label, settings.region), 0), settings)
                        }
                        return
                      }
                      setPanel(t.key)
                    }}
                    aria-label={t.aria}
                  >
                    <span aria-hidden="true">{t.icon}</span>
                    <span className="btn__text">{t.label}</span>
                  </button>
                  </Fragment>
                ))}
              </>
            )}
          </div>
        </div>
      </header>

      {(jogo || jogoFim) && (
        <div className="shell">
          <div className="jogo" role="status">
            {jogo ? (
              <>
                <p className="jogo__pista">
                  <span className="jogo__cade">Cadê</span>{' '}
                  <strong>{regionalLabel(jogo.target.label, settings.region)}</strong>?
                </p>
                <div className="jogo__acoes">
                  <span className="jogo__placar" aria-live="polite">
                    {jogo.acertos} de {jogo.total}
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() =>
                      speak(
                        pista(regionalLabel(jogo.target.label, settings.region), jogo.acertos),
                        settings,
                      )
                    }
                  >
                    🔊 Repetir
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => setJogo(null)}>
                    Parar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="jogo__pista">
                  <strong>Você achou todas!</strong>
                </p>
                <div className="jogo__acoes">
                  <button
                    type="button"
                    className="btn btn--speak"
                    onClick={() => {
                      const novo = comecar(cards)
                      setJogoFim(false)
                      setJogo(novo)
                      if (novo) {
                        speak(pista(regionalLabel(novo.target.label, settings.region), 0), settings)
                      }
                    }}
                  >
                    Jogar de novo
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => setJogoFim(false)}>
                    Voltar a falar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {settings.scanning && scan.phase !== 'idle' && (
        <div className="shell">
          <div
            className={`scan-actions ${scan.onActions ? 'scan-actions--on' : ''}`}
            role="status"
            aria-label="Comandos alcançados pela varredura"
          >
            {scanActions
              .filter((a) => !a.disabled)
              .map((a, i) => (
                <span
                  key={a.label}
                  className={`scan-actions__item ${
                    scan.onActions && scan.actionIndex === i ? 'scan-actions__item--on' : ''
                  }`}
                >
                  {a.label}
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="shell shell--flush">
        <SentenceBar
          sentence={sentence}
          region={settings.region}
          composed={composed}
          marks={marks}
          onMark={(p) => setMarks((m) => ({ ...m, ...p }))}
          onEnableGrammar={() => patch({ grammar: true })}
          onSpeak={() => currentPhrase && say(currentPhrase)}
          onBackspace={() => {
            // Esvaziar card a card tem de zerar os marcadores igual a limpar de
            // uma vez: heranca silenciosa de "não"/"pergunta"/passado para a
            // frase seguinte e o pior tipo de bug — so aparece falando.
            if (sentence.length <= 1) setMarks(NO_MARKS)
            setSentence((s) => s.slice(0, -1))
            setArticles((a) => a.slice(0, -1))
          }}
          onClear={clearSentence}
          onRemoveAt={removeAt}
          onMoveAt={moveInSentence}
          articles={articles}
          onCycleArticle={cycleArticle}
          onSave={() => {
            if (!currentPhrase) return
            setMyPhrases((list) =>
              list.some((x) => x.label === currentPhrase.label)
                ? list.filter((x) => x.label !== currentPhrase.label)
                : [...list, currentPhrase],
            )
          }}
          saved={Boolean(currentPhrase && myPhrases.some((x) => x.label === currentPhrase.label))}
          onSpeakWord={(card, inflected) => speak(inflected ?? word(card), settings)}
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
        {/* A faixa fica FORA da grade e antes dela: posicao identica em toda
            prancha, sem deslocar nenhuma celula existente. */}
        {/* Na propria prancha Nucleo a faixa nao aparece: as seis palavras ja
            estao ali, e ver o mesmo pictograma duas vezes na mesma tela e pior
            que a inconsistencia de posicao — a crianca fica sem saber qual
            tocar. Nas outras dez pranchas a faixa esta sempre no mesmo lugar,
            que e onde o ganho de plano motor existe. */}
        {settings.coreStrip && board?.id !== 'nucleo' && (
          <div className="shell">
            <div className="core" role="group" aria-label="Palavras que servem em qualquer prancha">
              {CORE_STRIP.map((card) => (
                <button
                  key={card.label}
                  type="button"
                  className="core__cell"
                  onClick={() => pick(card)}
                  aria-label={regionalLabel(card.label, settings.region)}
                >
                  <Pictogram card={card} eager />
                  <span>{regionalLabel(card.label, settings.region)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sugestoes.length > 0 && (
          <div className="shell">
            <div className="sugestoes" role="group" aria-label="Sugestões de próxima palavra">
              <span className="sugestoes__rotulo" aria-hidden="true">
                talvez
              </span>
              {sugestoes.map((card) => (
                <button
                  key={card.label}
                  type="button"
                  className="sugestao"
                  onClick={() => pick(card)}
                  aria-label={`Sugestão: ${regionalLabel(card.label, settings.region)}`}
                >
                  <Pictogram card={card} eager />
                  <span>{regionalLabel(card.label, settings.region)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="shell">
          <CardGrid
            cards={cards}
            settings={settings}
            onPick={pick}
            onPreview={(c) => speak(word(c), settings)}
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
      {panel === 'scripts' && (
        <ScriptsPanel
          mine={scripts}
          history={history}
          phrases={myPhrases}
          onSpeak={say}
          onChange={setScripts}
          onClose={() => setPanel('none')}
        />
      )}
      {panel === 'editor' && boards && (
        <BoardEditor
          settings={settings}
          factory={boards}
          customBoards={customBoards}
          edits={edits}
          baseUrl={BASE}
          initialBoardId={board?.id ?? ''}
          onEdits={setEdits}
          onCustomBoards={setCustomBoards}
          onClose={() => setPanel('none')}
        />
      )}
      {panel === 'settings' && (
        <SettingsPanel
          settings={settings}
          favorites={favorites}
          phrases={myPhrases}
          edits={edits}
          customBoards={customBoards}
          scripts={scripts}
          onChange={patch}
          onImport={(p) => {
            setSettings((s) => ({ ...s, ...p.settings }))
            setFavorites(p.favorites)
            setMyPhrases(p.phrases)
            setEdits(p.edits ?? {})
            setCustomBoards(p.customBoards ?? [])
            setScripts(p.scripts ?? [])
          }}
          onClose={() => setPanel('none')}
        />
      )}
      {panel === 'help' && <HelpOverlay onClose={() => setPanel('none')} />}
    </div>
  )
}
