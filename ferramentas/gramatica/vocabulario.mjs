/**
 * De onde saem as palavras que a ferramenta põe nas frases.
 *
 * A DECISÃO: vocabulário inventado não serve.
 *
 * Uma lista escrita à mão dentro da ferramenta testa o que quem escreveu a
 * ferramenta imaginou — e os defeitos que apareceram até hoje apareceram
 * justamente em palavras que ninguém imaginou. Então o vocabulário sai do
 * léxico real, nas duas camadas que o app usa:
 *
 *   1. `LEXICON` — 250 palavras revisadas à mão, com todas as marcas finas
 *      (`mass`, `animate`, `place`, `device`, `bodyPart`, `prep`, `modal`).
 *      É de onde vêm os casos com traço específico, porque só aqui o traço
 *      existe anotado.
 *   2. `lexico.json` — ~4.900 palavras inferidas do acervo. É de onde vem a
 *      cauda: substantivo e adjetivo comuns que o motor trata com menos
 *      informação, que é a condição da maioria das palavras que a pessoa
 *      traz pela busca.
 *
 * A amostragem da camada 2 é por passo fixo sobre as chaves ordenadas, não por
 * sorteio: assim o conjunto não muda quando a semente muda, e uma suspeita
 * achada hoje continua achável amanhã.
 */

/** Amostra `quantos` itens espalhados por toda a lista, sempre os mesmos. */
function espalhar(lista, quantos) {
  if (lista.length <= quantos) return [...lista]
  const passo = lista.length / quantos
  const saida = []
  for (let i = 0; i < quantos; i++) saida.push(lista[Math.floor(i * passo)])
  return saida
}

export function montarVocabulario(motor) {
  const { LEXICON, lookup } = motor
  const entradas = Object.entries(LEXICON)

  const daClasse = (classe, filtro = () => true) =>
    entradas.filter(([, l]) => l.class === classe && filtro(l)).map(([p]) => p)

  const gerado = Object.entries(motor.lexicoGeradoBruto ?? {})
    .filter(([p]) => !LEXICON[p] && !p.includes(' '))
    .sort((a, b) => a[0].localeCompare(b[0], 'pt'))

  const geradoDaClasse = (classe, quantos, filtro = () => true) =>
    espalhar(
      gerado.filter(([, l]) => l.class === classe && filtro(l)).map(([p]) => p),
      quantos,
    )

  return {
    /* Sujeito. A string vazia é um valor legítimo: "sem pronome" é o caso em
       que o motor assume 1ª pessoa, e é uma das apostas declaradas do
       GRAMMAR.md — precisa ser exercitada tanto quanto os pronomes. */
    pronome: ['', ...daClasse('pronoun')],

    /* Verbos separados de modais porque a distinção é o que produziu
       "quero e comer" no passado: o par modal+verbo tem de ser coberto. */
    verbo: daClasse('verb', (l) => !l.modal && !l.fixed),
    verboModal: daClasse('verb', (l) => l.modal),
    verboRegido: daClasse('verb', (l) => !!l.prep),
    verboFixo: daClasse('verb', (l) => !!l.fixed),
    verboDesconhecido: geradoDaClasse('verb', 12),

    substantivo: daClasse('noun', (l) => !l.mass && !l.animate && !l.place),
    substantivoMassa: daClasse('noun', (l) => !!l.mass),
    substantivoAnimado: daClasse('noun', (l) => !!l.animate),
    substantivoLugar: daClasse('noun', (l) => !!l.place),
    substantivoAparelho: daClasse('noun', (l) => !!l.device),
    substantivoCorpo: daClasse('noun', (l) => !!l.bodyPart),
    substantivoGerado: geradoDaClasse('noun', 40),

    adjetivo: daClasse('adjective'),
    adjetivoGerado: geradoDaClasse('adjective', 20),

    determinante: daClasse('determiner'),
    quantificador: daClasse('quantifier'),
    negacao: daClasse('negation'),
    conectivo: daClasse('connector'),
    preposicao: daClasse('preposition'),
    artigoSolto: daClasse('article'),
    pergunta: daClasse('question'),
    advTempo: Object.keys(motor.TIME_ADVERBS),

    /* Numeral por extenso e algarismo. O algarismo entra porque o painel de
       Números é de onde a criança tira o número, e já produziu defeito
       ("quero 9 e pão"). */
    numeral: ['um', 'dois', 'três', 'quatro', 'dez', '1', '2', '3', '9', '12'],

    /** A ficha de uma palavra, para os detectores consultarem. */
    ficha: (palavra) => lookup(palavra),
  }
}
