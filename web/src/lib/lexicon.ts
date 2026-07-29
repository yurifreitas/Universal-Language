/**
 * Lexico pt-BR das pranchas.
 *
 * Por que um lexico proprio e nao anotacao dentro de boards.json: o usuario
 * pode trazer para a frase qualquer um dos 13.801 pictogramas da ARASAAC pela
 * busca, e nenhum deles esta em boards.json. O lexico precisa ser consultado
 * por ROTULO, com heuristica de fallback para o que nao conhece — nunca falhar,
 * no maximo saber menos.
 *
 * A anotacao aqui e o que o motor de frases (`grammar.ts`) consome. Ela existe
 * porque o portugues exige concordancia que o pictograma nao carrega: "a agua"
 * mas "o pao", "bonita" mas "bonito", "gosto DE bolo" mas "quero bolo".
 *
 * Ver GRAMMAR.md e LANGUAGE-SYSTEMS.md secao 1 (Blissymbolics: o indicador
 * gramatical e separado do simbolo-base — aqui o "indicador" e este registro,
 * nao um pictograma novo por flexao).
 */

export type WordClass =
  | 'pronoun'
  | 'determiner'
  | 'verb'
  | 'noun'
  | 'adjective'
  | 'adverb'
  | 'quantifier'
  | 'question'
  | 'negation'
  | 'affirmation'
  | 'social'
  | 'connector'

/**
 * Pessoa gramatical.
 *
 * `2s` e "voce", que flexiona como 3a pessoa em pt-BR. `2t` e o "tu" normativo
 * ("tu queres", "tu foste"), usado quando a pessoa escolhe uma variedade com tu
 * E o registro normativo — no coloquial brasileiro, "tu" leva o verbo na forma
 * de 3a pessoa e cai em `2s`. Ver `regional.ts`.
 */
export type Person = '1s' | '2s' | '2t' | '3s' | '1p' | '3p'

export type Tense = 'present' | 'past' | 'future'

export interface Lexeme {
  class: WordClass
  /** Genero do substantivo/adjetivo. Adjetivo sem genero e invariavel (feliz). */
  gender?: 'm' | 'f'
  /** Ja esta no plural no rotulo (ex.: "os dentes" dentro de uma locucao). */
  plural?: boolean
  /** Incontavel: "quero agua", nao "quero a agua". */
  mass?: boolean
  /** Substantivo de lugar: aceita "para" depois de verbo de movimento. */
  place?: boolean
  /** Pessoa/ser animado: relevante para escolher artigo definido. */
  animate?: boolean
  /** Parte do corpo: "dor" + parte do corpo vira "dor na barriga". */
  bodyPart?: boolean
  /** Idiomatico sem artigo depois de preposicao: "vou para casa". */
  bareAfterPrep?: boolean
  /** Pessoa gramatical, para pronomes. */
  person?: Person
  /** Regencia: verbo que exige preposicao antes do complemento. */
  prep?: string
  /**
   * Verbo que rege INFINITIVO como complemento: "quero comer", "posso jogar",
   * "vou dormir". Distingue-se da coordenacao — em "brincar, pintar e
   * desenhar" os verbos estao em lista, em "quero comer" o segundo e
   * complemento do primeiro. Sem esta marca o motor produzia "quero e comer".
   */
  modal?: boolean
  /**
   * Aparelho: depois de verbo de atividade pede locativo — "jogar NO celular",
   * "ver NA televisao". Depois de verbo de posse continua objeto direto:
   * "quero o celular".
   */
  device?: boolean
  /**
   * Locucao ja flexionada ou fixa ("acabou", "escovar os dentes"): o motor
   * conjuga so o primeiro elemento, ou nada, conforme o caso.
   */
  fixed?: boolean
  /** Plural irregular, quando o rotulo for pluralizado por um marcador. */
  pluralForm?: string
}

/* ------------------------------------------------------------------ verbos */

type VerbForms = Partial<Record<Tense, Partial<Record<Person, string>>>>

