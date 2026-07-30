import {
  folha,
  folhas,
  galho,
  linearizar,
  verificar,
  type Raiz,
  type Tronco,
} from '../src/lib/arvore'
import { wordClassOf } from '../src/lib/lexicon'
import type { Card } from '../src/types'

/**
 * A árvore da frase. Roda com `npm run test:arvore`.
 *
 * O que este arquivo protege é a ESTRUTURA — que as garantias do GRAMMAR.md
 * possam ser verificadas na própria árvore, em vez de por comparação de
 * strings depois do fato. Ver `ARVORE.md`.
 *
 * O módulo ainda não alimenta o app: ele é construído ao lado, e a troca só
 * acontece depois da comparação diferencial sobre os 20.000 casos da auditoria.
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

const c = (label: string): Card => ({ id: 0, label })

const TRACOS = {
  tense: 'present',
  question: false,
  progressive: false,
  request: false,
  plural: false,
  speakerGender: 'n',
  region: 'padrao',
  register: 'coloquial',
} as const

/* ------------------------------------------------------------ "Eu quero a água." */

const sujeito = galho('sn', [folha('eu', 'nucleo', 'card', { cardIndex: 0 })])
const objeto = galho(
  'sn',
  [
    folha('a', 'determinante'),
    folha('água', 'nucleo', 'card', { cardIndex: 2 }),
  ],
  { genero: 'f' },
)
const predicado = galho('predicado', [
  folha('quero', 'nucleo', 'flexionada', { cardIndex: 1, original: 'querer' }),
  objeto,
])
const tronco: Tronco = {
  tipo: 'tronco',
  sujeito,
  predicados: [predicado],
  ligacao: 'nenhuma',
  negada: false,
}
const raiz: Raiz = { tipo: 'raiz', troncos: [tronco], tracos: TRACOS }

eq('linearização', linearizar(raiz), 'eu quero a água')
eq('todas as folhas na ordem', folhas(raiz).map((f) => f.texto), ['eu', 'quero', 'a', 'água'])

/* ---------------------------------------------- a palavra inserida é opcional */

/**
 * "O artigo pode ser removido" — o pedido que motivou a árvore.
 *
 * Toda folha inserida é opcional por definição: ela é conveniência do motor,
 * não escolha da pessoa. Some sem tocar em regra nenhuma.
 */
eq('só o inserido é opcional', folhas(raiz).filter((f) => f.opcional).map((f) => f.texto), ['a'])
eq('modo telegráfico', linearizar(raiz, { semOpcionais: true }), 'eu quero água')
eq(
  'o que a pessoa escolheu nunca é opcional',
  folhas(raiz).filter((f) => f.origem !== 'inserida').every((f) => !f.opcional),
  true,
)

/* --------------------------------------------- gênero mora no nó, não numa var */

eq('o SN carrega o gênero', objeto.genero, 'f')

/* ------------------------------------------------- verificação das garantias */

const cards = [c('eu'), c('querer'), c('água')]
eq('árvore íntegra não acusa nada', verificar(raiz, cards, wordClassOf), [])

// 1. conteúdo inserido — a garantia mais dura do GRAMMAR.md
const comConteudo: Raiz = {
  ...raiz,
  troncos: [
    {
      ...tronco,
      predicados: [galho('predicado', [...predicado.filhos, folha('bolo', 'nucleo')])],
    },
  ],
}
eq(
  'acusa conteúdo inserido',
  verificar(comConteudo, cards, wordClassOf).map((v) => v.regra),
  ['conteudo-inserido'],
)

// Funcional inserido é legítimo e não pode acusar.
const comFuncional: Raiz = {
  ...raiz,
  troncos: [
    {
      ...tronco,
      predicados: [galho('predicado', [...predicado.filhos, folha('de', 'preposicao')])],
    },
  ],
}
eq('preposição inserida é legítima', verificar(comFuncional, cards, wordClassOf), [])

// 2. card perdido
const semAgua: Raiz = {
  ...raiz,
  troncos: [
    {
      ...tronco,
      predicados: [galho('predicado', [predicado.filhos[0]!])],
    },
  ],
}
eq(
  'acusa card perdido',
  verificar(semAgua, cards, wordClassOf).map((v) => v.regra),
  ['card-perdido'],
)

// 3. reordenação
const trocado: Raiz = {
  ...raiz,
  troncos: [
    {
      ...tronco,
      sujeito: galho('sn', [folha('água', 'nucleo', 'card', { cardIndex: 2 })]),
      predicados: [
        galho('predicado', [
          folha('quero', 'nucleo', 'flexionada', { cardIndex: 1 }),
          galho('sn', [folha('eu', 'nucleo', 'card', { cardIndex: 0 })]),
        ]),
      ],
    },
  ],
}
eq(
  'acusa reordenação',
  verificar(trocado, cards, wordClassOf).map((v) => v.regra),
  ['reordenacao'],
)

/* ------------------------------------------------------- negação no tronco */

/**
 * A negação é traço da ORAÇÃO, e não um sinalizador global disputando ordem
 * com o separador de lista. Duas orações, uma negada e outra não — o caso que
 * o motor linear só acertou na segunda tentativa.
 */
const duas: Raiz = {
  tipo: 'raiz',
  tracos: TRACOS,
  troncos: [
    { ...tronco, negada: false },
    { ...tronco, ligacao: 'coordenada', negada: true, negacaoCardIndex: 3 },
  ],
}
eq('cada oração sabe se está negada', duas.troncos.map((t) => t.negada), [false, true])
eq('a negação aponta para o card', duas.troncos[1]!.negacaoCardIndex, 3)

if (falhas) {
  console.error(`\nárvore: ${falhas} de ${falhas + passou} casos falharam.`)
  process.exit(1)
}
console.log(`árvore: ${passou} casos, todos como esperado.`)
