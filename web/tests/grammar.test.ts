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
    // Verbo modal ja carrega futuridade no portugues falado: ninguem diz
    // "eu vou querer água amanhã", diz "eu quero água amanhã".
    { cards: ['eu', 'querer', 'água'], marks: { tense: 'future' }, expect: 'Eu quero água.' },
    { cards: ['eu', 'comer', 'bolo'], marks: { tense: 'future' }, expect: 'Eu vou comer o bolo.' },
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
    // Verbo coordenado compartilha o sujeito, entao compartilha a flexao.
    { cards: ['eu', 'correr', 'pular', 'dançar'], expect: 'Eu corro, pulo e danço.' },
    { cards: ['mãe', 'pular', 'querer'], expect: 'A mãe pula e quer.' },
        // "ver" pede objeto direto: "vejo na televisão" so existe com objeto
    // ("vi o desenho na televisão"). A expectativa antiga fixava o defeito.
    { cards: ['eu', 'ver', 'televisão'], expect: 'Eu vejo a televisão.' },
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
  'lista de coisas': [
    // Tocar tres comidas e uma LISTA. Antes virava "feijão de pão de banana".
    { cards: ['feijão', 'pão', 'banana'], expect: 'Feijão, pão e banana.' },
    {
      cards: ['eu', 'querer', 'feijão', 'arroz', 'carne'],
      expect: 'Eu quero feijão, arroz e carne.',
    },
    { cards: ['eu', 'querer', 'bolo', 'sorvete'], expect: 'Eu quero bolo e sorvete.' },
    // Compostos de verdade continuam com "de".
    { cards: ['eu', 'querer', 'suco', 'fruta'], expect: 'Eu quero suco de fruta.' },
    { cards: ['casa', 'mãe'], expect: 'A casa da mãe.' },
    { cards: ['eu', 'dor', 'barriga'], expect: 'Eu estou com dor na barriga.' },
  ],
  'palavras de ligação escolhidas pela pessoa': [
    // A escolha da pessoa vence a do motor — mas a forma continua concordada.
    { cards: ['o', 'mãe'], expect: 'A mãe.' },
    { cards: ['eu', 'querer', 'um', 'bolo'], expect: 'Eu quero um bolo.' },
    { cards: ['eu', 'brincar', 'com', 'mãe'], expect: 'Eu brinco com a mãe.' },
    { cards: ['eu', 'querer', 'suco', 'sem', 'açúcar'], expect: 'Eu quero suco sem açúcar.' },
    { cards: ['eu', 'ir', 'em', 'o', 'parque'], expect: 'Eu vou no parque.' },
    // Conectivo posto pela pessoa: o motor nao poe outro por cima.
    { cards: ['feijão', 'e', 'arroz'], expect: 'Feijão e arroz.' },
    { cards: ['eu', 'querer', 'bolo', 'e', 'sorvete'], expect: 'Eu quero o bolo e o sorvete.' },
    // Interjeicao chama alguem: vocativo, sem artigo.
    { cards: ['ah', 'mãe'], expect: 'Ah, mãe.' },
    { cards: ['ei', 'você'], expect: 'Ei, você.' },
  ],
  'achados da revisão linguística': [
    // "or" nao e mais sufixo de verbo: AMOR deixou de virar "eu amo".
    { cards: ['eu', 'querer', 'amor'], expect: 'Eu quero amor.' },
    // "nunca" e a palavra da pessoa; era trocada por "não".
    { cards: ['eu', 'nunca', 'comer', 'feijão'], expect: 'Eu nunca como feijão.' },
    // Irregulares que a regra produzia inexistentes ("eu pedo", "eu sao").
    { cards: ['eu', 'pedir', 'ajuda'], expect: 'Eu peço ajuda.' },
    { cards: ['eu', 'querer', 'sair'], expect: 'Eu quero sair.' },
    { cards: ['eu', 'cair'], marks: { tense: 'past' }, expect: 'Eu caí.' },
    // Regencia antes de infinitivo, diferente da de substantivo.
    { cards: ['eu', 'terminar', 'comer'], expect: 'Eu termino de comer.' },
    { cards: ['eu', 'falar', 'mãe'], expect: 'Eu falo com a mãe.' },
    { cards: ['eu', 'sentar', 'cadeira'], expect: 'Eu sento na cadeira.' },
    { cards: ['eu', 'querer', 'colo'], expect: 'Eu quero colo.' },
    { cards: ['eu', 'querer', 'cachorro'], expect: 'Eu quero o cachorro.' },
  ],
  'defeitos achados pela revisão do motor': [
    // O clitico atravessava conector e capturava o sujeito da segunda oracao.
    {
      cards: ['eu', 'comer', 'mas', 'eu', 'querer', 'bolo'],
      expect: 'Eu como mas eu quero o bolo.',
    },
    // Clitico colava no modal: saia "Eu te quero ajudar".
    { cards: ['eu', 'querer', 'ajudar', 'você'], expect: 'Eu quero te ajudar.' },
    // Todo animado da frase entrava no sujeito composto.
    { cards: ['eu', 'feliz', 'mamãe'], expect: 'Eu estou feliz a mamãe.' },
    // Quantificador nao concordava: "muito água".
    { cards: ['eu', 'querer', 'muito', 'água'], expect: 'Eu quero muita água.' },
    // Plural de palavra em -z voltava inalterado.
    { cards: ['nós', 'feliz'], expect: 'Nós estamos felizes.' },
    // Verbo defectivo conjugado em 1a pessoa: "Eu doo a barriga".
    { cards: ['eu', 'doer', 'barriga'], expect: 'Eu dói a barriga.' },
    // Estado passado pede imperfeito, nao perfeito.
    { cards: ['eu', 'triste'], marks: { tense: 'past' }, expect: 'Eu estava triste.' },
    { cards: ['eu', 'medo'], marks: { tense: 'past' }, expect: 'Eu tinha medo.' },
    // Contracao com demonstrativo era obrigatoria e nao existia.
    { cards: ['eu', 'ir', 'em', 'esse', 'parque'], expect: 'Eu vou nesse parque.' },
    // Marcador de plural pluralizava incontavel.
    { cards: ['eu', 'querer', 'água'], marks: { plural: true }, expect: 'Eu quero água.' },
  ],
  'imperfeito, numerais, posse e predicado nominal': [
    // O imperfeito e o tempo de contar rotina e de pedir com cortesia.
    { cards: ['eu', 'comer', 'bolo'], marks: { tense: 'imperfect' }, expect: 'Eu comia o bolo.' },
    { cards: ['eu', 'querer', 'água'], marks: { tense: 'imperfect' }, expect: 'Eu queria água.' },
    { cards: ['eu', 'ir', 'escola'], marks: { tense: 'imperfect' }, expect: 'Eu ia pra escola.' },
    { cards: ['eu', 'ter', 'medo'], marks: { tense: 'imperfect' }, expect: 'Eu tinha medo.' },
    // Numeral pluraliza e dispensa artigo; antes saia "quero dois e bolo".
    { cards: ['eu', 'querer', 'dois', 'bolo'], expect: 'Eu quero dois bolos.' },
    { cards: ['eu', 'querer', 'três', 'maçã'], expect: 'Eu quero três maçãs.' },
    // Possessivo de 3a pessoa e POSPOSTO.
    { cards: ['carro', 'dele'], expect: 'O carro dele.' },
    { cards: ['eu', 'querer', 'bola', 'dela'], expect: 'Eu quero a bola dela.' },
    // Predicado nominal pede SER, e antes nao havia verbo nenhum.
    { cards: ['isso', 'minha', 'bola'], expect: 'Isso é minha bola.' },
    { cards: ['eu', 'querer', 'isso'], expect: 'Eu quero isso.' },
    // Adjetivos em sequencia sao lista.
    { cards: ['eu', 'cansado', 'triste'], expect: 'Eu estou cansado e triste.' },
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
