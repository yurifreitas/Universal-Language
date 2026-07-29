import { compose, NO_MARKS, type GrammarMarks } from '../src/lib/grammar'
import type { Region, Register } from '../src/lib/regional'

/**
 * Regressao do motor de frases.
 *
 * Roda com `npm run test:grammar`. Nao ha framework: o motor e uma funcao pura
 * de entrada e saida, e uma tabela de "isto entra, aquilo sai" e a forma mais
 * legivel de fixar o comportamento — inclusive para quem revisa a gramatica sem
 * ler TypeScript.
 *
 * COMO USAR AO MUDAR UMA REGRA
 *
 * Uma linha que muda de valor NAO e necessariamente um defeito: pode ser a
 * melhoria que voce acabou de fazer. Leia a frase nova em voz alta; se for o
 * portugues que voce quer, atualize o esperado. O que este arquivo impede e a
 * mudanca que passa despercebida.
 */

interface Case {
  cards: string[]
  expect: string
  marks?: Partial<GrammarMarks>
  region?: Region
  register?: Register
  speakerGender?: 'n' | 'm' | 'f'
}

const CASES: Record<string, Case[]> = {
  'básico': [
    { cards: ['eu', 'querer', 'água'], expect: 'Eu quero água.' },
    { cards: ['querer', 'água'], expect: 'Quero água.' },
    { cards: ['eu', 'querer', 'comer', 'bolo'], expect: 'Eu quero comer o bolo.' },
    { cards: ['sim'], expect: 'Sim.' },
    { cards: ['eu', 'acabou'], expect: 'Eu acabou.' },
  ],
  'regência e artigo': [
    { cards: ['eu', 'gostar', 'chocolate'], expect: 'Eu gosto de chocolate.' },
    { cards: ['eu', 'gostar', 'mãe'], expect: 'Eu gosto da mãe.' },
    { cards: ['eu', 'querer', 'mais', 'suco'], expect: 'Eu quero mais suco.' },
    { cards: ['eu', 'querer', 'suco', 'fruta'], expect: 'Eu quero suco de fruta.' },
    { cards: ['casa', 'mãe'], expect: 'A casa da mãe.' },
  ],
  'tempo': [
    { cards: ['ontem', 'eu', 'ir', 'escola'], expect: 'Ontem eu fui pra escola.' },
    { cards: ['amanhã', 'eu', 'ir', 'praia'], expect: 'Amanhã eu vou pra praia.' },
    { cards: ['eu', 'tomar banho'], marks: { tense: 'past' }, expect: 'Eu tomei banho.' },
    { cards: ['eu', 'querer', 'água'], marks: { tense: 'future' }, expect: 'Eu vou querer água.' },
    { cards: ['eu', 'pegar', 'bola'], marks: { tense: 'past' }, expect: 'Eu peguei a bola.' },
  ],
  'progressivo': [
    { cards: ['eu', 'comer'], marks: { progressive: true }, expect: 'Eu estou comendo.' },
    {
      cards: ['eu', 'comer', 'bolo'],
      marks: { progressive: true, tense: 'past' },
      expect: 'Eu estava comendo o bolo.',
    },
    { cards: ['menina', 'brincar'], marks: { progressive: true }, expect: 'A menina está brincando.' },
  ],
  'pedido': [
    { cards: ['abrir', 'porta'], marks: { request: true }, expect: 'Abre a porta.' },
    {
      cards: ['abrir', 'porta'],
      marks: { request: true },
      register: 'normativo',
      expect: 'Abra a porta.',
    },
    { cards: ['você', 'abrir', 'porta'], marks: { request: true }, expect: 'Você abre a porta.' },
  ],
  'clítico': [
    { cards: ['eu', 'amar', 'você'], expect: 'Eu te amo.' },
    { cards: ['ajudar', 'eu'], expect: 'Me ajuda.' },
    { cards: ['eu', 'gostar', 'você'], expect: 'Eu gosto de você.' },
  ],
  'cópula e estado': [
    { cards: ['eu', 'triste'], expect: 'Eu estou triste.' },
    { cards: ['eu', 'cansado'], speakerGender: 'f', expect: 'Eu estou cansada.' },
    { cards: ['eu', 'fome'], expect: 'Eu tenho fome.' },
    { cards: ['eu', 'dor', 'barriga'], expect: 'Eu estou com dor na barriga.' },
    { cards: ['meu', 'mão', 'dor'], expect: 'Minha mão dói.' },
    { cards: ['água', 'quente'], expect: 'Água está quente.' },
    { cards: ['casa', 'bonito'], expect: 'A casa está bonita.' },
    { cards: ['costas', 'dor'], expect: 'As costas doem.' },
  ],
  'ligação com verbo': [
    { cards: ['eu', 'feliz', 'ir', 'comer'], expect: 'Eu estou feliz de ir comer.' },
    { cards: ['eu', 'cansado', 'esperar'], expect: 'Eu estou cansado de esperar.' },
    { cards: ['eu', 'medo', 'ir', 'médico'], expect: 'Eu tenho medo de ir ao médico.' },
    { cards: ['eu', 'ir', 'dormir'], expect: 'Eu vou dormir.' },
    { cards: ['eu', 'ir', 'casa'], expect: 'Eu vou pra casa.' },
  ],
  'listas de pessoas': [
    { cards: ['mãe', 'pai', 'avó'], expect: 'A mãe, o pai e a avó.' },
    { cards: ['eu', 'querer', 'mãe', 'pai'], expect: 'Eu quero a mãe e o pai.' },
    {
      cards: ['eu', 'gostar', 'mãe', 'pai', 'irmã'],
      expect: 'Eu gosto da mãe, do pai e da irmã.',
    },
  ],
  'negação, pergunta e plural': [
    { cards: ['eu', 'não', 'querer', 'banheiro'], expect: 'Eu não quero o banheiro.' },
    { cards: ['eu', 'não', 'gostar', 'feijão'], expect: 'Eu não gosto de feijão.' },
    { cards: ['onde', 'mãe'], expect: 'Onde está a mãe?' },
    { cards: ['eu', 'querer', 'biscoito'], marks: { plural: true }, expect: 'Eu quero os biscoitos.' },
  ],
  'regionalismo': [
    { cards: ['eu', 'querer', 'biscoito'], region: 'sul', expect: 'Eu quero a bolacha.' },
    { cards: ['eu', 'querer', 'mãe'], region: 'nordeste', expect: 'Eu quero a mainha.' },
    { cards: ['menino', 'brincar'], region: 'sul', expect: 'O guri brinca.' },
    // A virgula de lista nao pode impedir a troca regional da palavra.
    {
      cards: ['mãe', 'pai', 'avó'],
      region: 'nordeste',
      expect: 'A mainha, o painho e a avó.',
    },
    { cards: ['você', 'querer', 'suco'], region: 'sul', expect: 'Tu quer suco.' },
    {
      cards: ['você', 'querer', 'suco'],
      region: 'sul',
      register: 'normativo',
      expect: 'Tu queres suco.',
    },
    {
      cards: ['você', 'ir', 'escola'],
      region: 'nordeste',
      register: 'normativo',
      expect: 'Tu vais para a escola.',
    },
    { cards: ['eu', 'ir', 'parque'], register: 'normativo', expect: 'Eu vou para o parque.' },
  ],
  'sujeito composto e coordenação': [
    // As frases que o usuario pediu, palavra por palavra.
    {
      cards: ['amanhã', 'mamãe', 'eu', 'você', 'brincar', 'o dia todo', 'pintar', 'desenhar'],
      expect: 'Amanhã a mamãe, eu e você vamos brincar o dia todo, pintar e desenhar.',
    },
    { cards: ['eu', 'poder', 'jogar', 'celular'], expect: 'Eu posso jogar no celular.' },
    {
      cards: ['eu', 'poder', 'jogar', 'celular'],
      marks: { question: true },
      expect: 'Eu posso jogar no celular?',
    },
    { cards: ['eu', 'você', 'ir', 'parque'], expect: 'Eu e você vamos pro parque.' },
    { cards: ['mamãe', 'papai', 'ir', 'trabalhar'], expect: 'A mamãe e o papai vão trabalhar.' },
    { cards: ['eu', 'querer', 'pintar', 'desenhar'], expect: 'Eu quero pintar e desenhar.' },
    {
      cards: ['eu', 'correr', 'pular', 'dançar'],
      expect: 'Eu corro, pular e dançar.',
    },
    { cards: ['eu', 'ver', 'televisão'], expect: 'Eu vejo na televisão.' },
    { cards: ['eu', 'querer', 'celular'], expect: 'Eu quero o celular.' },
    // Negacao com verbo modal e coordenacao: o "nao" cola no verbo conjugado e
    // vale para a lista inteira.
    { cards: ['eu', 'não', 'ir', 'pular', 'correr'], expect: 'Eu não vou pular e correr.' },
    {
      cards: ['eu', 'não', 'querer', 'comer', 'dormir'],
      expect: 'Eu não quero comer e dormir.',
    },
    {
      cards: ['nós', 'ir', 'cantar', 'dançar', 'brincar'],
      expect: 'Nós vamos cantar, dançar e brincar.',
    },
    {
      cards: ['amanhã', 'eu', 'mamãe', 'ir', 'praia'],
      expect: 'Amanhã eu e a mamãe vamos pra praia.',
    },
  ],
  'palavra fora do léxico': [
    // Nao conjuga nem artigula o que so foi adivinhado: telegrafico e menos
    // errado que forma inexistente.
    { cards: ['eu', 'querer', 'dinossauro'], expect: 'Eu quero dinossauro.' },
  ],
}

let pass = 0
const failures: string[] = []

for (const [group, cases] of Object.entries(CASES)) {
  for (const c of cases) {
    const got = compose(
      c.cards.map((label) => ({ id: 0, label })),
      {
        marks: { ...NO_MARKS, ...c.marks },
        ...(c.region ? { region: c.region } : {}),
        ...(c.register ? { register: c.register } : {}),
        ...(c.speakerGender ? { speakerGender: c.speakerGender } : {}),
      },
    ).text
    if (got === c.expect) pass++
    else failures.push(`  [${group}] ${c.cards.join(' · ')}\n     esperado: ${c.expect}\n     obtido:   ${got}`)
  }
}

if (failures.length) {
  console.error(`\n${failures.length} caso(s) diferentes do esperado:\n`)
  console.error(failures.join('\n\n'))
  console.error(`\n${pass} passaram.\n`)
  process.exit(1)
}
console.log(`motor de frases: ${pass} casos, todos como esperado.`)
