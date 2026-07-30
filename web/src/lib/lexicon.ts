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

// Camada 2 do `lookup`. So o VALOR e importado daqui; o tipo `Lexeme` viaja no
// sentido contrario e some no build, entao nao ha ciclo em tempo de execucao.
import { lexicoGerado } from './lexicoGerado'

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
   * Preposicao solta, escolhida pela pessoa: DE, EM, COM, PARA, SEM. Existe
   * porque o motor insere preposicao sozinho — e as vezes a pessoa quer outra,
   * ou quer uma onde o motor nao poria nenhuma.
   */
  | 'preposition'
  /**
   * Artigo e demonstrativo soltos: O, A, UM, ESSE. O motor decide artigo por
   * conta propria; quando a pessoa escolhe um, a escolha dela vence.
   */
  | 'article'
  /** AH, OI, NOSSA, EI — abre a fala e chama alguem. */
  | 'interjection'

/**
 * Pessoa gramatical.
 *
 * `2s` e "voce", que flexiona como 3a pessoa em pt-BR. `2t` e o "tu" normativo
 * ("tu queres", "tu foste"), usado quando a pessoa escolhe uma variedade com tu
 * E o registro normativo — no coloquial brasileiro, "tu" leva o verbo na forma
 * de 3a pessoa e cai em `2s`. Ver `regional.ts`.
 */
export type Person = '1s' | '2s' | '2t' | '3s' | '1p' | '3p'

/**
 * `past` e o preterito PERFEITO ("eu comi"): evento acabado.
 * `imperfect` e o IMPERFEITO ("eu comia"): habito, rotina, cenario — e a forma
 * de narrar o dia e de pedir com cortesia ("eu queria água"), que e como se
 * pede em portugues falado sem soar ríspido.
 */
export type Tense = 'present' | 'past' | 'imperfect' | 'future'

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
   * Preposicao exigida antes de um INFINITIVO complemento, que nao e a mesma
   * exigida antes de substantivo: "terminei DE comer" mas "terminei a tarefa".
   * Usar `prep` para os dois casos produzia "terminei de tarefa".
   */
  prepInf?: string
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
  /** Possessivo que vem DEPOIS do substantivo: "o carro dele". */
  postposed?: boolean
  /** Plural irregular, quando o rotulo for pluralizado por um marcador. */
  pluralForm?: string
  /**
   * SUBSTANTIVO que rege infinitivo por preposicao: "medo DE cair",
   * "vontade DE ir", "pressa DE sair".
   *
   * Existe porque o motor usava `mass` para isto — e `mass` quer dizer
   * INCONTAVEL, nao "substantivo de estado". Os dois conjuntos se cruzam em
   * medo, fome e sede, o que fez a regra parecer certa por um tempo; mas suco,
   * leite, arroz e carne tambem sao incontaveis, e produziam
   * "quero suco DE QUERER leite". Sao coisas diferentes e agora tem marcas
   * diferentes.
   */
  nounPrepInf?: string
  /**
   * ADJETIVO cujo rotulo esta na forma FEMININA de um par biforme:
   * "preguiçosa" (de preguiçoso), "amarela", "cansada".
   *
   * O acervo nomeia muitos pictogramas assim, e o card imprime o rotulo que
   * tem. Sem esta marca o motor so sabia ir de masculino para feminino, e
   * `BEIJO · PREGUIÇOSA` saia "O beijo está preguiçosa".
   *
   * Nao se deduz da terminacao: ha adjetivo invariavel em -a ("otimista",
   * "hipócrita"), e converter esses daria "otimisto".
   */
  femininoBase?: boolean
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
  pedir: {
    present: { '1s': 'peço', '2s': 'pede', '2t': 'pedes', '3s': 'pede', '1p': 'pedimos', '3p': 'pedem' },
  },
  sair: {
    present: { '1s': 'saio', '2s': 'sai', '2t': 'sais', '3s': 'sai', '1p': 'saímos', '3p': 'saem' },
    past: { '1s': 'saí', '2s': 'saiu', '2t': 'saíste', '3s': 'saiu', '1p': 'saímos', '3p': 'saíram' },
  },
  cair: {
    present: { '1s': 'caio', '2s': 'cai', '2t': 'cais', '3s': 'cai', '1p': 'caímos', '3p': 'caem' },
    past: { '1s': 'caí', '2s': 'caiu', '2t': 'caíste', '3s': 'caiu', '1p': 'caímos', '3p': 'caíram' },
  },
  subir: {
    present: { '1s': 'subo', '2s': 'sobe', '2t': 'sobes', '3s': 'sobe', '1p': 'subimos', '3p': 'sobem' },
  },
  dizer: {
    present: { '1s': 'digo', '2s': 'diz', '2t': 'dizes', '3s': 'diz', '1p': 'dizemos', '3p': 'dizem' },
    past: { '1s': 'disse', '2s': 'disse', '2t': 'disseste', '3s': 'disse', '1p': 'dissemos', '3p': 'disseram' },
  },
  trazer: {
    present: { '1s': 'trago', '2s': 'traz', '2t': 'trazes', '3s': 'traz', '1p': 'trazemos', '3p': 'trazem' },
    past: { '1s': 'trouxe', '2s': 'trouxe', '2t': 'trouxeste', '3s': 'trouxe', '1p': 'trouxemos', '3p': 'trouxeram' },
  },
  perder: {
    present: { '1s': 'perco', '2s': 'perde', '2t': 'perdes', '3s': 'perde', '1p': 'perdemos', '3p': 'perdem' },
  },
  // Grafia da 1a do preterito, mesmo caso de `pegar`/`jogar`.
  tocar: { past: { '1s': 'toquei' } },
  abraçar: { past: { '1s': 'abracei' } },
  almoçar: { past: { '1s': 'almocei' } },
  explicar: { past: { '1s': 'expliquei' } },
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
/**
 * O imperfeito e o tempo mais regular do portugues: so QUATRO verbos fogem da
 * regra (-ava / -ia). Por isso ele entra barato, e por isso vale a pena — e a
 * forma de contar rotina, que e metade da conversa em casa.
 */
