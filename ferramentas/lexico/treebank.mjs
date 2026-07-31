/**
 * Extração de comportamento verbal a partir de treebank Universal Dependencies.
 *
 * Existe porque `NIVEIS.md` afirmava que o "Teto 2" — a forma da palavra não
 * carrega o significado — não tinha saída automática. Tem. As seis marcas de
 * comportamento de `LEXICO-PADRAO.md` são, uma a uma, padrões de dependência
 * sintática, e existe corpus de português com isso anotado por linguistas.
 *
 * O que muda: as marcas deixam de sair da minha lista e passam a sair de USO
 * ATESTADO, com contagem — que é evidência, e evidência se discute.
 *
 * FONTE: UD_Portuguese-GSD (CC BY-SA 4.0), português brasileiro.
 *   https://github.com/UniversalDependencies/UD_Portuguese-GSD
 *
 * Escolhido em vez do Bosque porque o Bosque mistura português europeu e
 * brasileiro, e o léxico gerado do ARASAAC JÁ tem contaminação de pt-PT
 * ("actuar", "facturar", "mandriar"). Puxar de corpus misto agravaria um
 * problema que já existe.
 *
 *   node ferramentas/lexico/treebank.mjs <pasta-com-os-.conllu>
 *
 * O corpus NÃO é versionado neste repositório: é dado de terceiro com licença
 * própria, e o app não o consome em tempo de execução — ele alimenta a revisão
 * do léxico, e só.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/* ------------------------------------------------------------ leitura CoNLL-U */

/**
 * Uma frase do CoNLL-U vira uma lista de tokens.
 *
 * As linhas de intervalo ("3-4 dos") são descartadas: elas descrevem a forma
 * contraída na superfície, e o que interessa aqui é a análise sintática, que
 * está nas linhas dos tokens que a compõem.
 */
function* frases(texto) {
  let atual = []
  for (const linha of texto.split('\n')) {
    if (!linha.trim()) {
      if (atual.length) yield atual
      atual = []
      continue
    }
    if (linha.startsWith('#')) continue
    const campos = linha.split('\t')
    if (campos.length < 8) continue
    const [id, forma, lema, upos, , traços, head, rel] = campos
    if (id.includes('-') || id.includes('.')) continue
    atual.push({
      id: Number(id),
      forma,
      lema: (lema || forma || '').toLowerCase(),
      upos,
      traços: traços === '_' ? {} : Object.fromEntries(
        traços.split('|').map((t) => t.split('=')),
      ),
      head: Number(head),
      rel: (rel || '').split(':')[0],
    })
  }
  if (atual.length) yield atual
}

/* ------------------------------------------------------- os seis padrões */

/**
 * Cada marca é um padrão de dependência. As glosas abaixo são a tradução da
 * regra linguística para a anotação — e são a parte que merece revisão, porque
 * é onde uma leitura errada da anotação viraria uma marca errada no léxico.
 */
const PADROES = {
  /**
   * DITRANSITIVO: objeto direto mais um destinatário.
   *
   * `iobj` é o caso limpo. Mas o português brasileiro escreve o destinatário
   * como oblíquo com preposição muito mais do que como `iobj` — "dá água PRA
   * mãe" —, então `obj` + `obl` cuja preposição é "a"/"para" também conta. Sem
   * isso a extração perderia a forma mais comum da construção.
   */
  ditransitivo: (verbo, filhos, tokens) => {
    const temObj = filhos.some((f) => f.rel === 'obj')
    if (!temObj) return false
    if (filhos.some((f) => f.rel === 'iobj')) return true
    return filhos.some(
      (f) =>
        f.rel === 'obl' &&
        tokens.some(
          (t) => t.head === f.id && t.rel === 'case' && ['a', 'para', 'pra'].includes(t.lema),
        ),
    )
  },

  /**
   * COMPLETIVA: rege oração encaixada com "que".
   *
   * MEDIDO, E FOI PRECISO MUDAR O PLANO. A intenção era separar volitivo
   * (`Mood=Sub` — "quero que venha") de opinião (`Mood=Ind` — "acho que vem")
   * direto da anotação. Não dá neste corpus: `Mood` está ausente em **93% dos
   * 2.285 `ccomp`** (só 160 o trazem). O teste original achava quase nada, e
   * achava por defeito da ferramenta, não por ausência do fenômeno.
   *
   * O sinal que o corpus dá de verdade é mais simples e ainda assim valioso:
   * QUE VERBOS regem oração com "que". Os mais frequentes são `dizer` (439),
   * `afirmar` (201), `informar` (97), `explicar` (85), `saber` (71),
   * `achar` (44), `acreditar` (41) — exatamente a classe que interessa.
   *
   * A divisão volitivo × opinião fica para o revisor humano, que é onde ela
   * cabe: a ferramenta entrega a lista curta e certa, e a pessoa decide de que
   * lado cada uma cai. Entregar a lista já é a parte difícil.
   */
  completiva: (verbo, filhos) => filhos.some((f) => f.rel === 'ccomp'),

  /** Das completivas, as poucas em que o modo ESTÁ anotado — evidência forte. */
  completivaSubjuntivo: (verbo, filhos) =>
    filhos.some((f) => f.rel === 'ccomp' && f.traços.Mood === 'Sub'),
  completivaIndicativo: (verbo, filhos) =>
    filhos.some((f) => f.rel === 'ccomp' && f.traços.Mood === 'Ind'),

  /**
   * MODAL: rege infinitivo como complemento — "quero comer", "posso ir".
   * `xcomp` é justamente o complemento sem sujeito próprio.
   */
  modal: (verbo, filhos) =>
    filhos.some((f) => f.rel === 'xcomp' && f.traços.VerbForm === 'Inf'),
}