/**
 * Irregulares. O futuro NAO entra aqui: o motor usa o futuro perifrastico
 * ("vou comer"), entao basta `ir` no presente — uma decisao que elimina quase
 * toda a irregularidade do futuro do portugues.
 */
export const IRREGULAR_VERBS: Record<string, VerbForms> = {
  ser: {
    present: { '2t': 'és', '1s': 'sou', '2s': 'é', '3s': 'é', '1p': 'somos', '3p': 'são' },
    past: { '2t': 'foste', '1s': 'fui', '2s': 'foi', '3s': 'foi', '1p': 'fomos', '3p': 'foram' },
  },
  estar: {
    present: { '2t': 'estás', '1s': 'estou', '2s': 'está', '3s': 'está', '1p': 'estamos', '3p': 'estão' },
    past: { '2t': 'estiveste', '1s': 'estive', '2s': 'esteve', '3s': 'esteve', '1p': 'estivemos', '3p': 'estiveram' },
  },
  ter: {
    present: { '2t': 'tens', '1s': 'tenho', '2s': 'tem', '3s': 'tem', '1p': 'temos', '3p': 'têm' },
    past: { '2t': 'tiveste', '1s': 'tive', '2s': 'teve', '3s': 'teve', '1p': 'tivemos', '3p': 'tiveram' },
  },
  querer: {
    present: { '2t': 'queres', '1s': 'quero', '2s': 'quer', '3s': 'quer', '1p': 'queremos', '3p': 'querem' },
    past: { '2t': 'quiseste', '1s': 'quis', '2s': 'quis', '3s': 'quis', '1p': 'quisemos', '3p': 'quiseram' },
  },
  ir: {
    present: { '2t': 'vais', '1s': 'vou', '2s': 'vai', '3s': 'vai', '1p': 'vamos', '3p': 'vão' },
    past: { '2t': 'foste', '1s': 'fui', '2s': 'foi', '3s': 'foi', '1p': 'fomos', '3p': 'foram' },
  },
  vir: {
    present: { '2t': 'vens', '1s': 'venho', '2s': 'vem', '3s': 'vem', '1p': 'vimos', '3p': 'vêm' },
    past: { '2t': 'vieste', '1s': 'vim', '2s': 'veio', '3s': 'veio', '1p': 'viemos', '3p': 'vieram' },
  },
  dar: {
    present: { '2t': 'dás', '1s': 'dou', '2s': 'dá', '3s': 'dá', '1p': 'damos', '3p': 'dão' },
    past: { '2t': 'deste', '1s': 'dei', '2s': 'deu', '3s': 'deu', '1p': 'demos', '3p': 'deram' },
  },
  fazer: {
    present: { '2t': 'fazes', '1s': 'faço', '2s': 'faz', '3s': 'faz', '1p': 'fazemos', '3p': 'fazem' },
    past: { '2t': 'fizeste', '1s': 'fiz', '2s': 'fez', '3s': 'fez', '1p': 'fizemos', '3p': 'fizeram' },
  },
  poder: {
    present: { '2t': 'podes', '1s': 'posso', '2s': 'pode', '3s': 'pode', '1p': 'podemos', '3p': 'podem' },
    past: { '2t': 'pudeste', '1s': 'pude', '2s': 'pôde', '3s': 'pôde', '1p': 'pudemos', '3p': 'puderam' },
  },
  ver: {
    present: { '2t': 'vês', '1s': 'vejo', '2s': 'vê', '3s': 'vê', '1p': 'vemos', '3p': 'veem' },
    past: { '2t': 'viste', '1s': 'vi', '2s': 'viu', '3s': 'viu', '1p': 'vimos', '3p': 'viram' },
  },
  saber: {
    present: { '2t': 'sabes', '1s': 'sei', '2s': 'sabe', '3s': 'sabe', '1p': 'sabemos', '3p': 'sabem' },
    past: { '2t': 'soubeste', '1s': 'soube', '2s': 'soube', '3s': 'soube', '1p': 'soubemos', '3p': 'souberam' },
  },
  ler: {
    present: { '2t': 'lês', '1s': 'leio', '2s': 'lê', '3s': 'lê', '1p': 'lemos', '3p': 'leem' },
    past: { '2t': 'leste', '1s': 'li', '2s': 'leu', '3s': 'leu', '1p': 'lemos', '3p': 'leram' },
  },
  ouvir: {
    present: { '2t': 'ouves', '1s': 'ouço', '2s': 'ouve', '3s': 'ouve', '1p': 'ouvimos', '3p': 'ouvem' },
  },
  dormir: {
    present: { '2t': 'dormes', '1s': 'durmo', '2s': 'dorme', '3s': 'dorme', '1p': 'dormimos', '3p': 'dormem' },
  },
  vestir: {
    present: { '2t': 'vestes', '1s': 'visto', '2s': 'veste', '3s': 'veste', '1p': 'vestimos', '3p': 'vestem' },
  },
  doer: {
    present: { '3s': 'dói', '3p': 'doem' },
    past: { '3s': 'doeu', '3p': 'doeram' },
  },
  pegar: {
    // regular na fala, mas a 1a do preterito muda a grafia (peguei, nao *pegei)
    past: { '1s': 'peguei' },
  },
  brincar: { past: { '1s': 'brinquei' } },
  ficar: { past: { '1s': 'fiquei' } },
  jogar: { past: { '1s': 'joguei' } },
  chegar: { past: { '1s': 'cheguei' } },
  dançar: { past: { '1s': 'dancei' } },
  começar: { past: { '1s': 'comecei' } },
}

