/**
 * Rodada longa: várias sementes, um relatório só (Eixo D6).
 *
 *   node ferramentas/gramatica/rodada.mjs --sementes=10 --casos=20000
 *
 * POR QUE UMA SEMENTE NÃO BASTA — e este é o motivo de o arquivo existir.
 *
 * A cobertura de pares e trios fecha em 100% com 20.000 casos, e isso engana:
 * dá a sensação de que o espaço foi visto. Não foi. O que fecha é a cobertura
 * das **dimensões**; o CONTEÚDO de cada caso — qual verbo, qual substantivo,
 * qual card repetido — muda com a semente. Um relatório limpo numa semente e
 * sujo na seguinte não é contradição: é a prova de que o número de uma semente
 * só não autoriza afirmar nada.
 *
 * Aconteceu exatamente isso: semente 1 devolveu zero suspeitas, e a semente 77
 * devolveu 14 — todas de um detector mal calibrado que a primeira nunca
 * exercitou. O relatório de N sementes é o número honesto.
 *
 * Cada semente roda em processo próprio, de propósito: é o que garante que a
 * segunda semente não herde estado da primeira. Custa o tempo de subir o Node
 * de novo, e o tempo de subir o Node é irrelevante ao lado de uma afirmação
 * falsa sobre a gramática.
 *
 * PARÂMETROS
 *
 *   --sementes=N  quantas sementes (padrão 40 — ver abaixo)
 *   --de=N        primeira semente (padrão 1); as seguintes são passos primos
 *   --casos=N     casos por semente (padrão 20000)
 *   --saida=CAM   fila agregada (padrão suspeitas-longa.jsonl)
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, appendFileSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const aqui = dirname(fileURLToPath(import.meta.url))

function argumento(nome, padrao) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`))
  return achado ? achado.slice(nome.length + 3) : padrao
}

/*
 * 40, e não 10, porque foi o número que achou defeito.
 *
 * 10 sementes (200 mil casos, 1,5 min) devolveram relatório limpo; 40 (800
 * mil, 5,7 min) acharam a vírgula indevida do sujeito composto com 2ª pessoa.
 * Enquanto acrescentar semente ainda acha coisa, o padrão está baixo demais —
 * e seis minutos é barato ao lado de afirmar que a gramática está sem defeito.
 */
const quantas = Number(argumento('sementes', '40'))
const primeira = Number(argumento('de', '1'))
const casos = Number(argumento('casos', '20000'))
const filaAgregada = argumento('saida', join(aqui, 'suspeitas-longa.jsonl'))

/*
 * As sementes não são 1, 2, 3… Um passo primo grande espalha o estado inicial
 * do xorshift; sementes vizinhas produzem primeiros sorteios vizinhos, e dez
 * rodadas quase iguais dariam a mesma falsa sensação de cobertura que uma só.
 */
const PASSO = 7919
const sementes = Array.from({ length: quantas }, (_, i) => primeira + i * PASSO)

const temporario = (nome) => join(tmpdir(), `gramatica-rodada-${process.pid}-${nome}`)
const arquivoCasos = temporario('casos.jsonl')
const arquivoSuspeitas = temporario('suspeitas.jsonl')
const arquivoResumo = temporario('resumo.json')

writeFileSync(filaAgregada, '')

const total = { casos: 0, invariantes: 0, suspeitas: 0 }
const contagem = new Map()
const exemplos = new Map()
const porSemente = []
const inicio = Date.now()

for (const semente of sementes) {
  const t0 = Date.now()
  execFileSync(
    process.execPath,
    [join(aqui, 'enumerar.mjs'), `--casos=${casos}`, `--semente=${semente}`, `--saida=${arquivoCasos}`],
    { stdio: 'ignore' },
  )
  execFileSync(
    process.execPath,
    [
      join(aqui, 'detectar.mjs'),
      `--casos=${arquivoCasos}`,
      `--saida=${arquivoSuspeitas}`,
      `--json=${arquivoResumo}`,
      '--exemplos=2',
    ],
    { stdio: 'ignore' },
  )

  const resumo = JSON.parse(readFileSync(arquivoResumo, 'utf8'))
  total.casos += resumo.casos
  total.invariantes += resumo.invariantes
  total.suspeitas += resumo.suspeitas
  for (const [nome, n] of Object.entries(resumo.contagem)) {
    contagem.set(nome, (contagem.get(nome) ?? 0) + n)
  }
  for (const [nome, lista] of Object.entries(resumo.exemplos)) {
    const guardados = exemplos.get(nome) ?? []
    for (const ex of lista) if (guardados.length < 3) guardados.push({ ...ex, semente })
    exemplos.set(nome, guardados)
  }

  // A fila agregada guarda a semente em cada linha: sem isso, uma suspeita da
  // rodada longa não se reproduz, e suspeita que não se reproduz não se revisa.
  const fila = readFileSync(arquivoSuspeitas, 'utf8')
  if (fila.trim()) {
    appendFileSync(
      filaAgregada,
      fila
        .trim()
        .split('\n')
        .map((l) => JSON.stringify({ semente, ...JSON.parse(l) }))
        .join('\n') + '\n',
    )
  }

  const s = ((Date.now() - t0) / 1000).toFixed(1)
  porSemente.push({ semente, ...resumo, segundos: s })
  console.log(
    `semente ${String(semente).padStart(6)}  ${String(resumo.casos).padStart(6)} casos  ` +
      `invariantes ${resumo.invariantes}  suspeitas ${String(resumo.suspeitas).padStart(4)}  (${s}s)`,
  )
}

for (const f of [arquivoCasos, arquivoSuspeitas, arquivoResumo]) {
  if (existsSync(f)) rmSync(f)
}

const minutos = ((Date.now() - inicio) / 1000 / 60).toFixed(1)
const sujas = porSemente.filter((s) => s.invariantes + s.suspeitas > 0).length

console.log(`\n${'═'.repeat(64)}`)
console.log(`${sementes.length} sementes · ${total.casos} casos · ${minutos} min`)
console.log(`VIOLAÇÕES DE INVARIANTE: ${total.invariantes}   suspeitas: ${total.suspeitas}`)
console.log(`sementes com alguma coisa: ${sujas}/${sementes.length}`)
console.log(`${'═'.repeat(64)}\n`)

if (contagem.size === 0) {
  console.log('Nenhum detector disparou em nenhuma semente.')
  console.log('Antes de comemorar: rode a sonda de defeito injetado descrita em REVISAO.md.')
  console.log('Relatório limpo e detector quebrado imprimem exatamente a mesma coisa.')
} else {
  for (const [nome, n] of [...contagem].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(n).padStart(7)}  ${nome}`)
    for (const ex of exemplos.get(nome) ?? []) {
      console.log(`         · [semente ${ex.semente}] ${JSON.stringify(ex.entrada)}`)
      console.log(`           → "${ex.texto}"   (${ex.motivo})`)
    }
  }
  console.log(`\nfila agregada: ${filaAgregada.replace(/\\/g, '/')}`)
}
