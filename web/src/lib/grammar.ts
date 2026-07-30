import type { Card } from '../types'
import {
  ESTAR_IMPERFECT,
  TER_IMPERFECT,
  GERUND,
  FUTURE_SUBJUNCTIVE,
  IMPERFECT_IRREGULAR,
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
    imperfect: { '1s': 'ava', '2s': 'ava', '2t': 'avas', '3s': 'ava', '1p': 'ávamos', '3p': 'avam' },
    future: { '1s': 'ar', '2s': 'ar', '2t': 'ar', '3s': 'ar', '1p': 'ar', '3p': 'ar' },
  },
  er: {
    present: { '1s': 'o', '2s': 'e', '2t': 'es', '3s': 'e', '1p': 'emos', '3p': 'em' },
    past: { '1s': 'i', '2s': 'eu', '2t': 'este', '3s': 'eu', '1p': 'emos', '3p': 'eram' },
    imperfect: { '1s': 'ia', '2s': 'ia', '2t': 'ias', '3s': 'ia', '1p': 'íamos', '3p': 'iam' },
    future: { '1s': 'er', '2s': 'er', '2t': 'er', '3s': 'er', '1p': 'er', '3p': 'er' },
  },
  ir: {
    present: { '1s': 'o', '2s': 'e', '2t': 'es', '3s': 'e', '1p': 'imos', '3p': 'em' },
    past: { '1s': 'i', '2s': 'iu', '2t': 'iste', '3s': 'iu', '1p': 'imos', '3p': 'iram' },
    imperfect: { '1s': 'ia', '2s': 'ia', '2t': 'ias', '3s': 'ia', '1p': 'íamos', '3p': 'iam' },
    future: { '1s': 'ir', '2s': 'ir', '2t': 'ir', '3s': 'ir', '1p': 'ir', '3p': 'ir' },
  },
}

function verbGroup(head: string): 'ar' | 'er' | 'ir' | null {
  if (head.endsWith('ar')) return 'ar'
  if (head.endsWith('er')) return 'er'
  if (head.endsWith('ir')) return 'ir'
  return null
}

/**
 * Futuro do subjuntivo. Nos regulares e identico ao infinitivo — "quando ele
 * chegar", "se voce comer" —, entao so os irregulares consultam a tabela.
 */
