/**
 * Regionalismos do portugues brasileiro.
 *
 * POR QUE ISTO IMPORTA NUMA PRANCHA DE CAA
 *
 * O rotulo de um card nao e legenda: e a palavra que a pessoa vai dizer, e que
 * ela ouve os outros dizerem em casa. Uma crianca do Recife que aponta o
 * pictograma da mandioca e ouve o aparelho falar "mandioca" recebe um modelo de
 * lingua que nao e o da familia dela — e, pior, aprende que o jeito dela de
 * falar nao esta no aparelho. Nenhuma variedade e mais correta que outra; o
 * padrao de um app nacional acaba sendo o Sudeste por inercia, e isso e uma
 * escolha, nao um fato.
 *
 * ESCOPO
 *
 * Duas camadas independentes:
 *
 * 1. **Lexical** — a palavra muda: macaxeira / aipim / mandioca.
 * 2. **Pronominal e verbal** — tu, voce e "a gente", com a conjugacao que cada
 *    um pede. Esta e a camada que o motor de frases (`grammar.ts`) consome.
 *
 * O QUE NAO E FEITO AQUI
 *
 * Nao ha tentativa de reproduzir sotaque, prosodia ou fonologia: isso e da voz
 * do sistema, e o navegador expoe pouquissimo controle. Tambem nao ha
 * regionalismo de sintaxe complexa — "tu foi" vs "tu foste" e tratado, mas
 * ordem de clitico e concordancia variavel nao.
 */

export type Region = 'padrao' | 'sudeste' | 'sul' | 'nordeste' | 'norte' | 'centro-oeste'

/**
 * Registro. `coloquial` e o padrao porque uma prancha serve primeiro a conversa
 * do dia a dia; `normativo` existe para contexto escolar, onde a pessoa pode
 * precisar da forma que a professora espera.
 */
export type Register = 'coloquial' | 'normativo'

export interface RegionInfo {
  id: Region
  name: string
  /** Como a 2a pessoa e chamada nesta variedade. */
  you: 'você' | 'tu'
  hint: string
}

export const REGIONS: RegionInfo[] = [
  {
    id: 'padrao',
    name: 'Sem regionalismo',
    you: 'você',
    hint: 'Português brasileiro geral, como está nas pranchas de fábrica.',
  },
  {
    id: 'sudeste',
    name: 'Sudeste',
    you: 'você',
    hint: 'SP, RJ, MG, ES. Mandioca, biscoito/bolacha, mexerica, você.',
  },
  {
    id: 'sul',
    name: 'Sul',
    you: 'tu',
    hint: 'RS, SC, PR. Aipim, bolacha, bergamota, guri, cacetinho e tu.',
  },
  {
    id: 'nordeste',
    name: 'Nordeste',
    you: 'tu',
    hint: 'Macaxeira, biscoito, jerimum, mainha/painho, tu.',
  },
  {
    id: 'norte',
    name: 'Norte',
    you: 'tu',
    hint: 'Macaxeira, jerimum, tu.',
  },
  {
    id: 'centro-oeste',
    name: 'Centro-Oeste',
    you: 'você',
    hint: 'Mandioca, bolacha, você.',
  },
]

type Variants = Partial<Record<Region, string>>

/**
 * Tabela de variantes. A chave e a forma que aparece nas pranchas de fabrica;
 * o valor e a forma daquela regiao. Ausencia significa "usa a forma da chave".
 *
 * Inclui palavras que nao estao nas pranchas fixas de proposito: o usuario pode
 * trazer qualquer pictograma pela busca, e "macaxeira" precisa funcionar quando
 * ele traz a mandioca.
 */
export const REGIONAL_WORDS: Record<string, Variants> = {
  /* ------------------------------------------------------------- comida */
  mandioca: { nordeste: 'macaxeira', norte: 'macaxeira', sul: 'aipim' },
  biscoito: { sul: 'bolacha', sudeste: 'bolacha', 'centro-oeste': 'bolacha' },
  bolacha: { nordeste: 'biscoito', norte: 'biscoito' },
  mexerica: { sul: 'bergamota', nordeste: 'tangerina', norte: 'tangerina' },
  tangerina: { sudeste: 'mexerica', sul: 'bergamota' },
  abóbora: { nordeste: 'jerimum', norte: 'jerimum' },
  suco: { nordeste: 'suco' },
  'pão francês': { sul: 'cacetinho', nordeste: 'pão de sal' },
  sanduíche: { sudeste: 'sanduíche', nordeste: 'misto' },
  bala: { sul: 'bala' },
  'saco plástico': { sudeste: 'sacola', sul: 'bolsa' },

  /* ----------------------------------------------------------- pronomes

     O card VOCÊ passa a mostrar e falar "tu" nas variedades que usam tu. A
     conjugacao que "tu" leva depende do registro, e quem decide isso e o motor
     de frases — ver `tuUsesThirdPerson`. */
  você: { sul: 'tu', nordeste: 'tu', norte: 'tu' },

  /* ------------------------------------------------------------ pessoas */
  menino: { sul: 'guri' },
  menina: { sul: 'guria' },
  mãe: { nordeste: 'mainha' },
  pai: { nordeste: 'painho' },
  criança: { sul: 'guri' },

  /* ------------------------------------------------------- coisas e lugares */
  semáforo: { sudeste: 'farol', sul: 'sinaleira', nordeste: 'sinal' },
  chinelo: { nordeste: 'havaianas' },
  pipa: { sudeste: 'pipa', nordeste: 'papagaio', sul: 'pandorga' },
  'fila de espera': { sudeste: 'fila' },

  /* -------------------------------------------------------------- corpo */
  // Nao ha variacao regional relevante aqui — deixado explicito para quem
  // vier ampliar a tabela nao procurar em vao.
}

/**
 * Rotulo de um card na variedade escolhida.
 *
 * Preserva a caixa da primeira letra: os rotulos das pranchas sao minusculos,
 * mas frases prontas comecam com maiuscula.
 */
export function regionalLabel(label: string, region: Region): string {
  if (region === 'padrao') return label
  const key = label.trim().toLowerCase()
  const variant = REGIONAL_WORDS[key]?.[region]
  if (!variant) return label
  const isCapitalized = label.charAt(0) === label.charAt(0).toUpperCase()
  return isCapitalized ? variant.charAt(0).toUpperCase() + variant.slice(1) : variant
}

/** A palavra da 2a pessoa nesta variedade — o rotulo do card VOCÊ muda junto. */
export function secondPerson(region: Region): 'você' | 'tu' {
  return REGIONS.find((r) => r.id === region)?.you ?? 'você'
}

/**
 * Conjugacao de `tu`.
 *
 * No Brasil falado, `tu` quase sempre leva o verbo na forma de 3a pessoa —
 * "tu quer", "tu foi". A forma normativa ("tu queres", "tu foste") sobrevive
 * em parte do Sul e no registro escrito. O app segue o registro escolhido, e
 * nunca corrige a pessoa: as duas existem.
 */
export function tuUsesThirdPerson(register: Register): boolean {
  return register === 'coloquial'
}