/**
 * Imperfeito de ESTAR — a unica forma de imperfeito que o motor precisa, porque
 * so aparece no progressivo passado ("eu estava comendo"). Conjugar o
 * imperfeito de todos os verbos exigiria outra tabela inteira; a perifrase
 * resolve com um verbo so.
 */
export const ESTAR_IMPERFECT: Record<Person, string> = {
  '1s': 'estava',
  '2s': 'estava',
  '2t': 'estavas',
  '3s': 'estava',
  '1p': 'estávamos',
  '3p': 'estavam',
}

/**
 * Presente do subjuntivo, usado para o imperativo normativo ("abra a porta").
 * Só os irregulares: os regulares seguem a troca de vogal temática
 * (-ar → -e, -er/-ir → -a).
 */
export const SUBJUNCTIVE: Record<string, string> = {
  ser: 'seja',
  estar: 'esteja',
  ter: 'tenha',
  ir: 'vá',
  vir: 'venha',
  dar: 'dê',
  fazer: 'faça',
  poder: 'possa',
  querer: 'queira',
  saber: 'saiba',
  ver: 'veja',
  ler: 'leia',
  ouvir: 'ouça',
  dormir: 'durma',
  vestir: 'vista',
  pegar: 'pegue',
  brincar: 'brinque',
  ficar: 'fique',
  jogar: 'jogue',
  chegar: 'chegue',
  dançar: 'dance',
  começar: 'comece',
}

/** Gerundios que a regra (-ar→ando, -er→endo, -ir→indo) nao acerta. */
export const GERUND: Record<string, string> = {
  vir: 'vindo',
  pôr: 'pondo',
}

/* ------------------------------------------------------------------ lexico */

const V = (extra: Partial<Lexeme> = {}): Lexeme => ({ class: 'verb', ...extra })
const N = (gender: 'm' | 'f', extra: Partial<Lexeme> = {}): Lexeme => ({
  class: 'noun',
  gender,
  ...extra,
})
const ADJ = (gender?: 'm' | 'f'): Lexeme => ({ class: 'adjective', ...(gender ? { gender } : {}) })