export function futuroDoSubjuntivo(infinitive: string, person: Person): string {
  const parts = infinitive.split(' ')
  const head = parts[0] ?? infinitive
  const tail = parts.slice(1).join(' ')
  const irr = FUTURE_SUBJUNCTIVE[head]?.[person]
  const forma = irr ?? (person === '1p' ? `${head}mos` : person === '3p' ? `${head}em` : head)
  return tail ? `${forma} ${tail}` : forma
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
 * Presente do subjuntivo — o tempo da oração encaixada.
 *
 * "Quero **que você venha**", "preciso **que a mamãe ajude**". É a construção
 * que faltava: `QUERER · VOCÊ · VIR` saía como "Quero você vem" — duas orações
 * coladas, sem o "que" e sem o subjuntivo, dizendo uma coisa que ninguém fala.
 *
 * E é uma construção **cara de perder** numa prancha de CAA: pedir que outra
 * pessoa faça algo é metade da comunicação de quem depende de outras pessoas
 * para quase tudo. Sem ela, a criança consegue dizer "eu quero água" mas não
 * "quero que você abra".
 *
 * `SUBJUNCTIVE` já tinha a forma de 3ª pessoa dos irregulares. As demais saem
 * dela por sufixo — `venha` → `venhamos`/`venham` — com as duas exceções que
 * não seguem a regra tabeladas à parte.
 */
const SUBJ_IRREGULAR_PESSOAS: Record<string, Partial<Record<Person, string>>> = {
  ir: { '1p': 'vamos', '3p': 'vão' },
  dar: { '1p': 'demos', '3p': 'deem' },
}

export function subjunctivePresent(infinitive: string, person: Person): string {
  const parts = infinitive.split(' ')
  const head = parts[0] ?? infinitive
  const tail = parts.slice(1).join(' ')
  const join = (v: string) => (tail ? `${v} ${tail}` : v)

  const excecao = SUBJ_IRREGULAR_PESSOAS[head]?.[person]
  if (excecao) return join(excecao)

  const base =
    SUBJUNCTIVE[head] ??
    (() => {
      const group = verbGroup(head)
      if (!group) return null
      return `${head.slice(0, -2)}${group === 'ar' ? 'e' : 'a'}`
    })()

  // Fora do léxico e sem terminação de verbo reconhecível: devolver o
  // infinitivo é telegráfico, mas inventar uma forma inexistente é pior.
  if (!base) return join(head)

  if (person === '1p') return join(`${base}mos`)
  if (person === '3p') return join(`${base}m`)
  return join(base)
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

  if (tense === 'imperfect') {
    const irr = IMPERFECT_IRREGULAR[head]?.[person]
    if (irr) return join(irr)
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
  /**
   * O caminho de volta: FEMININO → MASCULINO.
   *
   * O acervo nomeia muitos pictogramas pela forma feminina — "preguiçosa",
   * "amarela", "cansada" —, e o card imprime o rotulo que tem. Sem este ramo,
   * `BEIJO · PREGUIÇOSA` saia "O beijo está preguiçosa": o motor so sabia ir de
   * masculino para feminino, e a forma do cartao ficava congelada.
   *
   * A marca `femininoBase` e obrigatoria, e nao se deduz da terminacao: ha
   * adjetivo INVARIAVEL em -a ("otimista", "hipócrita", "agrícola"), e
   * converter esses produziria "otimisto". Quem nao declara nao flexiona — a
   * mesma regra do resto do arquivo.
   */
  if (gender === 'm' && lex?.femininoBase && out.endsWith('a')) out = `${out.slice(0, -1)}o`
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
  /**
   * A forma regional, quando ela difere da canonica — "guri" para "criança".
   *
   * O `label` continua canonico porque toda regra do motor (regencia, classe,
   * contabilidade, lexico) e escrita sobre ele. O que a pessoa VAI DIZER e
   * isto, e e sobre isto que se forma o plural.
   */
  variante?: string
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
      // A VARIANTE viaja junto, e nao so o genero dela.
      //
      // Achado pela varredura em lote, em 74 casos: o plural era formado sobre
      // a palavra canonica ("criança" -> "crianças") e so depois a saida
      // tentava regionalizar — mas o mapa de variantes so conhece o SINGULAR,
      // entao "crianças" passava intacto e ficava com o artigo do genero de
      // "guri". Resultado: "Os crianças".
      //
      // Pluralizar a variante resolve na origem: "guri" -> "guris".
      return { card, index, label, lex: merged, variante: variant }
    }
    return { card, index, label, lex }
  })

  if (!items.length) return { text: '', tokens: [], raw, changes: 0 }

  /* --- traços globais da frase ------------------------------------------ */

  /* ----------------------------------------------------------- oracoes

     ATE AQUI o motor tratava a frase como UMA oracao so. Tudo depois do
     primeiro verbo virava complemento ou coordenacao, e o resultado era:

       "eu querer porque eu fome"  ->  "Eu me quero porque fome."

     O segundo "eu" era lido como objeto do primeiro verbo, e o segundo verbo
     nunca era conjugado. Subordinacao e o que permite JUSTIFICAR e NARRAR —
     "porque eu quero", "quando o papai chegar", "a mamãe falou que" — e sem ela
     a pessoa so consegue enunciar fatos soltos.

     A segmentacao e deliberadamente simples: um conectivo de oracao seguido de
     verbo abre oracao nova. "E" e "ou" NAO abrem — eles coordenam dentro da
     mesma oracao ("quero comer e beber"), e trata-los como fronteira quebraria
     a coordenacao de verbos que ja funcionava. */
  /**
   * Conectivos que exigem FUTURO DO SUBJUNTIVO no verbo da oracao que abrem.
   *
   * "Quando o papai CHEGAR", "se voce QUISER". Sem isto saia "quando o papai
   * chega", que troca uma condicao futura por um habito — a diferenca entre
   * "vou brincar quando ele chegar" e "brinco sempre que ele chega".
   */
  const SUBJUNTIVO_FUTURO = new Set(['quando', 'se', 'enquanto', 'assim que', 'depois que'])
  /**
   * Verbos que pedem oracao encaixada com "que" + subjuntivo quando o que vem
   * depois tem sujeito PROPRIO: "quero que voce venha".
   *
   * Com sujeito igual, o mesmo verbo rege infinitivo direto — "quero ir" — e e
   * por isso que a marca so nasce em `ehSujeitoNovo`.
   */
  const VOLITIVOS = new Set(['querer', 'precisar', 'pedir', 'deixar', 'mandar', 'esperar', 'preferir'])
  /** Oracoes que precisam do "que" e do presente do subjuntivo. */
  const clauseQue = new Set<number>()
  /** O "que" sai uma vez por oracao, antes do sujeito dela. */
  const queEmitido = new Set<number>()
  /**
   * O proximo item que IMPORTA para a regencia — pulando a negacao.
   *
   * Um card "nao" no meio nao muda a relacao entre as palavras em volta: ele
   * nega a oracao inteira, e nao a ligacao entre um adjetivo e o verbo que vem
   * depois. Quem le so `items[i + 1]` para decidir regencia precisa pular por
   * cima dele.
   */
  const proximoIgnorandoNegacao = (i: number) => {
    for (let j = i + 1; j < items.length; j++) {
      const x = items[j]
      if (x && x.lex.class !== 'negation') return x
    }
    return undefined
  }

  /** Oracoes justapostas: separadas por virgula, sem conectivo inventado. */
  const clauseVirgula = new Set<number>()
  const virgulaEmitida = new Set<number>()

  /**
   * Põe a vírgula que separa duas orações justapostas.
   *
   * Vai no token ANTERIOR, e não como token próprio: vírgula é pontuação presa
   * à palavra que a precede, e um token separado apareceria com espaço antes
   * dela na saída falada e na barra da frase.
   */
  const virgulaDeOracao = (oracao: number) => {
    if (!clauseVirgula.has(oracao) || virgulaEmitida.has(oracao)) return
    virgulaEmitida.add(oracao)
    const ultimo = tokens[tokens.length - 1]
    // Sem nada antes não há o que separar — a oração é a primeira da frase.
    if (ultimo && !/[,.;:!?]$/.test(ultimo.text)) ultimo.text = `${ultimo.text},`
  }

  const CLAUSE_STARTERS = new Set([
    'porque',
    'que',
    'quando',
    'se',
    'mas',
    'então',
    'aí',
    'e aí',
    'senão',
    'por isso',
  ])

  /** A que oracao pertence cada posicao da frase. */
  const clauseOf: number[] = []
  /** Oracoes que o conectivo pos no futuro do subjuntivo. */
  const clauseSubjunctive: boolean[] = [false]
  /** Itens que abriram uma oracao subordinada. */
  const abriuOracao = new Set<number>()
  {
    let c = 0
    /**
     * A oração já tem PREDICADO — e não "já vi um card de verbo".
     *
     * A diferença apareceu em `FELIZ · EU · GOSTAR · IRMÃO`, que saía
     * "Vou estar feliz eu gostar do irmão": duas orações coladas e a segunda
     * sem conjugar. O "eu" não abria oração nova porque, para esta contagem,
     * ainda não havia verbo — mas havia predicado, "estou feliz", montado com
     * uma cópula que o motor insere e que não é card nenhum.
     *
     * Contar predicado em vez de card de verbo é o conserto na estrutura. O
     * adjetivo só forma predicado quando é o PRIMEIRO da oração: depois de um
     * substantivo ele é modificador ("a casa bonita"), e a cópula não entra.
     */
    let predicadoNaOracao = false
    let houveNomeNaOracao = false
    for (const it of items) {
      clauseOf[it.index] = c
      if (it.lex.class === 'verb') predicadoNaOracao = true
      // Adjetivo sem nome antes vira "estar X" — isso é predicado.
      if (it.lex.class === 'adjective' && !houveNomeNaOracao) predicadoNaOracao = true
      if (it.lex.class === 'noun') houveNomeNaOracao = true

      const depois = items.slice(it.index + 1)

      // (a) Conectivo explicito. Abre se houver verbo OU pronome depois — o
      // pronome importa porque a oracao pode ter o verbo INSERIDO pelo motor:
      // em "porque · eu · fome" o "tenho" nao existe como card, e exigir verbo
      // explicito deixava a segunda oracao invisivel.
      const porConectivo =
        CLAUSE_STARTERS.has(it.label) &&
        depois.some((x) => x.lex.class === 'verb' || x.lex.class === 'pronoun')

      // (b) Fronteira IMPLICITA, sem conectivo nenhum.
      //
      //   "quando · papai · chegar | eu · brincar"
      //
      // A oracao principal comeca no "eu", e nada a anuncia. A pista e
      // posicional: ja houve verbo nesta oracao, e agora aparece um sujeito com
      // verbo proprio depois dele. Sem isto o "eu" era lido como objeto do
      // verbo anterior e virava clitico — "quando o papai me chegar".
      const ehSujeitoNovo =
        predicadoNaOracao &&
        (it.lex.class === 'pronoun' || (it.lex.class === 'noun' && Boolean(it.lex.animate))) &&
        depois.some((x) => x.lex.class === 'verb')

      if (porConectivo || ehSujeitoNovo) {
        if (porConectivo) {
          c++
          abriuOracao.add(it.index)
          clauseSubjunctive[c] = SUBJUNTIVO_FUTURO.has(it.label)
        } else {
          // O proprio item ja pertence a oracao nova.
          c++
          clauseSubjunctive[c] = false
          clauseOf[it.index] = c
          /**
           * Verbo volitivo antes de sujeito novo pede **que** + subjuntivo:
           * "quero QUE você VENHA", "preciso QUE a mamãe AJUDE".
           *
           * Sem isto saía "quero você vem" — duas orações coladas. A marca é
           * posta aqui, no mesmo lugar onde a oração nasce, para não haver um
           * segundo lugar decidindo o mesmo.
           */
          const verboAntes = [...items.slice(0, items.indexOf(it))]
            .reverse()
            .find((x) => x.lex.class === 'verb')
          // "SE · VOCE · QUERER · EU · IR" e condicional: a segunda oracao e a
          // PRINCIPAL ("se voce quiser, eu vou"), nao uma encaixada de
          // "querer". Um verbo volitivo dentro de uma oracao ja subordinada nao
          // encaixa o que vem depois dela.
          if (verboAntes && VOLITIVOS.has(verboAntes.label) && !clauseSubjunctive[c - 1]) {
            clauseQue.add(c)
          } else {
            /**
             * Oração nova SEM conectivo e sem verbo que a encaixe: separa por
             * vírgula.
             *
             * Achado varrendo combinações: `EU · PODER · VOCÊ · VIR` saía como
             * "Eu posso você vem" — duas orações coladas, sem nada entre elas,
             * que não é frase em língua nenhuma. "Poder" não rege oração
             * encaixada como "querer" rege, então não cabe pôr "que" aqui; o
             * que cabe é **não colar**.
             *
             * A vírgula é a saída conservadora de propósito: ela não inventa
             * relação nenhuma entre as duas orações — só marca que são duas.
             * Escolher um conectivo ("e", "mas", "então") seria o motor
             * decidindo o que a pessoa quis dizer, e isso ele não faz.
             */
            clauseVirgula.add(c)
          }
        }
        predicadoNaOracao = false
        houveNomeNaOracao = false
      }
    }
  }

  interface Oracao {
    firstVerbIndex: number
    pronoun: Item | undefined
    subjectGroup: Item[]
    person: Person
    objectPronoun: Item | undefined
    cliticVerbIndex: number
    clitic: string | null
    useImperative: boolean
  }

  const ehSujeito = (it: Item) =>
    it.lex.class === 'pronoun' || (it.lex.class === 'noun' && Boolean(it.lex.animate))

  /**
   * Tudo que e decidido POR ORACAO: quem e o sujeito, em que pessoa o verbo vai,
   * e qual pronome e objeto. Antes isto era calculado uma vez para a frase
   * inteira, o que so estava certo enquanto a frase tinha uma oracao.
   */
  const analisar = (dentro: Item[]): Oracao => {
    const fv = dentro.find((it) => it.lex.class === 'verb')?.index ?? -1

    // Pronome SUJEITO: so conta o que vem antes do verbo da PROPRIA oracao.
    // Depois do verbo, um pronome e objeto ("eu vejo você") e vira clitico.
    const pron = dentro.find(
      (it) => it.lex.class === 'pronoun' && (fv < 0 || it.index < fv),
    )
    const subjNoun = dentro.find(
      (it) => it.lex.class === 'noun' && fv >= 0 && it.index < fv,
    )

    const grupo: Item[] = []
    if (fv >= 0) {
      // Com verbo, tudo antes dele e zona de sujeito — inclusive depois de um
      // adverbio de abertura: "amanhã a mamãe, eu e você vamos".
      for (const it of dentro) {
        if (it.index >= fv) break
        if (ehSujeito(it)) grupo.push(it)
      }
    } else {
      // Sem verbo, so a sequencia de ABERTURA conta. Antes, todo animado da
      // frase entrava, e "eu feliz mamãe" virava "Eu estamos feliz a mamãe".
      for (const it of dentro) {
        if (ehSujeito(it)) grupo.push(it)
        else if (it.lex.class !== 'determiner' && it.lex.class !== 'article') break
      }
    }

    let p: Person = pron?.lex.person ?? '1s'
    // Sem pronome, assume-se 1a pessoa: numa prancha de CAA o enunciado padrao
    // e sobre o proprio falante ("quero agua"). O pronome implicito NAO e
    // escrito — so a flexao do verbo o indica.
    if (!pron && subjNoun) p = subjNoun.lex.plural ? '3p' : '3s'

    // SUJEITO COMPOSTO: "MAMÃE · EU · VOCÊ" e um sujeito so, e o portugues manda
    // o verbo para a 1a do plural. Qualquer elemento de 1a na lista -> 1p;
    // senao, mais de um elemento -> 3p.
    if (grupo.length > 1) {
      const tem1 = grupo.some((it) => it.lex.person === '1s' || it.lex.person === '1p')
      p = tem1 ? '1p' : '3p'
    }
    // "tu" no registro normativo pede a 2a de verdade: "tu queres". No coloquial
    // brasileiro leva a forma de 3a, que ja e o valor de 2s.
    const dizTu = pron && (pron.label === 'tu' || secondPerson(region) === 'tu')
    if (dizTu && pron.lex.person === '2s' && !tuUsesThirdPerson(register)) p = '2t'

    // Clitico: pronome de 1a/2a DEPOIS do verbo e objeto. A busca fica dentro da
    // oracao, e era isso que faltava — atravessando o conectivo, o motor pegava
    // o sujeito da oracao seguinte.
    const obj = dentro.find(
      (it) =>
        it.lex.class === 'pronoun' &&
        fv >= 0 &&
        it.index > fv &&
        (it.lex.person === '1s' || it.lex.person === '2s'),
    )
    // O clitico acompanha o ULTIMO verbo antes do pronome, nao o primeiro: em
    // "quero ajudar você" quem rege o objeto e "ajudar".
    const cvi = obj
      ? (dentro
          .filter((x) => x.index < obj.index && x.lex.class === 'verb')
          .at(-1)?.index ?? -1)
      : -1
    const cv = cvi >= 0 ? items[cvi] : undefined
    const cl = obj && cv && !cv.lex.prep ? (obj.lex.person === '1s' ? 'me' : 'te') : null

    // "AJUDAR · EU" nao e "eu ajudo": e pedido a quem ouve. Objeto de 1a sem
    // sujeito escrito implica interlocutor como sujeito.
    if (!pron && cl === 'me') p = '2s'

    // Pedido com sujeito de 2a explicito nao vira imperativo: "você abra a
    // porta" nao existe, e "você abre a porta" ja e pedido em portugues falado.
    const imp =
      marks.request && !(pron && (pron.lex.person === '2s' || pron.lex.person === '2t'))

    return {
      firstVerbIndex: fv,
      pronoun: pron,
      subjectGroup: grupo,
      person: p,
      objectPronoun: obj,
      cliticVerbIndex: cvi,
      clitic: cl,
      useImperative: imp,
    }
  }

  const oracoes: Oracao[] = []
  {
    const total = (clauseOf[items.length - 1] ?? 0) + 1
    for (let c = 0; c < total; c++) {
      oracoes.push(analisar(items.filter((it) => clauseOf[it.index] === c)))
    }
  }

  let oracao = oracoes[0]!
  let { pronoun, subjectGroup, person, objectPronoun, clitic, cliticVerbIndex } = oracao
  // Usado na troca de oracao abaixo; a primeira ja vem analisada.
  let firstVerbIndex = oracao.firstVerbIndex
  void firstVerbIndex
  let useImperative = oracao.useImperative

  const timeAdverb = items.find((it) => TIME_ADVERBS[it.label])
  const tense: Tense =
    marks.tense !== 'auto' ? marks.tense : (timeAdverb && TIME_ADVERBS[timeAdverb.label]) || 'present'

  /**
   * TODOS os cards de negacao, e nao so o primeiro.
   *
   * Era `find`, entao um segundo "nao" na frase era simplesmente ignorado — e
   * com ele a unica forma que a pessoa tinha de dizer onde a negacao pega.
   * Ver `emitListSeparator`.
   */
  const negationCards = items.filter((it) => it.lex.class === 'negation')
  const negationCard = negationCards[0]
  const negated = marks.negated || negationCards.length > 0
  /** Cards de negacao ja transformados em "nem" numa coordenacao. */
  const negacoesUsadas = new Set<number>()
  // "quando" e "se" tambem sao interrogativos — mas quando abrem oracao
  // subordinada nao ha pergunta nenhuma: "quando o papai chegar eu brinco" e
  // afirmacao. Antes saia "Quando está o papai chegar?".
  const question =
    marks.question ||
    items.some((it) => it.lex.class === 'question' && !abriuOracao.has(it.index))

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
  /** Numeral maior que um antes do substantivo: "dois bolos". */
  let numeralPlural = false
  /** O ultimo item emitido ainda pertencia ao sujeito da frase. */
  let previousWasSubject = false
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

  /*
   * O calculo de clitico, sujeito implicito e imperativo mudou de lugar: agora
   * e feito POR ORACAO, em `analisar()`, la em cima. Antes ficava aqui e valia
   * para a frase inteira — o que so estava certo enquanto a frase tinha uma
   * oracao so.
   */

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
  const emitListSeparator = (isLast: boolean, predicado = false, i = Number.MAX_SAFE_INTEGER) => {
    // A pessoa acabou de escolher "e" ou "mas": o motor nao poe outro por cima.
    if (explicitConnector) {
      explicitConnector = false
      return
    }
    /**
     * NEGAÇÃO NÃO PARA NO PRIMEIRO PREDICADO.
     *
     * `NÃO · QUERER · SUCO · QUERER · LEITE · QUERER · PÃO` saía como
     *
     *     "Não quero suco, quero leite e quero pão."
     *
     * — que diz o **contrário** do que a pessoa montou: os dois últimos
     * predicados ficavam afirmativos. Num app de fala, inverter o sentido é o
     * pior defeito possível: a pessoa é ouvida dizendo o oposto do que quis, e
     * não tem como corrigir a não ser remontando tudo.
     *
     * Em português a coordenação de predicados negados é feita com **nem**, que
     * já carrega a negação — "não quero suco, nem quero leite". É mais curto e
     * mais natural do que repetir "não" em cada um, e mantém cada palavra que a
     * pessoa escolheu no lugar em que ela pôs.
     */
    /**
     * O "não" nega ONDE A PESSOA O PÔS — nem mais, nem menos.
     *
     * Duas tentações erradas, e o app já caiu na primeira:
     *
     *   - **negar só o primeiro predicado, sempre.** Era o que acontecia:
     *     `NÃO · QUERER · SUCO · QUERER · LEITE` saía "Não quero suco, quero
     *     leite" — e a pessoa era ouvida dizendo que QUER leite.
     *   - **negar a frase inteira, sempre.** Igualmente errado pelo motivo
     *     oposto: "não quero suco, quero leite" é uma frase legítima, de
     *     contraste, e o motor não pode tirá-la de ninguém.
     *
     * O critério não é adivinhar a intenção: é olhar onde estão os cards. Um
     * "não" antes do segundo verbo vira **nem** — que é literalmente "e não" —
     * e a coordenação sai correta sem o motor decidir nada por conta própria.
     * Quem quer negar os dois toca "não" duas vezes; quem quer contrastar toca
     * uma vez só.
     */
    /**
     * "Nem" só existe em série JÁ negativa — ele é literalmente "e não".
     *
     * "Eu quero água, nem quero o pão" não é português: sem um predicado
     * negado antes, o segundo "não" precisa sair como "e não". Por isso a
     * conversão exige `negationDone` — alguma negação já ter sido dita.
     */
    const negacaoAqui = negationDone
      ? negationCards.find((n) => !negacoesUsadas.has(n.index) && n.index < i)
      : undefined
    if (predicado && negacaoAqui) {
      negacoesUsadas.add(negacaoAqui.index)
      // A vírgula vem SEMPRE antes de "nem", inclusive antes do último — ao
      // contrário do "e", que a dispensa. "Não quero suco, nem quero pão."
      const last = tokens[tokens.length - 1]
      if (last) last.text = `${last.text},`
      push('nem', 'card', { cardIndex: negacaoAqui.index })
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

  /**
   * A negação sai no predicado ONDE O CARD ESTÁ — não no primeiro da frase.
   *
   * Achado numa tela do app: `EU · QUERER · ÁGUA · NÃO · QUERER · PÃO` saía
   * como "Eu **não** quero água e quero o pão". A pessoa pôs o "não" antes do
   * SEGUNDO querer, e o motor o levou para o primeiro — invertendo as duas
   * metades da frase de uma vez.
   *
   * O critério é o mesmo do resto: a posição do card é a intenção. Um card de
   * negação só pode ser emitido quando o predicado que está sendo construído
   * vem DEPOIS dele.
   *
   * `ateIndice` é o índice do item que está sendo emitido agora. Sem ele, um
   * predicado anterior consumiria a negação de um posterior.
   */
  const negacaoDisponivel = (ateIndice: number): boolean => {
    if (!negated) return false
    // Marcador da faixa (sem card): vale para a oração toda, e sai no primeiro
    // predicado — é o que a pessoa pediu ao marcar a frase inteira.
    if (negationCards.length === 0) return true
    return negationCards.some((n) => !negacoesUsadas.has(n.index) && n.index < ateIndice)
  }

  const emitNegation = (ateIndice = Number.MAX_SAFE_INTEGER) => {
    if (!negated || negationDone) return
    if (!negacaoDisponivel(ateIndice)) return
    negationDone = true
    // O card consumido é o primeiro AINDA disponível, e não sempre o primeiro
    // da frase: é isso que faz a negação sair no predicado certo quando ela
    // está no meio.
    const usado = negationCards.find((n) => !negacoesUsadas.has(n.index) && n.index < ateIndice)
    if (usado) {
      // Este card já virou o "não" deste predicado: não pode virar "nem" outra
      // vez lá na coordenação. É o que distingue um "não" (contraste — "não
      // quero suco, quero leite") de dois ("não quero suco, nem leite").
      negacoesUsadas.add(usado.index)
      push('não', 'card', { cardIndex: usado.index })
    } else push('não', 'inserted')
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
  /**
   * Qual cópula já entrou nesta oração.
   *
   * Existe para permitir DUAS predicações sobre o mesmo sujeito quando elas
   * pedem cópulas diferentes — "eu estou feliz **e tenho** medo". Sem isto,
   * `EU · FELIZ · MEDO` saía "Eu estou feliz medo": a segunda predicação era
   * silenciosamente descartada porque já havia verbo.
   */
  let copulaEmitida: 'estar' | 'ter' | 'ser' | null = null

  const emitCopula = (verb: 'estar' | 'ter' | 'ser' = 'estar') => {
    emitNegation()
    const p = subjectPerson()
    // "eu estive triste" e perfeito, e soa como evento pontual; a lingua usa o
    // IMPERFEITO para estado passado — "eu estava triste", "eu tinha medo".
    const forma =
      (tense === 'past' || tense === 'imperfect') && verb !== 'ser'
        ? verb === 'estar'
          ? ESTAR_IMPERFECT[p]
          : TER_IMPERFECT[p]
        : conjugate(verb, p, tense === 'past' ? 'imperfect' : tense)
    push(forma, 'inserted')
    verbDone = true
    copulaEmitida = verb
  }

  let oracaoAtual = 0

  for (let i = 0; i < items.length; i++) {
    const it = items[i]!
    const { lex, label } = it
    /**
     * O proximo item que IMPORTA — a negacao e transparente.
     *
     * Quase toda decisao do motor olha uma posicao a frente: concordancia de
     * determinante, regencia de preposicao, se o substantivo abre lista, se o
     * adjetivo liga a um verbo. Um card "nao" no meio escondia tudo isso e
     * produzia uma familia inteira de defeitos:
     *
     *     EU · CANSADO · NAO · ESPERAR  ->  "cansado esperar"  (sem o "de")
     *     UM · NAO · TITIA  + plural    ->  "um titias"        (sem concordar)
     *
     * A negacao nega a oracao; ela nunca e alvo de concordancia nem de
     * regencia. Torna-la transparente AQUI conserta todos os pontos de uma vez,
     * em vez de um remendo por lugar — e foi assim que os dois acima
     * apareceram, com semanas de diferenca, cada um no seu canto.
     */
    const next = proximoIgnorandoNegacao(i)
    const isPlural = it.index === lastNounIndex

    // Fronteira de oracao: troca o sujeito, a pessoa e o clitico, e zera o
    // estado que so valia para a oracao anterior. Sem isto o segundo verbo
    // nunca era conjugado — "eu quero porque eu fome" parava em "porque fome".
    const c = clauseOf[it.index] ?? 0
    if (c !== oracaoAtual) {
      oracaoAtual = c
      oracao = oracoes[c]!
      ;({ firstVerbIndex, pronoun, subjectGroup, person, objectPronoun, clitic, cliticVerbIndex } =
        oracao)
      useImperative = oracao.useImperative
      verbDone = false
      lastNoun = null
      previousWasNoun = false
      previousWasSubject = false
      coordForm = 'finite'
      regencyPrep = null
      pendingPrep = null
      pendingPrepCard = null
      pendingVerbPrep = null
      suppressArticle = false
      lastVerbLabel = null
    }

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
        // "quero QUE você venha": o "que" abre a oração encaixada, e vem antes
        // do sujeito dela.
        if (clauseQue.has(clauseOf[it.index] ?? 0) && !queEmitido.has(clauseOf[it.index] ?? 0)) {
          queEmitido.add(clauseOf[it.index] ?? 0)
          push('que', 'inserted')
        }
        virgulaDeOracao(clauseOf[it.index] ?? 0)
        previousWasSubject = subjectGroup.some((x) => x.index === it.index)
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
        // "dele"/"dela" sao pospostos: vem DEPOIS do substantivo e nao
        // concordam com ele — concordam com o dono. "O carro dele", nunca
        // "dele carro" nem "dela carro" virando "da carro".
        if (lex.postposed) {
          push(it.card.label, 'card', { cardIndex: it.index })
          previousWasNoun = false
          break
        }
        // Predicado nominal com possessivo: "isso · minha · bola" precisa da
        // copula tanto quanto "isso · bola". Antes saia "Isso minha bola".
        if (!verbDone && !questionSeen && subjectGroup.length > 0 && previousWasSubject) {
          emitCopula('ser')
        }

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
          if (verboAnterior && !modalAindaAberto(items, i)) {
            const maisVerbos = items.slice(i + 1).some((x) => x.lex.class === 'verb')
            // `predicado`: é coordenação de PREDICADOS, e não de coisas numa
            // lista. Só aqui a negação precisa atravessar para o item seguinte.
            emitListSeparator(!maisVerbos, true, it.index)
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

        /**
         * A negação vem DEPOIS do separador de lista, não antes.
         *
         * Foi o erro da primeira tentativa deste conserto: com `emitNegation`
         * no topo do ramo, `EU·QUERER·ÁGUA·NÃO·QUERER·PÃO` saía "Eu quero água
         * **não e** quero o pão" — o "não" atravessava na frente do "e". A
         * ordem certa é a da fala: primeiro liga as duas orações, depois nega a
         * segunda.
         */
        emitNegation(it.index)

        const coordenado =
          emCadeia &&
          Boolean([...items.slice(0, i)].reverse().find((x) => x.lex.class === 'verb')) &&
          !modalAindaAberto(items, i)

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
          // Verbo modal ja carrega a futuridade em portugues falado: "eu quero
          // ir amanhã" — a perifrase produzia "eu VOU QUERER ir amanhã".
          const tempoDoVerbo = tense === 'future' && lex.modal ? 'present' : tense
          const subjFuturo = clauseSubjunctive[oracaoAtual] === true
          // Oracao encaixada por verbo volitivo: presente do subjuntivo.
          const subjPresente = clauseQue.has(oracaoAtual)
          const text = subjPresente
            ? subjunctivePresent(label, person)
            : subjFuturo
            ? futuroDoSubjuntivo(label, person)
            : useImperative
            ? imperative(label, register)
            : marks.progressive
              ? `${tense === 'past' || tense === 'imperfect' ? ESTAR_IMPERFECT[person] : conjugate('estar', person, tense)} ${gerund(label)}`
              : conjugate(label, person, tempoDoVerbo)
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
        const ehEstado =
          label === 'fome' || label === 'sede' || label === 'medo' || label === 'dor'
        const copulaDoEstado = label === 'dor' ? 'estar' : 'ter'

        /**
         * Segunda predicação sobre o mesmo sujeito: "eu estou feliz E TENHO
         * medo".
         *
         * O ramo abaixo exigia `!verbDone`, então com a cópula de um adjetivo
         * já emitida o substantivo de estado caía solto — "Eu estou feliz
         * medo". São duas predicações legítimas com cópulas diferentes, e a
         * língua as junta com "e", exatamente como já se faz com dois verbos.
         *
         * Só vale quando a cópula anterior foi OUTRA: com a mesma, "tenho fome
         * e tenho sede" seria repetição desnecessária, e o caminho de lista que
         * já existe resolve melhor.
         */
        /**
         * "Eu estou feliz **e com** dor" — a cópula é elidida.
         *
         * Quando a segunda predicação usa a MESMA cópula da primeira, repeti-la
         * ("estou feliz e estou com dor") soa a lista de formulário. A língua
         * elide o verbo e liga direto pelo "com", e é isso que sai da boca de
         * quem fala.
         */
        const elideCopula = ehEstado && verbDone && copulaEmitida === copulaDoEstado
        if (ehEstado && verbDone && copulaEmitida && copulaEmitida !== copulaDoEstado) {
          emitListSeparator(!items.slice(i + 1).some((x) => x.lex.class === 'noun'), true, it.index)
          emitCopula(copulaDoEstado)
          if (label === 'dor') push('com', 'inserted')
          push(it.card.label, 'card', { cardIndex: it.index })
          previousWasNoun = true
          lastNoun = { gender: lex.gender ?? 'm', plural: false, label, lex }
          break
        }

        if (elideCopula) {
          emitListSeparator(!items.slice(i + 1).some((x) => x.lex.class === 'noun'), true, it.index)
          if (label === 'dor') push('com', 'inserted')
          push(it.card.label, 'card', { cardIndex: it.index })
          previousWasNoun = true
          lastNoun = { gender: lex.gender ?? 'm', plural: false, label, lex }
          break
        }

        if (!verbDone && ehEstado) {
          emitCopula(copulaDoEstado)
          if (label === 'dor') pendingPrep = 'com'
        }

        // Predicado NOMINAL: "isso · meu" e "eu · menino" nao sao frase sem
        // verbo. A copula aqui e SER, nao estar — identidade e posse, nao
        // estado. Antes saia "Eu sua bola".
        if (
          !verbDone &&
          !questionSeen &&
          subjectGroup.length > 0 &&
          previousWasSubject &&
          // …e este substantivo NAO faz parte do proprio sujeito: em
          // "eu · mamãe · ir" os dois sao sujeito composto, e inserir copula
          // ali dava "eu vamos ser e a mamãe ir".
          !subjectGroup.some((x) => x.index === it.index)
        ) {
          emitCopula('ser')
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
        /**
         * O artigo escolhido no bloco não vence a supressão estrutural.
         *
         * Achado pela varredura em lote: `UM · TITIA`, com o segundo bloco
         * marcado como indefinido, saía **"Umas umas titias"** — o quantificador
         * "um" já ocupa o lugar do artigo, e o modo explícito punha outro por
         * cima dele.
         *
         * O toque no bloco escolhe QUAL artigo, não SE existe um: a pessoa não
         * está pedindo dois determinantes seguidos, e nenhuma escolha dela no
         * bloco significa isso. Onde a estrutura já não comporta artigo, o modo
         * explícito é ignorado — e o "nenhum" continua valendo, porque tirar é
         * sempre um pedido possível.
         */
        const cabeArtigo = !suppressArticle
        const art =
          modo === 'none' || !cabeArtigo
            ? null
            : modo === 'def'
              ? article(gender, plural)
              : modo === 'indef'
                ? INDEFINITE[gender][plural ? 1 : 0]
                : decideArticle({ lex, prep, suppressArticle })
                  ? article(gender, plural)
                  : null

        // "quero QUE A mãe venha": o "que" abre a oracao encaixada e vem antes
        // do artigo do sujeito dela — senao sai "quero a que mãe venha".
        if (clauseQue.has(clauseOf[it.index] ?? 0) && !queEmitido.has(clauseOf[it.index] ?? 0)) {
          queEmitido.add(clauseOf[it.index] ?? 0)
          push('que', 'inserted')
        }
        virgulaDeOracao(clauseOf[it.index] ?? 0)

        const prepCard = pendingPrepCard
        pendingPrepCard = null
        const emitPrep = (t: string, primeiro: boolean) =>
          push(t, primeiro && prepCard !== null ? 'card' : 'inserted', {
            ...(primeiro && prepCard !== null ? { cardIndex: prepCard } : {}),
          })
        if (prep && art) contract(prep, art).forEach((t, k) => emitPrep(t, k === 0))
        else if (prep) emitPrep(prep, true)
        else if (art) push(art, 'inserted')

        const pluralizar = isPlural || numeralPlural
        numeralPlural = false
        // "quero QUE a mamãe venha": sujeito novo tambem pode ser substantivo.
        if (clauseQue.has(clauseOf[it.index] ?? 0) && !queEmitido.has(clauseOf[it.index] ?? 0)) {
          queEmitido.add(clauseOf[it.index] ?? 0)
          push('que', 'inserted')
        }
        // Com variante regional, e ELA que se pluraliza — ver o comentario na
        // montagem dos itens.
        const baseDoNome = it.variante ?? it.card.label
        const text = pluralizar ? pluralize(baseDoNome, lex) : baseDoNome
        push(text, text === it.card.label ? 'card' : 'inflected', {
          cardIndex: it.index,
          ...(text === it.card.label ? {} : { original: it.card.label }),
        })

        explicitPrep = false
        previousWasSubject = subjectGroup.some((x) => x.index === it.index)
        lastNoun = { gender, plural: isPlural || Boolean(lex.plural), label, lex }
        // "medo de cair", "vontade de ir": substantivo de estado liga ao verbo
        // seguinte por preposicao.
        //
        // A condicao era `lex.mass`, e estava errada. `mass` quer dizer
        // INCONTAVEL, nao "substantivo de estado" — os dois conjuntos so se
        // cruzam por acaso em medo, fome e sede, o que fez a regra passar
        // despercebida. Mas suco, leite, arroz, carne e comida tambem sao
        // incontaveis, e por isso
        //
        //     NAO · QUERER · SUCO · QUERER · LEITE
        //
        // saia como "Nao quero suco DE QUERER leite" em vez de coordenar os
        // dois verbos. Agora a regencia e declarada palavra a palavra em
        // `nounPrepInf`, e quem nao a declara nao ganha preposicao nenhuma.
        if (next?.lex.class === 'verb' && lex.nounPrepInf) {
          pendingVerbPrep = lex.nounPrepInf
        }
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
        // "eu cansado triste" nao e portugues: adjetivos em sequencia sao
        // lista, como os substantivos e os verbos ja eram.
        if (items[i - 1]?.lex.class === 'adjective') {
          emitListSeparator(next?.lex.class !== 'adjective')
        }

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
        //
        // O próximo item é lido IGNORANDO a negação. Achado pela varredura em
        // lote, em 191 casos:
        //
        //     EU · CANSADO · ESPERAR        → "Eu estou cansado de esperar."
        //     EU · CANSADO · NÃO · ESPERAR  → "Eu não estou cansado esperar."
        //
        // O card "não" entre o adjetivo e o verbo escondia o verbo de quem
        // olhava só uma posição à frente, e a preposição sumia. A negação não
        // muda a relação entre o adjetivo e o verbo — ela nega a oração — e
        // por isso não pode entrar no meio dessa leitura.
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
        if (lex.plural) numeralPlural = true
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
        // "quando" e "se" tambem sao interrogativos — mas quando ABREM oracao
        // subordinada nao ha pergunta nenhuma: "quando o papai chegar eu
        // brinco" e afirmacao. Antes o motor inseria copula de pergunta e saia
        // "Quando ESTÁ o papai chegar?", o que ainda por cima impedia o verbo
        // seguinte de ser conjugado.
        if (!abriuOracao.has(it.index)) questionSeen = true
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

/**
 * O verbo modal anterior ainda espera complemento?
 *
 * "Quero comer" — o segundo verbo é complemento do primeiro, e entra colado no
 * infinitivo. Mas em
 *
 *     QUERER · SUCO · QUERER · LEITE
 *
 * o "suco" já é o complemento de "quero": o segundo "querer" não completa nada,
 * ele abre um predicado novo e tem de ser coordenado — "quero suco **e quero**
 * leite".
 *
 * A regra antiga olhava só se o verbo anterior era modal, e por isso saía
 * "quero suco querer leite": um modal já satisfeito continuava engolindo todo
 * verbo que viesse depois, por mais longe que estivesse.
 *
 * O que fecha um modal é um complemento entre ele e o verbo atual — substantivo
 * ou pronome objeto. Adjetivo e advérbio não fecham: em "quero ficar quieto
 * dormir" o "quieto" é do "ficar", não complemento de "quero".
 */
function modalAindaAberto(items: Item[], i: number): boolean {
  for (let j = i - 1; j >= 0; j--) {
    const anterior = items[j]
    if (!anterior) continue
    if (anterior.lex.class === 'verb') return Boolean(anterior.lex.modal)
    if (anterior.lex.class === 'noun') return false
    // Pronome depois do verbo é objeto ("quero ELE"), e também fecha; antes do
    // verbo é sujeito, e aí não há modal aberto ainda para fechar.
    if (anterior.lex.class === 'pronoun' && items.slice(0, j).some((x) => x.lex.class === 'verb'))
      return false
  }
  return false
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
  /**
   * Substantivo COM classe e SEM gênero: também não leva artigo.
   *
   * O caso existe desde que o léxico gerado passou a publicar comuns de dois
   * gêneros sem gênero — *o* dentista e *a* dentista são os dois corretos, e a
   * palavra legitimamente não tem um. O motor caía no masculino por omissão
   * (`lex.gender ?? 'm'`), o que transformava "não sei" em "é homem".
   *
   * Numa prancha de CAA isso não é erro de concordância: é o app pondo a
   * pessoa errada na frase, e quem usa fala de si e de quem está por perto o
   * tempo todo. Sem artigo — "quero dentista" — a frase fica telegráfica e
   * verdadeira, que é a troca que este arquivo já faz em todo lugar.
   */
  if (lex.class === 'noun' && !lex.gender) return false
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