/**
 * A regência (`prep`) sai à parte porque não é sim/não: é QUAL preposição, e
 * exige que uma delas domine as ocorrências. "Gostar" aparece com "de" quase
 * sempre; um verbo que aparece com cinco preposições diferentes não tem
 * regência fixa e não deve receber marca nenhuma.
 */
function preposicaoDoOblíquo(filhos, tokens) {
  /**
   * SÓ CONTA QUANDO NÃO HÁ OBJETO DIRETO.
   *
   * A primeira versão contava todo `obl` com preposição, e o resultado eram 79
   * verbos com "regência" — incluindo `levar.prep`, `ver.prep` e `dizer.prep`.
   * Esses não regem preposição: "levar o filho PARA a escola" tem objeto direto
   * e um ADJUNTO de lugar. UD básico não distingue complemento de adjunto: as
   * duas coisas são `obl`.
   *
   * O discriminador disponível é a ausência de objeto direto. Verbo de objeto
   * preposicionado — "gostar DE", "precisar DE", "brincar COM" — não tem objeto
   * direto justamente porque o complemento dele vem pela preposição. Não é
   * perfeito (perde "avisar alguém DE algo"), mas erra para o lado de omitir,
   * que é a política do projeto.
   */
  if (filhos.some((f) => f.rel === 'obj')) return []
  const preps = []
  for (const f of filhos) {
    if (f.rel !== 'obl') continue
    const caso = tokens.find((t) => t.head === f.id && t.rel === 'case')
    if (caso) preps.push(caso.lema)
  }
  return preps
}

/* ------------------------------------------------------------------ coleta */

function extrair(pasta) {
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.conllu'))
  if (!arquivos.length) {
    console.error(`Nenhum .conllu em ${pasta}.`)
    console.error('Baixe de https://github.com/UniversalDependencies/UD_Portuguese-GSD')
    process.exit(1)
  }

  /** lema -> { total, marcas: {nome: n}, preps: {prep: n} } */
  const verbos = new Map()
  let frasesLidas = 0

  for (const arq of arquivos) {
    for (const tokens of frases(readFileSync(join(pasta, arq), 'utf8'))) {
      frasesLidas++
      for (const t of tokens) {
        if (t.upos !== 'VERB' && t.upos !== 'AUX') continue
        const filhos = tokens.filter((x) => x.head === t.id)
        const reg = verbos.get(t.lema) ?? { total: 0, marcas: {}, preps: {} }
        reg.total++
        /**
         * `soTerceira` NÃO É EXTRAÍVEL DESTE CORPUS, e a tentativa foi
         * removida em vez de ajustada.
         *
         * A ideia era: verbo atestado só na 3ª pessoa é impessoal ("doer",
         * "chover"). Medido, ela marcava **484 verbos**, incluindo `dizer`,
         * `levar` e `mostrar` — absurdo evidente.
         *
         * A causa é o gênero do texto, não o limiar. `Person` está ausente em
         * **91% dos tokens verbais** (31.751 de 34.909), e onde aparece é 3.019
         * de 3ª contra 138 de 1ª e 1 de 2ª. Jornal narra o que os outros
         * fizeram: "só atestado na 3ª pessoa" descreve o CORPUS, não o verbo.
         *
         * Fica como aviso: um corte mais alto teria escondido o defeito em vez
         * de corrigi-lo. Quando um sinal mede o gênero do texto, nenhum limiar
         * o conserta.
         */
        for (const [nome, testa] of Object.entries(PADROES)) {
          if (testa(t, filhos, tokens)) reg.marcas[nome] = (reg.marcas[nome] ?? 0) + 1
        }
        for (const p of preposicaoDoOblíquo(filhos, tokens)) {
          reg.preps[p] = (reg.preps[p] ?? 0) + 1
        }
        verbos.set(t.lema, reg)
      }
    }
  }
  return { verbos, frasesLidas, arquivos }
}

