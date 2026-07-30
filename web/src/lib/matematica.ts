import type { Card } from '../types'

/**
 * Números, contas, dinheiro, horas e símbolos.
 *
 * POR QUE ISTO EXISTE NUMA PRANCHA DE CAA
 *
 * Falta de fala não é falta de matemática, mas uma prancha sem número trata as
 * duas como a mesma coisa. Sem esta área, uma criança não consegue responder
 * "quantos anos você tem?", dizer que quer **dois** pães, escolher a nota certa
 * no troco, nem dizer que a aula é às três. Isso a exclui da escola e do
 * comércio — dois lugares onde ela precisa de autonomia.
 *
 * DUAS DECISÕES
 *
 * 1. **Algarismo, e não desenho.** Todo o resto do app usa pictograma; aqui,
 *    não. "7" desenhado de sete jeitos diferentes atrapalha mais do que o
 *    algarismo, que é exatamente o símbolo que a pessoa vai encontrar na porta
 *    da sala, na etiqueta de preço e no relógio. Ver `Card.texto`.
 * 2. **Tudo entra na frase.** Número não é uma calculadora separada: tocar em
 *    "3" põe "3" na barra da frase como qualquer outro card, e ele pode ser
 *    dito sozinho ou dentro de "eu quero 3 pão". A calculadora existe à parte,
 *    para quando a conta é o assunto.
 */

/** Célula de texto — algarismo, sinal, símbolo. */
export function celula(label: string, fala?: string): Card & { fala?: string } {
  return { id: 0, label, texto: true, ...(fala ? { fala } : {}) }
}

export const DIGITOS: Card[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) =>
  celula(d),
)

/** Dezenas cheias e cem: dizer "trinta" sem montar 3 e 0. */
export const DEZENAS: Card[] = [
  '10',
  '20',
  '30',
  '40',
  '50',
  '60',
  '70',
  '80',
  '90',
  '100',
].map((d) => celula(d))

/**
 * Quantidades faladas em palavra, e não em algarismo.
 *
 * "Quero DOIS pães" é a forma que sai da boca; "quero 2 pães" é a forma que se
 * escreve. Quem ainda não lê usa esta linha, quem já lê usa a de cima — e as
 * duas dizem a mesma coisa em voz alta.
 */
export const QUANTIDADES: Card[] = [
  'nenhum',
  'um',
  'dois',
  'três',
  'muitos',
  'poucos',
  'metade',
  'todos',
].map((q) => celula(q))

export interface Operador {
  sinal: string
  nome: string
  aplica: (a: number, b: number) => number
}

export const OPERADORES: Operador[] = [
  { sinal: '+', nome: 'mais', aplica: (a, b) => a + b },
  { sinal: '−', nome: 'menos', aplica: (a, b) => a - b },
  { sinal: '×', nome: 'vezes', aplica: (a, b) => a * b },
  // Divisão por zero devolve `NaN` de propósito: a tela mostra "não dá", que é
  // a resposta honesta, em vez de "Infinity" — que não significa nada para
  // quem está aprendendo.
  { sinal: '÷', nome: 'dividido por', aplica: (a, b) => (b === 0 ? NaN : a / b) },
]

/** Comparação — a outra metade da matemática de todo dia. */
export const COMPARACOES: Card[] = [
  celula('=', 'igual'),
  celula('>', 'maior que'),
  celula('<', 'menor que'),
  celula('≠', 'diferente de'),
]

/**
 * Símbolos e pontuação. Não são enfeite: "?" muda uma frase inteira de
 * sentido, e quem escreve num aplicativo de mensagem precisa deles.
 */
export const SIMBOLOS: (Card & { fala?: string })[] = [
  celula('?', 'interrogação'),
  celula('!', 'exclamação'),
  celula('.', 'ponto'),
  celula(',', 'vírgula'),
  celula('%', 'por cento'),
  celula('½', 'meio'),
  celula('¼', 'um quarto'),
  celula('R$', 'reais'),
  celula('°C', 'graus'),
  celula('#', 'número'),
  celula('+', 'mais'),
  celula('−', 'menos'),
]

/** Cédulas e moedas do real, com o valor em centavos para somar sem erro. */
export interface Dinheiro {
  label: string
  centavos: number
  moeda: boolean
}

export const DINHEIRO: Dinheiro[] = [
  { label: '5¢', centavos: 5, moeda: true },
  { label: '10¢', centavos: 10, moeda: true },
  { label: '25¢', centavos: 25, moeda: true },
  { label: '50¢', centavos: 50, moeda: true },
  { label: 'R$ 1', centavos: 100, moeda: true },
  { label: 'R$ 2', centavos: 200, moeda: false },
  { label: 'R$ 5', centavos: 500, moeda: false },
  { label: 'R$ 10', centavos: 1000, moeda: false },
  { label: 'R$ 20', centavos: 2000, moeda: false },
  { label: 'R$ 50', centavos: 5000, moeda: false },
  { label: 'R$ 100', centavos: 10000, moeda: false },
]

