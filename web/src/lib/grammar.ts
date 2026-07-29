import type { Card } from '../types'
import {
  IRREGULAR_VERBS,
  LEXICON,
  TIME_ADVERBS,
  lookup,
  type Lexeme,
  type Person,
  type Tense,
} from './lexicon'

/**
 * Motor de frases — de selecao telegrafica para portugues flexionado.
 *
 * "eu querer agua"  ->  "Eu quero água."
 * "ontem eu ir escola"  ->  "Ontem eu fui para a escola."
 * "eu dor barriga"  ->  "Eu estou com dor na barriga."   (ver regra `dor`)
 *
 * TRES REGRAS QUE O MOTOR NAO PODE QUEBRAR
 *
 * 1. **Nao reordena a selecao do usuario.** A ordem das celulas tocadas e a
 *    ordem da frase. A unica excecao e a particula de negacao, que o portugues
 *    obriga a ficar antes do verbo. Nenhum sistema historico de CAA reordena a
 *    escolha do usuario (ver LANGUAGE-SYSTEMS.md secao 10), e reordenar seria
 *    dizer por ele algo que ele nao montou.
 *
 * 2. **Nao acrescenta conteudo, so funcional.** O motor insere artigo,
 *    preposicao, copula e flexao — nunca substantivo, verbo ou adjetivo novo.
 *
 * 3. **E reversivel.** Cada token sai etiquetado (`card` / `inflected` /
 *    `inserted`), a interface mostra o que foi acrescentado, e a frase literal
 *    continua disponivel. A saida flexionada e uma camada de apoio, nunca a
 *    unica fala possivel.
 */

export interface GrammarMarks {
  /** `auto` deixa os adverbios de tempo da propria frase decidirem. */
  tense: 'auto' | Tense
  negated: boolean
  question: boolean
  /** Pluraliza o ultimo substantivo da frase. */
  plural: boolean
}

export const NO_MARKS: GrammarMarks = {
  tense: 'auto',
  negated: false,
  question: false,
  plural: false,
}

export type TokenKind =
  /** veio de um card, inalterado */
  | 'card'
  /** veio de um card, com a forma mudada (conjugado, pluralizado, concordado) */
  | 'inflected'
  /** nao veio de card nenhum: artigo, preposicao, copula, particula */
  | 'inserted'

export interface Token {
  text: string
  kind: TokenKind
  /** indice na frase de cards, quando houver */
  cardIndex?: number
  /** rotulo original, quando `inflected` — a interface mostra a origem */
  original?: string
}

export interface Composed {
  /** frase flexionada, pontuada e capitalizada */
  text: string
  tokens: Token[]
  /** a selecao literal, sem motor — o que o app fala com a gramatica desligada */
  raw: string
  /** quantas palavras funcionais o motor precisou inserir ou mudar */
  changes: number
}

/* -------------------------------------------------------------- conjugacao */

const REGULAR: Record<'ar' | 'er' | 'ir', Record<Tense, Record<Person, string>>> = {
  ar: {
    present: { '1s': 'o', '2s': 'a', '3s': 'a', '1p': 'amos', '3p': 'am' },
    past: { '1s': 'ei', '2s': 'ou', '3s': 'ou', '1p': 'amos', '3p': 'aram' },
    future: { '1s': 'ar', '2s': 'ar', '3s': 'ar', '1p': 'ar', '3p': 'ar' },
  },
  er: {
    present: { '1s': 'o', '2s': 'e', '3s': 'e', '1p': 'emos', '3p': 'em' },
    past: { '1s': 'i', '2s': 'eu', '3s': 'eu', '1p': 'emos', '3p': 'eram' },
    future: { '1s': 'er', '2s': 'er', '3s': 'er', '1p': 'er', '3p': 'er' },
  },
  ir: {
    present: { '1s': 'o', '2s': 'e', '3s': 'e', '1p': 'imos', '3p': 'em' },
    past: { '1s': 'i', '2s': 'iu', '3s': 'iu', '1p': 'imos', '3p': 'iram' },
    future: { '1s': 'ir', '2s': 'ir', '3s': 'ir', '1p': 'ir', '3p': 'ir' },
  },
}

