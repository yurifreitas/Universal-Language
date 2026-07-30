/**
 * Enumerador do espaço de combinações do motor de frases (Eixo D1).
 *
 *   node ferramentas/gramatica/enumerar.mjs --casos=20000 --semente=1
 *
 * Gera combinações com cobertura de pares e trios (ver `cobertura.mjs`), roda
 * o motor em cada uma e grava um JSONL com entrada, marcadores, opções e saída
 * — inclusive os tokens, que é o que permite ao detector verificar as
 * invariantes duras sem comparar strings.
 *
 * ISTO NÃO É UM SERVIDOR. É ferramenta de construção: roda na máquina de quem
 * desenvolve e cospe um arquivo. O app publicado continua estático e offline.
 *
 * PARÂMETROS
 *
 *   --casos=N     teto de casos gerados (padrão 20000)
 *   --semente=N   semente do sorteador (padrão 1) — mesma semente, mesma saída
 *   --familias=N  1 caso em cada N vira família: o mesmo conteúdo repetido nas
 *                 6 regiões × 2 registros, com o mesmo `familia`. É o único
 *                 jeito de o detector comparar variedades entre si, porque a
 *                 comparação exige o par, não o caso solto.
 *   --saida=CAM   arquivo de saída (padrão ferramentas/gramatica/casos.jsonl)
 */

import { createWriteStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { carregarMotor, sorteador, raiz } from './motor.mjs'
import { montarVocabulario } from './vocabulario.mjs'
import { gerarCasos } from './cobertura.mjs'

const aqui = dirname(fileURLToPath(import.meta.url))

function argumento(nome, padrao) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`))
  return achado ? achado.slice(nome.length + 3) : padrao
}

/** Amostra espalhada, para dimensão lexical não explodir o número de pares. */
function limitar(lista, quantos) {
  if (lista.length <= quantos) return [...lista]
  const passo = lista.length / quantos
  return Array.from({ length: quantos }, (_, i) => lista[Math.floor(i * passo)])
}

/**
 * As formas de frase.
 *
 * Cada forma é um arranjo de cards, e a lista existe porque o motor não trata
 * "uma frase": trata sujeito composto, coordenação de verbos, complemento de
 * modal, lista de substantivos animados, locativo de aparelho — regras
 * diferentes que só se encontram em formas diferentes. Sortear cards soltos
 * cobriria o léxico e quase nunca a regra.
 */
const FORMAS = {
  'sujeito+verbo': (v) => [v.pronome, v.verbo],
  'sujeito+verbo+objeto': (v) => [v.pronome, v.verbo, v.subst1],
  'objeto duplo': (v) => [v.verbo, v.subst1, v.subst2],
  'verbos coordenados': (v) => [v.pronome, v.verbo, v.verboAlt],
  'modal+infinitivo': (v) => [v.pronome, v.modal, v.verbo],
  'modal+objeto+verbo': (v) => [v.modal, v.pronome2, v.verbo],
  'substantivo+adjetivo': (v) => [v.subst1, v.adjetivo],
  'lista de três': (v) => [v.subst1, v.subst2, v.animado],
  'lista de quatro': (v) => [v.animado, v.subst1, v.subst2, v.substGerado],
  'sujeito composto': (v) => [v.animado, v.pronome2, v.verbo, v.subst1],
  numeral: (v) => [v.numeral, v.subst1],
  'preposição escolhida': (v) => [v.subst1, v.preposicao, v.subst2],
  'cópula com adjetivo': (v) => [v.pronome2, v.adjetivo],
  'palavra de pergunta': (v) => [v.pergunta, v.subst1],
  'dor e corpo': (v) => ['dor', v.corpo],
  'quantificador': (v) => [v.quantificador, v.subst1],
  'determinante+substantivo+adjetivo': (v) => [v.determinante, v.subst1, v.adjetivo],
  'verbo com regência': (v) => [v.pronome, v.verboRegido, v.subst1],
  'movimento e lugar': (v) => [v.pronome, 'ir', v.lugar],
  'advérbio de tempo': (v) => [v.advTempo, v.pronome, v.verbo, v.subst1],
  aparelho: (v) => [v.pronome, v.verbo, v.aparelho],
  'fora do léxico': (v) => [v.pronome, v.verboDesconhecido, v.substGerado],
  'seis cards': (v) => [
    v.advTempo,
    v.pronome2,
    v.modal,
    v.verbo,
    v.subst1,
    v.conectivo,
    v.subst2,
    v.adjetivo,
  ],
  'ligação com verbo seguinte': (v) => [v.pronome2, v.adjetivo, v.modal, v.verbo],
}

const motor = await carregarMotor()
const voc = montarVocabulario(motor)

const substantivos = [
  ...voc.substantivo,
  ...voc.substantivoMassa,
  ...voc.substantivoAnimado,
  ...voc.substantivoLugar,
  ...voc.substantivoAparelho,
  ...voc.substantivoCorpo,
  ...voc.substantivoGerado,
]

const dimensoes = {
  forma: Object.keys(FORMAS),
  pronome: limitar(voc.pronome, 9),
  pronome2: limitar(voc.pronome.filter(Boolean), 8),
  verbo: limitar(voc.verbo, 24),
  verboAlt: limitar([...voc.verbo].reverse(), 16),
  verboRegido: limitar(voc.verboRegido, 8),
  verboDesconhecido: limitar(voc.verboDesconhecido, 8),
  modal: voc.verboModal,
  subst1: limitar(substantivos, 28),
  subst2: limitar([...substantivos].reverse(), 20),
  animado: limitar(voc.substantivoAnimado, 10),
  lugar: limitar(voc.substantivoLugar, 8),
  aparelho: limitar(voc.substantivoAparelho, 6),
  corpo: limitar(voc.substantivoCorpo, 8),
  substGerado: limitar(voc.substantivoGerado, 16),
  adjetivo: limitar([...voc.adjetivo, ...voc.adjetivoGerado], 20),
  determinante: voc.determinante,
  quantificador: voc.quantificador,
  conectivo: voc.conectivo.length ? voc.conectivo : ['e'],
  preposicao: voc.preposicao.length ? voc.preposicao : ['de', 'em', 'com'],
  pergunta: voc.pergunta,
  numeral: voc.numeral,
  advTempo: voc.advTempo,

  tempo: ['auto', 'present', 'past', 'imperfect', 'future'],
  negado: [false, true],
  marcaPergunta: [false, true],
  progressivo: [false, true],
  pedido: [false, true],
  marcaPlural: [false, true],
  genero: ['n', 'm', 'f'],
  regiao: motor.REGIONS.map((r) => r.id),
  registro: ['coloquial', 'normativo'],
  artigoModo: motor.ARTICLE_MODES,
  artigoPosicao: [0, 1, 2, 3],
  /* Onde o card NÃO entra. -1 é "nenhum": a negação por card e a negação por
     marcador são mecanismos diferentes e precisam aparecer separadas e
     juntas. */
  cardNegacao: [-1, 0, 1, 2, 3],
}

/* Trios só entre as dimensões pequenas. Ver o cabeçalho de `cobertura.mjs`. */
const TRIOS = [
  'forma',
  'tempo',
  'negado',
  'marcaPergunta',
  'progressivo',
  'pedido',
  'marcaPlural',
  'genero',
  'regiao',
  'registro',
  'artigoModo',
  'cardNegacao',
]

const totalCasos = Number(argumento('casos', '20000'))
const semente = Number(argumento('semente', '1'))
const passoFamilia = Number(argumento('familias', '12'))
const destino = argumento('saida', join(aqui, 'casos.jsonl'))

const aleatorio = sorteador(semente)
const inicio = Date.now()

/* As famílias (12 variantes cada) contam para o teto pedido, senão `--casos`
   deixaria de dizer quanto trabalho o detector vai receber. */
const variantesPorFamilia = dimensoes.regiao.length * dimensoes.registro.length
const combosBase = Math.max(
  1,
  Math.floor(totalCasos / (1 + (variantesPorFamilia - 1) / passoFamilia)),
)

const { casos, paresTotais, paresCobertos, triosTotais, triosCobertos } = gerarCasos({
  dimensoes,
  casos: combosBase,
  aleatorio,
  trios: TRIOS,
})

const fluxo = createWriteStream(destino, { encoding: 'utf8' })
let escritos = 0
let comErro = 0

function montarCards(c) {
  const bruto = FORMAS[c.forma](c).filter((p) => p && String(p).trim())
  if (c.cardNegacao >= 0) {
    const pos = Math.min(c.cardNegacao, bruto.length)
    bruto.splice(pos, 0, 'não')
  }
  return bruto.map((label, id) => ({ id, label: String(label) }))
}

function rodar(c, cards, regiao, registro, familia) {
  const marcadores = {
    tense: c.tempo,
    negated: c.negado,
    question: c.marcaPergunta,
    plural: c.marcaPlural,
    progressive: c.progressivo,
    request: c.pedido,
  }
  const articles = new Array(cards.length).fill('auto')
  if (c.artigoPosicao < articles.length) articles[c.artigoPosicao] = c.artigoModo

  const opcoes = {
    articles,
    speakerGender: c.genero,
    region: regiao,
    register: registro,
  }

  let saida
  try {
    const r = motor.compose(cards, { marks: marcadores, ...opcoes })
    saida = { text: r.text, raw: r.raw, changes: r.changes, tokens: r.tokens }
  } catch (erro) {
    comErro++
    saida = { erro: String(erro && erro.message ? erro.message : erro) }
  }

  fluxo.write(
    JSON.stringify({
      id: escritos++,
      familia,
      forma: c.forma,
      entrada: cards.map((k) => k.label),
      marcadores,
      opcoes,
      saida,
    }) + '\n',
  )
}

casos.forEach((c, i) => {
  const cards = montarCards(c)
  if (cards.length === 0) return
  const emFamilia = i % passoFamilia === 0
  if (!emFamilia) {
    rodar(c, cards, c.regiao, c.registro, null)
    return
  }
  for (const regiao of dimensoes.regiao) {
    for (const registro of dimensoes.registro) {
      rodar(c, cards, regiao, registro, `f${i}`)
    }
  }
})

fluxo.end()

const segundos = ((Date.now() - inicio) / 1000).toFixed(1)
console.log(`casos escritos: ${escritos}   (${segundos}s)`)
console.log(`combinações-base: ${casos.length}   famílias: 1 em cada ${passoFamilia}`)
console.log(
  `pares cobertos: ${paresCobertos}/${paresTotais} ` +
    `(${((paresCobertos / paresTotais) * 100).toFixed(1)}%)`,
)
console.log(
  `trios cobertos: ${triosCobertos}/${triosTotais} ` +
    `(${((triosCobertos / triosTotais) * 100).toFixed(1)}%)`,
)
if (comErro) console.log(`EXCEÇÕES do motor: ${comErro}`)
console.log(`saída: ${destino.replace(raiz, '.')}`)
