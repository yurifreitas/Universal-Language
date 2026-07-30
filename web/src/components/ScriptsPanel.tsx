import { useEffect, useMemo, useState } from 'react'
import type { Card } from '../types'
import { BUILT_IN_SCRIPTS, duplicate, moveStep, scriptId, type Script } from '../lib/scripts'
import { useRovingFocus } from '../lib/useRovingFocus'
import { Pictogram } from './Pictogram'
import { Dialog } from './Dialog'

interface Props {
  mine: Script[]
  /** Fontes de passos prontos: o que foi dito e o que foi salvo. */
  history: Card[]
  phrases: Card[]
  onSpeak: (step: Card) => void
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
 */
export function ScriptsPanel({ mine, history, phrases, onSpeak, onChange, onClose }: Props) {
  const all = useMemo<Script[]>(() => [...BUILT_IN_SCRIPTS, ...mine], [mine])
  const [active, setActive] = useState(0)
  const [step, setStep] = useState(0)
  const [newName, setNewName] = useState('')
  /** Passos ja falados nesta passagem pelo roteiro. */
  const [done, setDone] = useState<number[]>([])
  const tabs = useRovingFocus(all.length, setActive)

  useEffect(() => tabs.setFocused(active), [active, tabs])
  useEffect(() => {
    setStep(0)
    setDone([])
  }, [active])
  useEffect(() => {
    if (active >= all.length) setActive(0)
  }, [active, all.length])

  const script = all[active]
  const editable = Boolean(script && !script.builtIn)

  const patch = (fn: (s: Script) => Script) => {
    if (!script) return
    onChange(mine.map((s) => (s.id === script.id ? fn(s) : s)))
  }

  const total = script?.steps.length ?? 0

  const speakStep = (card: Card, i: number) => {
    onSpeak(card)
    setStep(Math.min(i + 1, Math.max(0, total - 1)))
    // Passo falado fica marcado como cumprido. Nao e pontuacao nem premio: e
    // memoria de onde se esta, para quem perdeu o fio no meio de uma interacao
    // — que e o motivo de existir um roteiro.
    setDone((d) => (d.includes(i) ? d : [...d, i]))
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

  return (
    <Dialog title="Roteiros" onClose={onClose}>
      <div className="shell phrases">
        <p className="settings__note phrases__intro">
          A ordem do que se costuma dizer numa situação que se repete. Saber a sequência de
          antemão tira parte do peso de uma situação imprevisível — e evita remontar cada frase
          na frente de um estranho com pressa. Nenhum passo é obrigatório.
        </p>

        <div className="phrases__tabs" role="tablist" aria-label="Roteiros">
          {all.map((s, i) => (
            <button
              key={s.id}
              ref={tabs.setRef(i)}
              type="button"
              role="tab"
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              className={`tab ${i === active ? 'tab--active' : ''}`}
              onClick={() => setActive(i)}
              onKeyDown={(e) => tabs.onKeyDown(e, i)}
            >
              <span className="tab__name">{s.name}</span>
              <span className="sr-only">{`, ${s.steps.length} passos`}</span>
            </button>
          ))}
        </div>

        {script && total > 0 && (
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
            {done.length > 0 && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setDone([])
                  setStep(0)
                }}
              >
                ↺ Começar de novo
              </button>
            )}
          </div>
        )}

        {script && (
          <ol className="steps" aria-label={`Passos de ${script.name}`}>
            {script.steps.map((card, i) => (
              <li
                key={`${card.id}-${i}`}
                className={`step ${i === step ? 'step--now' : ''} ${
                  done.includes(i) ? 'step--done' : ''
                }`}
              >
                <span className="step__n" aria-hidden="true">
                  {done.includes(i) ? '✓' : i + 1}
                </span>
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
                {editable && (
                  <span className="editor__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => patch((s) => moveStep(s, i, i - 1))}
                      disabled={i === 0}
                      aria-label="Mover passo para cima"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => patch((s) => moveStep(s, i, i + 1))}
                      disabled={i === script.steps.length - 1}
                      aria-label="Mover passo para baixo"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => patch((s) => ({ ...s, steps: s.steps.filter((_, j) => j !== i) }))}
                      aria-label="Remover passo"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}

        {script?.builtIn && (
          <div className="phrases__save">
            <p className="phrases__current">
              Roteiro de fábrica: para mudar os passos, faça uma cópia sua.
            </p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                const copy = duplicate(script, mine)
                onChange([...mine, copy])
                setActive(BUILT_IN_SCRIPTS.length + mine.length)
              }}
            >
              Fazer uma cópia editável
            </button>
          </div>
        )}

        {editable && script && (
          <section className="settings__group">
            <h3>Acrescentar passo</h3>
            {candidates.length === 0 ? (
              <p className="settings__note">
                Os passos vêm das suas frases salvas e do que você disse há pouco. Fale ou salve
                uma frase e ela aparece aqui.
              </p>
            ) : (
              <div className="editor__results">
                {candidates.map((c, i) => (
                  <button
                    key={`${c.id}-${i}`}
                    type="button"
                    className="editor__result"
                    onClick={() => patch((s) => ({ ...s, steps: [...s.steps, c] }))}
                  >
                    <Pictogram card={c} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--wide"
              onClick={() => {
                onChange(mine.filter((s) => s.id !== script.id))
                setActive(0)
              }}
            >
              ✕ Apagar este roteiro
            </button>
          </section>
        )}

        <section className="settings__group">
          <h3>Novo roteiro</h3>
          <label className="field">
            <span>Nome da situação</span>
            <input
              type="text"
              value={newName}
              placeholder="Ir ao dentista, aniversário, ônibus…"
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn--ghost btn--wide"
            onClick={() => {
              const name = newName.trim()
              if (!name) return
              const created: Script = { id: scriptId(name, mine), name, icon: 7072, steps: [] }
              onChange([...mine, created])
              setNewName('')
              setActive(BUILT_IN_SCRIPTS.length + mine.length)
            }}
          >
            + Criar roteiro
          </button>
          <p className="settings__note">
            Depois de criar, os passos são escolhidos entre as frases que você salvou e as que
            disse há pouco — é assim que o histórico vira roteiro.
          </p>
        </section>
      </div>
    </Dialog>
  )
}