/**
 * Conjuga um infinitivo. Locucoes ("escovar os dentes", "tomar banho") tem so
 * o verbo-cabeca flexionado; o resto e complemento fixo.
 *
 * O futuro e sempre **perifrastico** ("vou comer"), nunca sintetico
 * ("comerei"): e a forma corrente do portugues brasileiro falado e, de quebra,
 * dispensa toda a irregularidade do futuro — basta `ir` no presente.
 */
export function conjugate(infinitive: string, person: Person, tense: Tense): string {
  const parts = infinitive.split(' ')
  const head = parts[0] ?? infinitive
  const tail = parts.slice(1).join(' ')
  const join = (v: string) => (tail ? `${v} ${tail}` : v)

  if (tense === 'future') {
    // "vou ir" nao existe na fala: o futuro de IR e o proprio presente de IR.
    if (head === 'ir') return join(conjugate('ir', person, 'present'))
    return join(`${conjugate('ir', person, 'present')} ${head}`)
  }

  const irregular = IRREGULAR_VERBS[head]?.[tense]?.[person]
  if (irregular) return join(irregular)

  const group = head.endsWith('ar') ? 'ar' : head.endsWith('er') ? 'er' : head.endsWith('ir') ? 'ir' : null
  if (!group) return infinitive // nao sabemos conjugar: devolve intacto

  return join(head.slice(0, -2) + REGULAR[group][tense][person])
}

/* ----------------------------------------------------------- concordancia */

export function pluralize(word: string, lex?: Lexeme): string {
  if (lex?.plural) return word
  if (lex?.pluralForm) return lex.pluralForm

  const parts = word.split(' ')
  const head = parts[0] ?? word
  const tail = parts.slice(1).join(' ')
  const join = (v: string) => (tail ? `${v} ${tail}` : v)

  if (/[sz]$/.test(head)) return join(/[aeiou]s$/.test(head) ? `${head}es` : head)
  if (head.endsWith('m')) return join(`${head.slice(0, -1)}ns`)
  if (/[rl]$/.test(head)) return join(head.endsWith('l') ? `${head.slice(0, -1)}is` : `${head}es`)
  if (head.endsWith('ão')) return join(`${head.slice(0, -2)}ões`)
  return join(`${head}s`)
}

/** Concordancia de adjetivo. Invariavel (feliz, grande) fica como esta. */
function agree(word: string, gender: 'm' | 'f', plural: boolean, lex?: Lexeme): string {
  let out = word
  // So flexiona genero quem tem forma feminina: o lexico marca `gender: 'm'`
  // nos adjetivos de duas formas (bonito/bonita) e omite nos invariaveis.
  if (gender === 'f' && lex?.gender === 'm' && out.endsWith('o')) out = `${out.slice(0, -1)}a`
  if (plural) out = pluralize(out, undefined)
  return out
}

const DETERMINERS: Record<string, Record<'m' | 'f', [string, string]>> = {
  // singular, plural
  meu: { m: ['meu', 'meus'], f: ['minha', 'minhas'] },
  minha: { m: ['meu', 'meus'], f: ['minha', 'minhas'] },
}

function article(gender: 'm' | 'f', plural: boolean): string {
  if (gender === 'f') return plural ? 'as' : 'a'
  return plural ? 'os' : 'o'
}

const CONTRACTIONS: Record<string, Record<string, string>> = {
  de: { o: 'do', a: 'da', os: 'dos', as: 'das' },
  em: { o: 'no', a: 'na', os: 'nos', as: 'nas' },
  a: { o: 'ao', a: 'à', os: 'aos', as: 'às' },
}

/** "em" + "a" = "na". Preposicoes sem contracao ("para", "com") ficam soltas. */
function contract(prep: string, art: string): string[] {
  const merged = CONTRACTIONS[prep]?.[art]
  return merged ? [merged] : [prep, art]
}

