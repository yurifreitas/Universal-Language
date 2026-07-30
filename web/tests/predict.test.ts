import { INICIO, learn, suggest, tamanho, type PredictModel } from '../src/lib/predict'
import type { Card } from '../src/types'

/**
 * Regressao do modelo de sugestao. Roda com `npm run test:predict`.
 *
 * O que estes casos protegem, em ordem de importancia:
 *
 *   1. **O modelo comeca vazio.** Um app que sugere antes de conhecer a pessoa
 *      esta sugerindo o que ALGUEM disse, e a literatura de CAA e explicita
 *      quanto ao custo disso: perda de voz propria.
 *   2. **Aprende so o que foi falado**, e nao o que foi montado e desfeito.
 *   3. **Nao cresce sem limite** no localStorage.
 */

const c = (label: string): Card => ({ id: 0, label })
const vocab = new Map<string, Card>(
  ['eu', 'querer', 'água', 'bolo', 'mais', 'comer', 'mamãe'].map((l) => [l, c(l)]),
)

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

/* 1. Vazio de fabrica */
eq('modelo novo nao sugere nada', suggest({}, 'querer', vocab), [])
eq('modelo novo tem tamanho zero', tamanho({}), 0)

/* 2. Aprende uma frase */
let m: PredictModel = learn({}, [c('eu'), c('querer'), c('água')])
eq(
  'sugere o que veio depois de "querer"',
  suggest(m, 'querer', vocab).map((x) => x.label),
  ['água'],
)
eq(
  'sugere abertura de frase',
  suggest(m, null, vocab).map((x) => x.label),
  ['eu'],
)

/* 3. Frequencia ordena */
m = learn(m, [c('eu'), c('querer'), c('bolo')])
m = learn(m, [c('eu'), c('querer'), c('bolo')])
eq(
  'o mais dito vem primeiro',
  suggest(m, 'querer', vocab).map((x) => x.label),
  ['bolo', 'água'],
)

/* 4. Palavra que saiu do vocabulario e ignorada, sem quebrar */
const vocabSemBolo = new Map(vocab)
vocabSemBolo.delete('bolo')
eq(
  'card removido some da sugestao',
  suggest(m, 'querer', vocabSemBolo).map((x) => x.label),
  ['água'],
)

/* 5. Frase de um card so nao ensina par nenhum */
eq('frase de uma palavra nao cria par', Object.keys(learn({}, [c('água')])), [INICIO])

/* 6. Poda: no maximo 12 alvos por origem */
let grande: PredictModel = {}
for (let i = 0; i < 30; i++) grande = learn(grande, [c('querer'), c(`coisa${i}`)])
eq('poda em 12 alvos', Object.keys(grande['querer'] ?? {}).length, 12)

/* 7. Nao sugere repetir a palavra que acabou de ser dita quando so ha ela */
const so = learn({}, [c('mais'), c('mais')])
eq(
  'aprende repeticao se a pessoa repetiu mesmo',
  suggest(so, 'mais', vocab).map((x) => x.label),
  ['mais'],
)

if (falhas) {
  console.error(`\n${falhas} caso(s) diferentes do esperado. ${passou} passaram.\n`)
  process.exit(1)
}
console.log(`sugestao de palavra: ${passou} casos, todos como esperado.`)
