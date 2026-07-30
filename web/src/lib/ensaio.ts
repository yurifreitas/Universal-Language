/**
 * Ensaio de roteiro — e os selos.
 *
 * POR QUE ISTO EXISTE
 *
 * Um roteiro social so serve se for ENSAIADO antes. Ler a lista de passos na
 * hora da consulta e tarde: a leitura compete com a situacao. O ensaio e o uso
 * previsto do recurso, e ate agora o app nao tinha tela para ele — tinha uma
 * lista, que e material de consulta, nao de pratica.
 *
 * O QUE ESTE MODULO NAO FAZ — e por que
 *
 * Ha uma diferenca grande entre **marcar progresso** e **gamificar**. A
 * literatura de CAA e explicita quanto ao risco: transformar comunicacao em
 * jogo com placar cria pressao de desempenho justamente em quem ja convive com
 * ela, e desloca o motivo de falar de "eu quero dizer isso" para "eu quero
 * pontuar". Entao aqui:
 *
 *   - nao ha erro. Nao existe resposta errada num ensaio de fala.
 *   - nao ha cronometro. Pressa e o oposto do que um roteiro resolve.
 *   - nao ha nota, ranking nem comparacao com ninguem.
 *   - nada trava nem exige: sair do ensaio no meio nao perde nada, e o passo
 *     pode ser pulado sem consequencia.
 *
 * O que ha e o que serve a quem pratica: **contagem de vezes que o roteiro
 * inteiro foi ensaiado** e um selo por faixa. Selo e reconhecimento de esforco
 * acumulado — nao mede acerto, so presenca. Um dia de treino nunca faz o selo
 * regredir.
 */

export type ScriptStats = Record<string, number>

export interface Selo {
  /** Numero de ensaios a partir do qual o selo vale. */
  de: number
  nome: string
  icone: string
  /** O que ele diz a quem pratica, em uma linha. */
  hint: string
}

/**
 * As faixas. Comecam em UM: a primeira passagem inteira por um roteiro ja e a
 * conquista que mais custa, e um sistema que so reconhece a partir da quinta
 * vez deixa de fora justamente quem mais precisa de retorno.
 */
export const SELOS: Selo[] = [
  { de: 1, nome: 'Primeira vez', icone: '🌱', hint: 'Você foi do começo ao fim uma vez.' },
  { de: 3, nome: 'Já conhece', icone: '⭐', hint: 'Três ensaios inteiros deste roteiro.' },
  { de: 5, nome: 'Sabe de cor', icone: '🏅', hint: 'Cinco ensaios. A ordem já é sua.' },
  { de: 10, nome: 'É seu', icone: '🏆', hint: 'Dez ensaios inteiros. Este roteiro é seu.' },
]

/** Quantas vezes este roteiro foi ensaiado do começo ao fim. */
export function vezes(stats: ScriptStats, id: string): number {
  const n = stats[id]
  return typeof n === 'number' && n > 0 ? Math.floor(n) : 0
}

/** O selo atual, ou `null` antes do primeiro ensaio completo. */
export function seloDe(n: number): Selo | null {
  let atual: Selo | null = null
  for (const s of SELOS) if (n >= s.de) atual = s
  return atual
}

/** O proximo selo e quanto falta — `null` quando ja se chegou no ultimo. */
export function proximoSelo(n: number): { selo: Selo; faltam: number } | null {
  const prox = SELOS.find((s) => n < s.de)
  return prox ? { selo: prox, faltam: prox.de - n } : null
}

/**
 * Registra um ensaio completo.
 *
 * So conta quando a pessoa chegou ao fim: metade de um roteiro nao e um ensaio
 * do roteiro. Mas parar no meio tambem nao TIRA nada — a contagem so sobe.
 */
export function registrarEnsaio(stats: ScriptStats, id: string): ScriptStats {
  if (!id) return stats
  return { ...stats, [id]: vezes(stats, id) + 1 }
}

/**
 * Elogio de fim de ensaio.
 *
 * Varia com a contagem para nao virar ruido — a mesma frase toda vez deixa de
 * ser dita para quem ouve, e passa a ser so o som do fim. Nunca compara com
 * outra pessoa e nunca fala de rapidez.
 */
export function fecho(n: number): string {
  if (n <= 1) return 'Você foi até o fim. Da primeira vez é o mais difícil.'
  if (n < 3) return 'De novo, inteiro. Está ficando conhecido.'
  if (n < 5) return 'Mais um ensaio inteiro. Você já sabe a ordem.'
  if (n < 10) return 'Sai quase sozinho agora.'
  return 'Este roteiro é seu.'
}
