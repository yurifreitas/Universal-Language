import { comecar, elogio, pista, responder, sortear, type GameState } from '../src/lib/game'
import type { Card } from '../src/types'

/**
 * Regressao do jogo "Cadê?". Roda com `npm run test:game`.
 *
 * O sorteio recebe a funcao aleatoria por parametro justamente para poder ser
 * testado: um sorteador que chama `Math.random` direto e a classe de logica em
 * que o erro passa despercebido — sortear sempre o primeiro, nunca o ultimo,
 * repetir o mesmo. Aqui o "acaso" e controlado.
 */

const c = (label: string): Card => ({ id: 0, label })
const baralho = ['água', 'bolo', 'suco', 'pão'].map(c)

let falhas = 0
let passou = 0
const eq = (nome: string, obtido: unknown, esperado: unknown) => {
  const a = JSON.stringify(obtido)
  const b = JSON.stringify(esperado)
  if (a === b) passou++
  else {
    falhas++
    console.error(`  ${nome}\n     esperado: ${b}\n     obtido:   ${a}`)
  }
}

/* Sorteio determinístico: 0 pega o primeiro, ~1 pega o último. */
eq('sorteia o primeiro', sortear(baralho, [], () => 0)?.label, 'água')
eq('sorteia o último sem estourar', sortear(baralho, [], () => 0.999999)?.label, 'pão')
eq('não repete o que já saiu', sortear(baralho, ['água'], () => 0)?.label, 'bolo')
eq('baralho vazio devolve nulo', sortear([], [], () => 0), null)
/* Esgotadas todas, recomeça em vez de travar. */
eq(
  'quando acabam as novas, permite repetir',
  sortear(baralho, ['água', 'bolo', 'suco', 'pão'], () => 0)?.label,
  'água',
)

/* Errar não muda nada — nem placar, nem alvo, nem fim. */
const inicio = comecar(baralho, 3, () => 0) as GameState
eq('começa com o primeiro alvo', inicio.target.label, 'água')
const erro = responder(inicio, c('bolo'), baralho, () => 0)
eq('errar não conta acerto', erro.proximo?.acertos, 0)
eq('errar mantém o mesmo alvo', erro.proximo?.target.label, 'água')
eq('errar não termina a rodada', erro.terminou, false)

/* Acertar avança sem repetir. */
const acerto = responder(inicio, c('água'), baralho, () => 0)
eq('acertar conta', acerto.proximo?.acertos, 1)
eq('acertar troca o alvo', acerto.proximo?.target.label, 'bolo')

/* A rodada termina no total, não antes. */
const quase: GameState = { target: c('suco'), usadas: ['água', 'bolo', 'suco'], acertos: 2, total: 3 }
const fim = responder(quase, c('suco'), baralho, () => 0)
eq('termina ao completar o total', fim.terminou, true)
eq('sem próximo estado no fim', fim.proximo, null)

/* A rodada nunca pede mais palavras do que a prancha tem. */
eq('total limitado ao tamanho da prancha', comecar(baralho, 99, () => 0)?.total, 4)

/* Pista e elogio variam, e nunca voltam vazios. */
eq('pista muda a cada rodada', pista('água', 0) !== pista('água', 1), true)
eq('pista nomeia o alvo', pista('água', 0).includes('água'), true)
eq('elogio nunca é vazio', elogio(7).length > 0, true)

if (falhas) {
  console.error(`\n${falhas} caso(s) diferentes do esperado. ${passou} passaram.\n`)
  process.exit(1)
}
console.log(`jogo "Cadê?": ${passou} casos, todos como esperado.`)
