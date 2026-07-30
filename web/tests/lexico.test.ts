import { definirLexicoGerado, esquecerLexicoGerado, tamanhoDoLexicoGerado } from '../src/lib/lexicoGerado'
import { lookup } from '../src/lib/lexicon'
import { compose, NO_MARKS } from '../src/lib/grammar'
import type { Card } from '../src/types'

/**
 * Robustez da camada de léxico gerado. Roda com `npm run test:lexico`.
 *
 * O que este arquivo protege não é a inferência — ela é medida por
 * `ferramentas/lexico/medir.mjs`, contra o gabarito. O que se protege aqui é a
 * **política**:
 *
 *   - o léxico revisado à mão sempre vence o gerado;
 *   - dado corrompido é descartado entrada a entrada, sem derrubar o resto;
 *   - sem o arquivo, o app se comporta exatamente como se comportava antes de
 *     ele existir.
 *
 * A terceira é a que mais importa. Um léxico maior é melhoria, nunca requisito:
 * a prancha tem de abrir e falar sem ele.
 */

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

const frase = (rotulos: string[]) =>
  compose(
    rotulos.map((label): Card => ({ id: 0, label })),
    { marks: NO_MARKS, articles: [], speakerGender: 'n', region: 'padrao', register: 'coloquial' },
  ).text

/* ------------------------------------------------- sem o léxico carregado */

esquecerLexicoGerado()
eq('sem léxico, o gerado está vazio', tamanhoDoLexicoGerado(), 0)
// "girafa" não está no léxico manual: sem a camada gerada, cai no palpite.
eq('sem léxico, palavra desconhecida é palpite', lookup('girafa').guessed, true)
eq('sem léxico, o motor continua compondo', frase(['eu', 'querer', 'água']), 'Eu quero água.')

/* --------------------------------------------------------- precedência */

definirLexicoGerado({
  girafa: { class: 'noun', gender: 'f' },
  // O manual diz que "água" é feminino e incontável. O gerado tenta o contrário.
  água: { class: 'noun', gender: 'm' },
  correr: { class: 'verb' },
})

eq('gerado preenche o que faltava', lookup('girafa').class, 'noun')
eq('gerado traz gênero', lookup('girafa').gender, 'f')
eq('gerado NÃO é palpite', lookup('girafa').guessed, undefined)
// A regra que sustenta a confiança na revisão à mão.
eq('manual vence gerado', lookup('água').gender, 'f')
eq('manual vence gerado (incontável)', lookup('água').mass, true)

/* ------------------------------------------------- descarte de lixo */

definirLexicoGerado({
  bom1: { class: 'noun', gender: 'f' },
  semClasse: { gender: 'f' },
  classeInvalida: { class: 'pokemon', gender: 'f' },
  naoObjeto: 'nada disso',
  nulo: null,
  generoInvalido: { class: 'noun', gender: 'x' },
  bom2: { class: 'verb' },
})
eq('entrada sem classe é descartada', lookup('semclasse').guessed, true)
eq('classe desconhecida é descartada', lookup('classeinvalida').guessed, true)
eq('valor não-objeto é descartado', lookup('naoobjeto').guessed, true)
eq('nulo é descartado', lookup('nulo').guessed, true)
// Gênero inválido não invalida a entrada: a CLASSE é o dado mais confiável e
// mais útil, e ficar com ela é melhor que perder as duas coisas.
eq('gênero inválido cai, classe fica', lookup('generoinvalido').class, 'noun')
eq('gênero inválido não vaza', lookup('generoinvalido').gender, undefined)
eq('as boas sobrevivem ao lixo em volta', tamanhoDoLexicoGerado(), 3)

/* ------------------------------------- efeito real na composição */

esquecerLexicoGerado()
const semLexico = frase(['eu', 'querer', 'girafa'])
definirLexicoGerado({ girafa: { class: 'noun', gender: 'f' } })
const comLexico = frase(['eu', 'querer', 'girafa'])
// Sem saber o gênero o motor não arrisca artigo — "o girafa" é pior que
// nenhum artigo. Sabendo, ele põe o certo.
eq('sem léxico: sem artigo', semLexico, 'Eu quero girafa.')
eq('com léxico: artigo certo', comLexico, 'Eu quero a girafa.')

/* --------------------------------------- plural vindo do acervo */

definirLexicoGerado({ pão: { class: 'noun', gender: 'm', pluralForm: 'pães' } })
eq('plural irregular do acervo', lookup('pão').pluralForm, 'pães')

esquecerLexicoGerado()

if (falhas) {
  console.error(`\nléxico gerado: ${falhas} de ${falhas + passou} casos falharam.`)
  process.exit(1)
}
console.log(`léxico gerado: ${passou} casos, todos como esperado.`)
