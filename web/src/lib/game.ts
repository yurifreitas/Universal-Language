import type { Card } from '../types'

/**
 * "Cadê?" — o jogo de achar a palavra.
 *
 * POR QUE ESTE JOGO, E NAO OUTRO
 *
 * A tentacao numa prancha de CAA e gamificar o USO: pontos por frase dita,
 * sequencia de dias, medalha por falar. Isso e ruim por um motivo especifico —
 * transforma comunicar em tarefa, e faz a crianca dizer coisas para ganhar
 * ponto em vez de para dizer. Comunicacao nao pode ter placar.
 *
 * O que PODE ser treinado e a habilidade que sustenta a fluidez: **achar a
 * palavra**. A pesquisa de busca visual em pranchas de CAA (Wilkinson e
 * colegas, replicada em TEA e sindrome de Down) mostra que o tempo de localizar
 * um simbolo e o que decide se a prancha flui ou trava — e que onde o olhar vai
 * prediz onde a mao vai. Treinar localizacao e treinar fluencia.
 *
 * TRES DECISOES
 *
 * 1. **Joga-se na prancha DE VERDADE.** Nao ha tabuleiro proprio, nao ha
 *    embaralhamento: as celulas ficam onde sempre estao. O plano motor
 *    treinado e o mesmo que sera usado para falar — se o jogo usasse outro
 *    arranjo, treinaria o movimento errado (LAMP).
 * 2. **Nao ha erro.** Tocar a celula errada nao tira ponto, nao emite som de
 *    negacao e nao encerra nada: o app so repete a pista. Quem esta aprendendo
 *    onde fica uma palavra erra por definicao — punir isso e punir o
 *    aprendizado.
 * 3. **Nao ha relogio.** Velocidade e consequencia, nao meta. Cronometrar
 *    penalizaria exatamente quem tem comprometimento motor.
 */

/**
 * MODOS.
 *
 * O jogo nasceu com um so: ouvir a palavra e achar a celula. Os outros dois
 * treinam a mesma habilidade de localizacao por caminhos diferentes, e cada um
 * serve a um momento — quem ainda nao le so consegue o primeiro; quem esta
 * formando leitura ganha muito com o segundo.
 *
 *  - `nome`     "Cadê a água?" — busca por palavra falada.
 *  - `inicial`  "Qual começa com A?" — consciencia fonologica, e o unico modo
 *               em que MAIS DE UMA resposta esta certa: vale qualquer card
 *               daquela letra. Aceitar so o sorteado seria mentir para a
 *               crianca que acertou.
 *  - `silencio` a pista aparece ESCRITA e nao e falada. Para treinar leitura, e
 *               para jogar em lugar onde nao se pode ter som.
 */
export type Modo = 'nome' | 'inicial' | 'silencio'

export interface GameState {
  /** A palavra que se procura agora. */
  target: Card
  /** Palavras ja sorteadas nesta rodada, para nao repetir. */
  usadas: string[]
  acertos: number
  /** Quantas palavras tem a rodada inteira. */
  total: number
  modo: Modo
  /**
   * Toques fora do alvo NESTA palavra. Nao e contador de erro para placar
   * nenhum — e o gatilho da ajuda: passou de dois, o app acende a celula certa
   * em vez de repetir a pista pela quinta vez. Zera a cada palavra nova.
   */
  tentativas: number
  /**
   * Acertos seguidos sem precisar de ajuda. Existe para dar RITMO — "engatou" —
   * e nunca aparece como nota: quebrar a sequencia nao tira nada, e a proxima
   * palavra comeca igual.
   */
  sequencia: number
}

export const RODADA_PADRAO = 5

/** Depois de duas tentativas, a celula certa acende. Ajudar > insistir. */
export const TENTATIVAS_ATE_AJUDA = 2

/** Primeira letra, sem acento e em maiuscula — a pista do modo `inicial`. */
export function inicialDe(label: string): string {
  return (
    label
      .trim()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .charAt(0)
      .toUpperCase() || '?'
  )
}

/**
 * Sorteia a proxima palavra entre as da prancha aberta, sem repetir.
 *
 * Recebe o sorteador por parametro em vez de chamar `Math.random` direto: uma
 * funcao que sorteia sozinha nao pode ser testada, e este e justamente o tipo
 * de logica em que um erro passa despercebido (sortear sempre a primeira,
 * nunca a ultima, repetir a mesma).
 */
export function sortear(
  cards: Card[],
  usadas: string[],
  aleatorio: () => number = Math.random,
): Card | null {
  const restantes = cards.filter((c) => !usadas.includes(c.label))
  const fonte = restantes.length > 0 ? restantes : cards
  if (fonte.length === 0) return null
  const i = Math.min(fonte.length - 1, Math.floor(aleatorio() * fonte.length))
  return fonte[i] ?? null
}

