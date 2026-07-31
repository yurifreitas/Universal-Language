import type { Lexeme } from './lexicon'

/**
 * O léxico gerado a partir do acervo — a camada do meio.
 *
 * O QUE ISTO RESOLVE
 *
 * O léxico revisado à mão tem 250 palavras. O acervo que a busca oferece tem
 * **7.212 termos de uma palavra**. Ou seja: 97% do vocabulário que a pessoa
 * consegue achar e pôr na frase chegava ao motor como palavra desconhecida —
 * sem classe, sem gênero, sem plural. O motor então fazia a coisa certa e
 * conservadora: não conjugava, não concordava, não punha artigo. O resultado
 * era frase telegráfica para quase tudo que saísse das pranchas de fábrica.
 *
 * Esta camada preenche esse vão com dados **medidos**, não chutados. Ver
 * `ferramentas/lexico/LEXICO.md` para o método e os números.
 *
 * A ORDEM DE PRECEDÊNCIA, E POR QUÊ
 *
 *   1. `LEXICON` — revisado à mão, sempre vence. Uma pessoa olhou cada
 *      entrada; nenhuma inferência tem autoridade sobre isso.
 *   2. este léxico — inferido do acervo, só o que passou no corte de confiança.
 *   3. `guess()` — a adivinhação por terminação, que continua existindo para o
 *      que não está em lugar nenhum.
 *
 * ROBUSTEZ
 *
 * Tudo aqui falha para o comportamento de hoje. Se o arquivo não carregar, se
 * vier corrompido, se a versão for desconhecida ou se a rede não existir, o
 * app funciona exatamente como funcionava antes — com `guess()`. Um léxico
 * maior é uma melhoria, nunca um requisito: **a prancha tem de abrir sem ele.**
 */

/** Versões do formato que este código sabe ler. */
const VERSOES_ACEITAS = new Set(['1', '1.0', '1.0.0'])

interface Envelope {
  versao?: string
  atualizadoEm?: string
  descricao?: string
  fonte?: string
  entradas?: Record<string, unknown>
}

let carregado: Record<string, Lexeme> = {}
let estado: 'vazio' | 'carregando' | 'pronto' | 'falhou' = 'vazio'
let emCurso: Promise<void> | null = null

/**
 * Classes que esta camada aceita. Qualquer outra é descartada na leitura.
 *
 * As quatro últimas entraram quando a inferência passou a separar o que o
 * `type=4` da ARASAAC junta: aquele código não quer dizer "adjetivo", quer
 * dizer **modificador**, e recolhe advérbio (*depressa*, *agora*), numeral
 * cardinal (*trinta*, *cem*), possessivo (*minhas*) e demonstrativo (*aquelas*)
 * no mesmo balde.
 *
 * Publicá-los como adjetivo fazia o motor pôr cópula onde não cabe — "o dia vai
 * estar depressa". Com a classe certa ele trata cada um como deve.
 *
 * Classes que exigem estrutura própria — `question`, `preposition` — ficam de
 * fora de propósito: a inferência não sabe montar o que elas regem, e publicar
 * meia informação sobre elas trocaria um erro por outro.
 */
const CLASSES = new Set([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'quantifier',
  'determiner',
  'article',
])

/**
 * Valida entrada a entrada, e descarta a que não couber.
 *
 * Um arquivo gerado por uma versão futura da ferramenta pode trazer campo que
 * este código não conhece; o certo é ignorar o campo e ficar com o resto, e
 * não recusar o arquivo inteiro. Mas classe fora do conjunto conhecido é outra
 * coisa: significa que o significado do dado mudou, e aí a entrada sai.
 */
/**
 * O CONTRATO DO LÉXICO GERADO — quais marcas atravessam do arquivo para o motor.
 *
 * Esta lista é a padronização: um campo que não estiver aqui não chega ao motor,
 * por mais que o gerador o escreva. Ela é declarada uma vez e consumida pelo
 * validador abaixo, em vez de repetida numa linha por campo.
 *
 * O que está de fora, e por quê:
 *
 *   `class` e `gender` — validados à parte, porque têm domínio fechado e não são
 *   booleanos nem texto livre.
 *
 *   `person`, `postposed`, `fixed` — descrevem palavras de classe FECHADA
 *   (pronomes, possessivos, locuções travadas). Nenhuma delas vem do acervo:
 *   são as 250 revisadas à mão, e essas já estão no `LEXICON`. Deixar o gerador
 *   declará-las abriria caminho para uma inferência automática marcar
 *   `person: '1s'` num substantivo qualquer.
 */
