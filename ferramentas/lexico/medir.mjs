/**
 * O relatório de precisão.
 *
 * Roda a MESMA inferência de `gerar.mjs` sobre o léxico revisado à mão e
 * compara. Existe por um motivo só: sem ele, qualquer mexida nas regras de
 * terminação é uma aposta, e uma regressão de gênero só apareceria quando
 * alguém lesse "o mão" na tela.
 *
 *   node ferramentas/lexico/medir.mjs
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  inferir, lerAcervo, gabarito, pluralDoMotor, construirContexto,
  CAMPOS_COMPORTAMENTO_GABARITO,
} from './inferir.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const acervo = lerAcervo(join(raiz, 'data', 'arasaac.sqlite'))
// O par masculino de um adjetivo em -a é evidência que só existe olhando o
// acervo inteiro; por isso o contexto é montado uma vez, antes das inferências.
const contexto = construirContexto(acervo)
const revisado = gabarito(readFileSync(join(raiz, 'web', 'src', 'lib', 'lexicon.ts'), 'utf8'))

/* As classes que a inferência sabe produzir. Comparar contra pronome ou
 * advérbio não mediria a inferência, mediria o recorte do gabarito. */
const COMPARAVEIS = new Set(['noun', 'verb', 'adjective'])

const erros = { classe: [], genero: [], plural: [], adjetivo: [] }
let noGabarito = 0
let coberto = 0
const conta = {
  classeTotal: 0, classeOk: 0,
  generoTotal: 0, generoOk: 0,
  generoAltoTotal: 0, generoAltoOk: 0,
  pluralTotal: 0, pluralOk: 0,
  adjTotal: 0, adjOk: 0,
  alta: 0,
}

for (const [palavra, esperado] of revisado) {
  if (!COMPARAVEIS.has(esperado.class)) continue
  noGabarito += 1
  const linhas = acervo.get(palavra)
  if (!linhas) continue
  const r = inferir(palavra, linhas, contexto)
  if (!r) continue
  coberto += 1
  if (r.confianca === 'alta') conta.alta += 1

  conta.classeTotal += 1
  if (r.entrada.class === esperado.class) conta.classeOk += 1
  else erros.classe.push(`${palavra}: inferi ${r.entrada.class}, é ${esperado.class}`)

  // Adjetivo é medido à parte porque `gender` quer dizer outra coisa nele:
  // não é o gênero da palavra, é a marca de "tem duas formas". A ausência é
  // uma resposta ("invariável"), então ela também é conferida — misturar isso
  // com a medida de substantivo daria uma média que não descreve nem um nem
  // outro.
  if (r.entrada.class === 'adjective' && esperado.class === 'adjective') {
    conta.adjTotal += 1
    if ((r.entrada.gender ?? null) === (esperado.gender ?? null)) conta.adjOk += 1
    else {
      erros.adjetivo.push(
        `${palavra}: inferi ${r.entrada.gender ?? 'invariável'}, é ${esperado.gender ?? 'invariável'}`,
      )
    }
  }

  if (esperado.gender && r.entrada.class === 'noun') {
    conta.generoTotal += 1
    const ok = r.entrada.gender === esperado.gender
    if (ok) conta.generoOk += 1
    else {
      erros.genero.push(
        `${palavra}: inferi ${r.entrada.gender ?? '—'}, é ${esperado.gender}` +
          ` [${Object.entries(r.sinais).map(([k, v]) => `${k}=${v ?? '-'}`).join(' ')}]` +
          ` (${r.confianca})`,
      )
    }
    if (r.confianca === 'alta') {
      conta.generoAltoTotal += 1
      if (ok) conta.generoAltoOk += 1
    }
  }

  // O plural é medido pela FORMA QUE O MOTOR VAI IMPRIMIR, não pelo campo.
  // Calar quando o motor já acerta sozinho é a resposta certa, e contar isso
  // como erro faria a métrica pedir exatamente o dado redundante que a
  // ferramenta existe para não emitir.
  if (esperado.pluralForm) {
    conta.pluralTotal += 1
    const final = r.entrada.pluralForm ?? pluralDoMotor(palavra)
    if (final === esperado.pluralForm) conta.pluralOk += 1
    else erros.plural.push(`${palavra}: motor diria "${final}", é "${esperado.pluralForm}"`)
  }
}

const pc = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—')
const linha = (nome, ok, total) =>
  `  ${nome.padEnd(30)} ${String(ok).padStart(4)}/${String(total).padEnd(5)} ${pc(ok, total).padStart(7)}`