/* ------------------------------------------------------------------- cortes

   O corte é a decisão que separa evidência de ruído, e ele é declarado aqui em
   vez de embutido no laço para poder ser discutido e medido.

   Uma ocorrência não é evidência: anotação tem erro, e um `ccomp` mal marcado
   viraria um verbo volitivo falso. Três ocorrências E um quinto das aparições
   do verbo é o corte inicial — conservador de propósito, pela mesma política
   do resto do projeto: marca errada não tem conserto, lacuna tem. */

const MIN_OCORRENCIAS = 3
const MIN_PROPORCAO = 0.2

function classificar(verbos) {
  const saida = new Map()
  for (const [lema, reg] of verbos) {
    const marcas = {}
    for (const [nome, n] of Object.entries(reg.marcas)) {
      if (n >= MIN_OCORRENCIAS && n / reg.total >= MIN_PROPORCAO) marcas[nome] = true
    }
    // Regência: uma preposição só, dominante, e com massa suficiente.
    const preps = Object.entries(reg.preps).sort((a, b) => b[1] - a[1])
    const [melhor] = preps
    const totalPreps = preps.reduce((s, [, n]) => s + n, 0)
    if (melhor && melhor[1] >= MIN_OCORRENCIAS && melhor[1] / totalPreps >= 0.7) {
      // "de" e "a" antes de substantivo comum são quase sempre complemento
      // nominal ou adjunto, não regência do verbo. Só entram com dominância
      // forte, e a revisão humana decide.
      marcas.prep = melhor[0]
    }
    if (Object.keys(marcas).length) saida.set(lema, { marcas, ocorrencias: reg.total })
  }
  return saida
}

/* ------------------------------------------------------------- comparação */

/**
 * O valor da extração não é a lista: é o CONFRONTO com o que já existe.
 *
 * Onde o corpus concorda com o léxico revisado à mão, a marca ganha evidência
 * independente. Onde discorda, um dos dois está errado — e isso é um achado,
 * não um erro da ferramenta.
 */
function comparar(extraido, lexiconTs) {
  const CAMPOS = ['volitivo', 'opiniao', 'ditransitivo', 'atividade', 'soTerceira', 'ligacao']
  const revisado = new Map()
  const bloco = lexiconTs.slice(
    lexiconTs.indexOf('export const LEXICON'),
    lexiconTs.indexOf('\n}', lexiconTs.indexOf('export const LEXICON')),
  )
  const re = /^\s{2}(?:'([^']+)'|([\wà-öø-ÿ]+)):\s*(V\(.*)$/gimu
  let m
  while ((m = re.exec(bloco))) {
    const chave = (m[1] ?? m[2]).toLowerCase()
    const valor = m[3]
    const marcas = {}
    for (const c of CAMPOS) if (new RegExp(`\\b${c}:\\s*true`).test(valor)) marcas[c] = true
    const p = valor.match(/prep:\s*'([^']+)'/)
    if (p) marcas.prep = p[1]
    revisado.set(chave, marcas)
  }

  const concorda = []
  const soCorpus = []
  const soMao = []
  const conflito = []

  for (const [lema, { marcas, ocorrencias }] of extraido) {
    const mao = revisado.get(lema)
    if (!mao) continue
    for (const campo of [...CAMPOS, 'prep']) {
      const c = marcas[campo]
      const h = mao[campo]
      if (c && h && c === h) concorda.push(`${lema}.${campo}`)
      else if (c && h && c !== h) conflito.push(`${lema}.${campo}: corpus=${c} mão=${h}`)
      else if (c && !h) soCorpus.push(`${lema}.${campo} (${ocorrencias}x)`)
      else if (!c && h && campo !== 'prep') soMao.push(`${lema}.${campo}`)
    }
  }
  return { concorda, soCorpus, soMao, conflito, revisadoTotal: revisado.size }
}

/* ---------------------------------------------------------------- programa */

