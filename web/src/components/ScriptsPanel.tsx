import { useEffect, useMemo, useRef, useState } from 'react'
import type { Card } from '../types'
import {
  BUILT_IN_SCRIPTS,
  duplicate,
  editStep,
  handStep,
  moveStep,
  scriptId,
  scriptIcon,
  STEP_ICON,
  type Script,
} from '../lib/scripts'
import {
  fecho,
  proximoSelo,
  registrarEnsaio,
  seloDe,
  vezes,
  type ScriptStats,
} from '../lib/ensaio'
import { earcon } from '../lib/audio'
import { loadIndex, search } from '../lib/search'
import { stopSpeaking } from '../lib/speech'
import { useRovingFocus } from '../lib/useRovingFocus'
import { Pictogram } from './Pictogram'
import { Dialog } from './Dialog'

interface Props {
  mine: Script[]
  /** Fontes de passos prontos: o que foi dito e o que foi salvo. */
  history: Card[]
  phrases: Card[]
  baseUrl: string
  /** Quantas vezes cada roteiro foi ensaiado inteiro. */
  stats: ScriptStats
  /** Earcons ligados nos ajustes: o ensaio marca o avanço com um som curto. */
  sounds: boolean
  onStats: (stats: ScriptStats) => void
  /** `onEnd` roda ao fim da locucao — e o que encadeia "falar tudo". */
  onSpeak: (step: Card, onEnd?: () => void) => void
  onChange: (scripts: Script[]) => void
  onClose: () => void
}

/**
 * Roteiros: sequencias de frases para situacoes que se repetem.
 *
 * O passo atual fica marcado e avanca sozinho quando um passo e falado, mas
 * **nada trava**: qualquer passo pode ser tocado a qualquer momento, e sair do
 * roteiro nao exige nada. Conversa real nao segue roteiro; um app que obrigasse
 * a seguir seria pior que nenhum. Ver `lib/scripts.ts`.
 *
 * ORGANIZACAO DA TELA — por que esta nesta ordem
 *
 * O painel tem tres andares, e a ordem deles e a ordem em que as perguntas
 * aparecem para quem abre: **qual roteiro** (a faixa de escolha), **o que ele
 * diz** (cabecalho + passos) e, so para roteiro proprio, **como muda-lo** (a
 * oficina, no fim). Antes o formulario de criar roteiro ficava no rodape de
 * tudo, depois dos passos — a acao que comeca o uso estava no lugar mais
 * distante da tela.
 */
