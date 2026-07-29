import type { Card } from '../types'
import {
  ESTAR_IMPERFECT,
  GERUND,
  IRREGULAR_VERBS,
  LEXICON,
  SUBJUNCTIVE,
  TIME_ADVERBS,
  lookup,
  type Lexeme,
  type Person,
  type Tense,
} from './lexicon'
import {
  regionalLabel,
  secondPerson,
  tuUsesThirdPerson,
  type Region,
  type Register,
} from './regional'

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
  /**
   * Acontecendo agora: perifrase progressiva ("estou comendo"). Combina com o
   * tempo — com passado da o imperfeito ("estava comendo"), que e a unica forma
   * de imperfeito que o motor produz.
   */
  progressive: boolean
  /**
   * Pedido. Poe o verbo no imperativo ("abre a porta" no coloquial, "abra a
   * porta" no normativo). Nao se aplica quando a frase tem sujeito explicito
   * de 2a pessoa: "voce abre a porta" ja e um pedido em portugues falado, e
   * "voce abra" nao existe.
   */
  request: boolean
}

export const NO_MARKS: GrammarMarks = {
  tense: 'auto',
  negated: false,
  question: false,
  plural: false,
  progressive: false,
  request: false,
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
    present: { '1s': 'o', '2s': 'a', '2t': 'as', '3s': 'a', '1p': 'amos', '3p': 'am' },
    past: { '1s': 'ei', '2s': 'ou', '2t': 'aste', '3s': 'ou', '1p': 'amos', '3p': 'aram' },
    future: { '1s': 'ar', '2s': 'ar', '2t': 'ar', '3s': 'ar', '1p': 'ar', '3p': 'ar' },
  },
  er: {
    present: { '1s': 'o', '2s': 'e', '2t': 'es', '3s': 'e', '1p': 'emos', '3p': 'em' },
    past: { '1s': 'i', '2s': 'eu', '2t': 'este', '3s': 'eu', '1p': 'emos', '3p': 'eram' },
    future: { '1s': 'er', '2s': 'er', '2t': 'er', '3s': 'er', '1p': 'er', '3p': 'er' },
  },
  ir: {
    present: { '1s': 'o', '2s': 'e', '2t': 'es', '3s': 'e', '1p': 'imos', '3p': 'em' },
    past: { '1s': 'i', '2s': 'iu', '2t': 'iste', '3s': 'iu', '1p': 'imos', '3p': 'iram' },
    future: { '1s': 'ir', '2s': 'ir', '2t': 'ir', '3s': 'ir', '1p': 'ir', '3p': 'ir' },
  },
}

function verbGroup(head: string): 'ar' | 'er' | 'ir' | null {
  if (head.endsWith('ar')) return 'ar'
  if (head.endsWith('er')) return 'er'
  if (head.endsWith('ir')) return 'ir'
  return null
}

/** Gerundio: falar → falando, comer → comendo, partir → partindo. */
export function gerund(infinitive: string): string {
  const parts = infinitive.split(' ')
  const head = parts[0] ?? infinitive
  const tail = parts.slice(1).join(' ')
  const join = (v: string) => (tail ? `${v} ${tail}` : v)

  const known = GERUND[head]
  if (known) return join(known)
  const group = verbGroup(head)
  if (!group) return infinitive
  return join(`${head.slice(0, -2)}${group === 'ar' ? 'ando' : group === 'er' ? 'endo' : 'indo'}`)
}

/**
 * Imperativo de 2a pessoa.
 *
 * No coloquial brasileiro o imperativo afirmativo usa a forma de 3a do presente
 * ("abre a porta", "me ajuda"); a gramatica normativa, para "voce", usa o
 * subjuntivo ("abra a porta"). As duas circulam, e nenhuma e erro — o app segue
 * o registro que a pessoa escolheu, e nao corrige ninguem.
 */
export function imperative(infinitive: string, register: Register): string {
  const parts = infinitive.split(' ')
  const head = parts[0] ?? infinitive
  const tail = parts.slice(1).join(' ')
  const join = (v: string) => (tail ? `${v} ${tail}` : v)

  if (register === 'coloquial') return join(conjugate(head, '3s', 'present'))

  const known = SUBJUNCTIVE[head]
  if (known) return join(known)
  const group = verbGroup(head)
  if (!group) return infinitive
  return join(`${head.slice(0, -2)}${group === 'ar' ? 'e' : 'a'}`)
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

  const group = verbGroup(head)
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
  // "pra" e a forma falada de "para", e contrai igual: pro, pra, pros, pras.
  // "para" nao contrai — e a forma escrita, e "paro parque" nao existe.
  pra: { o: 'pro', a: 'pra', os: 'pros', as: 'pras' },
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
  region?: Region
  register?: Register
}

