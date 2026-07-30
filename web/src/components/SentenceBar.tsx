import { Fragment, useState } from 'react'
import type { Card } from '../types'
import type { ArticleMode, Composed, GrammarMarks } from '../lib/grammar'
import { regionalLabel, type Region } from '../lib/regional'
import { alternativasDe } from '../lib/alternativas'
import type { Tratamento } from '../lib/tratamento'
import { Pictogram } from './Pictogram'
import { Faixa } from './Faixa'

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
  /** Artigo escolhido por posicao da frase. */
  articles: ArticleMode[]
  /** Nivel de fala, para saber quais formas oferecer. */
  tratamento: Tratamento
  /** Troca a palavra desta posicao por outra forma dela. */
  onTrocarPalavra: (index: number, label: string) => void
  onCycleArticle: (index: number) => void
  /** Guarda a frase montada em "Minhas frases", sem sair da tela. */
  onSave: () => void
  /** Esta frase ja esta guardada? */
  saved: boolean
}

/** O que o botao de artigo mostra e anuncia em cada estado. */
const ARTICLE_UI: Record<ArticleMode, { icon: string; label: string }> = {
  auto: { icon: 'o/–', label: 'Artigo automático' },
  def: { icon: 'o', label: 'Com artigo: o, a' },
  indef: { icon: 'um', label: 'Com artigo: um, uma' },
  none: { icon: '–', label: 'Sem artigo' },
}

/**
 * QUANDO — o tempo do verbo.
 *
 * Os rótulos eram `◇ ◀ ● ▶`, sem nome nenhum na tela. Quatro losangos e setas
 * não dizem "passado" para ninguém — nem para quem lê, e muito menos para quem
 * não lê, que é metade de quem usa uma prancha. Um símbolo só funciona quando
 * já se sabe o que ele quer dizer; até lá ele é decoração no lugar de controle.
 *
 * Agora cada um tem PALAVRA, e a palavra é a que se usa falando: "antes",
 * "agora", "depois" — não "pretérito", "presente", "futuro". A criança que diz
 * "antes eu comi" está certa; a gramática da escola vem depois.
 */
const TENSES = [
  { value: 'auto', icon: '✨', label: 'Sozinho', ajuda: 'O app decide pelo que a frase pede.' },
  { value: 'past', icon: '⏪', label: 'Antes', ajuda: 'Já aconteceu — "eu comi".' },
  { value: 'present', icon: '⏺', label: 'Agora', ajuda: 'Está acontecendo — "eu como".' },
  { value: 'future', icon: '⏩', label: 'Depois', ajuda: 'Vai acontecer — "eu vou comer".' },
] as const

/**
 * O que muda o SENTIDO da frase, cada um com nome e cor própria.
 *
 * Antes eram cinco botões iguais, com `?`, `…ndo`, `✋` e `+1` dentro. Além de
 * crípticos, todos tinham o mesmo peso visual — e negar uma frase não é a mesma
 * coisa que pluralizar um substantivo. A cor separa as famílias: o que nega, o
 * que pergunta, o que muda o modo, o que conta.
 */
