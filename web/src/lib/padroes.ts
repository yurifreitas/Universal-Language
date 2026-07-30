/**
 * Padrões visuais.
 *
 * O QUE ISTO É — E O QUE NÃO É
 *
 * Não é teste de inteligência. Não dá QI, não dá percentil, não compara com
 * norma nenhuma e não devolve nota. Se devolvesse, seria pior que inútil: a
 * história da avaliação de pessoas não-falantes é uma sequência de laudos que
 * confundiram **falta de fala** com falta de pensamento, e o custo disso foi
 * gente inteligente tratada a vida inteira como incapaz. Um app de CAA não
 * pode repetir isso com uma tela colorida.
 *
 * O que isto é: um lugar onde **pensar aparece sem depender de falar**. As
 * quatro atividades abaixo se resolvem apontando — nenhuma exige linguagem,
 * nenhuma exige leitura, nenhuma tem tempo. É a mesma lógica das provas
 * não-verbais usadas justamente para não subestimar quem não fala, com a
 * diferença de que aqui o resultado não classifica ninguém: ele mostra **por
 * onde a pessoa entra**.
 *
 * O QUE O APP DEVOLVE
 *
 * Uma leitura de PREFERÊNCIA, não de capacidade: "você resolve mais rápido as
 * de cor", "as de sequência saem sozinhas". Isso serve a quem ensina — dá pista
 * de qual caminho usar para apresentar coisa nova — e não serve para dizer
 * quanto alguém vale. A diferença está escrita na tela, não só aqui.
 *
 * AS QUATRO ATIVIDADES
 *
 *  - `sequencia`  o que vem depois — regularidade no tempo/espaço
 *  - `intruso`    qual não pertence — abstração de categoria
 *  - `analogia`   A está para B como C está para… — relação entre relações
 *  - `agrupar`    o que combina com este — classificação livre
 *
 * DESENHO EM VEZ DE PICTOGRAMA
 *
 * Formas geométricas em cor e tamanho controlados, e não os pictogramas do
 * resto do app. Um pictograma carrega significado ("cachorro"), e significado
 * atravessa o exercício: a pessoa acerta pelo que a figura QUER DIZER, não pelo
 * padrão. Aqui o desenho não pode significar nada.
 */

export type Forma = 'circulo' | 'quadrado' | 'triangulo' | 'losango'
export type Cor = 'a' | 'b' | 'c'
export type Tamanho = 1 | 2 | 3

export interface Figura {
  forma: Forma
  cor: Cor
  tamanho: Tamanho
  /** Vazia = só contorno. A quarta dimensão, para quem não distingue cor. */
  vazia?: boolean
}

export type Tipo = 'sequencia' | 'intruso' | 'analogia' | 'agrupar'

export const TIPOS: { id: Tipo; nome: string; sobre: string }[] = [
  { id: 'sequencia', nome: 'O que vem depois', sobre: 'Regularidade — o padrão continua.' },
  { id: 'intruso', nome: 'Qual não pertence', sobre: 'Categoria — o que os outros têm em comum.' },
  { id: 'analogia', nome: 'Está para', sobre: 'Relação entre relações.' },
  { id: 'agrupar', nome: 'O que combina', sobre: 'Classificação — juntar pelo que se parece.' },
]

export interface Desafio {
  tipo: Tipo
  /** A pergunta, em uma frase curta e sem jargão. */
  enunciado: string
  /** O que se mostra antes da pergunta. Vazio no `intruso`. */
  mostra: Figura[]
  /** As alternativas. */
  opcoes: Figura[]
  /** Índice da resposta esperada dentro de `opcoes`. */
  certa: number
  /** Por que essa é a resposta — mostrado DEPOIS, sempre, acerte ou não. */
  porque: string
}

const FORMAS: Forma[] = ['circulo', 'quadrado', 'triangulo', 'losango']
const CORES: Cor[] = ['a', 'b', 'c']

const pega = <T,>(lista: T[], r: () => number): T =>
  lista[Math.min(lista.length - 1, Math.floor(r() * lista.length))]!

/** Embaralha devolvendo também onde foi parar o item de índice 0. */
function embaralhar<T>(itens: T[], r: () => number): { itens: T[]; certa: number } {
  const marcado = itens[0]
  const copia = [...itens]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j]!, copia[i]!]
  }
  return { itens: copia, certa: copia.indexOf(marcado as T) }
}

