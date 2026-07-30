import type { Card } from '../types'
import {
  ESTAR_IMPERFECT,
  TER_IMPERFECT,
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
/** Defectivos: so existem na 3a pessoa. "Eu doo a barriga" nao existe. */
const SO_TERCEIRA = new Set(['doer'])

export function conjugate(infinitive: string, person: Person, tense: Tense): string {
  const parts = infinitive.split(' ')
  const head = parts[0] ?? infinitive
  const tail = parts.slice(1).join(' ')
  const join = (v: string) => (tail ? `${v} ${tail}` : v)

  if (SO_TERCEIRA.has(head) && person !== '3s' && person !== '3p') person = '3s'

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

  // "feliz" -> "felizes", "rapaz" -> "rapazes". Antes qualquer final em z
  // voltava inalterado, e "nós estamos feliz" saia assim mesmo.
  if (head.endsWith('z')) return join(`${head}es`)
  if (head.endsWith('s')) return join(/[aeiou]s$/.test(head) ? `${head}es` : head)
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
  seu: { m: ['seu', 'seus'], f: ['sua', 'suas'] },
  sua: { m: ['seu', 'seus'], f: ['sua', 'suas'] },
  nosso: { m: ['nosso', 'nossos'], f: ['nossa', 'nossas'] },
  nossa: { m: ['nosso', 'nossos'], f: ['nossa', 'nossas'] },
}

/**
 * Artigos e demonstrativos que a pessoa escolhe como card.
 *
 * O motor decide artigo sozinho o tempo todo; quando a pessoa toca um, ela esta
 * dizendo qual quer. A forma, porem, continua sendo concordada: quem toca "o" e
 * depois "mãe" escolheu ARTIGO DEFINIDO, nao escolheu o masculino — e "o mãe"
 * nao ajudaria ninguem.
 */
const ARTICLES: Record<string, Record<'m' | 'f', [string, string]>> = {
  o: { m: ['o', 'os'], f: ['a', 'as'] },
  a: { m: ['o', 'os'], f: ['a', 'as'] },
  os: { m: ['os', 'os'], f: ['as', 'as'] },
  as: { m: ['os', 'os'], f: ['as', 'as'] },
  um: { m: ['um', 'uns'], f: ['uma', 'umas'] },
  uma: { m: ['um', 'uns'], f: ['uma', 'umas'] },
  esse: { m: ['esse', 'esses'], f: ['essa', 'essas'] },
  essa: { m: ['esse', 'esses'], f: ['essa', 'essas'] },
  aquele: { m: ['aquele', 'aqueles'], f: ['aquela', 'aquelas'] },
  aquela: { m: ['aquele', 'aqueles'], f: ['aquela', 'aquelas'] },
}

const INDEFINITE: Record<'m' | 'f', [string, string]> = {
  m: ['um', 'uns'],
  f: ['uma', 'umas'],
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

/**
 * Contracao com demonstrativo e indefinido — que a tabela acima nao cobre,
 * porque nao sao artigos definidos. "Eu vou em esse parque" nao existe: e
 * "nesse". Obrigatoria, nao opcional.
 */
const CONTRACTIONS_EXTRA: Record<string, Record<string, string>> = {
  em: {
    esse: 'nesse',
    essa: 'nessa',
    esses: 'nesses',
    essas: 'nessas',
    aquele: 'naquele',
    aquela: 'naquela',
    um: 'num',
    uma: 'numa',
  },
  de: {
    esse: 'desse',
    essa: 'dessa',
    aquele: 'daquele',
    aquela: 'daquela',
  },
  a: { aquele: 'àquele', aquela: 'àquela' },
}

/** "em" + "a" = "na". Preposicoes sem contracao ("para", "com") ficam soltas. */
function contract(prep: string, art: string): string[] {
  const merged = CONTRACTIONS[prep]?.[art] ?? CONTRACTIONS_EXTRA[prep]?.[art]
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

/**
 * Artigo de um card especifico, decidido pela pessoa.
 *
 * O motor acerta na maioria das vezes, mas "na maioria das vezes" nao serve
 * quando a frase e sua: as vezes se quer "quero bolo" e nao "quero O bolo", ou
 * "quero UM bolo" e nao "quero o bolo". A diferenca entre pedir o bolo que esta
 * ali e pedir um bolo qualquer nao e detalhe de estilo.
 *
 * `auto` deixa o motor decidir, que continua sendo o padrao.
 */
export type ArticleMode = 'auto' | 'def' | 'indef' | 'none'

export const ARTICLE_MODES: ArticleMode[] = ['auto', 'def', 'indef', 'none']

export interface ComposeOptions {
  marks?: GrammarMarks
  /** Um modo por posicao da frase; posicoes ausentes seguem `auto`. */
  articles?: ArticleMode[]
  speakerGender?: SpeakerGender
  region?: Region
  register?: Register
}

export function compose(sentence: Card[], options: ComposeOptions = {}): Composed {
  const marks = options.marks ?? NO_MARKS
  const speakerGender = options.speakerGender ?? 'n'
  const region = options.region ?? 'padrao'
  const articles = options.articles ?? []
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

  /**
   * SUJEITO COMPOSTO.
   *
   * "MAMÃE · EU · VOCÊ · BRINCAR" nao e tres sujeitos concorrendo: e um so,
   * coordenado, e o portugues manda o verbo para a 1a do plural — "a mamãe, eu
   * e você VAMOS brincar". Antes o motor olhava so o primeiro pronome e
   * produzia "a mamãe, eu e você brinca", que e o tipo de erro que faz a frase
   * inteira soar como de maquina.
   *
   * A regra de concordancia e simples e nao tem excecao util aqui:
   *   - qualquer elemento de 1a pessoa na lista  → 1a do plural
   *   - senao, mais de um elemento               → 3a do plural
   *   - senao                                    → o que o unico elemento for
   */
  // Sujeito composto e a sequencia de ABERTURA da frase, e nao todo animado que
  // aparecer nela: "eu feliz mamãe" nao tem sujeito plural — "mamãe" vem depois
  // do predicado. Antes saia "Eu estamos feliz a mamãe".
  const ehSujeito = (it: Item) =>
    it.lex.class === 'pronoun' || (it.lex.class === 'noun' && Boolean(it.lex.animate))

  const subjectGroup: Item[] = []
  if (firstVerbIndex >= 0) {
    // Com verbo na frase, tudo que vem ANTES dele e zona de sujeito — inclusive
    // depois de um adverbio de abertura: "amanhã a mamãe, eu e você vamos".
    for (const it of items) {
      if (it.index >= firstVerbIndex) break
      if (ehSujeito(it)) subjectGroup.push(it)
    }
  } else {
    // Sem verbo nenhum, so a sequencia de ABERTURA conta. Antes, todo animado
    // da frase entrava, e "eu feliz mamãe" virava "Eu estamos feliz a mamãe".
    for (const it of items) {
      if (ehSujeito(it)) subjectGroup.push(it)
      else if (it.lex.class !== 'determiner' && it.lex.class !== 'article') break
    }
  }

  let person: Person = pronoun?.lex.person ?? '1s'
  // Sem pronome, a frase e assumida em 1a pessoa: numa prancha de CAA o
  // enunciado padrao e sobre o proprio falante ("quero agua"). O pronome
  // implicito NAO e escrito na frase — so a flexao do verbo o indica.
  if (!pronoun && subjectNoun) person = subjectNoun.lex.plural ? '3p' : '3s'

  if (subjectGroup.length > 1) {
    const has1 = subjectGroup.some((it) => it.lex.person === '1s' || it.lex.person === '1p')
    person = has1 ? '1p' : '3p'
  }
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

  // Incontavel nao pluraliza: o marcador em "água" produzia "águas".
  const lastNounIndex = marks.plural
    ? items.reduce((acc, it) => (it.lex.class === 'noun' && !it.lex.mass ? it.index : acc), -1)
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
  /** Ultimo verbo visto, para decidir o locativo de aparelho. */
  let lastVerbLabel: string | null = null
  /** A pessoa escolheu a preposicao; o motor nao sobrepoe a dele. */
  let explicitPrep = false
  /** Indice do card de preposicao pendente, para atribuir o token a ele. */
  let pendingPrepCard: number | null = null
  /** A pessoa escolheu o conectivo; o motor nao insere virgula nem "e". */
  let explicitConnector = false
  /**
   * Forma que um verbo COORDENADO deve assumir.
   *
   * Verbo coordenado compartilha o sujeito, entao compartilha a flexao:
   * "eu corro, pulo e danço" — nunca "eu corro, pular e dançar".
   *
   * Mas quando o primeiro verbo saiu como perifrase — "vamos brincar" no
   * futuro, "estou brincando" no progressivo — quem carrega a flexao e o
   * auxiliar, e ele e compartilhado pela lista inteira: "vamos brincar, pintar
   * e desenhar". Ali a coordenacao volta ao infinitivo.
   */
  let coordForm: 'finite' | 'infinitive' = 'finite'

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
      (it.lex.person === '1s' || it.lex.person === '2s') &&
      // Conector no meio significa ORACAO NOVA, e o pronome depois dele e
      // sujeito dela, nao objeto da primeira: "eu como mas EU quero bolo"
      // virava "eu me como mas quero o bolo".
      !items.slice(firstVerbIndex + 1, it.index).some((x) => x.lex.class === 'connector'),
  )

  /**
   * Qual verbo o clitico acompanha.
   *
   * E o ULTIMO verbo antes do pronome, nao o primeiro: em "quero ajudar você"
   * quem rege o objeto e "ajudar", e colar no modal dava "eu TE quero ajudar".
   */
  const cliticVerbIndex = objectPronoun
    ? ([...items.slice(0, objectPronoun.index)].reverse().find((x) => x.lex.class === 'verb')
        ?.index ?? -1)
    : -1
  const cliticVerb = cliticVerbIndex >= 0 ? items[cliticVerbIndex] : undefined
  const clitic =
    objectPronoun && cliticVerb && !cliticVerb.lex.prep
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

  /**
   * Elemento que entra em lista coordenada: pronome ou substantivo animado.
   * "MAMÃE · EU · VOCÊ" e "MÃE · PAI · AVÓ" sao o mesmo fenomeno — o primeiro
   * como sujeito, o segundo como objeto.
   */
  const listEligible = (it: Item | undefined): boolean =>
    Boolean(it) &&
    (it!.lex.class === 'pronoun' || (it!.lex.class === 'noun' && Boolean(it!.lex.animate)))

  /**
   * Compostos reais de substantivo + substantivo, que pedem "de".
   *
   * Isto e uma tabela e nao uma regra de proposito. A regra antes era "dois
   * substantivos seguidos = de", e ela produzia o absurdo que aparece assim que
   * alguem toca tres comidas: FEIJÃO · PÃO · BANANA virava "feijão de pão de
   * banana". Numa prancha, tocar tres comidas e uma LISTA — a pessoa esta
   * dizendo o que quer comer, nao descrevendo uma receita.
   *
   * Entao o padrao passou a ser lista, e "de" ficou para os poucos casos em que
   * ele e mesmo o que a lingua usa.
   */
  const COMPOUND = new Set([
    'suco|fruta',
    'suco|laranja',
    'suco|maçã',
    'suco|uva',
    'bolo|chocolate',
    'bolo|cenoura',
    'sorvete|chocolate',
    'sorvete|morango',
    'pão|queijo',
    'vitamina|banana',
    'salada|fruta',
    'copo|água',
    'copo|leite',
    'prato|comida',
    'escova|dente',
    'papel|desenho',
  ])

  /**
   * O que liga dois substantivos seguidos.
   *
   *   `em`   — DOR + parte do corpo: "dor na barriga"
   *   `de`   — composto conhecido ("suco de fruta") ou posse, quando o segundo
   *            e pessoa e o primeiro nao ("a casa da mãe")
   *   `list` — todo o resto: "feijão, pão e banana"
   */
  const nounLink = (
    prev: { label: string; lex: Lexeme },
    cur: { label: string; lex: Lexeme },
  ): 'em' | 'de' | 'list' => {
    if (prev.label === 'dor' && cur.lex.bodyPart) return 'em'
    if (COMPOUND.has(`${prev.label}|${cur.label}`)) return 'de'
    if (!prev.lex.animate && cur.lex.animate) return 'de'
    return 'list'
  }

  /** Virgula entre os itens do meio, "e" antes do ultimo. */
  const emitListSeparator = (isLast: boolean) => {
    // A pessoa acabou de escolher "e" ou "mas": o motor nao poe outro por cima.
    if (explicitConnector) {
      explicitConnector = false
      return
    }
    if (isLast) {
      push('e', 'inserted')
    } else {
      const last = tokens[tokens.length - 1]
      if (last) last.text = `${last.text},`
    }
  }

  /**
   * Verbos de atividade pedem locativo antes de aparelho — "jogar NO celular",
   * "ver NA televisao". Verbo de posse nao: "quero O celular".
   */
  // `ver` e `assistir` sairam da lista: pedem objeto direto ("eu vejo
  // televisão"), e o locativo produzia "eu assisto NA televisão". Ficaram os
  // que de fato locativizam: joga-se NO celular, fala-se NO telefone.
  const ACTIVITY_VERBS = new Set(['jogar', 'brincar', 'falar', 'mexer', 'estudar'])

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
    const p = subjectPerson()
    // "eu estive triste" e perfeito, e soa como evento pontual; a lingua usa o
    // IMPERFEITO para estado passado — "eu estava triste", "eu tinha medo".
    const forma =
      tense === 'past'
        ? verb === 'estar'
          ? ESTAR_IMPERFECT[p]
          : TER_IMPERFECT[p]
        : conjugate(verb, p, tense)
    push(forma, 'inserted')
    verbDone = true
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i]!
    const { lex, label } = it
    const next = items[i + 1]
    const isPlural = it.index === lastNounIndex

    // Preposicao escolhida pela pessoa sai ANTES de qualquer coisa que nao
    // saiba emiti-la sozinha. Substantivo, artigo e pronome tratam a pendencia
    // por conta propria — porque precisam contrair e concordar; o resto so
    // precisa nao perde-la.
    // So a preposicao ESCOLHIDA pela pessoa (`pendingPrepCard`) sobrevive a um
    // item que nao a consome. A que veio da regencia do verbo e descartada:
    // "brincar" pede "com", mas "brincar o dia todo" nao leva preposicao
    // alguma — e emiti-la produzia "brincar com o dia todo".
    if (
      pendingPrep &&
      pendingPrepCard !== null &&
      lex.class !== 'noun' &&
      lex.class !== 'article' &&
      lex.class !== 'pronoun' &&
      lex.class !== 'preposition'
    ) {
      const card = pendingPrepCard
      push(pendingPrep, card === null ? 'inserted' : 'card', {
        ...(card === null ? {} : { cardIndex: card }),
      })
      pendingPrep = null
      pendingPrepCard = null
    }

    switch (lex.class) {
      case 'negation':
        // Nao se emite aqui: o portugues quer a particula colada ao verbo, e o
        // usuario pode ter tocado NAO em qualquer posicao.
        break

      case 'pronoun':
        // O pronome-objeto ja foi (ou sera) emitido como clitico antes do
        // verbo; repeti-lo aqui daria "me ajuda eu".
        if (clitic && objectPronoun?.index === it.index) break
        // Sujeito composto: "a mamãe, eu e você".
        if (listEligible(items[i - 1]) && !pendingPrep) {
          emitListSeparator(!listEligible(next))
        }
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

        const emCadeia = verbDone

        // A separacao vem ANTES de decidir a forma do verbo, e nao dentro de um
        // dos ramos: verbo adivinhado (fora do lexico, como "pintar") caia no
        // ramo que so empurra o rotulo e pulava a coordenacao inteira — saia
        // "brincar o dia todo pintar e desenhar", sem a virgula.
        if (emCadeia) {
          // Dois casos diferentes escondidos no mesmo lugar:
          //
          //   COMPLEMENTO — "quero comer", "posso jogar", "vou dormir": o
          //   segundo verbo e complemento de um modal, e entra colado.
          //
          //   COORDENACAO — "brincar, pintar e desenhar": verbos em lista, que
          //   pedem virgula e "e". Sem a distincao saia "quero e comer".
          //
          // Sem verbo anterior no texto (o primeiro era uma copula inserida,
          // como em "estou feliz de ir comer") nao ha o que coordenar.
          const verboAnterior = [...items.slice(0, i)]
            .reverse()
            .find((x) => x.lex.class === 'verb')
          if (verboAnterior && !verboAnterior.lex.modal) {
            const maisVerbos = items.slice(i + 1).some((x) => x.lex.class === 'verb')
            emitListSeparator(!maisVerbos)
          }
          // Regencia do verbo anterior antes de infinitivo: "terminei DE
          // comer", "comecei A pintar". Diferente da regencia antes de
          // substantivo — "terminei a tarefa" nao leva "de".
          const anterior = [...items.slice(0, i)].reverse().find((x) => x.lex.class === 'verb')
          if (anterior?.lex.prepInf && !pendingVerbPrep) pendingVerbPrep = anterior.lex.prepInf
          // "estou feliz DE ir comer", "medo DE cair".
          if (pendingVerbPrep) {
            push(pendingVerbPrep, 'inserted')
            pendingVerbPrep = null
          }
        }

        const coordenado =
          emCadeia &&
          Boolean(
            [...items.slice(0, i)].reverse().find((x) => x.lex.class === 'verb') &&
              ![...items.slice(0, i)].reverse().find((x) => x.lex.class === 'verb')!.lex.modal,
          )

        if (clitic && objectPronoun && it.index === cliticVerbIndex) {
          push(clitic, 'inflected', {
            cardIndex: objectPronoun.index,
            original: objectPronoun.card.label,
          })
        }

        if (lex.fixed || (lex as { guessed?: boolean }).guessed) {
          // Palavra fora do lexico so foi ADIVINHADA como verbo pela
          // terminacao. Conjugar um chute produz forma inexistente ("ver" ->
          // "vo"); manter o infinitivo produz frase telegrafica, que e apenas
          // menos polida. Na duvida, a saida menos errada.
          push(it.card.label, 'card', { cardIndex: it.index })
        } else if (!emCadeia) {
          const text = useImperative
            ? imperative(label, register)
            : marks.progressive
              ? `${tense === 'past' ? ESTAR_IMPERFECT[person] : conjugate('estar', person, tense)} ${gerund(label)}`
              : conjugate(label, person, tense)
          push(text, text === label ? 'card' : 'inflected', {
            cardIndex: it.index,
            ...(text === label ? {} : { original: it.card.label }),
          })
        } else if (coordenado && coordForm === 'finite') {
          // Coordenado com um verbo finito: flexiona igual a ele.
          const text = conjugate(label, person, tense)
          push(text, text === label ? 'card' : 'inflected', {
            cardIndex: it.index,
            ...(text === label ? {} : { original: it.card.label }),
          })
        } else {
          // Complemento de modal, ou coordenado sob um auxiliar compartilhado:
          // infinitivo.
          push(it.card.label, 'card', { cardIndex: it.index })
        }
        if (!emCadeia) {
          // Perifrase ("vou brincar", "estou brincando") poe a flexao no
          // auxiliar, e o auxiliar vale para a lista toda.
          coordForm = tense === 'future' || marks.progressive ? 'infinitive' : 'finite'
        } else if (!coordenado) {
          coordForm = 'infinitive'
        }
        verbDone = true

        lastVerbLabel = label
        if (lex.prep && !explicitPrep) {
          pendingPrep = lex.prep
          regencyPrep = lex.prep
        }
        // "vou dormir" nao leva preposicao alguma: so entra quando o proximo
        // card e mesmo um lugar ou uma pessoa.
        // Movimento + lugar pede "para": "vou pra escola". Movimento + pessoa
        // pede "a": "vou ao médico" — nunca "vou o médico".
        if ((label === 'ir' || label === 'vir') && !explicitPrep) {
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
        if (!pendingPrep && listEligible(items[i - 1]) && listEligible(it)) {
          emitListSeparator(!listEligible(next))
          // A regencia do verbo vale para TODOS os itens da lista: "gosto da
          // mãe, do pai e da irmã" — nao "gosto da mãe, o pai e a irmã".
          if (regencyPrep) pendingPrep = regencyPrep
        } else if (previousWasNoun && !pendingPrep && lastNoun) {
          const link = nounLink(lastNoun, { label, lex })
          if (link === 'list') {
            const proximoTambemLista =
              next?.lex.class === 'noun' && nounLink({ label, lex }, next) === 'list'
            emitListSeparator(!proximoTambemLista)
            if (regencyPrep) pendingPrep = regencyPrep
            // Lista de coisas vai sem artigo: "quero feijão, arroz e carne".
            // Com artigo em alguns itens e nao em outros — porque incontavel
            // nao leva — saia "feijão, o pão e a banana", que soa quebrado.
            // Lista de PESSOAS mantem o artigo: "a mãe, o pai e a avó" e como
            // se fala.
            if (!lex.animate) suppressArticle = true
          } else {
            pendingPrep = link
          }
        }

        // Aparelho depois de verbo de atividade: "jogar no celular".
        if (!pendingPrep && lex.device && lastVerbLabel && ACTIVITY_VERBS.has(lastVerbLabel)) {
          pendingPrep = 'em'
        }

        // O PRIMEIRO item da lista tambem vai sem artigo, e isso so se decide
        // olhando para frente: quando "bolo" e emitido ainda nao se sabe que
        // "sorvete" vem depois. Sem esta olhada saia "o bolo e sorvete".
        // Parte do corpo seguida de DOR nao e lista: vira verbo ("as costas
        // doem"), e ali o artigo continua sendo necessario.
        const seguidoDeDor = next?.label === 'dor' && Boolean(lex.bodyPart)
        if (
          !lex.animate &&
          !seguidoDeDor &&
          next?.lex.class === 'noun' &&
          nounLink({ label, lex }, next) === 'list'
        ) {
          suppressArticle = true
        }

        const gender = lex.gender ?? 'm'
        const prep = pendingPrep
        pendingPrep = null

        const modo = articles[it.index] ?? 'auto'
        const plural = isPlural || Boolean(lex.plural)
        const art =
          modo === 'none'
            ? null
            : modo === 'def'
              ? article(gender, plural)
              : modo === 'indef'
                ? INDEFINITE[gender][plural ? 1 : 0]
                : decideArticle({ lex, prep, suppressArticle })
                  ? article(gender, plural)
                  : null

        const prepCard = pendingPrepCard
        pendingPrepCard = null
        const emitPrep = (t: string, primeiro: boolean) =>
          push(t, primeiro && prepCard !== null ? 'card' : 'inserted', {
            ...(primeiro && prepCard !== null ? { cardIndex: prepCard } : {}),
          })
        if (prep && art) contract(prep, art).forEach((t, k) => emitPrep(t, k === 0))
        else if (prep) emitPrep(prep, true)
        else if (art) push(art, 'inserted')

        const text = isPlural ? pluralize(it.card.label, lex) : it.card.label
        push(text, text === it.card.label ? 'card' : 'inflected', {
          cardIndex: it.index,
          ...(text === it.card.label ? {} : { original: it.card.label }),
        })

        explicitPrep = false
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

      case 'quantifier': {
        // "muito água" nao existe: o quantificador concorda com o substantivo
        // que ele quantifica.
        const alvoQ = next?.lex.class === 'noun' ? next.lex : undefined
        const q =
          alvoQ?.gender === 'f' && /o$/.test(label)
            ? `${it.card.label.slice(0, -1)}a`
            : it.card.label
        push(q, q === it.card.label ? 'card' : 'inflected', {
          cardIndex: it.index,
          ...(q === it.card.label ? {} : { original: it.card.label }),
        })
        // "mais agua", "muito bolo": quantificador ja determina, artigo sobra.
        suppressArticle = true
        previousWasNoun = false
        break
      }

      /**
       * PALAVRA FUNCIONAL ESCOLHIDA PELA PESSOA.
       *
       * O motor insere artigo e preposicao sozinho o tempo todo. Isso e util
       * ate a pessoa querer OUTRA — "brincar COM a mãe" em vez de "brincar a
       * mãe", "suco SEM açucar", "o carro DELE". A partir daqui existe card
       * para cada uma delas, e a regra e simples: **escolha da pessoa vence a
       * do motor**.
       *
       * O que o motor ainda faz e concordar a forma. Quem toca "o" e depois
       * "mãe" escolheu artigo definido, nao escolheu masculino.
       */
      case 'preposition':
        // Nao se emite aqui. Vira preposicao pendente e sai junto do que vier
        // depois — assim contrai com o artigo ("em" + "o" = "no") e substitui
        // a regencia do verbo em vez de duplicar ("brinco com a mãe", nunca
        // "brinco com com a mãe").
        pendingPrep = label
        pendingPrepCard = it.index
        explicitPrep = true
        previousWasNoun = false
        break

      case 'article': {
        const alvo = next?.lex.class === 'noun' ? next.lex : undefined
        const gender = alvo?.gender ?? lex.gender ?? 'm'
        const plural = Boolean(alvo?.plural) || next?.index === lastNounIndex
        const forms = ARTICLES[label]
        const text = forms ? forms[gender][plural ? 1 : 0] : it.card.label
        const mudou = text !== it.card.label

        if (pendingPrep) {
          const merged = contract(pendingPrep, text)
          const prepCard = pendingPrepCard
          pendingPrep = null
          pendingPrepCard = null
          if (merged.length === 1) {
            // "em" + "o" = "no": um token so, atribuido ao card do artigo.
            push(merged[0]!, 'inflected', { cardIndex: it.index, original: it.card.label })
          } else {
            push(merged[0]!, prepCard === null ? 'inserted' : 'card', {
              ...(prepCard === null ? {} : { cardIndex: prepCard }),
            })
            push(text, mudou ? 'inflected' : 'card', {
              cardIndex: it.index,
              ...(mudou ? { original: it.card.label } : {}),
            })
          }
        } else {
          push(text, mudou ? 'inflected' : 'card', {
            cardIndex: it.index,
            ...(mudou ? { original: it.card.label } : {}),
          })
        }
        suppressArticle = true
        previousWasNoun = false
        break
      }

      case 'interjection':
        push(it.card.label, 'card', { cardIndex: it.index })
        // "Ah, mãe!" — interjeicao pede pausa, e quem vem depois e chamado, nao
        // descrito: vocativo nao leva artigo.
        {
          const last = tokens[tokens.length - 1]
          if (last && next) last.text = `${last.text},`
        }
        if (next?.lex.class === 'noun' && next.lex.animate) suppressArticle = true
        previousWasNoun = false
        break

      case 'connector':
        push(it.card.label, 'card', { cardIndex: it.index })
        // A pessoa ja pos o "e"; o motor nao poe outro.
        explicitConnector = true
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
