/**
 * Carrega o motor de frases dentro do Node.
 *
 * Empacota `ponte.ts` com esbuild e importa o resultado. É o mesmo caminho da
 * suíte de testes (`npm run test:grammar`) — deliberadamente, porque uma
 * ferramenta de auditoria que roda um motor diferente do que o app roda não
 * audita nada.
 *
 * O léxico gerado (milhares de palavras) chega ao app por `fetch` e portanto
 * não existe em Node. Aqui ele é injetado pela mesma porta que o teste usa,
 * `definirLexicoGerado`, a partir do arquivo publicado — sem isso a ferramenta
 * estaria auditando um motor que só conhece 250 palavras, que não é o motor de
 * quem usa o app.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const aqui = dirname(fileURLToPath(import.meta.url))
export const raiz = join(aqui, '..', '..')
const web = join(raiz, 'web')

let motor = null

/** O esbuild que o próprio projeto instalou, seja qual for a plataforma. */
function binarioDoEsbuild() {
  const pastas = readdirSync(join(web, 'node_modules', '@esbuild'))
  for (const p of pastas) {
    for (const nome of ['esbuild.exe', join('bin', 'esbuild')]) {
      const caminho = join(web, 'node_modules', '@esbuild', p, nome)
      if (existsSync(caminho)) return caminho
    }
  }
  throw new Error('esbuild não encontrado em web/node_modules/@esbuild — rode `npm install` em web/.')
}

export async function carregarMotor() {
  if (motor) return motor

  const saida = join(web, 'node_modules', '.cache', 'ferramenta-gramatica.mjs')
  mkdirSync(dirname(saida), { recursive: true })

  // O executável do esbuild direto, e não `npx` nem o atalho de `.bin`: os
  // dois são script de shell no Windows, e depender de shell aqui trocaria uma
  // dependência já resolvida por uma dependência de ambiente.
  const esbuild = binarioDoEsbuild()

  execFileSync(
    esbuild,
    [
      join(aqui, 'ponte.ts'),
      '--bundle',
      '--format=esm',
      '--platform=node',
      `--outfile=${saida}`,
      '--log-level=warning',
    ],
    { cwd: web, stdio: 'inherit' },
  )

  const modulo = await import(pathToFileURL(saida).href)

  const envelope = JSON.parse(readFileSync(join(web, 'public', 'data', 'lexico.json'), 'utf8'))
  modulo.definirLexicoGerado(envelope.entradas ?? {})

  // O módulo de um bundle ESM é congelado; a cópia crua do léxico gerado viaja
  // ao lado dele porque o vocabulário precisa LISTAR o que o motor só sabe
  // CONSULTAR.
  motor = { ...modulo, lexicoGeradoBruto: envelope.entradas ?? {} }
  return motor
}

/**
 * Sorteador determinístico (xorshift32).
 *
 * A regra do projeto é que aleatoriedade entra por parâmetro. Aqui ela é mais
 * que estilo: um relatório de suspeitas que não se reproduz não é revisável —
 * quem for conferir um caso precisa poder gerá-lo de novo com a mesma semente.
 */
export function sorteador(semente) {
  let estado = (semente | 0) || 0x9e3779b9
  return () => {
    estado ^= estado << 13
    estado ^= estado >>> 17
    estado ^= estado << 5
    estado |= 0
    return (estado >>> 0) / 4294967296
  }
}

/** Um item da lista, sorteado. */
export function escolher(lista, aleatorio) {
  return lista[Math.floor(aleatorio() * lista.length) % lista.length]
}