const CAMPOS_BOOLEANOS = [
  // Numeral cardinal já é plural por natureza — "trinta bolos". Sem este campo,
  // os 31 numerais entravam mudos e o substantivo não pluralizava.
  'plural',
  'femininoBase',
  'mass',
  'animate',
  'place',
  'bodyPart',
  'bareAfterPrep',
  'device',
  'modal',
  'copulaSer',
  'prenominal',
  'predicativo',
  // Comportamento de classe aberta — a razão de existir desta lista. Ver o bloco
  // correspondente em `lexicon.ts`.
  'volitivo',
  'opiniao',
  'ligacao',
  'ditransitivo',
  'atividade',
  'soTerceira',
] as const satisfies readonly (keyof Lexeme)[]

const CAMPOS_TEXTO = [
  'pluralForm',
  'prep',
  'prepInf',
  'nounPrepInf',
] as const satisfies readonly (keyof Lexeme)[]

function limpar(bruto: Record<string, unknown>): Record<string, Lexeme> {
  const saida: Record<string, Lexeme> = {}
  for (const [palavra, valor] of Object.entries(bruto)) {
    if (!palavra || typeof valor !== 'object' || valor === null) continue
    const v = valor as Record<string, unknown>
    if (typeof v['class'] !== 'string' || !CLASSES.has(v['class'])) continue

    const entrada: Lexeme = { class: v['class'] as Lexeme['class'] }
    if (v['gender'] === 'm' || v['gender'] === 'f') entrada.gender = v['gender']

    // Transporte guiado pelas listas declaradas acima, e não por uma linha por
    // campo. Era assim antes, e o efeito era silencioso: um campo novo no
    // `Lexeme` simplesmente não atravessava, e a regra que dependia dele ficava
    // muda para as 4.905 palavras geradas — sem erro, sem aviso, sem teste
    // falhando. Declarar o conjunto num lugar só faz o transporte acompanhar o
    // tipo em vez de ficar para trás dele.
    for (const campo of CAMPOS_BOOLEANOS) {
      if (v[campo] === true) entrada[campo] = true
    }
    for (const campo of CAMPOS_TEXTO) {
      const valorTexto = v[campo]
      if (typeof valorTexto === 'string' && valorTexto.trim()) entrada[campo] = valorTexto.trim()
    }
    saida[palavra.trim().toLowerCase()] = entrada
  }
  return saida
}

/**
 * Carrega o léxico gerado. Idempotente e à prova de falha: chamar duas vezes
 * não baixa duas vezes, e qualquer erro deixa o app no estado de antes.
 */
export function carregarLexico(baseUrl: string): Promise<void> {
  if (estado === 'pronto' || estado === 'falhou') return Promise.resolve()
  if (emCurso) return emCurso

  estado = 'carregando'
  emCurso = fetch(`${baseUrl}data/lexico.json`)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status))
      return r.json() as Promise<Envelope>
    })
    .then((env) => {
      if (!env || typeof env !== 'object') throw new Error('formato')
      // Versão desconhecida não é carregada: o significado dos campos pode ter
      // mudado, e um léxico errado é pior que léxico nenhum.
      if (env.versao && !VERSOES_ACEITAS.has(String(env.versao))) {
        throw new Error(`versão ${env.versao}`)
      }
      if (!env.entradas || typeof env.entradas !== 'object') throw new Error('sem entradas')
      carregado = limpar(env.entradas as Record<string, unknown>)
      estado = 'pronto'
    })
    .catch(() => {
      // Silencioso de propósito: a ausência deste arquivo não é um erro que a
      // pessoa possa resolver, e o app continua inteiro sem ele.
      carregado = {}
      estado = 'falhou'
    })

  return emCurso
}

/** A entrada gerada para uma palavra, se houver. */
export function lexicoGerado(chave: string): Lexeme | undefined {
  return carregado[chave]
}

/**
 * Injeta um léxico direto, sem rede.
 *
 * Existe para o teste poder exercitar a validação e a precedência sem servidor
 * — e é a mesma porta por onde um léxico embutido no bundle entraria, se um
 * dia isso valer a pena. Passa pela MESMA limpeza do arquivo baixado: dado
 * injetado não tem privilégio nenhum sobre dado carregado.
 */
export function definirLexicoGerado(entradas: Record<string, unknown>): void {
  carregado = limpar(entradas)
  estado = 'pronto'
}

/** Volta ao estado de app recém-aberto. Só o teste usa. */
export function esquecerLexicoGerado(): void {
  carregado = {}
  estado = 'vazio'
  emCurso = null
}

/** Quantas palavras o léxico gerado trouxe — para a tela de ajustes mostrar. */
export function tamanhoDoLexicoGerado(): number {
  return Object.keys(carregado).length
}

export function estadoDoLexico(): typeof estado {
  return estado
}