export const LEXICON: Record<string, Lexeme> = {
  /* ------------------------------------------------------------- nucleo */
  eu: { class: 'pronoun', person: '1s' },
  você: { class: 'pronoun', person: '2s' },
  // `tu` entra como 2s: a pessoa que ele exige depende do registro escolhido, e
  // essa decisao e do motor (`grammar.ts`), nao do lexico.
  tu: { class: 'pronoun', person: '2s' },
  // "A gente" e semanticamente 1a do plural e gramaticalmente 3a do singular —
  // "a gente vai", nunca "a gente vamos".
  'a gente': { class: 'pronoun', person: '3s' },
  ele: { class: 'pronoun', person: '3s' },
  ela: { class: 'pronoun', person: '3s' },
  nós: { class: 'pronoun', person: '1p' },
  eles: { class: 'pronoun', person: '3p' },

  meu: { class: 'determiner', gender: 'm' },
  minha: { class: 'determiner', gender: 'f' },

  querer: V({ modal: true }),
  não: { class: 'negation' },
  sim: { class: 'affirmation' },
  mais: { class: 'quantifier' },
  acabou: V({ fixed: true }),
  ajudar: V(),
  gostar: V({ prep: 'de', modal: true }),
  ir: V({ modal: true }),
  vir: V({ modal: true }),
  parar: V(),
  dar: V(),
  pegar: V(),
  olhar: V({ prep: 'para' }),
  fazer: V(),
  comer: V(),
  beber: V(),
  brincar: V({ prep: 'com' }),
  dormir: V(),
  banheiro: N('m', { place: true }),
  // Incontavel: diz-se "estou com dor", nao "estou com a dor".
  dor: N('f', { mass: true }),
  aqui: { class: 'adverb' },
  agora: { class: 'adverb' },
  depois: { class: 'adverb' },
  onde: { class: 'question' },
  quem: { class: 'question' },
  'o que': { class: 'question' },
  'por que': { class: 'question' },
  quando: { class: 'question' },
  abrir: V(),
  fechar: V(),
  esperar: V(),
  terminar: V(),

  /* -------------------------------------------------------- sentimentos */
  feliz: ADJ(),
  triste: ADJ(),
  bravo: ADJ('m'),
  medo: N('m', { mass: true }),
  cansado: ADJ('m'),
  animado: ADJ('m'),
  calmo: ADJ('m'),
  nervoso: ADJ('m'),
  entediado: ADJ('m'),
  envergonhado: ADJ('m'),
  sozinho: ADJ('m'),
  doente: ADJ(),
  fome: N('f', { mass: true }),
  sede: N('f', { mass: true }),
  confuso: ADJ('m'),
  orgulhoso: ADJ('m'),
  amar: V(),

  /* ------------------------------------------------------------- comida */
  água: N('f', { mass: true }),
  suco: N('m', { mass: true }),
  leite: N('m', { mass: true }),
  pão: N('m', { pluralForm: 'pães' }),
  arroz: N('m', { mass: true }),
  feijão: N('m', { mass: true, pluralForm: 'feijões' }),
  fruta: N('f'),
  banana: N('f'),
  maçã: N('f', { pluralForm: 'maçãs' }),
  bolo: N('m'),
  biscoito: N('m'),
  macarrão: N('m', { mass: true }),
  carne: N('f', { mass: true }),
  ovo: N('m'),
  queijo: N('m', { mass: true }),
  sorvete: N('m'),
  iogurte: N('m'),
  chocolate: N('m', { mass: true }),
  comida: N('f', { mass: true }),

  /* ------------------------------------------------------------ pessoas */
  mãe: N('f', { animate: true, pluralForm: 'mães' }),
  pai: N('m', { animate: true }),
  irmão: N('m', { animate: true, pluralForm: 'irmãos' }),
  irmã: N('f', { animate: true, pluralForm: 'irmãs' }),
  avó: N('f', { animate: true }),
  avô: N('m', { animate: true }),
  amigo: N('m', { animate: true }),
  professor: N('m', { animate: true, pluralForm: 'professores' }),
  médico: N('m', { animate: true }),
  família: N('f', { animate: true }),
  bebê: N('m', { animate: true }),
  menino: N('m', { animate: true }),
  menina: N('f', { animate: true }),

  /* -------------------------------------------------------------- corpo */
  cabeça: N('f', { bodyPart: true }),
  barriga: N('f', { bodyPart: true }),
  mão: N('f', { bodyPart: true, pluralForm: 'mãos' }),
  pé: N('m', { bodyPart: true }),
  olho: N('m', { bodyPart: true }),
  ouvido: N('m', { bodyPart: true }),
  boca: N('f', { bodyPart: true }),
  nariz: N('m', { bodyPart: true, pluralForm: 'narizes' }),
  dente: N('m', { bodyPart: true }),
  braço: N('m', { bodyPart: true }),
  perna: N('f', { bodyPart: true }),
  costas: N('f', { bodyPart: true, plural: true }),
  garganta: N('f', { bodyPart: true }),
  cabelo: N('m', { bodyPart: true }),

  /* ------------------------------------------------------------ lugares */
  casa: N('f', { place: true, bareAfterPrep: true }),
  escola: N('f', { place: true }),
  quarto: N('m', { place: true }),
  cozinha: N('f', { place: true }),
  parque: N('m', { place: true }),
  rua: N('f', { place: true }),
  loja: N('f', { place: true }),
  hospital: N('m', { place: true, pluralForm: 'hospitais' }),
  carro: N('m', { place: true }),
  ônibus: N('m', { place: true, pluralForm: 'ônibus' }),
  praia: N('f', { place: true }),
  cama: N('f', { place: true }),
  mesa: N('f', { place: true }),
  porta: N('f'),

  /* -------------------------------------------------------------- acoes */
  correr: V(),
  pular: V(),
  sentar: V(),
  levantar: V(),
  andar: V(),
  escrever: V(),
  ler: V(),
  desenhar: V(),
  pintar: V(),
  colorir: V(),
  recortar: V(),
  colar: V(),
  montar: V(),
  construir: V(),
  cozinhar: V(),
  passear: V(),
  nadar: V(),
  descansar: V(),
  conversar: V({ prep: 'com' }),
  cantar: V(),
  dançar: V(),
  lavar: V(),
  vestir: V(),
  'escovar os dentes': V(),
  'tomar banho': V(),
  ouvir: V(),
  falar: V(),

  /* --------------------------------------------------------- qualidades */
  grande: ADJ(),
  pequeno: ADJ('m'),
  quente: ADJ(),
  frio: ADJ('m'),
  sujo: ADJ('m'),
  limpo: ADJ('m'),
  rápido: ADJ('m'),
  devagar: { class: 'adverb' },
  bonito: ADJ('m'),
  muito: { class: 'quantifier' },
  pouco: { class: 'quantifier' },
  novo: ADJ('m'),
  velho: ADJ('m'),

  /* -------------------------------------------------------------- tempo */
  hoje: { class: 'adverb' },
  amanhã: { class: 'adverb' },
  ontem: { class: 'adverb' },
  manhã: N('f'),
  tarde: N('f'),
  noite: N('f'),
  dia: N('m'),
  semana: N('f'),
  mês: N('m', { pluralForm: 'meses' }),
  ano: N('m'),
  antes: { class: 'adverb' },

  /* ---------------------------------------------- fora das pranchas fixas

     Palavras que nao estao em nenhuma prancha mas chegam com frequencia pela
     busca na ARASAAC. Sem registro aqui elas caem no `guess()`, que por
     seguranca nao conjuga nem artigula — anotar as mais comuns e barato. */
  ver: V(),
  saber: V({ modal: true }),
  poder: V({ modal: true }),
  ter: V(),
  ser: V(),
  estar: V(),
  ficar: V(),
  chorar: V(),
  jogar: V(),
  assistir: V(),
  estudar: V(),
  trabalhar: V(),
  viajar: V(),
  comprar: V(),
  procurar: V(),
  precisar: V({ prep: 'de', modal: true }),
  chamar: V(),
  mostrar: V(),
  guardar: V(),
  doer: V(),
  bola: N('f'),
  livro: N('m'),
  brinquedo: N('m'),
  celular: N('m', { pluralForm: 'celulares', device: true }),
  música: N('f'),
  televisão: N('f', { pluralForm: 'televisões', device: true }),
  remédio: N('m'),
  roupa: N('f'),
  sapato: N('m'),
  festa: N('f'),
  aniversário: N('m'),

  /* ------------------------------------------- tratamento e adjuntos

     "Mamae" e "papai" nao sao diminutivos decorativos: sao como a maioria das
     criancas de fato chama, e o rotulo do card e a palavra que a pessoa vai
     dizer. */
  mamãe: N('f', { animate: true, pluralForm: 'mamães' }),
  papai: N('m', { animate: true }),
  vovó: N('f', { animate: true }),
  vovô: N('m', { animate: true }),
  titia: N('f', { animate: true }),
  titio: N('m', { animate: true }),

  computador: N('m', { device: true, pluralForm: 'computadores' }),
  tablet: N('m', { device: true }),
  videogame: N('m', { device: true }),
  desenho: N('m'),
  parquinho: N('m', { place: true }),

  /* Locucoes adverbiais de duracao e de parte do dia. Entram inteiras porque
     "o dia todo" nao e artigo + substantivo + adjetivo: e um adjunto unico, e
     tratar peca por peca produzia "o dia todo" com artigo duplicado. */
  'o dia todo': { class: 'adverb' },
  'a tarde toda': { class: 'adverb' },
  'a manhã toda': { class: 'adverb' },
  'a noite toda': { class: 'adverb' },
  'de manhã': { class: 'adverb' },
  'de tarde': { class: 'adverb' },
  'de noite': { class: 'adverb' },
  'mais tarde': { class: 'adverb' },
  'depois do almoço': { class: 'adverb' },
  'todo dia': { class: 'adverb' },
  'de novo': { class: 'adverb' },
  junto: { class: 'adverb' },

  /* ------------------------------------------------------------- social */
  oi: { class: 'social' },
  tchau: { class: 'social' },
  'por favor': { class: 'social' },
  obrigado: { class: 'social' },
  desculpa: { class: 'social' },
}

