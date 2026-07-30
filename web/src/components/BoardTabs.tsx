import { useEffect, useRef } from 'react'
import type { Board } from '../types'
import { useRovingFocus } from '../lib/useRovingFocus'

interface Props {
  boards: Board[]
  active: number
  onChange: (i: number) => void
}

export const tabId = (id: string) => `tab-${id}`
export const panelId = (id: string) => `panel-${id}`

/**
 * Pranchas como padrao Tabs do WAI-ARIA APG.
 *
 * Antes eram botoes soltos com `aria-current`: funcionava, mas nao dizia ao
 * leitor de tela que sao um conjunto excludente, nem quantos sao, nem qual
 * regiao cada um controla. Com o padrao correto o leitor anuncia
 * "Comida, aba 3 de 9, selecionada".
 *
 * Ativacao automatica ao receber foco — o APG recomenda quando o conteudo troca
 * sem latencia perceptivel, que e o caso (as pranchas ja estao em memoria).
 *
 * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
export function BoardTabs({ boards, active, onChange }: Props) {
  const { setFocused, setRef, onKeyDown } = useRovingFocus(boards.length, onChange)
  const strip = useRef<HTMLDivElement>(null)

  /**
   * A aba ativa entra em cena sozinha.
   *
   * Em celular a faixa de abas rola na horizontal, e trocar de prancha por
   * atalho de teclado (1–9) ou pelo aparecimento da prancha de Favoritos podia
   * deixar a aba selecionada fora da area visivel: a grade mudava e nada na
   * tela dizia por que.
   */
  useEffect(() => {
    const el = strip.current?.children[active]
    el?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [active])

  // Mantem o indice do roving em sincronia quando a prancha muda por outro
  // caminho (atalho de teclado 1-9, ou remocao da prancha de favoritos).
  useEffect(() => setFocused(active), [active, setFocused])

  return (
    <nav className="tabs">
      <div
        ref={strip}
        className="shell tabs__inner"
        role="tablist"
        aria-label="Pranchas de vocabulário"
      >
        {boards.map((b, i) => (
          <button
            key={b.id}
            ref={setRef(i)}
            type="button"
            role="tab"
            id={tabId(b.id)}
            aria-selected={i === active}
            // Apenas o painel ativo e renderizado, entao so a aba selecionada
            // pode apontar para ele. Manter `aria-controls` nas outras criaria
            // 8 referencias penduradas para IDs inexistentes — pior que omitir.
            {...(i === active ? { 'aria-controls': panelId(b.id) } : {})}
            // Roving tabindex: so a aba selecionada entra na ordem de tabulacao.
            tabIndex={i === active ? 0 : -1}
            className={`tab ${i === active ? 'tab--active' : ''}`}
            onClick={() => onChange(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            title={i < 9 ? `${b.name} (tecla ${i + 1})` : b.name}
          >
            <span className="tab__icon" aria-hidden="true">
              {b.icon}
            </span>
            <span className="tab__name">{b.name}</span>
            <span className="sr-only">{`, ${b.cards.length} cards`}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