const MARCADORES = [
  {
    chave: 'negated',
    grupo: 'nega',
    icon: '⃠',
    label: 'Não',
    ajuda: 'Nega a frase — "eu não quero".',
  },
  {
    chave: 'question',
    grupo: 'pergunta',
    icon: '?',
    label: 'Pergunta',
    ajuda: 'Vira pergunta — "você quer?".',
  },
  {
    chave: 'progressive',
    grupo: 'modo',
    icon: '↻',
    label: 'Agora mesmo',
    ajuda: 'Acontecendo agora — "estou comendo".',
  },
  {
    chave: 'request',
    grupo: 'modo',
    icon: '🤲',
    label: 'Pedido',
    ajuda: 'Pede em vez de contar — "abre a porta".',
  },
  {
    chave: 'plural',
    grupo: 'conta',
    icon: '＋',
    label: 'Mais de um',
    ajuda: 'Põe no plural a última coisa nomeada.',
  },
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
  articles,
  onCycleArticle,
  tratamento,
  onTrocarPalavra,
  onSave,
  saved,
}: Props) {
  /**
   * Qual bloco está com as formas abertas.
   *
   * Um por vez: a barra da frase é estreita, e duas listas abertas empurrariam
   * a prancha para fora da tela — que é o que ela não pode fazer nunca.
   */
  const [trocando, setTrocando] = useState<number | null>(null)

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

                {/* Trocar o artigo no proprio bloco.
                    O motor acerta quase sempre, mas "quase sempre" nao serve
                    quando a frase e sua: pedir O bolo (aquele ali) e pedir UM
                    bolo (qualquer um) sao coisas diferentes, e as vezes nao se
                    quer artigo nenhum. */}
                {composed && (
                  <button
                    type="button"
                    className={`chip__art ${(articles[i] ?? 'auto') !== 'auto' ? 'chip__art--set' : ''}`}
                    onClick={() => onCycleArticle(i)}
                    aria-label={`${label}: ${ARTICLE_UI[articles[i] ?? 'auto'].label}. Tocar para trocar`}
                    title={ARTICLE_UI[articles[i] ?? 'auto'].label}
                  >
                    {ARTICLE_UI[articles[i] ?? 'auto'].icon}
                  </button>
                )}

                {/* TROCAR A FORMA DA PALAVRA.
                    O app já sabe dizer "mamãe", "mãe" ou "minha mãe"; mas essas
                    escolhas moram em Ajustes, valem para o app inteiro e de uma
                    vez. A fala real não é assim: a mesma criança diz "mamãe" em
                    casa e "minha mãe" na escola. Aqui a escolha é DESTA palavra,
                    NESTA frase, e não muda ajuste nenhum. */}
                {alternativasDe(card.label, { region, tratamento }).length > 1 && (
                  <button
                    type="button"
                    className={`chip__act chip__act--trocar ${
                      trocando === i ? 'chip__act--on' : ''
                    }`}
                    aria-expanded={trocando === i}
                    onClick={() => setTrocando(trocando === i ? null : i)}
                    aria-label={`Outras formas de ${label}`}
                  >
                    ⇄
                  </button>
                )}

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

      {/* AS FORMAS DA PALAVRA — fora do bloco, de propósito.
          Dentro dele a lista era cortada: a barra da frase tem rolagem lateral,
          e `overflow` corta qualquer coisa posicionada por cima. Aqui embaixo
          ela cabe inteira, aparece no mesmo lugar toda vez, e em tela estreita
          não briga com a largura do bloco. */}
      {trocando !== null && sentence[trocando] && (
        <div className="formas" role="group" aria-label="Outras formas da palavra">
          <span className="formas__titulo">
            Em vez de <strong>{regionalLabel(sentence[trocando]!.label, region)}</strong>
          </span>
          {alternativasDe(sentence[trocando]!.label, { region, tratamento }).map((f) => (
            <button
              key={f.label}
              type="button"
              className={`formas__opcao ${f.origem === 'atual' ? 'formas__opcao--atual' : ''}`}
              disabled={f.origem === 'atual'}
              onClick={() => {
                onTrocarPalavra(trocando, f.label)
                setTrocando(null)
              }}
            >
              <strong>{f.label}</strong>
              <small>{f.nota}</small>
            </button>
          ))}
          <button
            type="button"
            className="formas__fechar"
            onClick={() => setTrocando(null)}
            aria-label="Fechar as formas"
          >
            ✕
          </button>
        </div>
      )}

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
        <Faixa className="marks" nome="marcadores" role="toolbar" ariaLabel="Marcadores gramaticais">
          <div className="marks__set marks__set--tempo" role="group" aria-label="Quando">
            <span className="marks__rotulo" aria-hidden="true">
              quando
            </span>
            {TENSES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`mark mark--tempo ${marks.tense === t.value ? 'mark--on' : ''}`}
                aria-pressed={marks.tense === t.value}
                disabled={empty}
                onClick={() => onMark({ tense: t.value })}
                title={t.ajuda}
              >
                <span className="mark__icone" aria-hidden="true">
                  {t.icon}
                </span>
                <span className="mark__nome">{t.label}</span>
              </button>
            ))}
          </div>

          {MARCADORES.map((m) => (
            <button
              key={m.chave}
              type="button"
              className={`mark mark--wide mark--${m.grupo} ${
                marks[m.chave] ? 'mark--on' : ''
              }`}
              aria-pressed={marks[m.chave]}
              disabled={empty}
              onClick={() => onMark({ [m.chave]: !marks[m.chave] })}
              title={m.ajuda}
            >
              <span className="mark__icone" aria-hidden="true">
                {m.icon}
              </span>
              <span className="mark__nome">{m.label}</span>
            </button>
          ))}
        </Faixa>
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
        {/* Guardar a frase ali mesmo.
            Antes era preciso abrir Frases prontas e achar a faixa de salvar —
            tres toques e uma troca de tela para guardar algo que a pessoa
            acabou de montar e vai repetir amanha. */}
        <button
          type="button"
          className={`btn btn--ghost ${saved ? 'btn--saved' : ''}`}
          onClick={onSave}
          disabled={empty}
          aria-label={
            empty
              ? 'Guardar frase (frase vazia)'
              : saved
                ? `Já guardada em Minhas frases: ${spoken}`
                : `Guardar em Minhas frases: ${spoken}`
          }
          aria-pressed={saved}
        >
          {saved ? '★' : '☆'}
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