/**
 * Adverbios de tempo que empurram o tempo verbal da frase inteira. E o mesmo
 * mecanismo de um marcador de tempo Bliss, so que disparado pelo proprio
 * vocabulario: quem escolhe ONTEM ja disse que a frase e passada.
 */
export const TIME_ADVERBS: Record<string, Tense> = {
  ontem: 'past',
  antes: 'past',
  amanhã: 'future',
  depois: 'future',
  hoje: 'present',
  agora: 'present',
}

/* ---------------------------------------------------------------- fallback */

const VERB_SUFFIX = /(ar|er|ir|ôr|or)$/
const FEM_SUFFIX = /(a|ã|ade|agem|ção|são)$/

/**
 * Palavra fora do lexico — veio da busca na ARASAAC. Adivinha o minimo pela
 * terminacao, e o motor de frases trata "unknown" de forma conservadora: nao
 * conjuga o que nao tem certeza de ser verbo, nao inventa artigo onde o genero
 * e chute de baixa confianca.
 */
export function guess(label: string): Lexeme & { guessed: true } {
  const word = label.trim().toLowerCase()
  const head = word.split(' ')[0] ?? word

  if (VERB_SUFFIX.test(head) && head.length >= 3) {
    return { class: 'verb', guessed: true }
  }
  return {
    class: 'noun',
    gender: FEM_SUFFIX.test(head) ? 'f' : 'm',
    guessed: true,
  }
}

export function lookup(label: string): Lexeme & { guessed?: boolean } {
  const key = label.trim().toLowerCase()
  return LEXICON[key] ?? guess(key)
}

/** Classe de uma palavra — usada tambem pela codificacao de cor das celulas. */
export function wordClassOf(label: string): WordClass {
  return lookup(label).class
}
