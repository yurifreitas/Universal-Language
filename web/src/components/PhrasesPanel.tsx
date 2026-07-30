import { useEffect, useMemo, useRef, useState } from 'react'
import type { Card, Settings } from '../types'
import { ALL_GROUPS, inflectGroup, type PhraseGroup } from '../lib/phrases'
import { vezes, type ScriptStats } from '../lib/ensaio'
import { STEP_ICON } from '../lib/scripts'
import { loadIndex, search } from '../lib/search'
import { useRovingFocus } from '../lib/useRovingFocus'
import { CardGrid } from './CardGrid'
import { Pictogram } from './Pictogram'
import { Faixa } from './Faixa'
import { Dialog } from './Dialog'

interface Props {
  settings: Settings
  /** Frases salvas pelo proprio usuario. */
  mine: Card[]
  /** Ultimas frases ditas, mais recente primeiro. */
  history: Card[]
  /** Quantas vezes cada frase foi dita. */
  uses: ScriptStats
  baseUrl: string
  /** A frase montada agora, se houver — para o botao de salvar. */
  current: Card | null
  onSpeak: (phrase: Card) => void
  onSave: (phrase: Card) => void
  onRemoveMine: (phrase: Card) => void
  /** Substitui a lista inteira: usado por editar, reordenar e criar. */
  onMine: (phrases: Card[]) => void
  onClearHistory: () => void
  onClose: () => void
}

/** Quantas frases entram em "As mais faladas". Curto de propósito: é atalho. */
const TOP = 8

/**
 * Frases prontas.
 *
 * A grade e a mesma da prancha (`CardGrid`), o que traz de graca a navegacao
 * por setas, o roving tabindex e o toque longo para ouvir sem falar alto. A
 * diferenca e que aqui um toque **fala a frase inteira** em vez de acrescentar
 * uma palavra: e o atalho para o que se repete todo dia.
 *
 * Ver `lib/phrases.ts` para por que os grupos estao nesta ordem.
 *
 * O QUE FOI ACRESCENTADO, E POR QUE
 *
 *  - **Filtro por texto.** Sao sete grupos e mais de cem frases; achar "estou
 *    com dor" exigia lembrar em qual grupo ela mora. O filtro atravessa todos.
 *  - **As mais faladas.** As mesmas cinco ou seis frases respondem pela maior
 *    parte do uso real. Elas ganham um grupo proprio — e NENHUMA grade e
 *    reordenada por isso, que e a regra dura da prancha (LAMP).
 *  - **Escrever frase a mao.** Antes so era possivel salvar o que tivesse sido
 *    montado card a card na prancha. Preparar frases de antemao — que e o que
 *    um cuidador faz na vespera — nao tinha caminho nenhum.
 *  - **Editar e reordenar as suas.** Uma frase salva com erro de digitacao so
 *    podia ser apagada e refeita.
 */