console.log('\nPRECISÃO DA INFERÊNCIA — gabarito = léxico revisado à mão\n')
console.log(`  gabarito (noun/verb/adj)       ${noGabarito}`)
console.log(`  presentes no acervo            ${coberto}  (${pc(coberto, noGabarito)} de cobertura)`)
console.log(`  destes, confiança alta         ${conta.alta}  (${pc(conta.alta, coberto)})\n`)
console.log(linha('classe', conta.classeOk, conta.classeTotal))
console.log(linha('gênero (tudo que inferi)', conta.generoOk, conta.generoTotal))
console.log(linha('gênero (só confiança alta)', conta.generoAltoOk, conta.generoAltoTotal))
console.log(linha('plural irregular', conta.pluralOk, conta.pluralTotal))
console.log(linha('adjetivo: m vs invariável', conta.adjOk, conta.adjTotal))

for (const [nome, lista] of Object.entries(erros)) {
  if (!lista.length) continue
  console.log(`\n  erros de ${nome} (${lista.length}):`)
  for (const e of lista) console.log(`    - ${e}`)
}

/* ------------------------------------- comuns de dois gêneros: nenhum gênero */

/**
 * Não é uma medida, é uma trava.
 *
 * Estas palavras têm os dois gêneros, e qualquer uma delas sair do gerador com
 * `gender` é regressão — o app passaria a dizer "a dentista" de um homem, que
 * numa prancha de CAA é pôr a pessoa errada na frase. É exatamente o tipo de
 * erro que volta silencioso quando alguém mexer nas regras de terminação, e por
 * isso ele mora aqui e não numa revisão de código.
 */
const DOIS_GENEROS = [
  'dentista', 'artista', 'estudante', 'cliente', 'jornalista', 'motorista',
  'colega', 'jovem', 'intérprete', 'atleta', 'pediatra', 'astronauta',
]

const vazaram = []
for (const palavra of DOIS_GENEROS) {
  const linhas = acervo.get(palavra)
  if (!linhas) continue
  const r = inferir(palavra, linhas, contexto)
  if (r?.entrada.gender) vazaram.push(`${palavra} saiu como ${r.entrada.gender}`)
}

console.log('\n  COMUNS DE DOIS GÊNEROS — nenhum pode sair com gênero')
console.log(
  vazaram.length
    ? `    FALHOU: ${vazaram.join('; ')}`
    : `    OK — ${DOIS_GENEROS.length} conferidos, nenhum com gênero`,
)

/* ------------------------------------ adjetivo invariável: nenhum gênero */

/**
 * A armadilha simétrica à do `-ista`. Em adjetivo, `gender: 'm'` é a chave que
 * liga a flexão em `agree()`; pô-la num invariável faria o motor tentar
 * flexionar o que não flexiona. Trava, não medida.
 */
const INVARIAVEIS = [
  'feliz', 'triste', 'grande', 'simples', 'ruim', 'azul', 'legal', 'igual',
  'doente', 'quente', 'fácil', 'difícil', 'forte', 'verde', 'jovem',
]

const flexionaram = []
for (const palavra of INVARIAVEIS) {
  const linhas = acervo.get(palavra)
  if (!linhas) continue
  const r = inferir(palavra, linhas, contexto)
  if (r?.entrada.class === 'adjective' && r.entrada.gender) {
    flexionaram.push(`${palavra} saiu como ${r.entrada.gender}`)
  }
}

console.log('\n  ADJETIVOS INVARIÁVEIS — nenhum pode sair com gênero')
console.log(
  flexionaram.length
    ? `    FALHOU: ${flexionaram.join('; ')}`
    : `    OK — ${INVARIAVEIS.length} conferidos, nenhum com gênero`,
)

/* ------------------------------- femininoBase: exclusividade e armadilha */

/**
 * `gender` e `femininoBase` são mutuamente exclusivos por definição: um diz "o
 * rótulo é a forma masculina, flexione para feminino", o outro diz o contrário.
 * Uma entrada com os dois é contradição, e `agree()` aplicaria os dois ramos em
 * sequência. Varrido sobre o acervo inteiro, não sobre uma amostra.
 */
const contraditorias = []
for (const [termo, linhas] of acervo) {
  const r = inferir(termo, linhas, contexto)
  if (r?.entrada.gender && r.entrada.femininoBase) contraditorias.push(termo)
}

console.log('\n  gender + femininoBase NA MESMA ENTRADA — impossível')
console.log(
  contraditorias.length
    ? `    FALHOU: ${contraditorias.slice(0, 10).join(', ')} (${contraditorias.length})`
    : `    OK — ${acervo.size} termos varridos, nenhuma contradição`,
)

/**
 * A armadilha do `-ista` de roupa nova: adjetivo invariável em `-a` que ganha
 * `femininoBase` faz o motor imprimir "otimisto".
 */
const INVARIAVEIS_EM_A = [
  'otimista', 'pessimista', 'hipócrita', 'agrícola', 'indígena', 'azteca',
  'egoísta', 'realista', 'idealista', 'careca', 'poliglota',
]

const converteram = []
for (const palavra of INVARIAVEIS_EM_A) {
  const linhas = acervo.get(palavra)
  if (!linhas) continue
  const r = inferir(palavra, linhas, contexto)
  if (r?.entrada.femininoBase) converteram.push(palavra)
}