/**
 * Sequência: ABAB, AABB ou tamanho crescente.
 *
 * Três regras diferentes de propósito — uma pessoa pode enxergar a alternância
 * e não enxergar o crescimento, e o contrário também. Uma regra só mediria uma
 * coisa só e chamaria isso de "padrões".
 */
function sequencia(r: () => number): Desafio {
  const regra = Math.floor(r() * 3)
  const f1 = pega(FORMAS, r)
  const f2 = pega(
    FORMAS.filter((f) => f !== f1),
    r,
  )
  const c1 = pega(CORES, r)
  const c2 = pega(
    CORES.filter((c) => c !== c1),
    r,
  )

  let mostra: Figura[]
  let resposta: Figura
  let porque: string

  if (regra === 0) {
    mostra = [
      { forma: f1, cor: c1, tamanho: 2 },
      { forma: f2, cor: c2, tamanho: 2 },
      { forma: f1, cor: c1, tamanho: 2 },
      { forma: f2, cor: c2, tamanho: 2 },
    ]
    resposta = { forma: f1, cor: c1, tamanho: 2 }
    porque = 'A fila alterna de duas em duas: depois da segunda, volta a primeira.'
  } else if (regra === 1) {
    mostra = [
      { forma: f1, cor: c1, tamanho: 2 },
      { forma: f1, cor: c1, tamanho: 2 },
      { forma: f2, cor: c2, tamanho: 2 },
      { forma: f2, cor: c2, tamanho: 2 },
    ]
    resposta = { forma: f1, cor: c1, tamanho: 2 }
    porque = 'São pares: duas iguais, duas diferentes, e recomeça.'
  } else {
    mostra = [
      { forma: f1, cor: c1, tamanho: 1 },
      { forma: f1, cor: c1, tamanho: 2 },
      { forma: f1, cor: c1, tamanho: 3 },
      { forma: f1, cor: c1, tamanho: 1 },
    ]
    resposta = { forma: f1, cor: c1, tamanho: 2 }
    porque = 'O tamanho cresce de um em um e volta ao menor.'
  }

  const erradas: Figura[] = [
    { ...resposta, forma: f2 },
    { ...resposta, cor: c2 },
    { ...resposta, tamanho: resposta.tamanho === 3 ? 1 : ((resposta.tamanho + 1) as Tamanho) },
  ]
  const { itens, certa } = embaralhar([resposta, ...erradas], r)
  return { tipo: 'sequencia', enunciado: 'Qual vem depois?', mostra, opcoes: itens, certa, porque }
}

/** Intruso: três compartilham uma propriedade, um não. */
function intruso(r: () => number): Desafio {
  const eixo = Math.floor(r() * 3)
  const forma = pega(FORMAS, r)
  const cor = pega(CORES, r)
  const outraForma = pega(
    FORMAS.filter((f) => f !== forma),
    r,
  )
  const outraCor = pega(
    CORES.filter((c) => c !== cor),
    r,
  )

  const base: Figura = { forma, cor, tamanho: 2 }
  let fora: Figura
  let porque: string
  if (eixo === 0) {
    fora = { ...base, forma: outraForma }
    porque = `Três têm a mesma forma; essa não.`
  } else if (eixo === 1) {
    fora = { ...base, cor: outraCor }
    porque = 'Três têm a mesma cor; essa não.'
  } else {
    fora = { ...base, tamanho: 3 }
    porque = 'Três têm o mesmo tamanho; essa é maior.'
  }

  const { itens, certa } = embaralhar([fora, base, base, base], r)
  return {
    tipo: 'intruso',
    enunciado: 'Qual não combina com as outras?',
    mostra: [],
    opcoes: itens,
    certa,
    porque,
  }
}

/** Analogia: A→B assim como C→? — a relação é sempre uma transformação só. */
function analogia(r: () => number): Desafio {
  const qual = Math.floor(r() * 2)
  const f1 = pega(FORMAS, r)
  const f2 = pega(
    FORMAS.filter((f) => f !== f1),
    r,
  )
  const c1 = pega(CORES, r)
  const c2 = pega(
    CORES.filter((c) => c !== c1),
    r,
  )

  // A transformação é sempre UMA: ou muda a cor, ou muda o tamanho. Duas
  // mudanças ao mesmo tempo transformam o exercício em adivinhação.
  const a: Figura = { forma: f1, cor: c1, tamanho: 2 }
  const b: Figura = qual === 0 ? { ...a, cor: c2 } : { ...a, tamanho: 3 }
  const c: Figura = { forma: f2, cor: c1, tamanho: 2 }
  const resposta: Figura = qual === 0 ? { ...c, cor: c2 } : { ...c, tamanho: 3 }
  const porque =
    qual === 0
      ? 'Do primeiro para o segundo mudou só a cor. Aqui muda a cor também.'
      : 'Do primeiro para o segundo mudou só o tamanho. Aqui cresce igual.'

  const erradas: Figura[] = [
    { ...c },
    { ...resposta, forma: f1 },
    qual === 0 ? { ...c, tamanho: 3 } : { ...c, cor: c2 },
  ]
  const { itens, certa } = embaralhar([resposta, ...erradas], r)
  return {
    tipo: 'analogia',
    enunciado: 'O primeiro virou o segundo. O terceiro vira qual?',
    mostra: [a, b, c],
    opcoes: itens,
    certa,
    porque,
  }
}