export function comecar(
  cards: Card[],
  total = RODADA_PADRAO,
  aleatorio: () => number = Math.random,
  modo: Modo = 'nome',
): GameState | null {
  const target = sortear(cards, [], aleatorio)
  if (!target) return null
  return {
    target,
    usadas: [target.label],
    acertos: 0,
    total: Math.min(total, cards.length),
    modo,
    tentativas: 0,
    sequencia: 0,
  }
}

export interface Resultado {
  acertou: boolean
  /** Estado seguinte; `null` quando a rodada terminou. */
  proximo: GameState | null
  terminou: boolean
}

/**
 * O toque acertou?
 *
 * No modo `inicial` a pergunta e "qual comeca com A" — entao QUALQUER card
 * daquela letra vale. Exigir justamente o que foi sorteado transformaria um
 * acerto legitimo em erro, que e a pior coisa que um jogo de aprendizado pode
 * fazer.
 */
export function acerta(estado: GameState, escolhido: Card): boolean {
  if (estado.modo === 'inicial') {
    return inicialDe(escolhido.label) === inicialDe(estado.target.label)
  }
  return escolhido.label === estado.target.label
}

export function responder(
  estado: GameState,
  escolhido: Card,
  cards: Card[],
  aleatorio: () => number = Math.random,
): Resultado {
  // Errar nao encerra nem penaliza: o estado permanece e a pista pode ser
  // repetida — ver a decisao 2 no topo do arquivo. O que muda e `tentativas`,
  // que existe so para o app saber a hora de AJUDAR, e `sequencia`, que volta
  // a zero sem tirar nada de ninguem.
  if (!acerta(estado, escolhido)) {
    return {
      acertou: false,
      terminou: false,
      proximo: { ...estado, tentativas: estado.tentativas + 1, sequencia: 0 },
    }
  }

  const acertos = estado.acertos + 1
  // Achou de primeira, sem precisar da celula acesa: a sequencia continua.
  const sequencia = estado.tentativas === 0 ? estado.sequencia + 1 : 0

  if (acertos >= estado.total) {
    return { acertou: true, proximo: null, terminou: true }
  }

  // No modo `inicial` o acerto pode ser um card diferente do sorteado; ele
  // tambem entra em `usadas`, senao volta a ser sorteado logo em seguida.
  const usadas = estado.usadas.includes(escolhido.label)
    ? estado.usadas
    : [...estado.usadas, escolhido.label]

  const proximaPalavra = sortear(cards, usadas, aleatorio)
  if (!proximaPalavra) return { acertou: true, proximo: null, terminou: true }

  return {
    acertou: true,
    terminou: false,
    proximo: {
      target: proximaPalavra,
      usadas: [...usadas, proximaPalavra.label],
      acertos,
      total: estado.total,
      modo: estado.modo,
      tentativas: 0,
      sequencia,
    },
  }
}

/** A celula certa deve acender? Ajuda depois de duas tentativas, nunca antes. */
export function mostrarAjuda(estado: GameState): boolean {
  return estado.tentativas >= TENTATIVAS_ATE_AJUDA
}

/**
 * A pista falada. Varia a formula de proposito: ouvir sempre a mesma frase
 * vira ruido, e a variacao mantem a atencao sem exigir nada novo de quem ouve.
 */
export function pista(target: string, rodada: number, modo: Modo = 'nome'): string {
  if (modo === 'inicial') {
    const letra = inicialDe(target)
    const formas = [
      `Qual começa com ${letra}?`,
      `Acha uma palavra com ${letra}.`,
      `Cadê a palavra que começa com ${letra}?`,
    ]
    return formas[rodada % formas.length] ?? `Qual começa com ${letra}?`
  }
  const formas = [`Cadê ${target}?`, `Acha ${target}.`, `Onde está ${target}?`, `Mostra ${target}.`]
  return formas[rodada % formas.length] ?? `Cadê ${target}?`
}

/** A mesma pista, escrita — no modo silencioso ela e a unica que existe. */
export function pistaEscrita(target: string, modo: Modo): string {
  return modo === 'inicial' ? `Começa com ${inicialDe(target)}` : target
}

/** Elogio do acerto. Curto, e sem exagero — o objetivo e seguir, nao celebrar. */
export function elogio(rodada: number): string {
  const formas = ['Isso!', 'Achou!', 'Muito bem!', 'É essa mesmo!']
  return formas[rodada % formas.length] ?? 'Isso!'
}

/**
 * O que dizer quando engata uma sequencia. So a partir de tres, e so de vez em
 * quando: um elogio a cada acerto vira ruido e para de significar alguma coisa.
 */
export function embalo(sequencia: number): string | null {
  if (sequencia === 3) return 'Três seguidas!'
  if (sequencia === 5) return 'Cinco seguidas, olha só.'
  if (sequencia > 0 && sequencia % 10 === 0) return `${sequencia} seguidas!`
  return null
}

/** Quando a celula acende, o app diz o que fez — a ajuda nao pode ser silenciosa. */
export function fraseDaAjuda(target: string): string {
  return `Está aqui, ó: ${target}.`
}
