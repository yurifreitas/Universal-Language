import { Fragment } from 'react'
import type { Card } from '../types'
import type { Composed, GrammarMarks } from '../lib/grammar'
import { regionalLabel, type Region } from '../lib/regional'
import { Pictogram } from './Pictogram'

interface Props {
  sentence: Card[]
  /** Frase flexionada pelo motor. `null` quando a gramatica esta desligada. */
  composed: Composed | null
  marks: GrammarMarks
  region: Region
  onMark: (patch: Partial<GrammarMarks>) => void
  /** Liga o motor de frases a partir da propria barra. */
  onEnableGrammar: () => void
  onSpeak: () => void
  onBackspace: () => void
  onClear: () => void
  onRemoveAt: (index: number) => void
  /** Reordena a frase movendo o card de uma posicao para outra. */
  onMoveAt: (from: number, to: number) => void
  /** Fala uma palavra sozinha — a forma flexionada quando houver. */
  onSpeakWord: (card: Card, inflected?: string) => void
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
  region,
  onMark,
  onEnableGrammar,
  onSpeak,
  onBackspace,
  onClear,
  onRemoveAt,
  onMoveAt,
  onSpeakWord,
}: Props) {
  const empty = sentence.length === 0
  const spoken = composed
    ? composed.text
    : sentence.map((c) => regionalLabel(c.label, region)).join(' ')

  /**
   * A forma que cada card assumiu na frase falada, indexada pela posicao dele.
   *
   * E o que torna a flexao visivel NO CARD: quem escolheu QUERER ve "quero"
   * embaixo, e quem escolheu MÃO ve "minha mão". Antes isso so aparecia na
   * linha da frase inteira, onde era preciso descobrir sozinho qual palavra
   * veio de qual card.
   */
  const inflectedOf = new Map<number, string>()
  if (composed) {
    for (const t of composed.tokens) {
      if (t.kind === 'inflected' && t.cardIndex !== undefined) inflectedOf.set(t.cardIndex, t.text)
    }
  }

  return (
    <div className="sentence">
      <div className="sentence__strip" role="list" aria-label="Frase em construção">
        {empty ? (
          <p className="sentence__hint">Toque nos cards para montar a frase</p>
        ) : (
          sentence.map((card, i) => {
            const label = regionalLabel(card.label, region)
            const inflected = inflectedOf.get(i)
            return (
              // indice no key: a mesma palavra pode repetir na frase ("mais mais")
              <div key={`${card.id}-${i}`} role="listitem" className="chip">
                {/* Tocar o card FALA a palavra; nao apaga.
                    Apagar so no ✕, porque o toque no proprio bloco era o gesto
                    mais facil de acontecer sem querer — e apagar por engano no
                    meio de uma frase custa remontar tudo. */}
                <button
                  type="button"
                  className="chip__main"
                  onClick={() => onSpeakWord(card, inflected)}
                  aria-label={
                    inflected ? `${label}, dito como ${inflected}. Falar` : `${label}. Falar`
                  }
                >
                  <Pictogram card={card} eager />
                  <span className="chip__label">{label}</span>
                  {/* A forma flexionada so aparece quando difere do rotulo —
                      repetir "água/água" seria ruido. */}
                  {inflected && <span className="chip__form">{inflected}</span>}
                </button>

                <div className="chip__bar">
                  <button
                    type="button"
                    className="chip__act"
                    onClick={() => onMoveAt(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Mover ${label} para antes`}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="chip__act chip__act--del"
                    onClick={() => onRemoveAt(i)}
                    aria-label={`Remover ${label} da frase`}
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    className="chip__act"
                    onClick={() => onMoveAt(i, i + 1)}
                    disabled={i === sentence.length - 1}
                    aria-label={`Mover ${label} para depois`}
                  >
                    ›
                  </button>
                </div>
              </div>
            )
          })
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

      {/* Com o motor desligado a faixa de marcadores nao existe — e ate aqui
          nada na tela dizia que ela existia. Um convite de uma linha resolve:
          o recurso deixa de depender de a pessoa abrir Ajustes e ler ate o fim
          para descobrir que o app conjuga verbo. */}
      {!composed && !empty && (
        <div className="marks">
          <button type="button" className="mark mark--invite" onClick={onEnableGrammar}>
            <span aria-hidden="true">✍️</span>
            <span>Compor frase em português — conjugar verbo, tempo, negação</span>
          </button>
        </div>
      )}

      {composed && !empty && (
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
            className={`mark mark--wide ${marks.progressive ? 'mark--on' : ''}`}
            aria-pressed={marks.progressive}
            disabled={empty}
            onClick={() => onMark({ progressive: !marks.progressive })}
            title="Acontecendo agora — “estou comendo”"
          >
            <span aria-hidden="true">…ndo</span>
            <span className="sr-only">Acontecendo agora</span>
          </button>
          <button
            type="button"
            className={`mark mark--wide ${marks.request ? 'mark--on' : ''}`}
            aria-pressed={marks.request}
            disabled={empty}
            onClick={() => onMark({ request: !marks.request })}
            title="Pedido — “abre a porta”"
          >
            <span aria-hidden="true">✋</span>
            <span className="sr-only">Pedido</span>
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