/** Agrupar: qual das opções combina com a figura mostrada. */
function agrupar(r: () => number): Desafio {
  const forma = pega(FORMAS, r)
  const cor = pega(CORES, r)
  const outraForma = pega(
    FORMAS.filter((f) => f !== forma),
    r,
  )
  const outraCor = pega(
    CORES.filter((c) => c !== cor),
    r,
  )
  const alvo: Figura = { forma, cor, tamanho: 2 }
  const resposta: Figura = { forma, cor, tamanho: 3 }
  const erradas: Figura[] = [
    { forma: outraForma, cor, tamanho: 2 },
    { forma, cor: outraCor, tamanho: 2 },
    { forma: outraForma, cor: outraCor, tamanho: 3 },
  ]
  const { itens, certa } = embaralhar([resposta, ...erradas], r)
  return {
    tipo: 'agrupar',
    enunciado: 'Qual combina com esta?',
    mostra: [alvo],
    opcoes: itens,
    certa,
    porque: 'Mesma forma e mesma cor — o tamanho pode mudar.',
  }
}

/**
 * Monta um desafio do tipo pedido.
 *
 * Recebe o sorteador por parâmetro, como todo o resto do app: função que chama
 * `Math.random` sozinha não pode ser testada, e aqui um erro silencioso —
 * sortear sempre a mesma regra, pôr a resposta certa sempre na mesma posição —
 * passaria despercebido por muito tempo.
 */
export function montar(tipo: Tipo, r: () => number = Math.random): Desafio {
  if (tipo === 'sequencia') return sequencia(r)
  if (tipo === 'intruso') return intruso(r)
  if (tipo === 'analogia') return analogia(r)
  return agrupar(r)
}

/** Um tipo qualquer, para o modo "misturado". */
export function sortearTipo(r: () => number = Math.random): Tipo {
  return TIPOS[Math.min(TIPOS.length - 1, Math.floor(r() * TIPOS.length))]!.id
}

export type Perfil = Record<Tipo, { feitos: number; deprimeira: number }>

export const PERFIL_VAZIO: Perfil = {
  sequencia: { feitos: 0, deprimeira: 0 },
  intruso: { feitos: 0, deprimeira: 0 },
  analogia: { feitos: 0, deprimeira: 0 },
  agrupar: { feitos: 0, deprimeira: 0 },
}

export function anotar(perfil: Perfil, tipo: Tipo, deprimeira: boolean): Perfil {
  const atual = perfil[tipo] ?? { feitos: 0, deprimeira: 0 }
  return {
    ...perfil,
    [tipo]: {
      feitos: atual.feitos + 1,
      deprimeira: atual.deprimeira + (deprimeira ? 1 : 0),
    },
  }
}

/**
 * A leitura do perfil.
 *
 * Fala de CAMINHO, nunca de capacidade — "por aqui você entra rápido", e não
 * "você é bom nisto". A frase existe para quem ensina escolher por onde
 * apresentar coisa nova, e é escrita para não poder ser lida como nota.
 */
export function leituraDoPerfil(perfil: Perfil): string | null {
  const comDados = TIPOS.filter((t) => (perfil[t.id]?.feitos ?? 0) >= 3)
  if (comDados.length === 0) return null
  const taxa = (t: Tipo) => {
    const p = perfil[t]
    return p && p.feitos > 0 ? p.deprimeira / p.feitos : 0
  }
  const melhor = [...comDados].sort((a, b) => taxa(b.id) - taxa(a.id))[0]!
  return `Por enquanto, as de "${melhor.nome.toLowerCase()}" são as que saem mais direto. Isso é uma pista de por onde apresentar coisa nova — não é nota, e não mede ninguém.`
}
