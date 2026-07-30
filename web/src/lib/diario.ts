/**
 * Diário de prática — pontos do dia, semana e sequência.
 *
 * A LINHA QUE ESTE ARQUIVO NÃO CRUZA
 *
 * Comunicação não pontua. Nunca. Dizer "preciso de ajuda" não vale ponto,
 * salvar uma frase não vale ponto, montar uma frase grande não vale ponto —
 * porque no instante em que valer, a pessoa passa a dizer coisas para pontuar
 * em vez de para dizer, e o aparelho deixa de ser voz para virar tarefa. É a
 * crítica mais consistente da literatura de CAA à gamificação, e ela vale.
 *
 * O que pontua é **prática**: o jogo de achar a palavra e o ensaio de roteiro.
 * Os dois são exercício declarado, com começo e fim, e nenhum deles é falar
 * com alguém. Treinar localização e ensaiar uma sequência são atividades onde
 * repetir é o próprio objetivo — ali um placar ajuda em vez de atrapalhar.
 *
 * DUAS REGRAS DE DESENHO
 *
 * 1. **Nada é perdido.** Não há ponto negativo, não há decaimento, e a
 *    sequência de dias tem UM dia de tolerância: quem esquece uma terça não
 *    volta à estaca zero na quarta. Sistema de streak que zera transforma
 *    esquecer em fracasso, e o público deste app já convive com isso demais.
 * 2. **A meta é baixa e alcançável.** Dez pontos: uma rodada do jogo, ou um
 *    ensaio, ou meia dúzia de acertos. Meta que exige sessão longa exclui quem
 *    tem pouca tolerância a tela — que é parte de quem usa isto.
 */

/** Um dia, no formato `AAAA-MM-DD` em hora LOCAL — nunca UTC. */
export type Dia = string

export interface Diario {
  /** Pontos por dia. Só dias com prática aparecem. */
  dias: Record<Dia, number>
}

export const DIARIO_VAZIO: Diario = { dias: {} }

/** Meta do dia. Baixa de propósito — ver a regra 2 no topo. */
export const META_DIARIA = 10

/**
 * Quanto vale cada coisa.
 *
 * Ensaio inteiro vale mais que rodada de jogo porque custa mais: sete passos
 * ditos do começo ao fim contra cinco toques. E o acerto avulso vale 1 para
 * que a barra ande DURANTE a atividade — barra que só se mexe no fim não dá
 * retorno a quem não termina.
 */
export const PONTOS = {
  acerto: 1,
  rodada: 3,
  ensaio: 5,
} as const

export type Motivo = keyof typeof PONTOS

/** Hoje em hora local. `toISOString` usaria UTC e viraria o dia cedo demais. */
export function hoje(agora: Date = new Date()): Dia {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`
}

/** O dia `n` dias antes de `de`. */
export function diaAntes(de: Dia, n: number): Dia {
  const [a, m, d] = de.split('-').map(Number)
  const data = new Date(a ?? 2000, (m ?? 1) - 1, (d ?? 1) - n)
  return hoje(data)
}

export function pontosDe(diario: Diario, dia: Dia): number {
  const n = diario.dias[dia]
  return typeof n === 'number' && n > 0 ? Math.floor(n) : 0
}

export function registrar(diario: Diario, motivo: Motivo, dia: Dia = hoje()): Diario {
  return { dias: { ...diario.dias, [dia]: pontosDe(diario, dia) + PONTOS[motivo] } }
}

export function total(diario: Diario): number {
  return Object.keys(diario.dias).reduce((s, d) => s + pontosDe(diario, d), 0)
}

/** Quantos dias diferentes tiveram prática. */
export function diasPraticados(diario: Diario): number {
  return Object.keys(diario.dias).filter((d) => pontosDe(diario, d) > 0).length
}

/**
 * Sequência de dias praticando, com UM dia de tolerância.
 *
 * Conta para trás a partir de hoje (ou de ontem, se hoje ainda não teve
 * prática — o dia não acabou, e zerar a sequência às 9 da manhã seria
 * absurdo). Um buraco de um dia não quebra; dois buracos seguidos, sim.
 */
export function sequencia(diario: Diario, ref: Dia = hoje()): number {
  const tem = (d: Dia) => pontosDe(diario, d) > 0
  // Se hoje ainda não praticou, a sequência é a de ontem — ela só está em
  // aberto, não perdida.
  let cursor = tem(ref) ? ref : diaAntes(ref, 1)
  let conta = 0
  let falhasSeguidas = 0
  // Teto de 400 iterações: o histórico é local e finito, mas um laço sem teto
  // num dado corrompido travaria a tela.
  for (let i = 0; i < 400; i++) {
    if (tem(cursor)) {
      conta++
      falhasSeguidas = 0
    } else {
      falhasSeguidas++
      if (falhasSeguidas > 1) break
    }
    cursor = diaAntes(cursor, 1)
  }
  return conta
}

/** Os últimos 7 dias, do mais antigo para hoje — para o gráfico da semana. */
export function semana(diario: Diario, ref: Dia = hoje()): { dia: Dia; pontos: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dia = diaAntes(ref, 6 - i)
    return { dia, pontos: pontosDe(diario, dia) }
  })
}

/** Inicial do dia da semana, para o eixo do gráfico. */
export function letraDoDia(dia: Dia): string {
  const [a, m, d] = dia.split('-').map(Number)
  return ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][new Date(a ?? 2000, (m ?? 1) - 1, d ?? 1).getDay()] ?? '?'
}

export interface Nivel {
  de: number
  nome: string
  icone: string
}

/**
 * Níveis por total acumulado. As faixas crescem devagar no começo — a primeira
 * chega no mesmo dia em que se começa, e é ali que a pessoa decide se volta.
 */
export const NIVEIS: Nivel[] = [
  { de: 0, nome: 'Começando', icone: '🌱' },
  { de: 30, nome: 'Pegando o jeito', icone: '🌿' },
  { de: 100, nome: 'Firme', icone: '⭐' },
  { de: 250, nome: 'Craque', icone: '🏅' },
  { de: 500, nome: 'Mestre', icone: '🏆' },
]

export function nivelDe(pontos: number): Nivel {
  let atual = NIVEIS[0]!
  for (const n of NIVEIS) if (pontos >= n.de) atual = n
  return atual
}

export function proximoNivel(pontos: number): { nivel: Nivel; faltam: number } | null {
  const prox = NIVEIS.find((n) => pontos < n.de)
  return prox ? { nivel: prox, faltam: prox.de - pontos } : null
}

/** Frase do dia, conforme o quanto já se praticou hoje. Nunca cobra. */
export function recado(pontosHoje: number, seq: number): string {
  if (pontosHoje === 0 && seq > 0) return `Você praticou ${seq} ${seq === 1 ? 'dia' : 'dias'} seguidos. Hoje ainda dá.`
  if (pontosHoje === 0) return 'Um jogo ou um ensaio já conta.'
  if (pontosHoje < META_DIARIA) return 'Já começou. Falta pouco para a meta de hoje.'
  if (pontosHoje < META_DIARIA * 2) return 'Meta de hoje batida.'
  return 'Muito além da meta de hoje.'
}
