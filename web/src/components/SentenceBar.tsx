import { Fragment } from 'react'
import type { Card } from '../types'
import type { Composed, GrammarMarks } from '../lib/grammar'
import { Pictogram } from './Pictogram'

interface Props {
  sentence: Card[]
  /** Frase flexionada pelo motor. `null` quando a gramatica esta desligada. */
  composed: Composed | null
  marks: GrammarMarks
  onMark: (patch: Partial<GrammarMarks>) => void
  onSpeak: () => void
  onBackspace: () => void
  onClear: () => void
  onRemoveAt: (index: number) => void
}

const TENSES = [
  { value: 'auto', icon: '◇', label: 'Tempo automático' },
  { value: 'past', icon: '◀', label: 'Passado' },
  { value: 'present', icon: '●', label: 'Agora' },
  { value: 'future', icon: '▶', label: 'Futuro' },
] as const

/**
 * Barra da frase: os cards escolhidos, em ordem, e os controles de fala.
 *
 * Fica no topo e sempre visivel — e o "visor" do usuario, o equivalente ao que
 * ele esta prestes a dizer. Nunca deve rolar para fora da tela.
 *
 * Com o motor de frases ligado, ganha duas camadas:
 *
 * 1. A **frase falada**, logo abaixo dos cards, com o que o motor acrescentou
 *    (artigo, preposicao, copula) marcado visualmente. Ver o acrescimo e o que
 *    torna o motor auditavel em vez de magico — quem acompanha a terapia
 *    precisa saber o que a maquina pos na boca da pessoa.
 * 2. Os **marcadores gramaticais** — tempo, negacao, pergunta, plural — numa
 *    faixa propria. Esta e a licao do Blissymbolics: o indicador gramatical e
 *    separado do simbolo-base, nunca um pictograma novo por flexao
 *    (LANGUAGE-SYSTEMS.md secao 1). E fica FORA da grade, porque mover celula
 *    apaga memoria motora (LAMP, secao 5).
 */
export function SentenceBar({
  sentence,
  composed,
  marks,
  onMark,
  onSpeak,
  onBackspace,
  onClear,
  onRemoveAt,
}: Props) {
  const empty = sentence.length === 0
  const spoken = composed ? composed.text : sentence.map((c) => c.label).join(' ')

  return (
    <div className="sentence">
      <div className="sentence__strip" role="list" aria-label="Frase em construção">
        {empty ? (
          <p className="sentence__hint">Toque nos cards para montar a frase</p>
        ) : (
          sentence.map((card, i) => (
            <button
              // indice no key: a mesma palavra pode repetir na frase ("mais mais")
              key={`${card.id}-${i}`}
              type="button"
              role="listitem"
              className="chip"
              onClick={() => onRemoveAt(i)}
              aria-label={`Remover ${card.label}`}
            >
              <Pictogram card={card} eager />
              <span className="chip__label">{card.label}</span>
            </button>
          ))
        )}
      </div>

      {composed && !empty && (
        <p className="gram" aria-hidden="true">
          {composed.tokens.map((t, i) => (
            // O espaco entre palavras e texto de verdade, nao `content` de CSS:
            // conteudo gerado por CSS nao e selecionavel nem copiavel.
            <Fragment key={i}>
              {i > 0 ? ' ' : ''}
              <span
                className={
                  t.kind === 'inserted'
                    ? 'gram__word gram__word--added'
                    : t.kind === 'inflected'
                      ? 'gram__word gram__word--flex'
                      : 'gram__word'
                }
                {...(t.original ? { title: `${t.original} → ${t.text}` } : {})}
              >
                {t.text}
              </span>
            </Fragment>
          ))}
          {composed.text.slice(-1)}
        </p>
      )}

      {composed && (
        <div className="marks" role="toolbar" aria-label="Marcadores gramaticais">
          <div className="marks__set" role="group" aria-label="Tempo verbal">
            {TENSES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`mark ${marks.tense === t.value ? 'mark--on' : ''}`}
                aria-pressed={marks.tense === t.value}
                disabled={empty}
                onClick={() => onMark({ tense: t.value })}
                title={t.label}
              >
                <span aria-hidden="true">{t.icon}</span>
                <span className="sr-only">{t.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`mark mark--wide ${marks.negated ? 'mark--on' : ''}`}
            aria-pressed={marks.negated}
            disabled={empty}
            onClick={() => onMark({ negated: !marks.negated })}
          >
            não
          </button>
          <button
            type="button"
            className={`mark mark--wide ${marks.question ? 'mark--on' : ''}`}
            aria-pressed={marks.question}
            disabled={empty}
            onClick={() => onMark({ question: !marks.question })}
          >
            <span aria-hidden="true">?</span>
            <span className="sr-only">Pergunta</span>
          </button>
          <button
            type="button"
            className={`mark mark--wide ${marks.plural ? 'mark--on' : ''}`}
            aria-pressed={marks.plural}
            disabled={empty}
            onClick={() => onMark({ plural: !marks.plural })}
            title="Plural — aplica-se à última coisa nomeada"
          >
            <span aria-hidden="true">+1</span>
            <span className="sr-only">Plural</span>
          </button>
        </div>
      )}

      <div className="sentence__actions">
        <button
          type="button"
          className="btn btn--speak"
          onClick={onSpeak}
          disabled={empty}
          aria-label={empty ? 'Falar frase (frase vazia)' : `Falar: ${spoken}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" width="26" height="26">
            <path
              fill="currentColor"
              d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 2.2v2.1a7.5 7.5 0 0 1 0 15.4v2.1a9.6 9.6 0 0 0 0-19.6z"
            />
          </svg>
          <span>Falar</span>
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onBackspace}
          disabled={empty}
          aria-label="Apagar último card"
        >
          ⌫
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onClear}
          disabled={empty}
          aria-label="Limpar frase"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