export const IMPERFECT_IRREGULAR: Record<string, Record<Person, string>> = {
  ser: { '1s': 'era', '2s': 'era', '2t': 'eras', '3s': 'era', '1p': 'éramos', '3p': 'eram' },
  ter: { '1s': 'tinha', '2s': 'tinha', '2t': 'tinhas', '3s': 'tinha', '1p': 'tínhamos', '3p': 'tinham' },
  vir: { '1s': 'vinha', '2s': 'vinha', '2t': 'vinhas', '3s': 'vinha', '1p': 'vínhamos', '3p': 'vinham' },
  pôr: { '1s': 'punha', '2s': 'punha', '2t': 'punhas', '3s': 'punha', '1p': 'púnhamos', '3p': 'punham' },
}

/** Imperfeito de TER, para estado passado: "eu tinha medo", "eu tinha fome". */
export const TER_IMPERFECT: Record<Person, string> = {
  '1s': 'tinha',
  '2s': 'tinha',
  '2t': 'tinhas',
  '3s': 'tinha',
  '1p': 'tínhamos',
  '3p': 'tinham',
}

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
  pedir: 'peça',
  sair: 'saia',
  cair: 'caia',
  subir: 'suba',
  dizer: 'diga',
  trazer: 'traga',
  perder: 'perca',
  tocar: 'toque',
  abraçar: 'abrace',
  almoçar: 'almoce',
  explicar: 'explique',
  pegar: 'pegue',
  brincar: 'brinque',
  ficar: 'fique',
  jogar: 'jogue',
  chegar: 'chegue',
  dançar: 'dance',
  começar: 'comece',
}

/**
 * FUTURO DO SUBJUNTIVO — o tempo que "quando" e "se" exigem.
 *
 * "Quando o papai CHEGAR", "se voce QUISER", "quando eu FOR". E uma forma que
 * o portugues usa o tempo todo e que quase nenhuma outra lingua tem, entao ela
 * passa despercebida — mas sem ela sai "quando o papai chega eu brinco", que
 * troca uma condicao futura por um habito.
 *
 * Barato de implementar: nos verbos REGULARES a forma e identica ao
 * infinitivo. So os irregulares precisam de tabela — e sao estes.
 */
