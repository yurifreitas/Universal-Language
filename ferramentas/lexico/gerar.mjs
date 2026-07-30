/**
 * Gera `web/public/data/lexico.json` a partir do acervo ARASAAC.
 *
 *   node ferramentas/lexico/gerar.mjs
 *
 * Duas saídas, e a divisão entre elas é o ponto da ferramenta:
 *
 *   web/public/data/lexico.json      — só confiança ALTA. Vai para o app.
 *   ferramentas/lexico/revisar.jsonl — o resto. Fila de revisão humana.
 *
 * Rode `medir.mjs` antes de publicar o resultado de qualquer mexida nas regras.
 * Ver LEXICO.md.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { inferir, lerAcervo, chavesRevisadas } from './inferir.mjs'

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = join(aqui, '..', '..')

const fonteTs = readFileSync(join(raiz, 'web', 'src', 'lib', 'lexicon.ts'), 'utf8')
const manual = chavesRevisadas(fonteTs)

/**
 * Trava de segurança. As chaves do léxico manual saem por regex de um arquivo
 * TypeScript; se o formato do arquivo mudar e o regex parar de casar, ele não
 * falha com erro — falha devolvendo POUCAS chaves, e a ferramenta passaria por
 * cima de palavras revisadas à mão sem ninguém notar. Um piso grosseiro
 * transforma essa falha silenciosa em parada barulhenta.
 */
if (manual.size < 150) {
  console.error(
    `Só encontrei ${manual.size} chaves em lexicon.ts — esperava ~250.\n` +
      'O extrator de chaves quebrou. Abortando antes de sobrescrever o léxico revisado.',
  )
  process.exit(1)
}

const acervo = lerAcervo(join(raiz, 'data', 'arasaac.sqlite'))

const entradas = {}
const revisar = []
const porClasse = { noun: 0, verb: 0, adjective: 0 }
let semGenero = 0
let doisGeneros = 0

for (const [termo, linhas] of [...acervo].sort((a, b) => a[0].localeCompare(b[0], 'pt'))) {
  // O manual sempre vence. Nem sequer entra na fila de revisão: já foi revisado.
  if (manual.has(termo)) continue

  const r = inferir(termo, linhas)
  if (!r) continue

  if (r.confianca === 'alta') {
    // Substantivo sem gênero por IGNORÂNCIA não serve para nada que o motor
    // precise fazer e ocuparia espaço fingindo ser dado. Já o comum de dois
    // gêneros (`doisGeneros`) não tem gênero para dar — ali a omissão é o
    // resultado, e a classe sozinha já vale a entrada.
    if (r.entrada.class === 'noun' && !r.entrada.gender && !r.doisGeneros) {
      semGenero += 1
      revisar.push({ palavra: termo, motivo: 'substantivo sem gênero', ...r.entrada, sinais: r.sinais })
      continue
    }
    entradas[termo] = r.entrada
    porClasse[r.entrada.class] += 1
    if (r.doisGeneros) doisGeneros += 1
  } else {
    revisar.push({ palavra: termo, motivo: 'sinais insuficientes', ...r.entrada, sinais: r.sinais })
  }
}

const envelope = {
  versao: '1',
  atualizadoEm: new Date().toISOString().slice(0, 10),
  descricao:
    'Léxico inferido do acervo ARASAAC. Só entradas de confiança alta: classe do ' +
    'campo `type`, gênero por votação de sinais, plural só quando irregular para o ' +
    'motor. O léxico revisado à mão (web/src/lib/lexicon.ts) tem precedência e não ' +
    'aparece aqui. Método e números medidos em ferramentas/lexico/LEXICO.md.',
  fonte: 'ARASAAC (arasaac.org) — CC BY-NC-SA. Governo de Aragão / Sergio Palao.',
  entradas,
}

const destino = join(raiz, 'web', 'public', 'data')
mkdirSync(destino, { recursive: true })
writeFileSync(join(destino, 'lexico.json'), JSON.stringify(envelope, null, 0) + '\n', 'utf8')
writeFileSync(
  join(aqui, 'revisar.jsonl'),
  revisar.map((r) => JSON.stringify(r)).join('\n') + '\n',
  'utf8',
)

const total = Object.keys(entradas).length
const invadidas = Object.keys(entradas).filter((p) => manual.has(p))

console.log(`
  termos de uma palavra no acervo   ${acervo.size}
  já revisados à mão (preservados)  ${manual.size}

  PUBLICADAS  web/public/data/lexico.json      ${total}
      noun        ${porClasse.noun}   (${doisGeneros} comuns de dois gêneros, sem gênero de propósito)
      verb        ${porClasse.verb}
      adjective   ${porClasse.adjective}

  REVISÃO     ferramentas/lexico/revisar.jsonl ${revisar.length}
      destas, substantivo sem gênero  ${semGenero}

  colisões com o léxico manual      ${invadidas.length} ${invadidas.length ? '<-- BUG' : '(nenhuma, como deve ser)'}
`)

if (invadidas.length) process.exit(1)
