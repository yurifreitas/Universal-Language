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
  /** Artigo escolhido no bloco da frase, por posição. */
  articles?: ('auto' | 'def' | 'indef' | 'none')[]
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
  /**
   * Um modal já satisfeito não engole o verbo seguinte.
   *
   * Achado usando o app: `NÃO · QUERER · SUCO · QUERER · LEITE` saía como
   * "Não quero suco DE QUERER leite". Eram dois defeitos empilhados, e o
   * primeiro escondia o segundo:
   *
   *   1. a preposição vinha de `lex.mass` — que quer dizer INCONTÁVEL, não
   *      "substantivo de estado". Os conjuntos só se cruzam por acaso em medo,
   *      fome e sede; suco, leite e arroz também são incontáveis. Agora a
   *      regência é declarada palavra a palavra em `nounPrepInf`.
   *   2. "querer" é modal, e o motor tratava TODO verbo posterior como
   *      complemento dele — por mais longe que estivesse e mesmo com o
   *      complemento já preenchido. Agora um substantivo entre os dois fecha o
   *      modal, e o segundo verbo coordena.
   *
   * Os dois primeiros casos são o defeito; os quatro seguintes existem para o
   * conserto não quebrar o que funcionava.
   */
  'modal já satisfeito coordena, não completa': [
    {
      cards: ['não', 'querer', 'suco', 'querer', 'leite'],
      expect: 'Não quero suco e quero leite.',
    },
    { cards: ['querer', 'suco', 'querer', 'leite'], expect: 'Quero suco e quero leite.' },
    // O modal AINDA aberto continua pedindo infinitivo colado.
    { cards: ['eu', 'querer', 'comer'], expect: 'Eu quero comer.' },
    { cards: ['eu', 'poder', 'ir'], expect: 'Eu posso ir.' },
    { cards: ['eu', 'querer', 'brincar', 'pintar'], expect: 'Eu quero brincar e pintar.' },
    // Substantivo de estado continua regendo infinitivo — agora por declaração.
    { cards: ['eu', 'fome', 'comer'], expect: 'Eu tenho fome de comer.' },
  ],
  /**
   * O "não" nega ONDE A PESSOA O PÔS.
   *
   * Achado usando o app, e são dois erros opostos que o motor tinha de evitar
   * ao mesmo tempo:
   *
   *   - negar só o primeiro predicado, sempre — saía "Não quero suco, quero
   *     leite", e a pessoa era ouvida dizendo que QUER leite;
   *   - negar tudo, sempre — tiraria dela "não quero suco, quero leite", que é
   *     uma frase legítima de contraste.
   *
   * O critério não é adivinhar: é contar os cards. Um "não" nega um predicado;
   * dois "não" negam dois, e a coordenação vira "nem" — que é literalmente
   * "e não".
   */
  'escopo da negação': [
    { cards: ['não', 'querer', 'suco', 'querer', 'leite'], expect: 'Não quero suco e quero leite.' },
    {
      cards: ['não', 'querer', 'suco', 'não', 'querer', 'leite'],
      expect: 'Não quero suco, nem quero leite.',
    },
    {
      cards: ['não', 'querer', 'suco', 'não', 'querer', 'leite', 'não', 'querer', 'pão'],
      expect: 'Não quero suco, nem quero leite, nem quero o pão.',
    },
    // O marcador de negação é da ORAÇÃO inteira e não vira "nem".
    {
      cards: ['eu', 'querer', 'comer', 'dormir'],
      marks: { negated: true },
      expect: 'Eu não quero comer e dormir.',
    },
  ],

  /**
   * Numeral em algarismo.
   *
   * "dois" estava no léxico e "2" não, então o motor lia o algarismo como mais
   * uma coisa da lista: `EU · QUERER · 9 · PÃO` saía "Eu quero 9 **e** pão".
   * Só apareceu depois que o painel de Números passou a existir — e é
   * justamente lá que a criança vai buscar o número.
   */
  'numeral em algarismo': [
    { cards: ['eu', 'querer', '9', 'pão'], expect: 'Eu quero 9 pães.' },
    { cards: ['eu', 'querer', '1', 'pão'], expect: 'Eu quero 1 pão.' },
    { cards: ['eu', 'querer', '2', 'bolo'], expect: 'Eu quero 2 bolos.' },
  ],

  /**
   * "Quero que você venha" — a oração encaixada.
   *
   * Saía "Quero você vem": duas orações coladas, sem o "que" e sem o
   * subjuntivo. É uma construção cara de perder numa prancha de CAA, porque
   * **pedir que outra pessoa faça algo** é metade da comunicação de quem
   * depende de outras pessoas para quase tudo. Sem ela dá para dizer "eu quero
   * água", mas não "quero que você abra".
   *
   * Com sujeito IGUAL o mesmo verbo rege infinitivo direto ("quero ir"), e um
   * volitivo dentro de oração já subordinada não encaixa o que vem depois —
   * "se você quiser, eu vou" é condicional, não encaixe.
   */
  'oração encaixada por verbo volitivo': [
    { cards: ['eu', 'querer', 'você', 'vir'], expect: 'Eu quero que você venha.' },
    { cards: ['eu', 'querer', 'mãe', 'vir'], expect: 'Eu quero que a mãe venha.' },
    { cards: ['eu', 'precisar', 'você', 'ajudar'], expect: 'Eu preciso que você ajude.' },
    { cards: ['eu', 'querer', 'você', 'ir'], expect: 'Eu quero que você vá.' },
    { cards: ['não', 'querer', 'você', 'vir'], expect: 'Não quero que você venha.' },
    // Sujeito igual: infinitivo, sem "que".
    { cards: ['eu', 'querer', 'ir'], expect: 'Eu quero ir.' },
    { cards: ['eu', 'precisar', 'dormir'], expect: 'Eu preciso dormir.' },
  ],

  /**
   * Duas orações justapostas não ficam coladas.
   *
   * Achado varrendo combinações, não usando o app: `EU · PODER · VOCÊ · VIR`
   * saía "Eu posso você vem" — duas orações grudadas, sem nada entre elas, que
   * não é frase em língua nenhuma.
   *
   * "Poder" não rege oração encaixada como "querer" rege, então não cabe pôr
   * "que". O que cabe é **não colar**. A vírgula é a saída conservadora de
   * propósito: não inventa relação nenhuma entre as duas orações, só marca que
   * são duas. Escolher um conectivo ("e", "mas", "então") seria o motor
   * decidindo o que a pessoa quis dizer.
   *
   * De quebra, a mesma vírgula conserta a subordinada deslocada — "quando o
   * papai chegar, eu brinco" —, onde ela é obrigatória pela norma e faltava.
   */
  'orações justapostas': [
    { cards: ['eu', 'poder', 'você', 'vir'], expect: 'Eu posso, você vem.' },
    { cards: ['eu', 'poder', 'mãe', 'ajudar'], expect: 'Eu posso, a mãe ajuda.' },
    // O volitivo continua encaixando, e não ganha vírgula.
    { cards: ['eu', 'querer', 'você', 'vir'], expect: 'Eu quero que você venha.' },
  ],

  /**
   * Achados pela varredura em lote — `ferramentas/gramatica/`.
   *
   * Uma rodada de 20.000 casos com cobertura de 100% dos pares e trios levou 8
   * segundos e achou estes três. Nenhum aparece isolado: todos precisam de uma
   * COMBINAÇÃO — negação + posição, plural + região —, que é exatamente o que
   * uma tabela escrita à mão não alcança e o que custou caro achar usando o app.
   */
  'combinações achadas em lote': [
    // 191 casos. O card "não" entre o adjetivo e o verbo escondia o verbo de
    // quem olhava uma posição à frente, e a preposição da ligação sumia.
    { cards: ['eu', 'cansado', 'esperar'], expect: 'Eu estou cansado de esperar.' },
    { cards: ['eu', 'cansado', 'não', 'esperar'], expect: 'Eu não estou cansado de esperar.' },
    { cards: ['eu', 'não', 'cansado', 'esperar'], expect: 'Eu não estou cansado de esperar.' },
    { cards: ['eu', 'feliz', 'não', 'ir', 'comer'], expect: 'Eu não estou feliz de ir comer.' },

    // 74 casos. O plural era formado sobre a palavra canônica e só depois a
    // saída tentava regionalizar — mas o mapa de variantes só conhece o
    // singular. Saía "Os crianças": o gênero da variante com a palavra de
    // fábrica.
    { cards: ['criança'], region: 'sul', expect: 'O guri.' },
    { cards: ['criança'], region: 'sul', marks: { plural: true }, expect: 'Os guris.' },
    {
      cards: ['eu', 'querer', 'biscoito'],
      region: 'sul',
      marks: { plural: true },
      expect: 'Eu quero as bolachas.',
    },
    { cards: ['criança'], marks: { plural: true }, expect: 'As crianças.' },

    // O artigo escolhido no bloco não põe determinante onde a estrutura já não
    // comporta um: "um" já ocupa o lugar, e saía "Umas umas titias".
    { cards: ['um', 'titia'], articles: ['auto', 'indef'], expect: 'Uma titia.' },
    { cards: ['um', 'titia'], articles: ['auto', 'def'], expect: 'Uma titia.' },
  ],

  /**
   * A negação por CARD sai no predicado ONDE ELA ESTÁ.
   *
   * Foram duas tentativas. A primeira punha `emitNegation` no topo do ramo do
   * verbo, antes do separador de lista, e saía "Eu quero água **não e** quero o
   * pão" — o "não" atravessava na frente do "e". A ordem certa é a da fala:
   * primeiro liga as duas orações, depois nega a segunda.
   *
   * E "nem" só existe em série JÁ negativa, porque ele é literalmente "e não":
   * sem um predicado negado antes, o segundo "não" tem de sair como "e não".
   */
  'negação na posição do card': [
    {
      cards: ['eu', 'querer', 'água', 'não', 'querer', 'pão'],
      expect: 'Eu quero água e não quero o pão.',
    },
    {
      cards: ['eu', 'não', 'querer', 'água', 'querer', 'pão'],
      expect: 'Eu não quero água e quero o pão.',
    },
    // Série negativa: o segundo "não" vira "nem".
    {
      cards: ['não', 'querer', 'suco', 'não', 'querer', 'leite'],
      expect: 'Não quero suco, nem quero leite.',
    },
    // O marcador da faixa não tem posição: vale para a oração inteira.
    {
      cards: ['eu', 'querer', 'água', 'querer', 'pão'],
      marks: { negated: true },
      expect: 'Eu não quero água e quero o pão.',
    },
    // Sem verbo nenhum, a partícula abre a frase.
    { cards: ['não', 'bolo'], expect: 'Não o bolo.' },
  ],

  /**
   * Duas predicações sobre o mesmo sujeito.
   *
   * `EU · FELIZ · MEDO` saía "Eu estou feliz medo": a cópula do adjetivo já
   * tinha sido emitida, e o substantivo de estado era descartado em silêncio.
   * São duas predicações legítimas com cópulas diferentes — "estar feliz" e
   * "ter medo" — e a língua as junta com "e", como já se faz com dois verbos.
   *
   * Quando a cópula é a MESMA, ela é elidida: "estou feliz e **com** dor", e
   * não "estou feliz e estou com dor", que soa a lista de formulário.
   */
  'duas predicações no mesmo sujeito': [
    { cards: ['eu', 'feliz', 'medo'], expect: 'Eu estou feliz e tenho medo.' },
    { cards: ['eu', 'triste', 'fome'], expect: 'Eu estou triste e tenho fome.' },
    { cards: ['eu', 'feliz', 'dor'], expect: 'Eu estou feliz e com dor.' },
    // Uma predicação só continua como era.
    { cards: ['eu', 'medo'], expect: 'Eu tenho medo.' },
    { cards: ['eu', 'dor', 'barriga'], expect: 'Eu estou com dor na barriga.' },
  ],

  /**
   * A oração nova abre por PREDICADO, não por card de verbo.
   *
   * `FELIZ · EU · GOSTAR · IRMÃO` saía "Vou estar feliz eu gostar do irmão":
   * o "eu" não abria oração porque, para a contagem, ainda não havia verbo —
   * mas havia predicado, "estou feliz", montado com uma cópula que o motor
   * insere e que não é card nenhum.
   */
  'cópula inserida conta como predicado': [
    {
      cards: ['feliz', 'eu', 'gostar', 'irmão'],
      expect: 'Estou feliz, eu gosto do irmão.',
    },
    // Adjetivo depois de substantivo é modificador, e não abre nada.
    { cards: ['eu', 'querer', 'bolo', 'grande'], expect: 'Eu quero o bolo grande.' },
    { cards: ['casa', 'bonito'], expect: 'A casa está bonita.' },
  ],

  /**
   * VOCATIVO — chamar alguém antes de falar com ele.
   *
   * `MÃE · PAI · VOCÊS · NÃO · QUERER · BRINCAR` saía como sujeito composto:
   * "A mãe, o pai e vocês não querem brincar?" — como se fossem três partes
   * diferentes. Mas "vocês" JÁ É a mãe e o pai: ninguém soma o interlocutor a
   * si mesmo numa lista.
   *
   * Chamar alguém é o começo de toda interação, e numa prancha de CAA é como
   * se consegue a ATENÇÃO antes de dizer o resto.
   *
   * Descobriu junto que `vocês` não estava no léxico: fora dele era adivinhado
   * como substantivo masculino, e a frase desmontava inteira —
   * "A mãe e o pai não é e vocês querer brincar."
   */
  'vocativo': [
    {
      cards: ['mãe', 'pai', 'vocês', 'não', 'querer', 'brincar'],
      marks: { question: true },
      expect: 'Mãe, pai, vocês não querem brincar?',
    },
    { cards: ['mãe', 'você', 'querer', 'brincar'], marks: { question: true }, expect: 'Mãe, você quer brincar?' },
    { cards: ['pai', 'você', 'ajudar', 'eu'], expect: 'Pai, você me ajuda.' },
    // Sem pronome de 2a pessoa, continua sujeito composto — é frase sobre eles.
    { cards: ['mãe', 'pai', 'querer', 'brincar'], expect: 'A mãe e o pai querem brincar.' },
    // Com 1a pessoa na lista, o falante se incluiu: sujeito, não chamamento.
    { cards: ['mãe', 'eu', 'você', 'ir'], expect: 'A mãe, eu e você vamos.' },
    // `vocês` conjuga na 3a do plural.
    { cards: ['vocês', 'querer', 'brincar'], expect: 'Vocês querem brincar.' },
    { cards: ['vocês', 'feliz'], expect: 'Vocês estão felizes.' },
  ],

  /**
   * COM + pronome vira uma palavra só.
   *
   * `MÃE · PAI · QUERER · BRINCAR · COM · EU` saía "brincar **com eu**", que
   * não é português em variedade nenhuma. É das primeiras coisas que uma
   * criança pede — brincar **comigo** — e a forma errada marca a fala como
   * estrangeira num lugar onde ela devia soar como a de qualquer criança.
   *
   * Só `com` contrai assim: "para eu" e "de eu" têm outras formas ("para
   * mim", "de mim") e entram à parte quando forem tratadas.
   */
  'com + pronome': [
    {
      cards: ['mãe', 'pai', 'querer', 'brincar', 'com', 'eu'],
      marks: { question: true },
      expect: 'A mãe e o pai querem brincar comigo?',
    },
    { cards: ['você', 'brincar', 'com', 'eu'], marks: { question: true }, expect: 'Você brinca comigo?' },
    { cards: ['eu', 'ir', 'com', 'nós'], expect: 'Eu vou conosco.' },
    // Estes NÃO contraem.
    { cards: ['eu', 'brincar', 'com', 'você'], expect: 'Eu brinco com você.' },
    { cards: ['eu', 'brincar', 'com', 'ele'], expect: 'Eu brinco com ele.' },
    { cards: ['eu', 'brincar', 'com', 'mãe'], expect: 'Eu brinco com a mãe.' },
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
  'subordinação — a frase com duas orações': [
    // Justificar: a construcao que transforma pedido em explicacao.
    { cards: ['eu', 'querer', 'bolo', 'porque', 'eu', 'fome'],
      expect: 'Eu quero o bolo porque eu tenho fome.' },
    { cards: ['eu', 'não', 'querer', 'porque', 'eu', 'cansado'],
      expect: 'Eu não quero porque eu estou cansado.' },
    // Relatar o que o outro disse.
    { cards: ['mamãe', 'dizer', 'que', 'eu', 'ir', 'escola'],
      expect: 'A mamãe diz que eu vou pra escola.' },
    // Adversativa com sujeito proprio em cada oracao.
    { cards: ['eu', 'comer', 'mas', 'eu', 'querer', 'bolo'],
      expect: 'Eu como mas eu quero o bolo.' },
    // Condicional.
    { cards: ['eu', 'brincar', 'se', 'você', 'deixar'],
      expect: 'Eu brinco se você deixar.' },
    // "e" NAO abre oracao: continua sendo coordenacao de verbo.
    { cards: ['eu', 'querer', 'comer', 'e', 'beber'], expect: 'Eu quero comer e beber.' },
  ],
  'futuro do subjuntivo — o tempo que "quando" e "se" exigem': [
    // Regulares: a forma e identica ao infinitivo, e so por isso ja saia certo
    // por acidente. Os irregulares e que denunciavam a falta.
    { cards: ['quando', 'papai', 'chegar', 'eu', 'brincar'],
      expect: 'Quando o papai chegar, eu brinco.' },
    { cards: ['se', 'você', 'querer', 'eu', 'ir'], expect: 'Se você quiser, eu vou.' },
    { cards: ['quando', 'eu', 'ser', 'grande', 'eu', 'querer', 'dirigir'],
      expect: 'Quando eu for grande, eu quero dirigir.' },
    { cards: ['se', 'eu', 'poder', 'eu', 'comer', 'bolo'],
      expect: 'Se eu puder, eu como o bolo.' },
    { cards: ['quando', 'mamãe', 'vir', 'eu', 'falar'],
      expect: 'Quando a mamãe vier, eu falo.' },
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
        ...(c.articles ? { articles: c.articles } : {}),
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