export const FUTURE_SUBJUNCTIVE: Record<string, Record<Person, string>> = {
  ser: { '1s': 'for', '2s': 'for', '2t': 'fores', '3s': 'for', '1p': 'formos', '3p': 'forem' },
  ir: { '1s': 'for', '2s': 'for', '2t': 'fores', '3s': 'for', '1p': 'formos', '3p': 'forem' },
  estar: {
    '1s': 'estiver', '2s': 'estiver', '2t': 'estiveres', '3s': 'estiver',
    '1p': 'estivermos', '3p': 'estiverem',
  },
  ter: {
    '1s': 'tiver', '2s': 'tiver', '2t': 'tiveres', '3s': 'tiver',
    '1p': 'tivermos', '3p': 'tiverem',
  },
  vir: {
    '1s': 'vier', '2s': 'vier', '2t': 'vieres', '3s': 'vier',
    '1p': 'viermos', '3p': 'vierem',
  },
  ver: { '1s': 'vir', '2s': 'vir', '2t': 'vires', '3s': 'vir', '1p': 'virmos', '3p': 'virem' },
  fazer: {
    '1s': 'fizer', '2s': 'fizer', '2t': 'fizeres', '3s': 'fizer',
    '1p': 'fizermos', '3p': 'fizerem',
  },
  poder: {
    '1s': 'puder', '2s': 'puder', '2t': 'puderes', '3s': 'puder',
    '1p': 'pudermos', '3p': 'puderem',
  },
  querer: {
    '1s': 'quiser', '2s': 'quiser', '2t': 'quiseres', '3s': 'quiser',
    '1p': 'quisermos', '3p': 'quiserem',
  },
  saber: {
    '1s': 'souber', '2s': 'souber', '2t': 'souberes', '3s': 'souber',
    '1p': 'soubermos', '3p': 'souberem',
  },
  dizer: {
    '1s': 'disser', '2s': 'disser', '2t': 'disseres', '3s': 'disser',
    '1p': 'dissermos', '3p': 'disserem',
  },
  trazer: {
    '1s': 'trouxer', '2s': 'trouxer', '2t': 'trouxeres', '3s': 'trouxer',
    '1p': 'trouxermos', '3p': 'trouxerem',
  },
  dar: { '1s': 'der', '2s': 'der', '2t': 'deres', '3s': 'der', '1p': 'dermos', '3p': 'derem' },
  pôr: {
    '1s': 'puser', '2s': 'puser', '2t': 'puseres', '3s': 'puser',
    '1p': 'pusermos', '3p': 'puserem',
  },
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
  /**
   * `vocês` faltava, e a falta era cara.
   *
   * Fora do lexico ele era adivinhado como SUBSTANTIVO masculino (termina em
   * consoante), e a partir dai a frase desmontava inteira:
   *
   *     MÃE · PAI · VOCÊS · NÃO · QUERER · BRINCAR
   *     -> "A mãe e o pai não é e vocês querer brincar."
   *
   * O motor via tres substantivos em lista, inseria copula, e o verbo nunca
   * era conjugado porque nao havia sujeito reconhecivel. Um pronome de
   * tratamento no plural e das primeiras coisas que alguem diz numa prancha —
   * falar com duas pessoas ao mesmo tempo e a situacao da mesa de jantar.
   *
   * `3p` e nao `2p`: em portugues brasileiro "vocês" concorda na 3a do plural
   * ("vocês querem"), como "eles".
   */
  vocês: { class: 'pronoun', person: '3p' },

  meu: { class: 'determiner', gender: 'm' },
  minha: { class: 'determiner', gender: 'f' },

  /**
   * DETERMINANTES QUE ESTAVAM SENDO ADIVINHADOS COMO SUBSTANTIVO.
   *
   * `todo`, `outro`, `mesmo` e `cada` terminam como substantivo masculino
   * comum, e a adivinhação os classificava assim. Dois substantivos seguidos
   * viram lista — a regra certa para `PÃO · LEITE` —, e por isso saía **"Todo e
   * dia"**, "Outro e copo", "Todo e hora".
   *
   * São palavras do dia a dia numa prancha: "todo dia", "outro copo", "toda
   * hora" são pedidos e rotinas, não vocabulário raro. O conserto é lexical
   * porque o defeito é lexical — a estrutura estava certa a respeito de dois
   * substantivos; o que estava errado era chamá-los de substantivo.
   */
  todo: { class: 'determiner', gender: 'm' },
  toda: { class: 'determiner', gender: 'f' },
  outro: { class: 'determiner', gender: 'm' },
  outra: { class: 'determiner', gender: 'f' },
  mesmo: { class: 'determiner', gender: 'm' },
  mesma: { class: 'determiner', gender: 'f' },
  cada: { class: 'determiner' },

  /**
   * Pronomes indefinidos, pela mesma razão: `ninguém` e `alguém` terminam em
   * consoante e caíam em substantivo masculino. Como sujeito eles levam o verbo
   * à 3ª do singular, que é o que a classe `pronoun` com `person` garante.
   */
  // `tudo` e `nada` já existem abaixo como quantificadores, de propósito: eles
  // também quantificam ("nada de bolo"), e a entrada de lá é anterior a esta.
  ninguém: { class: 'pronoun', person: '3s' },
  alguém: { class: 'pronoun', person: '3s' },

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
  terminar: V({ prepInf: 'de', modal: true }),

  /* -------------------------------------------------------- sentimentos */
  feliz: ADJ(),
  triste: ADJ(),
  bravo: ADJ('m'),
  medo: N('m', { mass: true, nounPrepInf: 'de' }),
  cansado: ADJ('m'),
  animado: ADJ('m'),
  calmo: ADJ('m'),
  nervoso: ADJ('m'),
  entediado: ADJ('m'),
  envergonhado: ADJ('m'),
  sozinho: ADJ('m'),
  doente: ADJ(),
  fome: N('f', { mass: true, nounPrepInf: 'de' }),
  sede: N('f', { mass: true, nounPrepInf: 'de' }),
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
  sentar: V({ prep: 'em' }),
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
  passear: V({ prep: 'em' }),
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
  falar: V({ prep: 'com' }),

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
  açúcar: N('m', { mass: true }),

  /* ------------------------------- alta frequencia na fala com os pais

     Sem entrada aqui, estas palavras caem no `guess()`, que nao conjuga verbo
     nem sabe genero de substantivo — e sao justamente as que mais aparecem
     numa terca-feira comum em casa. */
  elas: { class: 'pronoun', person: '3p' },
  /* Demonstrativos-pronome. Estao na lista de Banajee (2003) citada em
     REFERENCES.md como nucleo, e faltavam: "quero isso" e "isso e meu" sao
     das frases mais frequentes de quem aponta antes de nomear. */
  isso: { class: 'pronoun', person: '3s' },
  aquilo: { class: 'pronoun', person: '3s' },
  /* "dele"/"dela" sao os unicos possessivos POSPOSTOS: "o carro dele", nunca
     "dele carro". Sem a marca, o motor os tratava como "meu" e produzia a
     ordem errada. */
  dele: { class: 'determiner', gender: 'm', postposed: true },
  dela: { class: 'determiner', gender: 'f', postposed: true },
  deles: { class: 'determiner', gender: 'm', postposed: true, plural: true },
  delas: { class: 'determiner', gender: 'f', postposed: true, plural: true },

  cachorro: N('m', { animate: true }),
  cachorra: N('f', { animate: true }),
  gato: N('m', { animate: true }),
  gata: N('f', { animate: true }),
  tia: N('f', { animate: true }),
  tio: N('m', { animate: true }),
  amiga: N('f', { animate: true }),
  professora: N('f', { animate: true }),
  filho: N('m', { animate: true }),
  filha: N('f', { animate: true }),
  criança: N('f', { animate: true }),

  colo: N('m', { mass: true }),
  sono: N('m', { mass: true }),
  xixi: N('m', { mass: true }),
  cocô: N('m', { mass: true }),
  ajuda: N('f', { mass: true }),
  raiva: N('f', { mass: true }),
  vontade: N('f', { mass: true, nounPrepInf: 'de' }),
  saudade: N('f', { mass: true, nounPrepInf: 'de' }),
  febre: N('f', { mass: true }),
  barulho: N('m', { mass: true }),

  abraço: N('m'),
  beijo: N('m'),
  copo: N('m'),
  colher: N('f', { pluralForm: 'colheres' }),
  chupeta: N('f'),
  mamadeira: N('f'),
  bicicleta: N('f'),
  cadeira: N('f'),
  banho: N('m'),
  pipoca: N('f'),
  batata: N('f'),

  // Estes tem forma irregular em IRREGULAR_VERBS, mas sem entrada AQUI o
  // `lookup` cai no `guess()`, que marca "adivinhado" — e o motor,
  // corretamente, nao conjuga o que so foi adivinhado. A tabela de irregulares
  // ficava inalcancavel.
  pedir: V(),
  sair: V(),
  cair: V(),
  subir: V(),
  dizer: V(),
  trazer: V(),
  perder: V(),
  tocar: V(),
  abraçar: V(),
  almoçar: V(),
  explicar: V(),

  acordar: V(),
  entrar: V({ prep: 'em' }),
  sentir: V(),
  tirar: V(),
  colocar: V({ prep: 'em' }),
  trocar: V(),
  levar: V(),
  machucar: V(),
  ganhar: V(),
  emprestar: V(),
  deixar: V({ modal: true }),
  tentar: V({ modal: true }),
  começar: V({ prepInf: 'a', modal: true }),
  acabar: V({ prepInf: 'de', modal: true }),
  sal: N('m', { mass: true }),
  lugar: N('m', { place: true, pluralForm: 'lugares' }),
  mar: N('m', { place: true }),
  ar: N('m', { mass: true }),
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

  /* ------------------------------------------------- palavras de ligacao

     Prancha "Ligacao". Sao as palavras que o motor de frases normalmente
     insere sozinho — e por isso mesmo precisam existir como card: quando a
     pessoa escolhe uma, a escolha dela vence a do motor. Ver GRAMMAR.md. */
  e: { class: 'connector' },
  ou: { class: 'connector' },
  mas: { class: 'connector' },
  porque: { class: 'connector' },
  então: { class: 'connector' },
  aí: { class: 'connector' },
  'e aí': { class: 'connector' },
  que: { class: 'connector' },
  se: { class: 'connector' },
  senão: { class: 'connector' },
  'por isso': { class: 'connector' },

  de: { class: 'preposition' },
  em: { class: 'preposition' },
  com: { class: 'preposition' },
  para: { class: 'preposition' },
  sem: { class: 'preposition' },
  até: { class: 'preposition' },

  o: { class: 'article', gender: 'm' },
  a: { class: 'article', gender: 'f' },
  os: { class: 'article', gender: 'm', plural: true },
  as: { class: 'article', gender: 'f', plural: true },
  um: { class: 'article', gender: 'm' },
  uma: { class: 'article', gender: 'f' },
  esse: { class: 'article', gender: 'm' },
  essa: { class: 'article', gender: 'f' },
  aquele: { class: 'article', gender: 'm' },
  aquela: { class: 'article', gender: 'f' },
  seu: { class: 'determiner', gender: 'm' },
  sua: { class: 'determiner', gender: 'f' },
  nosso: { class: 'determiner', gender: 'm' },
  nossa: { class: 'determiner', gender: 'f' },

  ah: { class: 'interjection' },
  oh: { class: 'interjection' },
  ei: { class: 'interjection' },
  opa: { class: 'interjection' },
  oba: { class: 'interjection' },
  eca: { class: 'interjection' },
  ui: { class: 'interjection' },
  uau: { class: 'interjection' },
  sério: { class: 'interjection' },
  claro: { class: 'interjection' },
  'que legal': { class: 'interjection' },

  /* ------------------------------------------------- prancha "Comentar"

     Comentar e o ato comunicativo que a literatura de CAA mais aponta como
     negligenciado: ha centenas de estudos sobre ensinar a PEDIR e catorze, no
     mundo inteiro, sobre ensinar a COMENTAR (Spencer, Tonsing & Dada, 2025).
     E comentar e o que sustenta proximidade social — pedir sozinho faz do
     aparelho um controle remoto. Ver REFERENCES.md secao 12. */
  gostei: { class: 'interjection' },
  'não gostei': { class: 'interjection' },
  olha: { class: 'interjection' },
  'eu também': { class: 'interjection' },
  'não sei': { class: 'interjection' },
  talvez: { class: 'adverb' },
  entendi: { class: 'interjection' },
  'por quê': { class: 'question' },
  'e você': { class: 'question' },
  'quero mais': { class: 'interjection' },
  chega: { class: 'interjection' },
  machucou: { class: 'verb', fixed: true },
  legal: ADJ(),
  feio: ADJ('m'),
  chato: ADJ('m'),
  igual: ADJ(),

  só: { class: 'adverb' },
  já: { class: 'adverb' },
  ainda: { class: 'adverb' },
  também: { class: 'adverb' },
  sempre: { class: 'adverb' },
  /*
   * `nunca` era `negation`, e o motor trata negacao como PARTICULA: ele nao
   * emite o card e insere "não" antes do verbo. Resultado: quem tocava NUNCA
   * ouvia "não" — a palavra escolhida sumia e outra entrava no lugar. "Nunca"
   * ja e negativo por si, e vai na posicao em que foi tocado.
   */
  nunca: { class: 'adverb' },
  jamais: { class: 'adverb' },
  tudo: { class: 'quantifier' },
  /* Numerais. Sao quantificadores que forcam o plural do que vem depois —
     "dois bolos", nao "dois bolo" — e dispensam artigo. Criança pede
     quantidade o tempo todo, e sem eles saia "quero dois e bolo". */
  dois: { class: 'quantifier', plural: true },
  duas: { class: 'quantifier', plural: true },
  três: { class: 'quantifier', plural: true },
  quatro: { class: 'quantifier', plural: true },
  cinco: { class: 'quantifier', plural: true },
  seis: { class: 'quantifier', plural: true },
  sete: { class: 'quantifier', plural: true },
  oito: { class: 'quantifier', plural: true },
  nove: { class: 'quantifier', plural: true },
  dez: { class: 'quantifier', plural: true },
  vários: { class: 'quantifier', plural: true },
  poucos: { class: 'quantifier', plural: true },
  muitos: { class: 'quantifier', plural: true },
  nada: { class: 'quantifier' },

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

/*
 * `or` NAO entra aqui. Entrava, e o efeito era: "amor", "flor", "cor", "calor",
 * "sabor", "valor", "motor", "doutor" — todos adivinhados como VERBO pela
 * terminacao. O card AMOR virava "eu amo". So `ôr` e necessario, para `pôr`.
 */
const VERB_SUFFIX = /(ar|er|ir|ôr)$/
/**
 * Acento agudo ou circunflexo no corpo da palavra denuncia paroxitona — e
 * infinitivo em portugues e SEMPRE oxitono, sem acento no radical.
 *
 * Sem esta checagem "açúcar", "câncer", "éter" e "mártir" eram adivinhados como
 * verbos por terminarem em -ar/-er/-ir, e o motor os tratava como acao. O caso
 * apareceu num pedido banal: "suco sem açúcar".
 */
const PAROXITONA_ACENTUADA = /[áéíóúâêôàãõ]/
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

  /**
   * Algarismo é numeral, não substantivo.
   *
   * "dois" estava no léxico e "2" não, então `EU · QUERER · 9 · PÃO` saía como
   * "Eu quero 9 **e** pão" — o motor lia o algarismo como mais uma coisa da
   * lista. É um defeito que só aparece desde que o painel de Números existe, e
   * é justamente lá que a criança vai buscar o número.
   *
   * `plural` a partir de 2 é o que faz "9 pães" sair certo, igual a "dois pães".
   */
  if (/^\d+$/.test(head)) {
    return { class: 'quantifier', plural: Number(head) !== 1, guessed: true }
  }

  if (VERB_SUFFIX.test(head) && head.length >= 3 && !PAROXITONA_ACENTUADA.test(head.slice(0, -2))) {
    return { class: 'verb', guessed: true }
  }
  return {
    class: 'noun',
    gender: FEM_SUFFIX.test(head) ? 'f' : 'm',
    guessed: true,
  }
}

/**
 * A palavra, com tudo que se sabe dela.
 *
 * Três camadas, nesta ordem:
 *
 *   1. **`LEXICON`** — revisado à mão, 250 palavras. Sempre vence: uma pessoa
 *      olhou cada entrada, e nenhuma inferência tem autoridade sobre isso.
 *   2. **léxico gerado** — inferido do acervo ARASAAC, milhares de palavras,
 *      só o que passou no corte de confiança medido. Ver `lexicoGerado.ts`.
 *   3. **`guess()`** — adivinhação por terminação, para o que não está em
 *      lugar nenhum. Marcado como `guessed`, e o motor de frases trata
 *      `guessed` de forma conservadora (não arrisca artigo, não conjuga chute).
 *
 * A camada 2 pode não existir — o arquivo é carregado depois da abertura e
 * pode falhar. Quando falta, isto aqui se comporta exatamente como antes dela.
 */
export function lookup(label: string): Lexeme & { guessed?: boolean } {
  const key = label.trim().toLowerCase()
  return LEXICON[key] ?? lexicoGerado(key) ?? guess(key)
}

/** Classe de uma palavra — usada tambem pela codificacao de cor das celulas. */
export function wordClassOf(label: string): WordClass {
  return lookup(label).class
}