/** Centavos → "R$ 12,50", e a forma falada por extenso. */
export function reais(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`
}

export function reaisFalado(centavos: number): string {
  const r = Math.floor(centavos / 100)
  const c = centavos % 100
  const parteReais = r === 1 ? 'um real' : `${r} reais`
  if (c === 0) return parteReais
  const parteCentavos = c === 1 ? 'um centavo' : `${c} centavos`
  return r === 0 ? parteCentavos : `${parteReais} e ${parteCentavos}`
}

/**
 * A hora dita como se fala, não como se lê num relógio digital.
 *
 * "Três e meia" e não "três e trinta"; "quinze para as quatro" e não "três e
 * quarenta e cinco". Quem combina um horário ouve a primeira forma.
 */
export function horaFalada(hora: number, minuto: number): string {
  const h = ((hora - 1 + 12) % 12) + 1
  const nome = h === 1 ? 'uma hora' : `${h} horas`
  if (minuto === 0) return nome
  if (minuto === 30) return `${h === 1 ? 'uma' : h} e meia`
  if (minuto === 15) return `${h === 1 ? 'uma' : h} e quinze`
  if (minuto === 45) {
    const prox = (h % 12) + 1
    return `quinze para as ${prox === 1 ? 'uma' : prox}`
  }
  return `${h === 1 ? 'uma' : h} e ${minuto}`
}

/** O relógio como se escreve, para o card entrar na frase. */
export function horaEscrita(hora: number, minuto: number): string {
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`
}

/** Resultado formatado: inteiro sem casas, quebrado com duas, erro como texto. */
export function resultado(n: number): string {
  if (!Number.isFinite(n)) return 'não dá'
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2).replace('.', ',')
}

/* =========================================================================
   MÓDULO AVANÇADO

   Fica atrás de um ajuste, desligado por padrão. Uma prancha de comunicação
   tem de abrir e funcionar para quem só precisa pedir água — cada aba a mais
   é um custo cobrado dessa pessoa para servir a outra. Quem precisa de mais,
   liga.
   ========================================================================= */

export interface Fracao {
  cima: number
  baixo: number
  nome: string
}

/** As frações que aparecem na vida: pizza, bolo, copo, tempo. */
export const FRACOES: Fracao[] = [
  { cima: 1, baixo: 2, nome: 'metade' },
  { cima: 1, baixo: 3, nome: 'um terço' },
  { cima: 2, baixo: 3, nome: 'dois terços' },
  { cima: 1, baixo: 4, nome: 'um quarto' },
  { cima: 3, baixo: 4, nome: 'três quartos' },
  { cima: 1, baixo: 5, nome: 'um quinto' },
  { cima: 1, baixo: 8, nome: 'um oitavo' },
  { cima: 1, baixo: 1, nome: 'inteiro' },
]

/** Porcentagens de uso corrente — desconto, bateria, nota, chance. */
export const PORCENTAGENS = [5, 10, 20, 25, 30, 50, 70, 75, 90, 100]

export interface Forma {
  nome: string
  lados: number
  /** Desenhada em CSS por `clip-path`, e não em imagem: forma é geometria. */
  clip: string
}

export const FORMAS_GEO: Forma[] = [
  { nome: 'triângulo', lados: 3, clip: 'polygon(50% 0, 100% 100%, 0 100%)' },
  { nome: 'quadrado', lados: 4, clip: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' },
  { nome: 'retângulo', lados: 4, clip: 'polygon(0 18%, 100% 18%, 100% 82%, 0 82%)' },
  { nome: 'losango', lados: 4, clip: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' },
  { nome: 'pentágono', lados: 5, clip: 'polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)' },
  {
    nome: 'hexágono',
    lados: 6,
    clip: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
  },
  { nome: 'estrela', lados: 5, clip: 'polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
  { nome: 'círculo', lados: 0, clip: 'circle(50% at 50% 50%)' },
]

/** A tabuada de um número, do 1 ao 10. */
export function tabuada(n: number): { a: number; b: number; r: number }[] {
  return Array.from({ length: 10 }, (_, i) => ({ a: n, b: i + 1, r: n * (i + 1) }))
}

/**
 * Sequências numéricas — a ponte entre contar e enxergar regra.
 *
 * Mesma habilidade do módulo de padrões visuais, do outro lado: ali a regra é
 * de forma e cor, aqui é de quantidade. Quem enxerga uma costuma enxergar a
 * outra, e quem não enxerga uma às vezes enxerga a outra — que é o motivo de
 * existirem as duas.
 */
export function sequenciaNumerica(
  inicio: number,
  passo: number,
  quantos = 6,
): { termos: number[]; proximo: number; regra: string } {
  const termos = Array.from({ length: quantos }, (_, i) => inicio + passo * i)
  return {
    termos,
    proximo: inicio + passo * quantos,
    regra: passo > 0 ? `soma ${passo} a cada passo` : `tira ${Math.abs(passo)} a cada passo`,
  }
}

/** `30% de 80` — a conta de desconto, feita como se faz de cabeça. */
export function porcentagemDe(pct: number, total: number): number {
  return (pct / 100) * total
}
