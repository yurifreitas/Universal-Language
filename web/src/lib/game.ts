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

export interface GameState {
  /** A palavra que se procura agora. */
  target: Card
  /** Palavras ja sorteadas nesta rodada, para nao repetir. */
  usadas: string[]
  acertos: number
  /** Quantas palavras tem a rodada inteira. */
  total: number
}

export const RODADA_PADRAO = 5

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
): GameState | null {
  const target = sortear(cards, [], aleatorio)
  if (!target) return null
  return { target, usadas: [target.label], acertos: 0, total: Math.min(total, cards.length) }
}

export interface Resultado {
  acertou: boolean
  /** Estado seguinte; `null` quando a rodada terminou. */
  proximo: GameState | null
  terminou: boolean
}

export function responder(
  estado: GameState,
  escolhido: Card,
  cards: Card[],
  aleatorio: () => number = Math.random,
): Resultado {
  // Errar nao muda nada: o estado permanece e a pista pode ser repetida. Nao ha
  // contador de erro nem penalidade — ver a decisao 2 no topo do arquivo.
  if (escolhido.label !== estado.target.label) {
    return { acertou: false, proximo: estado, terminou: false }
  }

  const acertos = estado.acertos + 1
  if (acertos >= estado.total) {
    return { acertou: true, proximo: null, terminou: true }
  }

  const proximaPalavra = sortear(cards, estado.usadas, aleatorio)
  if (!proximaPalavra) return { acertou: true, proximo: null, terminou: true }

  return {
    acertou: true,
    terminou: false,
    proximo: {
      target: proximaPalavra,
      usadas: [...estado.usadas, proximaPalavra.label],
      acertos,
      total: estado.total,
    },
  }
}

/**
 * A pista falada. Varia a formula de proposito: ouvir sempre a mesma frase
 * vira ruido, e a variacao mantem a atencao sem exigir nada novo de quem ouve.
 */
export function pista(target: string, rodada: number): string {
  const formas = [`Cadê ${target}?`, `Acha ${target}.`, `Onde está ${target}?`, `Mostra ${target}.`]
  return formas[rodada % formas.length] ?? `Cadê ${target}?`
}

/** Elogio do acerto. Curto, e sem exagero — o objetivo e seguir, nao celebrar. */
export function elogio(rodada: number): string {
  const formas = ['Isso!', 'Achou!', 'Muito bem!', 'É essa mesmo!']
  return formas[rodada % formas.length] ?? 'Isso!'
}