/* ---------------------------------------------------------------- composicao */

interface Item {
  card: Card
  lex: Lexeme
  index: number
  label: string
}

/**
 * Genero do falante. O portugues nao tem forma neutra para adjetivo: quem diz
 * "estou cansad_" precisa escolher. `n` mantem a forma nao-marcada do lexico em
 * vez de presumir — a escolha e do usuario, em Ajustes.
 */
export type SpeakerGender = 'n' | 'm' | 'f'

export interface ComposeOptions {
  marks?: GrammarMarks
  speakerGender?: SpeakerGender
}

export function compose(sentence: Card[], options: ComposeOptions = {}): Composed {
  const marks = options.marks ?? NO_MARKS
  const speakerGender = options.speakerGender ?? 'n'
  const raw = sentence.map((c) => c.label).join(' ')

  const items: Item[] = sentence.map((card, index) => ({
    card,
    index,
    label: card.label.trim().toLowerCase(),
    lex: lookup(card.label),
  }))

  if (!items.length) return { text: '', tokens: [], raw, changes: 0 }

  /* --- traços globais da frase ------------------------------------------ */

  const pronoun = items.find((it) => it.lex.class === 'pronoun')
  const person: Person = pronoun?.lex.person ?? '1s'
  // Sem pronome, a frase e assumida em 1a pessoa: numa prancha de CAA o
  // enunciado padrao e sobre o proprio falante ("quero agua"). O pronome
  // implicito NAO e escrito na frase — so a flexao do verbo o indica.

  const timeAdverb = items.find((it) => TIME_ADVERBS[it.label])
  const tense: Tense =
    marks.tense !== 'auto' ? marks.tense : (timeAdverb && TIME_ADVERBS[timeAdverb.label]) || 'present'

  const negationCard = items.find((it) => it.lex.class === 'negation')
  const negated = marks.negated || Boolean(negationCard)
  const question = marks.question || items.some((it) => it.lex.class === 'question')

  const lastNounIndex = marks.plural
    ? items.reduce((acc, it) => (it.lex.class === 'noun' ? it.index : acc), -1)
    : -1

  /* --- varredura --------------------------------------------------------- */

  const tokens: Token[] = []
  const push = (text: string, kind: TokenKind, extra: Partial<Token> = {}) => {
    if (text) tokens.push({ text, kind, ...extra })
  }

  let verbDone = false
  let negationDone = false
  let pendingPrep: string | null = null
  let suppressArticle = false
  let lastNoun: { gender: 'm' | 'f'; plural: boolean; label: string; lex: Lexeme } | null = null
  let previousWasNoun = false
  let questionSeen = false

  const emitNegation = () => {
    if (!negated || negationDone) return
    negationDone = true
    if (negationCard) push('não', 'card', { cardIndex: negationCard.index })
    else push('não', 'inserted')
  }

  /**
   * Pessoa que a copula deve seguir. Com pronome, e a dele. Sem pronome, se ja
   * houve um substantivo, ele e o sujeito e manda 3a pessoa ("a água está
   * quente"); sem nada, volta a 1a pessoa implicita.
   */
  const subjectPerson = (): Person => {
    if (pronoun) return person
    if (lastNoun) return lastNoun.plural ? '3p' : '3s'
    return person
  }

  /** Insere a copula quando a frase e "eu triste" — sem verbo nenhum. */
  const emitCopula = (verb: 'estar' | 'ter' = 'estar') => {
    emitNegation()
    push(conjugate(verb, subjectPerson(), tense), 'inserted')
    verbDone = true
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i]!
    const { lex, label } = it
    const next = items[i + 1]
    const isPlural = it.index === lastNounIndex

    switch (lex.class) {
      case 'negation':
        // Nao se emite aqui: o portugues quer a particula colada ao verbo, e o
        // usuario pode ter tocado NAO em qualquer posicao.
        break

      case 'pronoun':
        push(it.card.label, 'card', { cardIndex: it.index })
        previousWasNoun = false
        break

      case 'determiner': {
        // Concorda com o substantivo seguinte, nao com o rotulo do card:
        // MEU + MAO tem de virar "minha mão".
        const target = next?.lex.class === 'noun' ? next.lex : undefined
        const gender = target?.gender ?? lex.gender ?? 'm'
        const forms = DETERMINERS[label]
        const text = forms ? forms[gender][isPluralNext(next, lastNounIndex) ? 1 : 0] : it.card.label
        push(text, text === it.card.label ? 'card' : 'inflected', {
          cardIndex: it.index,
          ...(text === it.card.label ? {} : { original: it.card.label }),
        })
        suppressArticle = true
        previousWasNoun = false
        break
      }

      case 'verb': {
        emitNegation()
        if (lex.fixed || (lex as { guessed?: boolean }).guessed) {
          // Palavra fora do lexico so foi ADIVINHADA como verbo pela
          // terminacao. Conjugar um chute produz forma inexistente ("ver" ->
          // "vo"); manter o infinitivo produz frase telegrafica, que e apenas
          // menos polida. Na duvida, a saida menos errada.
          push(it.card.label, 'card', { cardIndex: it.index })
          verbDone = true
        } else if (!verbDone) {
          const text = conjugate(label, person, tense)
          push(text, text === label ? 'card' : 'inflected', {
            cardIndex: it.index,
            ...(text === label ? {} : { original: it.card.label }),
          })
          verbDone = true
        } else {
          // Verbo em cadeia fica no infinitivo: "quero comer", "vou dormir".
          push(it.card.label, 'card', { cardIndex: it.index })
        }

        if (lex.prep) pendingPrep = lex.prep
        // Movimento + lugar pede "para": "vou para a escola". So se o proximo
        // for de fato um lugar — "vou dormir" nao leva preposicao alguma.
        if ((label === 'ir' || label === 'vir') && next?.lex.place) pendingPrep = 'para'
        previousWasNoun = false
        break
      }

      case 'noun': {
        // PARTE DO CORPO + DOR ("mão dor") e uma das construcoes mais
        // frequentes numa prancha, e a traducao natural nao usa o substantivo:
        // e o verbo DOER concordando com a parte do corpo — "minha mão dói".
        if (!verbDone && label === 'dor' && lastNoun?.lex.bodyPart) {
          emitNegation()
          const text = conjugate('doer', lastNoun.plural ? '3p' : '3s', tense)
          push(text, 'inflected', { cardIndex: it.index, original: it.card.label })
          verbDone = true
          previousWasNoun = false
          break
        }

        // Sem verbo antes de um substantivo de estado ("eu fome"), a copula
        // correta e TER: "eu tenho fome", nao "eu estou fome". DOR pede
        // "estar com": "estou com dor".
        if (!verbDone && (label === 'fome' || label === 'sede' || label === 'medo' || label === 'dor')) {
          emitCopula(label === 'dor' ? 'estar' : 'ter')
          if (label === 'dor') pendingPrep = 'com'
        }

        // "onde mãe" nao e frase: a pergunta de localizacao pede copula, e ela
        // concorda com o substantivo que ainda VAI vir, nao com o anterior.
        if (!verbDone && questionSeen) {
          emitNegation()
          push(conjugate('estar', isPlural || lex.plural ? '3p' : '3s', tense), 'inserted')
          verbDone = true
        }

        // Dois substantivos seguidos pedem ligacao. DOR + parte do corpo e o
        // caso mais frequente numa prancha ("dor na barriga"); os demais
        // recebem "de" ("suco de fruta").
        if (previousWasNoun && !pendingPrep && lastNoun) {
          pendingPrep = lastNoun.label === 'dor' && lex.bodyPart ? 'em' : 'de'
        }

        const gender = lex.gender ?? 'm'
        const prep = pendingPrep
        pendingPrep = null

        const wantsArticle = decideArticle({ lex, prep, suppressArticle })
        const art = wantsArticle ? article(gender, isPlural || Boolean(lex.plural)) : null

        if (prep && art) contract(prep, art).forEach((t) => push(t, 'inserted'))
        else if (prep) push(prep, 'inserted')
        else if (art) push(art, 'inserted')

        const text = isPlural ? pluralize(it.card.label, lex) : it.card.label
        push(text, text === it.card.label ? 'card' : 'inflected', {
          cardIndex: it.index,
          ...(text === it.card.label ? {} : { original: it.card.label }),
        })

        lastNoun = { gender, plural: isPlural || Boolean(lex.plural), label, lex }
        suppressArticle = false
        previousWasNoun = true
        break
      }

      case 'adjective': {
        // "eu triste" nao e frase em portugues; "eu estou triste" e. A copula
        // so entra se ainda nao houver verbo.
        if (!verbDone) emitCopula()

        // Concorda com o ultimo substantivo ("a agua quente") ou, se nao houver,
        // com o falante ("estou cansada") — cujo genero e ajuste explicito.
        const subject = subjectPerson()
        const gender = lastNoun?.gender ?? (speakerGender === 'f' ? 'f' : 'm')
        const plural = lastNoun?.plural ?? (subject === '1p' || subject === '3p')
        const text =
          lastNoun || speakerGender !== 'n' || plural
            ? agree(it.card.label, gender, plural, lex)
            : it.card.label
        push(text, text === it.card.label ? 'card' : 'inflected', {
          cardIndex: it.index,
          ...(text === it.card.label ? {} : { original: it.card.label }),
        })
        previousWasNoun = false
        break
      }

      case 'quantifier':
        push(it.card.label, 'card', { cardIndex: it.index })
        // "mais agua", "muito bolo": quantificador ja determina, artigo sobra.
        suppressArticle = true
        previousWasNoun = false
        break

      case 'question':
        questionSeen = true
        push(it.card.label, 'card', { cardIndex: it.index })
        previousWasNoun = false
        break

      case 'adverb':
      case 'affirmation':
      case 'social':
      case 'connector':
      default:
        push(it.card.label, 'card', { cardIndex: it.index })
        previousWasNoun = false
        break
    }
  }

  // Negacao escolhida sem nenhum verbo na frase ("não" + "bolo"): a particula
  // abre a frase, que e como se diz na fala ("não, bolo não").
  if (negated && !negationDone) {
    tokens.unshift(
      negationCard
        ? { text: 'não', kind: 'card', cardIndex: negationCard.index }
        : { text: 'não', kind: 'inserted' },
    )
  }

  const text = punctuate(tokens.map((t) => t.text).join(' '), question)
  const changes = tokens.filter((t) => t.kind !== 'card').length

  return { text, tokens, raw, changes }
}

function isPluralNext(next: Item | undefined, lastNounIndex: number): boolean {
  if (!next || next.lex.class !== 'noun') return false
  return next.index === lastNounIndex || Boolean(next.lex.plural)
}

function decideArticle(args: {
  lex: Lexeme
  prep: string | null
  suppressArticle: boolean
}): boolean {
  const { lex, prep, suppressArticle } = args
  if (suppressArticle) return false
  // Palavra fora do lexico: o genero e chute pela terminacao. Errar o artigo
  // ("o mão") e pior que nao ter artigo, entao nao se arrisca.
  if ((lex as { guessed?: boolean }).guessed) return false
  if (lex.bareAfterPrep && prep) return false
  if (lex.mass) return false
  if (prep === 'de' && !lex.animate && !lex.place) return false
  return true
}

function punctuate(text: string, question: boolean): string {
  if (!text) return ''
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1)
  return capitalized + (question ? '?' : '.')
}

/** Um rotulo e conhecido pelo lexico? A interface avisa quando nao e. */
export function isKnown(label: string): boolean {
  return label.trim().toLowerCase() in LEXICON
}