console.log('\n  INVARIÁVEIS EM -a — nenhum pode sair com femininoBase')
console.log(
  converteram.length
    ? `    FALHOU: ${converteram.join(', ')}`
    : `    OK — ${INVARIAVEIS_EM_A.length} conferidos, nenhum marcado`,
)

/* ------------------------------------ o `type=4` não pode virar adjetivo */

/**
 * O `type=4` da ARASAAC mistura modificadores: advérbio, numeral e possessivo
 * vinham publicados como adjetivo, e o motor punha cópula onde cabia adjunto
 * ("Nosso dia não vai estar depressa"). Aparecia como erro de concordância, mas
 * era de classe.
 *
 * A trava é por classe ESPERADA, não só "não é adjetivo": trocar advérbio por
 * numeral passaria despercebido de outro jeito.
 */
const CLASSE_ESPERADA = Object.entries({
  depressa: 'adverb', agora: 'adverb', nunca: 'adverb', fora: 'adverb',
  ali: 'adverb', atrás: 'adverb', longe: 'adverb',
  trinta: 'quantifier', oitenta: 'quantifier', cem: 'quantifier',
  quinze: 'quantifier', mil: 'quantifier',
  minha: 'determiner', suas: 'determiner', algum: 'determiner',
  qualquer: 'determiner',
  esta: 'article', aqueles: 'article',
})

const classeErrada = []
for (const [palavra, esperada] of CLASSE_ESPERADA) {
  const linhas = acervo.get(palavra)
  if (!linhas) continue
  const r = inferir(palavra, linhas, contexto)
  const obtida = r?.entrada.class ?? '(descartado)'
  if (obtida !== esperada) classeErrada.push(`${palavra}: ${obtida}, esperava ${esperada}`)
}

console.log('\n  MODIFICADORES DO type=4 — classe certa, nunca adjetivo')
console.log(
  classeErrada.length
    ? `    FALHOU: ${classeErrada.join('; ')}`
    : `    OK — ${CLASSE_ESPERADA.length} conferidos, todos na classe certa`,
)

/* ==========================================================================
   TRAVA — o comportamento gerado nao pode CONTRADIZER o revisado a mao

   As seis marcas de classe aberta (ver LEXICO-PADRAO.md) sao semanticas, e
   inferidas por lista declarada. O risco delas nao e a lacuna: e o conflito.

   Uma lacuna deixa a regra muda, e mudo e o estado de antes — nunca pior. Um
   CONFLITO e outra coisa: o `LEXICON` revisado a mao vence no `lookup`, entao
   uma marca gerada errada nao apareceria neste app, mas apareceria em qualquer
   consumidor do `lexico.json` que nao tenha o LEXICON — a ferramenta de
   auditoria, um export, uma prancha de terceiro.

   Silencioso e divergente e a pior combinacao possivel. Entao a divergencia
   falha aqui, no build, e nao la.
   ========================================================================== */
const conflitos = []
let verbosConferidos = 0
let verbosComMarca = 0
for (const [palavra, esperado] of revisado) {
  if (esperado?.class !== 'verb') continue
  const linhas = acervo.get(palavra)
  if (!linhas) continue
  const r = inferir(palavra, linhas, contexto)
  if (!r || r.entrada.class !== 'verb') continue
  verbosConferidos++
  let temMarca = false
  for (const campo of CAMPOS_COMPORTAMENTO_GABARITO) {
    const gerado = r.entrada[campo] === true
    const mao = esperado[campo] === true
    if (gerado) temMarca = true
    // Só conflito conta. O gerado ter MENOS que o revisado é lacuna conhecida —
    // a lista cobre vocabulário de prancha, não o português inteiro.
    if (gerado && !mao) conflitos.push(`${palavra}.${campo}: gerado marca, revisado não`)
  }
  if (temMarca) verbosComMarca++
}

console.log('\n  COMPORTAMENTO DO VERBO — gerado não contradiz o revisado à mão')
console.log(
  conflitos.length
    ? `    FALHOU: ${conflitos.join('; ')}`
    : `    OK — ${verbosConferidos} verbos conferidos, ${verbosComMarca} com marca, 0 conflitos`,
)

const meta = conta.generoAltoTotal ? conta.generoAltoOk / conta.generoAltoTotal : 1
console.log(
  `\n  META: gênero em confiança alta ≥ 96% → ${pc(conta.generoAltoOk, conta.generoAltoTotal)}` +
    ` ${meta >= 0.96 ? 'OK' : 'ABAIXO DA META'}\n`,
)

if (
  vazaram.length ||
  flexionaram.length ||
  contraditorias.length ||
  converteram.length ||
  classeErrada.length ||
  conflitos.length ||
  meta < 0.96
) process.exit(1)