export function compose(sentence: Card[], options: ComposeOptions = {}): Composed {
  const marks = options.marks ?? NO_MARKS
  const speakerGender = options.speakerGender ?? 'n'
  const region = options.region ?? 'padrao'
  const register = options.register ?? 'coloquial'
  const raw = sentence.map((c) => regionalLabel(c.label, region)).join(' ')

  /** "para" vira "pra" no coloquial — e assim que se fala, e o app fala. */
  const to = register === 'coloquial' ? 'pra' : 'para'

  const items: Item[] = sentence.map((card, index) => {
    const label = card.label.trim().toLowerCase()
    const lex = lookup(label)
    // A variante regional pode ter OUTRO genero — "o biscoito" vira "a
    // bolacha", "a mandioca" vira "o aipim". Classe, regencia e contabilidade
    // continuam vindo da palavra canonica; so o genero (e o plural, que dele
    // depende) sao relidos da forma que a pessoa vai de fato dizer.
    const variant = regionalLabel(label, region)
    if (variant !== label) {
      const vlex = lookup(variant)
      const merged: Lexeme = { ...lex }
      if (vlex.gender) merged.gender = vlex.gender
      // O plural irregular da palavra canonica nao vale para a variante:
      // "pão/pães" nao diz nada sobre "cacetinho".
      if (vlex.pluralForm) merged.pluralForm = vlex.pluralForm
      else delete merged.pluralForm
      return { card, index, label, lex: merged }
    }
    return { card, index, label, lex }
  })

  if (!items.length) return { text: '', tokens: [], raw, changes: 0 }

  /* --- traços globais da frase ------------------------------------------ */

  const firstVerbIndex = items.findIndex((it) => it.lex.class === 'verb')

  // Pronome SUJEITO: so conta o que vem antes do primeiro verbo. Depois do
  // verbo, um pronome e objeto ("eu vejo você"), e vira clitico mais abaixo.
  const pronoun = items.find(
    (it) => it.lex.class === 'pronoun' && (firstVerbIndex < 0 || it.index < firstVerbIndex),
  )

  // Sujeito tambem pode ser substantivo plural antes do verbo — "os meninos
  // querem", nao "os meninos quer".
  const subjectNoun = items.find(
    (it) => it.lex.class === 'noun' && firstVerbIndex >= 0 && it.index < firstVerbIndex,
  )

  let person: Person = pronoun?.lex.person ?? '1s'
  // Sem pronome, a frase e assumida em 1a pessoa: numa prancha de CAA o
  // enunciado padrao e sobre o proprio falante ("quero agua"). O pronome
  // implicito NAO e escrito na frase — so a flexao do verbo o indica.
  if (!pronoun && subjectNoun) person = subjectNoun.lex.plural ? '3p' : '3s'
  // "tu" com registro normativo pede a 2a pessoa de verdade: "tu queres".
  // No coloquial brasileiro, "tu" leva a forma de 3a — que ja e o valor de 2s.
  // O card continua sendo o VOCÊ canonico; quem vira "tu" e a variedade.
  const saysTu = pronoun && (pronoun.label === 'tu' || secondPerson(region) === 'tu')
  if (saysTu && pronoun.lex.person === '2s' && !tuUsesThirdPerson(register)) person = '2t'

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
  /** Regencia do verbo principal, que se repete em cada item de uma lista. */
  let regencyPrep: string | null = null
  /**
   * Preposicao que liga um adjetivo ou um substantivo abstrato ao verbo
   * seguinte: "feliz DE ir", "medo DE cair", "cansado DE esperar". Sem ela sai
   * "estou feliz ir comer", que nao e portugues.
   */
  let pendingVerbPrep: string | null = null
  let suppressArticle = false
  let lastNoun: { gender: 'm' | 'f'; plural: boolean; label: string; lex: Lexeme } | null = null
  let previousWasNoun = false
  let questionSeen = false

  /**
   * Clitico. Um pronome DEPOIS do verbo e objeto, e o portugues brasileiro o
   * quer colado antes do verbo: "me ajuda", "te amo" — nao "ajuda eu".
   *
   * Esta e a segunda e ultima excecao a regra de nao reordenar (a primeira e a
   * negacao). Nos dois casos a posicao nao e escolha de estilo: e exigida pela
   * lingua, e manter a ordem tocada produziria frase agramatical.
   *
   * Nao se aplica quando o verbo rege preposicao — ai o pronome e complemento
   * preposicionado e fica onde esta: "gosto de você", nunca "te gosto".
   */
  const objectPronoun = items.find(
    (it) =>
      it.lex.class === 'pronoun' &&
      firstVerbIndex >= 0 &&
      it.index > firstVerbIndex &&
      (it.lex.person === '1s' || it.lex.person === '2s'),
  )
  const clitic =
    objectPronoun && !items[firstVerbIndex]?.lex.prep
      ? objectPronoun.lex.person === '1s'
        ? 'me'
        : 'te'
      : null

  // "AJUDAR · EU" nao e "eu ajudo": e um pedido a quem esta ouvindo. Quando o
  // objeto e a propria pessoa e nao ha sujeito escrito, o sujeito implicito e o
  // interlocutor, e o verbo vai para a 2a pessoa — "me ajuda", nao "me ajudo".
  if (!pronoun && clitic === 'me') person = '2s'

  /**
   * Pedido com sujeito de 2a pessoa explicito nao vira imperativo: "você abra a
   * porta" nao existe, e "você abre a porta" ja e um pedido em portugues
   * falado. O marcador so age quando o sujeito esta implicito.
   */
  const useImperative =
    marks.request && !(pronoun && (pronoun.lex.person === '2s' || pronoun.lex.person === '2t'))

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
        // O pronome-objeto ja foi (ou sera) emitido como clitico antes do
        // verbo; repeti-lo aqui daria "me ajuda eu".
        if (clitic && objectPronoun?.index === it.index) break
        // Verbo que rege preposicao tambem a exige antes de pronome:
        // "gosto DE você", "brinco COM você".
        if (pendingPrep) {
          push(pendingPrep, 'inserted')
          pendingPrep = null
        }
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
          if (clitic && objectPronoun) {
            push(clitic, 'inflected', {
              cardIndex: objectPronoun.index,
              original: objectPronoun.card.label,
            })
          }
          const text = useImperative
            ? imperative(label, register)
            : marks.progressive
              ? `${tense === 'past' ? ESTAR_IMPERFECT[person] : conjugate('estar', person, tense)} ${gerund(label)}`
              : conjugate(label, person, tense)
          push(text, text === label ? 'card' : 'inflected', {
            cardIndex: it.index,
            ...(text === label ? {} : { original: it.card.label }),
          })
          verbDone = true
        } else {
          // Verbo em cadeia fica no infinitivo: "quero comer", "vou dormir" —
          // mas se o que veio antes foi adjetivo ou estado, a ligacao entra:
          // "estou feliz DE ir comer".
          if (pendingVerbPrep) {
            push(pendingVerbPrep, 'inserted')
            pendingVerbPrep = null
          }
          push(it.card.label, 'card', { cardIndex: it.index })
        }

        if (lex.prep) {
          pendingPrep = lex.prep
          regencyPrep = lex.prep
        }
        // "vou dormir" nao leva preposicao alguma: so entra quando o proximo
        // card e mesmo um lugar ou uma pessoa.
        // Movimento + lugar pede "para": "vou pra escola". Movimento + pessoa
        // pede "a": "vou ao médico" — nunca "vou o médico".
        if (label === 'ir' || label === 'vir') {
          if (next?.lex.place) pendingPrep = to
          else if (next?.lex.animate) pendingPrep = 'a'
        }
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

        // Dois substantivos seguidos: o que liga um ao outro depende do que eles
        // sao.
        //
        // Ligar tudo com "de" produzia o absurdo que aparece quando alguem toca
        // tres pessoas seguidas: MÃE · PAI · AVÓ virava "a mãe do pai da avó" —
        // uma genealogia que ninguem quis dizer. Tocar tres pessoas e uma
        // LISTA, e lista se faz com virgula e "e", nao com posse.
        if (previousWasNoun && !pendingPrep && lastNoun) {
          if (lastNoun.label === 'dor' && lex.bodyPart) {
            pendingPrep = 'em'
          } else if (lastNoun.lex.animate && lex.animate) {
            // Virgula entre os do meio, "e" antes do ultimo.
            const maisPessoas = items
              .slice(i + 1)
              .some((x) => x.lex.class === 'noun' && x.lex.animate)
            const last = tokens[tokens.length - 1]
            if (maisPessoas) {
              if (last) last.text = `${last.text},`
            } else {
              push('e', 'inserted')
            }
            // A regencia do verbo vale para TODOS os itens da lista: "gosto da
            // mãe, do pai e da irmã" — nao "gosto da mãe, o pai e a irmã".
            if (regencyPrep) pendingPrep = regencyPrep
          } else {
            // "suco de fruta", "casa da mãe": aqui a relacao e mesmo de posse
            // ou de tipo, e "de" e o que a lingua usa.
            pendingPrep = 'de'
          }
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
        // "medo de cair", "vontade de ir": substantivo de estado tambem liga
        // ao verbo seguinte por preposicao.
        if (next?.lex.class === 'verb' && lex.mass) pendingVerbPrep = 'de'
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
        // "feliz de ir", "cansado de esperar", "pronto para sair".
        if (next?.lex.class === 'verb') pendingVerbPrep = 'de'
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

  // O regionalismo entra aqui, no fim, e nao no lexico: internamente a frase e
  // sempre montada com o rotulo canonico, para que a gramatica funcione igual
  // em qualquer variedade. So a saida — o que se ve e o que se fala — muda.
  const shown =
    region === 'padrao'
      ? tokens
      : tokens.map((t) => {
          // A virgula de lista fica grudada na palavra ("mãe,"), e sem separa-la
          // a busca na tabela falha justamente no meio de uma enumeracao.
          const m = /^(.*?)([,;:.!?]*)$/.exec(t.text)
          const word = m?.[1] ?? t.text
          const punct = m?.[2] ?? ''
          const text = regionalLabel(word, region) + punct
          return text === t.text ? t : { ...t, text }
        })

  const text = punctuate(shown.map((t) => t.text).join(' '), question)
  const changes = shown.filter((t) => t.kind !== 'card').length

  return { text, tokens: shown, raw, changes }
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
