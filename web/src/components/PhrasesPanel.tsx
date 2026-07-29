import { useEffect, useMemo, useState } from 'react'
import type { Card, Settings } from '../types'
import { ALL_GROUPS, type PhraseGroup } from '../lib/phrases'
import { useRovingFocus } from '../lib/useRovingFocus'
import { CardGrid } from './CardGrid'
import { Dialog } from './Dialog'

interface Props {
  settings: Settings
  /** Frases salvas pelo proprio usuario. */
  mine: Card[]
  /** Ultimas frases ditas, mais recente primeiro. */
  history: Card[]
  /** A frase montada agora, se houver — para o botao de salvar. */
  current: Card | null
  onSpeak: (phrase: Card) => void
  onSave: (phrase: Card) => void
  onRemoveMine: (phrase: Card) => void
  onClearHistory: () => void
  onClose: () => void
}

/**
 * Frases prontas.
 *
 * A grade e a mesma da prancha (`CardGrid`), o que traz de graca a navegacao
 * por setas, o roving tabindex e o toque longo para ouvir sem falar alto. A
 * diferenca e que aqui um toque **fala a frase inteira** em vez de acrescentar
 * uma palavra: e o atalho para o que se repete todo dia.
 *
 * Ver `lib/phrases.ts` para por que os grupos estao nesta ordem.
 */
export function PhrasesPanel({
  settings,
  mine,
  history,
  current,
  onSpeak,
  onSave,
  onRemoveMine,
  onClearHistory,
  onClose,
}: Props) {
  const groups = useMemo<PhraseGroup[]>(() => {
    const dynamic: PhraseGroup[] = []
    if (mine.length) dynamic.push({ id: 'minhas', name: 'Minhas frases', icon: '★', phrases: mine })
    if (history.length)
      dynamic.push({ id: 'historico', name: 'Disse agora há pouco', icon: '↩', phrases: history })
    // Grupos do usuario entram no FIM, nunca deslocando os fixos: a posicao de
    // "Urgente" nao pode depender de quantas frases a pessoa salvou.
    return [...ALL_GROUPS, ...dynamic]
  }, [mine, history])

  const [active, setActive] = useState(0)
  const tabs = useRovingFocus(groups.length, setActive)

  useEffect(() => tabs.setFocused(active), [active, tabs])
  // Um grupo dinamico pode sumir (ultima frase removida, historico limpo).
  useEffect(() => {
    if (active >= groups.length) setActive(0)
  }, [active, groups.length])

  const group = groups[active] ?? groups[0]
  const isMine = group?.id === 'minhas'
  const isHistory = group?.id === 'historico'

  return (
    <Dialog title="Frases prontas" onClose={onClose}>
      <div className="shell phrases">
        <p className="settings__note phrases__intro">
          Um toque fala a frase inteira. Elas não substituem a prancha — são o atalho para o que
          se repete; o que ninguém previu continua sendo montado card a card.
        </p>

        <div className="phrases__tabs" role="tablist" aria-label="Grupos de frases">
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
        </div>

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

        {isHistory && (
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
