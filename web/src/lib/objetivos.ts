import { diaAntes, hoje, type Dia } from './diario'

/**
 * Objetivos individuais e planejamento.
 *
 * POR QUE ISTO EXISTE
 *
 * Ninguém usa uma prancha de CAA sozinho no começo: há um fonoaudiólogo, um
 * professor de apoio, uma família. O trabalho deles é organizado por objetivo —
 * "pedir sem puxar pela mão", "usar duas palavras juntas", "responder sim e
 * não" — e revisado a cada semana ou mês. Até agora esse plano vivia fora do
 * app, num caderno, e a pessoa que usava o aparelho não tinha acesso a ele.
 *
 * Trazer para dentro muda duas coisas: o objetivo fica **visível para quem o
 * vive**, e o registro para de depender de memória no fim do dia.
 *
 * O QUE ESTE MÓDULO NÃO FAZ
 *
 * Não avalia, não dá nota e não classifica ninguém. Um registro é "aconteceu
 * hoje" — não "fez certo". A diferença importa: o primeiro conta oportunidades,
 * o segundo julga desempenho, e desempenho é justamente o que não se deve medir
 * em comunicação. Objetivo sem registro nenhum não vira alerta vermelho: vira
 * um objetivo que talvez tenha sido ambicioso demais, e a tela sugere revisar,
 * não cobrar.
 */

export type Area = 'comunicacao' | 'autonomia' | 'escola' | 'social' | 'motor' | 'outro'

export const AREAS: { id: Area; nome: string; icone: string }[] = [
  { id: 'comunicacao', nome: 'Comunicação', icone: '💬' },
  { id: 'autonomia', nome: 'Autonomia', icone: '🧭' },
  { id: 'escola', nome: 'Escola', icone: '🏫' },
  { id: 'social', nome: 'Convivência', icone: '🤝' },
  { id: 'motor', nome: 'Acesso e motor', icone: '✋' },
  { id: 'outro', nome: 'Outro', icone: '◆' },
]

export interface Objetivo {
  id: string
  titulo: string
  area: Area
  /** Quantas vezes por semana se espera que aconteça. 0 = sem meta numérica. */
  alvoSemanal: number
  /** Como reconhecer que aconteceu — o critério, em uma frase. */
  criterio: string
  /** Observações de quem acompanha. */
  notas: string
  /** Dias em que houve registro, e quantas vezes em cada. */
  registros: Record<Dia, number>
  /** Objetivo concluído sai da lista ativa sem ser apagado. */
  arquivado?: boolean
  /** Data em que foi criado, para a revisão saber a idade dele. */
  desde: Dia
}

/**
 * Modelos prontos.
 *
 * Não são "o plano certo" — plano é clínico e individual. São o começo de
 * conversa para quem abre a tela em branco e não sabe o que escrever, e todos
 * saem de objetivos correntes em intervenção de CAA.
 */
export const MODELOS: { titulo: string; area: Area; criterio: string; alvoSemanal: number }[] = [
  {
    titulo: 'Pedir usando a prancha em vez de puxar pela mão',
    area: 'comunicacao',
    criterio: 'Tocou o card do que queria antes de puxar alguém.',
    alvoSemanal: 10,
  },
  {
    titulo: 'Juntar duas palavras numa frase',
    area: 'comunicacao',
    criterio: 'Montou "eu quero", "mais bolo" — duas células na mesma fala.',
    alvoSemanal: 7,
  },
  {
    titulo: 'Responder sim e não',
    area: 'comunicacao',
    criterio: 'Respondeu a uma pergunta fechada pela prancha.',
    alvoSemanal: 14,
  },
  {
    titulo: 'Dizer que quer parar ou sair',
    area: 'autonomia',
    criterio: 'Usou "acabou", "chega" ou "preciso sair" antes da crise.',
    alvoSemanal: 5,
  },
  {
    titulo: 'Pedir ajuda ao professor',
    area: 'escola',
    criterio: 'Chamou por conta própria, sem alguém oferecer antes.',
    alvoSemanal: 5,
  },
  {
    titulo: 'Cumprimentar quem chega',
    area: 'social',
    criterio: 'Disse oi para alguém que entrou na sala.',
    alvoSemanal: 7,
  },
  {
    titulo: 'Comentar sobre algo que aconteceu',
    area: 'social',
    criterio: 'Falou de algo que não era pedido — contou, não pediu.',
    alvoSemanal: 3,
  },
  {
    titulo: 'Achar a palavra na prancha sem ajuda',
    area: 'motor',
    criterio: 'Localizou a célula sem que alguém apontasse.',
    alvoSemanal: 10,
  },
]

export function objetivoId(titulo: string, existentes: Objetivo[]): string {
  const slug =
    titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'objetivo'
  if (!existentes.some((o) => o.id === slug)) return slug
  let n = 2
  while (existentes.some((o) => o.id === `${slug}-${n}`)) n++
  return `${slug}-${n}`
}

export function criar(
  titulo: string,
  area: Area,
  criterio: string,
  alvoSemanal: number,
  existentes: Objetivo[],
): Objetivo {
  return {
    id: objetivoId(titulo, existentes),
    titulo: titulo.trim(),
    area,
    criterio: criterio.trim(),
    alvoSemanal: Math.max(0, Math.floor(alvoSemanal)),
    notas: '',
    registros: {},
    desde: hoje(),
  }
}

/** Um registro a mais hoje. Nunca é "acertou" — é "aconteceu". */
export function registrar(o: Objetivo, dia: Dia = hoje()): Objetivo {
  return { ...o, registros: { ...o.registros, [dia]: (o.registros[dia] ?? 0) + 1 } }
}

/** Desfaz o último registro do dia — toque errado acontece. */
export function desregistrar(o: Objetivo, dia: Dia = hoje()): Objetivo {
  const atual = o.registros[dia] ?? 0
  if (atual <= 0) return o
  const registros = { ...o.registros }
  if (atual === 1) delete registros[dia]
  else registros[dia] = atual - 1
  return { ...o, registros }
}

export function naSemana(o: Objetivo, ref: Dia = hoje()): number {
  let soma = 0
  for (let i = 0; i < 7; i++) soma += o.registros[diaAntes(ref, i)] ?? 0
  return soma
}

export function totalRegistros(o: Objetivo): number {
  return Object.values(o.registros).reduce((s, n) => s + n, 0)
}

/** Os 7 dias da semana corrente, do mais antigo para hoje. */
export function semanaDe(o: Objetivo, ref: Dia = hoje()): { dia: Dia; n: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dia = diaAntes(ref, 6 - i)
    return { dia, n: o.registros[dia] ?? 0 }
  })
}

/**
 * Leitura da semana, em uma frase.
 *
 * Nenhuma delas cobra e nenhuma diz "falhou". Quando não houve registro, a
 * sugestão é **revisar o objetivo** — porque a explicação mais provável para
 * uma semana vazia é que a meta não coube na rotina, e não que a pessoa não se
 * esforçou.
 */
export function leitura(o: Objetivo, ref: Dia = hoje()): string {
  const n = naSemana(o, ref)
  if (o.alvoSemanal === 0) return n === 0 ? 'Sem registro esta semana.' : `${n} esta semana.`
  if (n === 0) return 'Nada registrado esta semana — vale rever se a meta cabe na rotina.'
  if (n >= o.alvoSemanal) return `Meta da semana alcançada: ${n} de ${o.alvoSemanal}.`
  if (n >= o.alvoSemanal / 2) return `${n} de ${o.alvoSemanal} — passou da metade.`
  return `${n} de ${o.alvoSemanal} esta semana.`
}