export function PhrasesPanel({
  settings,
  mine,
  history,
  uses,
  baseUrl,
  current,
  onSpeak,
  onSave,
  onRemoveMine,
  onMine,
  onClearHistory,
  onClose,
}: Props) {
  const [filtro, setFiltro] = useState('')
  /** Oficina aberta: escrever, editar e reordenar as frases próprias. */
  const [oficina, setOficina] = useState(false)
  const [texto, setTexto] = useState('')
  const [icone, setIcone] = useState(STEP_ICON)
  const [busca, setBusca] = useState('')
  const [achados, setAchados] = useState<Card[]>([])
  const [indice, setIndice] = useState(false)
  const [editando, setEditando] = useState<number | null>(null)
  const campoTexto = useRef<HTMLInputElement | null>(null)

  /** As mais faladas, da mais dita para a menos. Só entra o que já foi dito. */
  const maisFaladas = useMemo<Card[]>(() => {
    const todas = new Map<string, Card>()
    for (const g of ALL_GROUPS) for (const p of g.phrases) todas.set(p.label, p)
    for (const p of [...mine, ...history]) todas.set(p.label, p)
    return [...todas.values()]
      .filter((p) => vezes(uses, p.label) > 0)
      .sort((a, b) => vezes(uses, b.label) - vezes(uses, a.label))
      .slice(0, TOP)
  }, [uses, mine, history])

  const groups = useMemo<PhraseGroup[]>(() => {
    const dynamic: PhraseGroup[] = []
    // "As mais faladas" vem antes dos outros grupos dinâmicos e depois dos
    // fixos: é o atalho mais provável, mas nunca desloca um grupo de fábrica.
    if (maisFaladas.length)
      dynamic.push({ id: 'topo', name: 'As mais faladas', icon: '🔥', phrases: maisFaladas })
    if (mine.length) dynamic.push({ id: 'minhas', name: 'Minhas frases', icon: '★', phrases: mine })
    if (history.length)
      dynamic.push({ id: 'historico', name: 'Disse agora há pouco', icon: '↩', phrases: history })
    // Grupos do usuario entram no FIM, nunca deslocando os fixos: a posicao de
    // "Urgente" nao pode depender de quantas frases a pessoa salvou. As frases
    // salvas pela propria pessoa nao sao reflexionadas — sao as palavras dela.
    return [...ALL_GROUPS.map((g) => inflectGroup(g, settings.speakerGender, settings.register)), ...dynamic]
  }, [mine, history, maisFaladas, settings.speakerGender, settings.register])

  const [active, setActive] = useState(0)
  const tabs = useRovingFocus(groups.length, setActive)

  useEffect(() => tabs.setFocused(active), [active, tabs])
  // Um grupo dinamico pode sumir (ultima frase removida, historico limpo).
  useEffect(() => {
    if (active >= groups.length) setActive(0)
  }, [active, groups.length])

  useEffect(() => {
    loadIndex(baseUrl)
      .then(() => setIndice(true))
      .catch(() => setIndice(false))
  }, [baseUrl])

  useEffect(() => {
    const t = setTimeout(
      () => setAchados(indice && busca.trim().length >= 2 ? search(busca, 8) : []),
      140,
    )
    return () => clearTimeout(t)
  }, [busca, indice])

  const group = groups[active] ?? groups[0]
  const isMine = group?.id === 'minhas'
  const isHistory = group?.id === 'historico'

  /**
   * Com filtro, o painel deixa de mostrar UM grupo e passa a mostrar o
   * resultado da busca em TODOS. Procurar dentro do grupo aberto seria a
   * resposta errada: quem digita "dor" não sabe em qual grupo ela está — é
   * justamente por isso que está digitando.
   */
  const termo = filtro
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  const filtradas = useMemo<Card[]>(() => {
    if (termo.length < 2) return []
    const vistas = new Set<string>()
    const saida: Card[] = []
    for (const g of groups) {
      for (const p of g.phrases) {
        const alvo = p.label
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
        if (alvo.includes(termo) && !vistas.has(p.label)) {
          vistas.add(p.label)
          saida.push(p)
        }
      }
    }
    return saida
  }, [termo, groups])

  const criar = () => {
    const t = texto.trim()
    if (!t) return
    if (!mine.some((p) => p.label === t)) onMine([...mine, { id: icone, label: t }])
    setTexto('')
    setIcone(STEP_ICON)
    setBusca('')
    campoTexto.current?.focus()
  }

  const mover = (from: number, to: number) => {
    if (to < 0 || to >= mine.length) return
    const next = [...mine]
    const [m] = next.splice(from, 1)
    if (!m) return
    next.splice(to, 0, m)
    onMine(next)
  }

  return (
    <Dialog title="Frases prontas" onClose={onClose}>
      <div className="shell phrases">
        <p className="settings__note phrases__intro">
          Um toque fala a frase inteira. Elas não substituem a prancha — são o atalho para o que
          se repete; o que ninguém previu continua sendo montado card a card.
        </p>

        {/* Filtro no topo, sempre visível. Atravessa todos os grupos. */}
        <div className="phrases__busca">
          <label className="field">
            <span className="sr-only">Procurar uma frase</span>
            <input
              type="search"
              value={filtro}
              placeholder="Procurar em todas as frases — dor, banheiro, obrigado…"
              onChange={(e) => setFiltro(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={`btn btn--ghost ${oficina ? 'btn--saved' : ''}`}
            aria-pressed={oficina}
            onClick={() => setOficina((o) => !o)}
          >
            ✎ <span className="btn__text">Escrever frase</span>
          </button>
        </div>

        {oficina && (
          <section className="settings__group phrases__oficina">
            <h3>Escrever uma frase</h3>
            <form
              className="passo-novo"
              onSubmit={(e) => {
                e.preventDefault()
                criar()
              }}
            >
              <label className="field">
                <span>O que dizer</span>
                <input
                  ref={campoTexto}
                  type="text"
                  value={texto}
                  placeholder="Pode me esperar um pouco?"
                  enterKeyHint="done"
                  onChange={(e) => setTexto(e.target.value)}
                />
              </label>
              <div className="passo-novo__linha">
                <span className="passo-novo__figura">
                  <Pictogram card={{ id: icone, label: texto || 'frase' }} />
                </span>
                <label className="field passo-novo__busca">
                  <span>Figura desta frase</span>
                  <input
                    type="search"
                    value={busca}
                    placeholder="esperar, dor, banheiro…"
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </label>
                <button type="submit" className="btn btn--speak" disabled={!texto.trim()}>
                  ★ Salvar
                </button>
              </div>
              {achados.length > 0 && (
                <div className="editor__results">
                  {achados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`editor__result ${c.id === icone ? 'editor__result--on' : ''}`}
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

            {/* Editar e reordenar o que já está salvo. Fica aqui, e não na
                grade: a grade é para FALAR, e um lápis dentro dela seria mais
                uma coisa para tocar por engano no meio de uma conversa. */}
            {mine.length > 0 && (
              <>
                <div className="roteiros__ou">
                  <span>suas frases salvas</span>
                </div>
                <ul className="editor__list">
                  {mine.map((p, i) => (
                    <li key={`${p.id}-${i}`} className="editor__row">
                      <Pictogram card={p} />
                      {editando === i ? (
                        <input
                          type="text"
                          className="editor__name"
                          defaultValue={p.label}
                          aria-label={`Texto da frase ${p.label}`}
                          autoFocus
                          enterKeyHint="done"
                          onBlur={(e) => {
                            const t = e.target.value.trim()
                            if (t) onMine(mine.map((x, j) => (j === i ? { ...x, label: t } : x)))
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
                          className="phrases__linha"
                          onClick={() => onSpeak(p)}
                          aria-label={`Falar: ${p.label}`}
                        >
                          {p.label}
                          {vezes(uses, p.label) > 0 && (
                            <span className="phrases__uso">
                              {' '}
                              · falada {vezes(uses, p.label)}×
                            </span>
                          )}
                        </button>
                      )}
                      <span className="editor__actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setEditando(editando === i ? null : i)}
                          aria-label={`Mudar o texto de "${p.label}"`}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => mover(i, i - 1)}
                          disabled={i === 0}
                          aria-label={`Mover "${p.label}" para antes`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => mover(i, i + 1)}
                          disabled={i === mine.length - 1}
                          aria-label={`Mover "${p.label}" para depois`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => onRemoveMine(p)}
                          aria-label={`Remover "${p.label}"`}
                        >
                          ✕
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {termo.length >= 2 ? (
          <div role="region" aria-label={`Resultado da busca por ${filtro}`}>
            <p className="settings__note">
              {filtradas.length === 0
                ? `Nenhuma frase com "${filtro}".`
                : `${filtradas.length} ${
                    filtradas.length === 1 ? 'frase encontrada' : 'frases encontradas'
                  } em todos os grupos.`}
            </p>
            <CardGrid
              cards={filtradas}
              settings={settings}
              dense
              onPick={onSpeak}
              isFavorite={() => false}
              emptyMessage="Nenhuma frase com esse texto."
            />
          </div>
        ) : (
          <>
            <Faixa
              className="phrases__tabs"
              nome="grupos"
              role="tablist"
              ariaLabel="Grupos de frases"
            >
              {groups.map((g, i) => (
                <button
                  key={g.id}
                  ref={tabs.setRef(i)}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  tabIndex={i === active ? 0 : -1}
                  className={`tab ${i === active ? 'tab--active' : ''}`}
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => tabs.onKeyDown(e, i)}
                >
                  <span className="tab__icon" aria-hidden="true">
                    {g.icon}
                  </span>
                  <span className="tab__name">{g.name}</span>
                  <span className="sr-only">{`, ${g.phrases.length} frases`}</span>
                </button>
              ))}
            </Faixa>

            {group && (
              <div role="tabpanel" aria-label={group.name}>
                <CardGrid
                  cards={group.phrases}
                  settings={settings}
                  dense
                  onPick={onSpeak}
                  // Sem `onPreview`: aqui o toque ja fala a frase, entao o toque
                  // longo nao teria com o que se diferenciar.
                  {...(isMine ? { onToggleFavorite: onRemoveMine, favoriteLabel: 'Remover' } : {})}
                  isFavorite={() => isMine}
                  emptyMessage="Nenhuma frase aqui ainda."
                />
              </div>
            )}
          </>
        )}

        {/* Depois da grade, e nao antes: estas faixas aparecem e somem conforme
            o estado, e acima da grade deslocariam as frases a cada mudanca. */}
        {current && (
          <div className="phrases__save">
            <p className="phrases__current">
              Frase montada agora: <strong>{current.label}</strong>
            </p>
            <button type="button" className="btn btn--ghost" onClick={() => onSave(current)}>
              ★ Salvar em Minhas frases
            </button>
          </div>
        )}

        {isHistory && termo.length < 2 && (
          <div className="phrases__save">
            <p className="phrases__current">
              O histórico fica só neste aparelho e some quando você limpa.
            </p>
            <button type="button" className="btn btn--ghost" onClick={onClearHistory}>
              Limpar histórico
            </button>
          </div>
        )}
      </div>
    </Dialog>
  )
}
