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
import { inferir, lerAcervo, gabarito, pluralDoMotor } from './inferir.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const acervo = lerAcervo(join(raiz, 'data', 'arasaac.sqlite'))
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
  const r = inferir(palavra, linhas)
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
  const r = inferir(palavra, linhas)
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
  const r = inferir(palavra, linhas)
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

const meta = conta.generoAltoTotal ? conta.generoAltoOk / conta.generoAltoTotal : 1
console.log(
  `\n  META: gênero em confiança alta ≥ 96% → ${pc(conta.generoAltoOk, conta.generoAltoTotal)}` +
    ` ${meta >= 0.96 ? 'OK' : 'ABAIXO DA META'}\n`,
)

if (vazaram.length || flexionaram.length || meta < 0.96) process.exit(1)