export function ScriptsPanel({
  mine,
  history,
  phrases,
  baseUrl,
  stats,
  sounds,
  onStats,
  onSpeak,
  onChange,
  onClose,
}: Props) {
  const all = useMemo<Script[]>(() => [...BUILT_IN_SCRIPTS, ...mine], [mine])
  const [active, setActive] = useState(0)
  const [step, setStep] = useState(0)
  const [newName, setNewName] = useState('')
  /** Formulario de criar: fechado por padrao, para nao competir com os passos. */
  const [criando, setCriando] = useState(false)
  /** Passos ja falados nesta passagem pelo roteiro. */
  const [done, setDone] = useState<number[]>([])
  /** Roteiro a selecionar assim que ele aparecer na lista. */
  const [pendingId, setPendingId] = useState<string | null>(null)
  /** Apagar exige dois toques: destruir trabalho num toque so e caro demais. */
  const [confirmar, setConfirmar] = useState<string | null>(null)
  /** Passo em edicao de texto, por indice. */
  const [editando, setEditando] = useState<number | null>(null)
  /** Renomeando o roteiro proprio. */
  const [renomeando, setRenomeando] = useState(false)
  /** Passo que a leitura corrida esta dizendo; `null` quando parada. */
  const [lendo, setLendo] = useState<number | null>(null)
  /**
   * Ensaio: passo em foco, ou `null` fora do ensaio. `'fim'` e a tela de
   * fechamento — estado proprio, e nao "passo alem do ultimo", porque ela tem
   * conteudo diferente e nao pode ser alcancada por engano avancando.
   */
  const [ensaio, setEnsaio] = useState<number | 'fim' | null>(null)
  /** Texto do passo novo escrito a mao, e o pictograma escolhido para ele. */
  const [texto, setTexto] = useState('')
  const [icone, setIcone] = useState<number>(STEP_ICON)
  const [busca, setBusca] = useState('')
  const [achados, setAchados] = useState<Card[]>([])
  const [indice, setIndice] = useState(false)
  const tabs = useRovingFocus(all.length, setActive)
  const novoNome = useRef<HTMLInputElement | null>(null)
  const campoTexto = useRef<HTMLInputElement | null>(null)

  useEffect(() => tabs.setFocused(active), [active, tabs])
  useEffect(() => {
    setStep(0)
    setDone([])
    setEditando(null)
    setRenomeando(false)
    setLendo(null)
    stopSpeaking()
  }, [active])
  useEffect(() => {
    if (active >= all.length) setActive(0)
  }, [active, all.length])

  // Sair do painel no meio da leitura corrida nao pode deixar a voz falando
  // sozinha por tras da prancha.
  useEffect(() => () => stopSpeaking(), [])

  useEffect(() => {
    loadIndex(baseUrl)
      .then(() => setIndice(true))
      .catch(() => setIndice(false))
  }, [baseUrl])

  // Mesmo debounce do editor de pranchas: a busca varre ~20 mil termos de forma
  // sincrona e travava o campo a cada tecla.
  useEffect(() => {
    const t = setTimeout(
      () => setAchados(indice && busca.trim().length >= 2 ? search(busca, 8) : []),
      140,
    )
    return () => clearTimeout(t)
  }, [busca, indice])

  // Seleciona pelo ID quando o roteiro novo entra na lista.
  useEffect(() => {
    if (!pendingId) return
    const i = all.findIndex((s) => s.id === pendingId)
    if (i >= 0) {
      setActive(i)
      setPendingId(null)
    }
  }, [pendingId, all])

  const script = all[active]
  const editable = Boolean(script && !script.builtIn)
  const total = script?.steps.length ?? 0

  const patch = (fn: (s: Script) => Script) => {
    if (!script) return
    onChange(mine.map((s) => (s.id === script.id ? fn(s) : s)))
  }

  const speakStep = (card: Card, i: number) => {
    setLendo(null)
    onSpeak(card)
    setStep(Math.min(i + 1, Math.max(0, total - 1)))
    // Passo falado fica marcado como cumprido. Nao e pontuacao nem premio: e
    // memoria de onde se esta, para quem perdeu o fio no meio de uma interacao
    // — que e o motivo de existir um roteiro.
    setDone((d) => (d.includes(i) ? d : [...d, i]))
  }

  /**
   * Ler o roteiro inteiro, um passo apos o outro.
   *
   * Serve ao ENSAIO — ouvir a sequencia antes de a situacao acontecer e
   * exatamente o que um roteiro social e para fazer — e serve tambem a quem
   * nao le a tela. Cada passo encadeia no fim da locucao anterior, e um toque
   * em Parar corta na hora.
   */
  const lerTudo = (from = 0) => {
    if (!script) return
    const card = script.steps[from]
    if (!card) {
      setLendo(null)
      return
    }
    setLendo(from)
    setStep(from)
    setDone((d) => (d.includes(from) ? d : [...d, from]))
    onSpeak(card, () => lerTudo(from + 1))
  }

  const parar = () => {
    setLendo(null)
    stopSpeaking()
  }

  /* ------------------------------------------------------------- ensaio */

  const ensaios = script ? vezes(stats, script.id) : 0
  const selo = seloDe(ensaios)
  const falta = proximoSelo(ensaios)

  const abrirEnsaio = () => {
    parar()
    setEnsaio(0)
    setDone([])
    setStep(0)
  }

  /**
   * Avanca o ensaio.
   *
   * "Avancar" nao e "acertar": nao ha resposta certa num ensaio de fala, e o
   * botao de pular usa exatamente este mesmo caminho. O que se registra e ter
   * chegado ao fim — presenca, nao desempenho. Ver `lib/ensaio.ts`.
   */
  const avancar = (i: number) => {
    if (!script) return
    setDone((d) => (d.includes(i) ? d : [...d, i]))
    if (i + 1 >= script.steps.length) {
      onStats(registrarEnsaio(stats, script.id))
      setEnsaio('fim')
      if (sounds) earcon.board()
      return
    }
    setEnsaio(i + 1)
    setStep(i + 1)
    if (sounds) earcon.select()
  }

  const concluido = total > 0 && done.length >= total

  /** Fontes de passo: sem repetir o que o roteiro ja tem. */
  const candidates = useMemo(() => {
    const have = new Set(script?.steps.map((s) => s.label) ?? [])
    const seen = new Set<string>()
    return [...phrases, ...history].filter((c) => {
      if (have.has(c.label) || seen.has(c.label)) return false
      seen.add(c.label)
      return true
    })
  }, [script, phrases, history])

  const criar = () => {
    const name = newName.trim()
    if (!name) return
    const created: Script = { id: scriptId(name, mine), name, icon: STEP_ICON, steps: [] }
    onChange([...mine, created])
    setNewName('')
    setCriando(false)
    setPendingId(created.id)
  }

  const acrescentar = (card: Card) => patch((s) => ({ ...s, steps: [...s.steps, card] }))

  const grupos = [
    { titulo: 'De fábrica', itens: BUILT_IN_SCRIPTS, offset: 0 },
    { titulo: 'Meus roteiros', itens: mine, offset: BUILT_IN_SCRIPTS.length },
  ]

  /* =====================================================================
     TELA DE ENSAIO

     Uma coisa por vez, em tela cheia. A lista serve para consultar; ensaiar
     pede o oposto — nada em volta competindo com o passo atual. Por isso ela
     substitui o painel em vez de morar dentro dele.

     Nao ha cronometro, nao ha erro, nao ha nota. "Pular" e "Já disse" seguem
     pelo mesmo caminho de proposito: ninguem esta sendo avaliado.
     ===================================================================== */
  if (script && ensaio !== null) {
    const sair = () => {
      setEnsaio(null)
      parar()
    }
    const atual = typeof ensaio === 'number' ? script.steps[ensaio] : null

    return (
      <Dialog title={`Ensaio — ${script.name}`} onClose={onClose}>
        <div className="shell ensaio">
          <div className="ensaio__topo">
            <button type="button" className="btn btn--ghost" onClick={sair}>
              ‹ Sair do ensaio
            </button>
            <span className="ensaio__conta">
              {ensaios === 0
                ? 'primeiro ensaio'
                : `já ensaiado ${ensaios}${ensaios === 1 ? ' vez' : ' vezes'}`}
              {selo && (
                <span className="ensaio__selo-chip">
                  <span aria-hidden="true">{selo.icone}</span> {selo.nome}
                </span>
              )}
            </span>
          </div>

          {ensaio === 'fim' ? (
            <div className="ensaio__fim" role="status">
              <span className="ensaio__selo-grande" aria-hidden="true">
                {selo?.icone ?? '🌱'}
              </span>
              <h3 className="ensaio__fim-titulo">Roteiro inteiro, do começo ao fim.</h3>
              <p className="ensaio__fecho">{fecho(ensaios)}</p>
              {selo && <p className="ensaio__selo-hint">{selo.hint}</p>}
              {/* O que falta é dito como convite, nunca como cobrança — e não
                  aparece se já se chegou no último selo. */}
              {falta && (
                <p className="settings__note ensaio__falta">
                  Mais {falta.faltam}{' '}
                  {falta.faltam === 1 ? 'ensaio inteiro' : 'ensaios inteiros'} e chega em{' '}
                  <strong>
                    {falta.selo.icone} {falta.selo.nome}
                  </strong>
                  .
                </p>
              )}
              <div className="ensaio__acoes">
                <button
                  type="button"
                  className="btn btn--speak"
                  onClick={() => {
                    setDone([])
                    setStep(0)
                    setEnsaio(0)
                  }}
                >
                  ↺ Ensaiar de novo
                </button>
                <button type="button" className="btn btn--ghost" onClick={sair}>
                  Voltar aos passos
                </button>
              </div>
            </div>
          ) : (
            atual &&
            typeof ensaio === 'number' && (
              <>
                {/* Onde se está, em bolinhas: o passo atual é maior, os já
                    ditos ficam cheios. Contagem escrita logo abaixo, porque
                    bolinha sozinha não informa a quem não vê a tela. */}
                <ol className="ensaio__pontos" aria-hidden="true">
                  {script.steps.map((s, i) => (
                    <li
                      key={`${s.id}-${i}`}
                      className={`ensaio__ponto ${i === ensaio ? 'ensaio__ponto--agora' : ''} ${
                        done.includes(i) ? 'ensaio__ponto--dito' : ''
                      }`}
                    />
                  ))}
                </ol>
                <p className="ensaio__posicao">
                  Passo {ensaio + 1} de {total}
                </p>

                <div className="ensaio__cartao">
                  <Pictogram card={atual} eager />
                  <p className="ensaio__fala">{atual.label}</p>
                </div>

                <div className="ensaio__acoes">
                  <button
                    type="button"
                    className="btn btn--speak ensaio__falar"
                    onClick={() => onSpeak(atual)}
                  >
                    🔊 Falar este passo
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost ensaio__proximo"
                    onClick={() => avancar(ensaio)}
                  >
                    {ensaio + 1 === total ? 'Terminei ✓' : 'Já disse ›'}
                  </button>
                </div>

                <div className="ensaio__secundarias">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={ensaio === 0}
                    onClick={() => setEnsaio(ensaio - 1)}
                  >
                    ‹ Passo anterior
                  </button>
                  {/* Pular existe e não custa nada: um passo que não cabe hoje
                      não pode travar o ensaio inteiro. */}
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => avancar(ensaio)}
                  >
                    Pular este
                  </button>
                </div>
              </>
            )
          )}
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog title="Roteiros" onClose={onClose}>
      <div className="shell roteiros">
        <p className="settings__note roteiros__intro">
          A ordem do que se costuma dizer numa situação que se repete. Saber a sequência de
          antemão tira parte do peso de uma situação imprevisível. Nenhum passo é obrigatório.
        </p>

        {/* ESCOLHA DO ROTEIRO.
            Era uma fila unica de pilulas de texto, sem figura e sem separar o
            que e de fabrica do que e seu — com seis ou sete roteiros virava uma
            faixa de nomes parecidos que so se distinguiam lendo. Agora cada
            roteiro tem pictograma, contagem de passos, e os dois grupos tem
            titulo proprio. */}
        <div className="roteiros__nav" role="tablist" aria-label="Roteiros">
          {grupos.map(
            (g) =>
              (g.itens.length > 0 || g.offset > 0) && (
                <div className="roteiros__grupo" key={g.titulo}>
                  <h3 className="roteiros__grupo-titulo">{g.titulo}</h3>
                  <div className="roteiros__lista">
                    {g.itens.map((s, j) => {
                      const i = g.offset + j
                      return (
                        <button
                          key={s.id}
                          ref={tabs.setRef(i)}
                          type="button"
                          role="tab"
                          aria-selected={i === active}
                          tabIndex={i === active ? 0 : -1}
                          className={`roteiro-item ${i === active ? 'roteiro-item--on' : ''}`}
                          onClick={() => setActive(i)}
                          onKeyDown={(e) => tabs.onKeyDown(e, i)}
                        >
                          <Pictogram card={{ id: scriptIcon(s), label: s.name }} />
                          <span className="roteiro-item__nome">{s.name}</span>
                          <span className="roteiro-item__meta">
                            {s.steps.length} {s.steps.length === 1 ? 'passo' : 'passos'}
                            {vezes(stats, s.id) > 0 && (
                              <>
                                {' · '}
                                <span className="roteiro-item__selo">
                                  <span aria-hidden="true">{seloDe(vezes(stats, s.id))?.icone}</span>{' '}
                                  {vezes(stats, s.id)}×
                                </span>
                              </>
                            )}
                          </span>
                        </button>
                      )
                    })}

                    {/* "Criar" mora aqui, junto do que ele cria, e nao no rodape
                        do painel: e a acao que comeca o uso. */}
                    {g.offset > 0 && (
                      <button
                        type="button"
                        className="roteiro-item roteiro-item--novo"
                        onClick={() => {
                          setCriando(true)
                          // Foco no campo: em celular isso ja abre o teclado, e
                          // sem ele o formulario aparece e nada acontece.
                          setTimeout(() => novoNome.current?.focus(), 0)
                        }}
                      >
                        <span className="roteiro-item__mais" aria-hidden="true">
                          +
                        </span>
                        <span className="roteiro-item__nome">Novo roteiro</span>
                        <span className="roteiro-item__meta">para uma situação sua</span>
                      </button>
                    )}
                  </div>
                  {g.offset > 0 && g.itens.length === 0 && (
                    <p className="settings__note">
                      Você ainda não tem roteiro próprio. Crie um, ou faça uma cópia editável de
                      um roteiro de fábrica.
                    </p>
                  )}
                </div>
              ),
          )}
        </div>

        {criando && (
          <form
            className="settings__group roteiros__novo"
            onSubmit={(e) => {
              e.preventDefault()
              criar()
            }}
          >
            <h3>Novo roteiro</h3>
            <label className="field">
              <span>Nome da situação</span>
              <input
                ref={novoNome}
                type="text"
                value={newName}
                placeholder="Ir ao dentista, aniversário, ônibus…"
                enterKeyHint="done"
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <div className="roteiros__form-acoes">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setCriando(false)
                  setNewName('')
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn--speak" disabled={!newName.trim()}>
                + Criar roteiro
              </button>
            </div>
          </form>
        )}

        {script && (
          <section className="roteiro" aria-label={`Roteiro ${script.name}`}>
            {/* CABECALHO DO ROTEIRO.
                Nome, o que ele e, e tudo que se pode fazer com ele — num lugar
                so. Antes as acoes estavam espalhadas: copiar ficava numa faixa
                depois dos passos, apagar no fim de outra secao, e "comecar de
                novo" so aparecia depois de falar alguma coisa. */}
            <header className="roteiro__head">
              <div className="roteiro__id">
                <Pictogram card={{ id: scriptIcon(script), label: script.name }} />
                <div className="roteiro__titulo">
                  {renomeando && editable ? (
                    <input
                      type="text"
                      className="roteiro__nome-campo"
                      defaultValue={script.name}
                      aria-label="Nome do roteiro"
                      autoFocus
                      enterKeyHint="done"
                      onBlur={(e) => {
                        const nome = e.target.value.trim()
                        if (nome) patch((s) => ({ ...s, name: nome }))
                        setRenomeando(false)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        if (e.key === 'Escape') setRenomeando(false)
                      }}
                    />
                  ) : (
                    <h3 className="roteiro__nome">{script.name}</h3>
                  )}
                  <p className="roteiro__meta">
                    {total} {total === 1 ? 'passo' : 'passos'} ·{' '}
                    {script.builtIn ? 'de fábrica, só leitura' : 'seu, editável'}
                  </p>
                  {selo && (
                    <p className="roteiro__selo">
                      <span aria-hidden="true">{selo.icone}</span> {selo.nome}
                      <span className="roteiro__selo-conta">
                        {' '}
                        · ensaiado {ensaios}
                        {ensaios === 1 ? ' vez' : ' vezes'}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="roteiro__acoes">
                {/* Ensaiar vem primeiro: é o uso previsto de um roteiro social
                    — praticar antes, e não ler durante. */}
                <button
                  type="button"
                  className="btn btn--speak"
                  disabled={total === 0}
                  onClick={abrirEnsaio}
                >
                  ★ <span className="btn__text">Ensaiar</span>
                </button>
                {lendo === null ? (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={total === 0}
                    onClick={() => lerTudo(0)}
                  >
                    ▶ <span className="btn__text">Falar tudo</span>
                  </button>
                ) : (
                  <button type="button" className="btn btn--ghost btn--armed" onClick={parar}>
                    ■ <span className="btn__text">Parar</span>
                  </button>
                )}
                {done.length > 0 && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      parar()
                      setDone([])
                      setStep(0)
                    }}
                  >
                    ↺ <span className="btn__text">Começar de novo</span>
                  </button>
                )}
                {editable && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setRenomeando(true)}
                    aria-label="Renomear este roteiro"
                  >
                    ✎ <span className="btn__text">Renomear</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    const copy = duplicate(script, mine)
                    onChange([...mine, copy])
                    // Pelo ID, e nao por indice: o indice era calculado com o
                    // `mine` ANTIGO e so acertava por coincidencia de ordem.
                    setPendingId(copy.id)
                  }}
                  aria-label={
                    script.builtIn ? 'Fazer uma cópia editável' : 'Duplicar este roteiro'
                  }
                >
                  ⧉ <span className="btn__text">{script.builtIn ? 'Copiar' : 'Duplicar'}</span>
                </button>
                {editable && (
                  <button
                    type="button"
                    className={`btn btn--ghost btn--danger ${
                      confirmar === script.id ? 'btn--armed' : ''
                    }`}
                    onClick={() => {
                      if (confirmar !== script.id) {
                        setConfirmar(script.id)
                        return
                      }
                      onChange(mine.filter((s) => s.id !== script.id))
                      setConfirmar(null)
                      setActive(0)
                    }}
                  >
                    ✕{' '}
                    <span className="btn__text">
                      {confirmar === script.id ? 'Tocar de novo' : 'Apagar'}
                    </span>
                  </button>
                )}
              </div>
            </header>

            {total > 0 && (
              <div className="progresso">
                <div
                  className="progresso__barra"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={done.length}
                  aria-label={`${done.length} de ${total} passos`}
                >
                  <span style={{ width: `${(done.length / total) * 100}%` }} />
                </div>
                <p className="progresso__texto">
                  {concluido ? (
                    <strong>Roteiro inteiro dito. ✓</strong>
                  ) : (
                    <>
                      Passo {Math.min(step + 1, total)} de {total}
                    </>
                  )}
                </p>
              </div>
            )}

            {total === 0 ? (
              <p className="settings__note roteiro__vazio">
                Roteiro sem passos ainda. Escreva o primeiro logo abaixo — ou puxe uma frase que
                você já disse.
              </p>
            ) : (
              <ol className="steps" aria-label={`Passos de ${script.name}`}>
                {script.steps.map((card, i) => (
                  <li
                    key={`${card.id}-${i}`}
                    className={`step ${i === step ? 'step--now' : ''} ${
                      done.includes(i) ? 'step--done' : ''
                    } ${lendo === i ? 'step--lendo' : ''}`}
                  >
                    <span className="step__n" aria-hidden="true">
                      {done.includes(i) ? '✓' : i + 1}
                    </span>

                    {editando === i && editable ? (
                      <input
                        type="text"
                        className="step__campo"
                        defaultValue={card.label}
                        aria-label={`Texto do passo ${i + 1}`}
                        autoFocus
                        enterKeyHint="done"
                        onBlur={(e) => {
                          patch((s) => editStep(s, i, e.target.value))
                          setEditando(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          if (e.key === 'Escape') setEditando(null)
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="step__say"
                        onClick={() => speakStep(card, i)}
                        aria-label={`Falar passo ${i + 1} de ${total}: ${card.label}${
                          i === step ? ' — passo atual' : ''
                        }${done.includes(i) ? ' — já dito' : ''}`}
                      >
                        <Pictogram card={card} />
                        <span>{card.label}</span>
                      </button>
                    )}

                    {editable && (
                      <span className="editor__actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setEditando(editando === i ? null : i)}
                          aria-label={`Mudar o texto do passo ${i + 1}`}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => patch((s) => moveStep(s, i, i - 1))}
                          disabled={i === 0}
                          aria-label={`Mover "${card.label}", passo ${i + 1}, para cima`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => patch((s) => moveStep(s, i, i + 1))}
                          disabled={i === script.steps.length - 1}
                          aria-label={`Mover "${card.label}", passo ${i + 1}, para baixo`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() =>
                            patch((s) => ({ ...s, steps: s.steps.filter((_, j) => j !== i) }))
                          }
                          aria-label={`Remover "${card.label}", passo ${i + 1}`}
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {script.builtIn && (
              <p className="settings__note roteiro__aviso">
                Roteiro de fábrica: para mudar, acrescentar ou tirar passos, faça uma cópia sua no
                botão <strong>Copiar</strong> acima. A cópia nasce com os mesmos passos.
              </p>
            )}
          </section>
        )}

        {editable && script && (
          <section className="settings__group roteiros__oficina">
            <h3>Acrescentar passo</h3>

            {/* ESCREVER O PASSO A MAO.
                Este campo e a diferenca entre um roteiro que se pode preparar e
                um que so se pode montar depois. Antes so havia a lista de
                frases ja ditas: um roteiro novo, na vespera do dentista, era
                literalmente impossivel de preencher. */}
            <form
              className="passo-novo"
              onSubmit={(e) => {
                e.preventDefault()
                if (!texto.trim()) return
                acrescentar(handStep(texto, icone))
                setTexto('')
                setIcone(STEP_ICON)
                setBusca('')
                campoTexto.current?.focus()
              }}
            >
              <label className="field">
                <span>Escrever o que dizer</span>
                <input
                  ref={campoTexto}
                  type="text"
                  value={texto}
                  placeholder="Oi, eu vim para a consulta."
                  enterKeyHint="done"
                  onChange={(e) => setTexto(e.target.value)}
                />
              </label>

              <div className="passo-novo__linha">
                <span className="passo-novo__figura">
                  <Pictogram card={{ id: icone, label: texto || 'passo' }} />
                </span>
                <label className="field passo-novo__busca">
                  <span>Figura deste passo</span>
                  <input
                    type="search"
                    value={busca}
                    placeholder="dentista, ônibus, dor…"
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </label>
                <button type="submit" className="btn btn--speak" disabled={!texto.trim()}>
                  + Acrescentar
                </button>
              </div>

              {busca.trim().length >= 2 && !indice && (
                <p className="settings__note">Carregando o índice de busca…</p>
              )}
              {achados.length > 0 && (
                <div className="editor__results">
                  {achados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`editor__result ${
                        c.id === icone ? 'editor__result--on' : ''
                      }`}
                      onClick={() => setIcone(c.id)}
                      aria-label={`Usar a figura de ${c.label}`}
                    >
                      <Pictogram card={c} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            <div className="roteiros__ou">
              <span>ou puxe uma frase que já existe</span>
            </div>

            {candidates.length === 0 ? (
              <p className="settings__note">
                Nada aqui ainda: esta lista se enche com as frases que você salva e com o que fala
                na prancha.
              </p>
            ) : (
              <div className="editor__results">
                {candidates.map((c, i) => (
                  <button
                    key={`${c.id}-${i}`}
                    type="button"
                    className="editor__result"
                    onClick={() => acrescentar(c)}
                  >
                    <Pictogram card={c} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            )}

            <p className="settings__note">
              O passo entra <strong>no fim</strong> do roteiro; as setas de cada passo mudam a
              ordem depois.
            </p>
          </section>
        )}
      </div>
    </Dialog>
  )
}