const pasta = process.argv[2]
if (!pasta) {
  console.error('uso: node ferramentas/lexico/treebank.mjs <pasta-com-os-.conllu>')
  console.error('baixe de https://github.com/UniversalDependencies/UD_Portuguese-GSD')
  process.exit(1)
}

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const { verbos, frasesLidas, arquivos } = extrair(pasta)
const extraido = classificar(verbos)

console.log('\nEXTRAÇÃO DE COMPORTAMENTO VERBAL — UD_Portuguese-GSD (CC BY-SA 4.0)\n')
console.log(`  arquivos                ${arquivos.join(', ')}`)
console.log(`  frases lidas            ${frasesLidas.toLocaleString('pt-BR')}`)
console.log(`  lemas verbais distintos ${verbos.size.toLocaleString('pt-BR')}`)
console.log(`  com alguma marca        ${extraido.size.toLocaleString('pt-BR')}`)
console.log(`  corte                   ≥${MIN_OCORRENCIAS} ocorrências e ≥${MIN_PROPORCAO * 100}% das aparições`)

const porMarca = {}
for (const [, { marcas }] of extraido) {
  for (const k of Object.keys(marcas)) porMarca[k] = (porMarca[k] ?? 0) + 1
}
console.log('\n  por marca:')
for (const [k, n] of Object.entries(porMarca).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(14)} ${String(n).padStart(4)}`)
}

const lexiconTs = readFileSync(join(raiz, 'web', 'src', 'lib', 'lexicon.ts'), 'utf8')
const cmp = comparar(extraido, lexiconTs)

console.log('\n  CONFRONTO com o léxico revisado à mão')
console.log(`    concordam                  ${cmp.concorda.length}`)
console.log(`    só o corpus tem            ${cmp.soCorpus.length}`)
console.log(`    só a revisão à mão tem     ${cmp.soMao.length}`)
console.log(`    CONFLITO                   ${cmp.conflito.length}`)

if (cmp.concorda.length) console.log(`\n    concordam: ${cmp.concorda.slice(0, 24).join(', ')}`)
if (cmp.conflito.length) {
  console.log('\n    conflitos — um dos dois lados está errado:')
  for (const c of cmp.conflito.slice(0, 20)) console.log(`      ${c}`)
}
if (cmp.soCorpus.length) {
  console.log('\n    candidatos que o corpus atesta e o léxico não tem:')
  for (const c of cmp.soCorpus.slice(0, 30)) console.log(`      ${c}`)
}

/**
 * CRUZAMENTO COM O ACERVO — o que separa uma lista de uma fila de trabalho.
 *
 * O corpus é jornal, e isso aparece na saída: `ressaltar`, `frisar`, `reiterar`,
 * `salientar`, `enfatizar` e `ponderar` regem completiva, e nenhuma criança vai
 * tocar num card desses. São verbos de citação de reportagem.
 *
 * O que interessa é a interseção: verbo que o corpus atesta E que existe como
 * pictograma. Fora dela, marcar não muda nada no app — não há card para tocar.
 */
let noAcervo = new Set()
try {
  const gerado = JSON.parse(
    readFileSync(join(raiz, 'web', 'public', 'data', 'lexico.json'), 'utf8'),
  )
  noAcervo = new Set(Object.keys(gerado.entradas ?? gerado))
} catch {
  console.log('\n  (lexico.json ausente — a fila sai sem a marca de acervo)')
}

const naFila = [...extraido]
  .map(([lema, v]) => ({ lema, ...v, temPictograma: noAcervo.has(lema) }))
  .sort(
    (a, b) => Number(b.temPictograma) - Number(a.temPictograma) || b.ocorrencias - a.ocorrencias,
  )

const comPicto = naFila.filter((x) => x.temPictograma)
console.log(`\n  COM PICTOGRAMA NO ACERVO: ${comPicto.length} de ${naFila.length}`)
console.log('  (o resto é vocabulário de reportagem — marcá-lo não muda nada no app)')
if (comPicto.length) console.log(`\n  ${comPicto.map((x) => x.lema).join(' · ')}`)

const destino = join(raiz, 'ferramentas', 'lexico', 'treebank.jsonl')
writeFileSync(destino, naFila.map((x) => JSON.stringify(x)).join('\n') + '\n')
console.log(`\n  fila de revisão: ${destino}`)
console.log('\n  Nada disto entra no léxico automaticamente. É evidência para revisão —')
console.log('  a política de `LEXICO-PADRAO.md` continua sendo: na dúvida, não marcar.\n')
