/**
 * Detectores de suspeita sobre a saída do enumerador (Eixo D2).
 *
 *   node ferramentas/gramatica/detectar.mjs [--casos=CAM] [--saida=CAM] [--exemplos=N]
 *
 * A REGRA QUE ORGANIZA O ARQUIVO INTEIRO: nenhum detector decide sozinho.
 *
 * Há duas categorias, e a diferença entre elas não é de confiança, é de
 * natureza:
 *
 *   INVARIANTE  — o contrato do GRAMMAR.md. O motor não acrescenta palavra de
 *                 conteúdo, não reordena, não perde palavra. Violação aqui não
 *                 é suspeita: é defeito, e o número certo é zero.
 *
 *   SUSPEITA    — sinal de que vale um par de olhos. Repetição, concordância,
 *                 infinitivo solto, diferença entre variedades. A maioria vai
 *                 ser comportamento correto que o detector não sabe
 *                 reconhecer, e isso está previsto: o valor da ferramenta não
 *                 é acertar, é reduzir centenas de milhares de combinações a
 *                 uma fila que uma pessoa consegue revisar.
 *
 * Um detector que fosse afinado até nunca errar deixaria de achar o que
 * ninguém previu — que é exatamente o que ele existe para achar. Ver REVISAO.md.
 */

import { createReadStream, createWriteStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { carregarMotor } from './motor.mjs'

const aqui = dirname(fileURLToPath(import.meta.url))

function argumento(nome, padrao) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`))
  return achado ? achado.slice(nome.length + 3) : padrao
}

const motor = await carregarMotor()
const { lookup, regionalLabel, LEXICON } = motor

/* ------------------------------------------------------- palavras funcionais */

/**
 * O que o motor TEM permissão de inserir.
 *
 * A lista não é escrita à mão inteira de propósito: as formas de ser, estar,
 * ter e ir saem do próprio motor (`conjugate`), porque uma lista copiada
 * envelhece em silêncio — bastaria alguém corrigir um irregular para o
 * detector passar a acusar o motor de inventar verbo.
 */
const FUNCIONAIS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das', 'dum', 'duma',
  'em', 'no', 'na', 'nos', 'nas', 'num', 'numa',
  'ao', 'à', 'aos', 'às', 'pelo', 'pela',
  'com', 'por', 'para', 'pra', 'pro', 'pras', 'pros', 'sem', 'que', 'e', 'ou', 'se', 'nem', 'não',
  'me', 'te', 'lhe', 'nos', 'se', 'mim', 'ti',
  'meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas', 'teu', 'tua',
  'dele', 'dela', 'deles', 'delas',
])
for (const verbo of ['ser', 'estar', 'ter', 'ir']) {
  for (const pessoa of ['1s', '2s', '2t', '3s', '1p', '3p']) {
    for (const tempo of ['present', 'past', 'imperfect', 'future']) {
      FUNCIONAIS.add(motor.conjugate(verbo, pessoa, tempo))
    }
  }
  FUNCIONAIS.add(motor.gerund(verbo))
  for (const registro of ['coloquial', 'normativo']) FUNCIONAIS.add(motor.imperative(verbo, registro))
}

const PREPOSICOES = new Set([
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'com', 'por', 'pelo', 'pela', 'para', 'pra', 'pro', 'sem', 'ao', 'à', 'aos', 'às',
])
/* `a` sozinho fica de fora: é preposição e artigo com a mesma forma, e incluí-lo
   fazia "para a batata" e "com a dor" — português perfeito — encherem a fila. */
const ARTIGOS = {
  o: { g: 'm', p: false }, a: { g: 'f', p: false },
  os: { g: 'm', p: true }, as: { g: 'f', p: true },
  um: { g: 'm', p: false }, uma: { g: 'f', p: false },
  uns: { g: 'm', p: true }, umas: { g: 'f', p: true },
  do: { g: 'm', p: false }, da: { g: 'f', p: false },
  dos: { g: 'm', p: true }, das: { g: 'f', p: true },
  no: { g: 'm', p: false }, na: { g: 'f', p: false },
  nos: { g: 'm', p: true }, nas: { g: 'f', p: true },
  ao: { g: 'm', p: false }, aos: { g: 'm', p: true },
}

const CONECTIVOS_ANTES_DE_INFINITIVO = new Set([
  'de', 'a', 'para', 'pra', 'que', 'e', 'ou', 'ao', 'sem', 'com', 'por', 'até', 'vírgula',
])

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/* ------------------------------------------------------------- os detectores */

const DETECTORES = []
const detector = (nome, gravidade, descricao, fn) =>
  DETECTORES.push({ nome, gravidade, descricao, fn })

/* --- invariantes duras --- */

detector(
  'invariante:conteudo-inserido',
  'invariante',
  'O motor pôs na boca da pessoa uma palavra de conteúdo que ela não escolheu.',
  (c) => {
    const achados = []
    for (const t of c.saida.tokens) {
      if (t.kind !== 'inserted') continue
      // A pontuação viaja colada no token ("era,"); é da frase, não da palavra.
      const chave = t.text.trim().toLowerCase().replace(/[.,?!;:]/g, '')
      if (!chave) continue
      if (FUNCIONAIS.has(chave)) continue
      const classe = lookup(chave).class
      if (['noun', 'verb', 'adjective', 'adverb'].includes(classe)) {
        achados.push(`inseriu "${t.text}" (${classe})`)
      }
    }
    return achados
  },
)

detector(
  'invariante:card-perdido',
  'invariante',
  'Um card escolhido não produziu palavra nenhuma na saída.',
  (c) => {
    const vistos = new Set(c.saida.tokens.filter((t) => t.cardIndex != null).map((t) => t.cardIndex))
    const faltando = c.entrada.map((l, i) => [l, i]).filter(([, i]) => !vistos.has(i))
    return faltando.map(([l, i]) => `card ${i} ("${l}") sumiu`)
  },
)

detector(
  'invariante:reordenacao',
  'invariante',
  'A ordem das células mudou fora das duas exceções previstas (negação e clítico).',
  (c) => {
    const indices = c.saida.tokens.filter((t) => t.cardIndex != null).map((t) => t.cardIndex)
    const achados = []
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] >= indices[i - 1]) continue
      // As duas exceções do GRAMMAR.md 2.1: a partícula de negação e o pronome
      // átono. Nas duas, a posição é exigida pela língua, não escolhida.
      const movido = c.entrada[indices[i]]
      const anterior = c.entrada[indices[i - 1]]
      const previsto = [movido, anterior].some(
        (l) => l === 'não' || lookup(l).class === 'pronoun' || lookup(l).class === 'negation',
      )
      if (!previsto) achados.push(`card ${indices[i]} ("${movido}") saiu depois de ${indices[i - 1]} ("${anterior}")`)
    }
    return achados
  },
)

detector(
  'invariante:palavra-do-card-sumiu',
  'invariante',
  'Card de várias palavras chegou incompleto à saída, sem ter sido flexionado.',
  (c) => {
    const porCard = new Map()
    for (const t of c.saida.tokens) {
      if (t.cardIndex == null) continue
      if (!porCard.has(t.cardIndex)) porCard.set(t.cardIndex, [])
      porCard.get(t.cardIndex).push(t)
    }
    const saida = semAcento(c.saida.text)
    const achados = []
    c.entrada.forEach((label, i) => {
      const partes = label.split(/\s+/)
      if (partes.length < 2) return
      const tokens = porCard.get(i) ?? []
      // Flexão pode legitimamente apagar uma palavra da locução ("escovar os
      // dentes" → "escovo os dentes"): só a locução intacta é cobrada inteira.
      if (tokens.some((t) => t.kind === 'inflected')) return
      const perdidas = partes.filter((p) => !saida.includes(semAcento(p)))
      if (perdidas.length) achados.push(`de "${label}" faltou ${perdidas.map((p) => `"${p}"`).join(', ')}`)
    })
    return achados
  },
)

detector(
  'invariante:excecao',
  'invariante',
  'O motor lançou exceção. Uma prancha que quebra é uma prancha muda.',
  (c) => (c.saida.erro ? [c.saida.erro] : []),
)

/* --- suspeitas --- */

detector('repeticao', 'alta', 'Palavra repetida em sequência ("a a água", "de de").', (c) => {
  const palavras = c.saida.text.toLowerCase().replace(/[.?!,]/g, '').split(/\s+/).filter(Boolean)
  const achados = []
  for (let i = 1; i < palavras.length; i++) {
    if (palavras[i] === palavras[i - 1]) achados.push(`"${palavras[i]} ${palavras[i]}"`)
  }
  return achados
})

detector('preposicao-dupla', 'alta', 'Preposição seguida de preposição.', (c) => {
  const palavras = c.saida.text.toLowerCase().replace(/[.?!,]/g, '').split(/\s+/).filter(Boolean)
  const achados = []
  for (let i = 1; i < palavras.length; i++) {
    if (PREPOSICOES.has(palavras[i]) && PREPOSICOES.has(palavras[i - 1])) {
      achados.push(`"${palavras[i - 1]} ${palavras[i]}"`)
    }
  }
  return achados
})

detector('concordancia', 'alta', 'Determinante, substantivo e adjetivo em gênero ou número diferentes.', (c) => {
  const tokens = c.saida.tokens
  const achados = []
  /*
   * A ficha vem da palavra REGIONAL, não da canônica: "a criança" vira "o
   * guri" no Sul, e é o gênero da variante que manda no artigo (GRAMMAR.md 5).
   * Consultar a canônica fazia o detector acusar "o guri" de erro.
   */
  const fichaDe = (t) =>
    t.cardIndex != null
      ? lookup(regionalLabel(t.original ?? c.entrada[t.cardIndex], c.opcoes.region))
      : null

  for (let i = 1; i < tokens.length; i++) {
    const art = ARTIGOS[tokens[i - 1].text.toLowerCase()]
    const ficha = fichaDe(tokens[i])
    if (!art || !ficha || ficha.class !== 'noun' || !ficha.gender || ficha.guessed) continue
    if (art.g !== ficha.gender) {
      achados.push(`"${tokens[i - 1].text} ${tokens[i].text}" — ${ficha.gender} no léxico`)
    }
  }

  // Adjetivo depois de substantivo: só a terminação -o/-a é verificável sem
  // saber flexionar, e é justamente onde o erro de concordância aparece.
  let ultimoSubstantivo = null
  for (const t of tokens) {
    const ficha = fichaDe(t)
    if (!ficha) continue
    if (ficha.class === 'noun' && ficha.gender && !ficha.guessed) ultimoSubstantivo = { t, ficha }
    else if (ficha.class === 'adjective' && ultimoSubstantivo) {
      const fim = t.text.toLowerCase().slice(-1)
      if ((fim === 'o' && ultimoSubstantivo.ficha.gender === 'f') || (fim === 'a' && ultimoSubstantivo.ficha.gender === 'm')) {
        achados.push(`"${ultimoSubstantivo.t.text} ... ${t.text}" — adjetivo discorda do substantivo`)
      }
    }
  }
  return achados
})

detector(
  'regionalismo-pela-metade',
  'alta',
  'A palavra saiu na forma canônica embora a região tenha variante para ela.',
  (c) => {
    const achados = []
    for (const t of c.saida.tokens) {
      if (t.cardIndex == null) continue
      const canonica = t.original ?? c.entrada[t.cardIndex]
      const variante = regionalLabel(canonica, c.opcoes.region)
      if (variante === canonica) continue
      // Compara o radical, não a palavra: a flexão é legítima ("guris"), a
      // troca de palavra é que tem de ter acontecido.
      const radical = semAcento(variante).slice(0, 3)
      if (!semAcento(t.text).startsWith(radical)) {
        achados.push(`"${canonica}" devia sair como "${variante}" em ${c.opcoes.region}, saiu "${t.text}"`)
      }
    }
    return achados
  },
)

detector('infinitivo-solto', 'media', 'Verbo do léxico ficou no infinitivo onde caberia conjugado.', (c) => {
  const tokens = c.saida.tokens
  const achados = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.kind !== 'card' || t.cardIndex == null) continue
    const label = c.entrada[t.cardIndex]
    const ficha = LEXICON[label]
    if (!ficha || ficha.class !== 'verb' || ficha.fixed) continue
    if (!/(ar|er|ir)$/.test(label)) continue

    const anterior = i > 0 ? tokens[i - 1] : null
    if (!anterior) {
      achados.push(`"${label}" abre a frase sem conjugar`)
      continue
    }
    const textoAnterior = anterior.text.toLowerCase()
    if (CONECTIVOS_ANTES_DE_INFINITIVO.has(textoAnterior)) continue
    // Depois de modal o infinitivo é o certo: "quero comer" (GRAMMAR.md).
    const fichaAnterior = anterior.cardIndex != null ? LEXICON[c.entrada[anterior.cardIndex]] : null
    if (fichaAnterior && fichaAnterior.modal) continue
    if (FUNCIONAIS.has(textoAnterior)) continue
    achados.push(`"${textoAnterior} ${label}" — infinitivo no meio da frase`)
  }
  return achados
})

detector('pontuacao', 'media', 'Pontuação dupla, espaço duplo ou vírgula antes de "e".', (c) => {
  const t = c.saida.text
  const achados = []
  if (/[.?!,]{2,}/.test(t)) achados.push('pontuação dupla')
  if (/ {2,}/.test(t)) achados.push('espaço duplo')
  if (/,\s+e\b/.test(t)) achados.push('vírgula antes de "e"')
  if (/\s+[.?!,]/.test(t)) achados.push('espaço antes de pontuação')
  return achados
})

detector('forma-da-frase', 'baixa', 'Frase que não começa com maiúscula ou não termina em pontuação.', (c) => {
  const t = c.saida.text
  const achados = []
  if (!t.trim()) return ['frase vazia']
  const primeira = t.trim().charAt(0)
  if (primeira !== primeira.toUpperCase()) achados.push(`começa em minúscula: "${t.slice(0, 12)}…"`)
  if (!/[.?!]$/.test(t.trim())) achados.push(`não termina em pontuação: "…${t.slice(-12)}"`)
  return achados
})

/* --- comparações entre variedades: precisam da família, não do caso solto --- */

const REGIOES_COM_TU = new Set(['sul', 'nordeste', 'norte'])

/**
 * Quantas diferenças entre variedades existiram e quantas foram explicadas.
 *
 * Sem isto, "0 suspeitas de região" seria ambíguo: pode querer dizer que o
 * motor está certo, ou que o detector nunca chegou a comparar nada. O número
 * de comparações e o de diferenças explicadas separam as duas leituras.
 */
const contexto = { regiaoComparadas: 0, regiaoDiferentes: 0, registroComparadas: 0, registroDiferentes: 0 }

function comparaRegiao(familia) {
  const achados = []
  const porRegistro = new Map()
  for (const c of familia) {
    if (!porRegistro.has(c.opcoes.register)) porRegistro.set(c.opcoes.register, [])
    porRegistro.get(c.opcoes.register).push(c)
  }
  for (const grupo of porRegistro.values()) {
    const base = grupo.find((c) => c.opcoes.region === 'padrao')
    if (!base) continue
    for (const c of grupo) {
      if (c === base) continue
      contexto.regiaoComparadas++
      const variaLexicalmente = c.entrada.some((l) => regionalLabel(l, c.opcoes.region) !== l)
      const temSegundaPessoa = c.entrada.some((l) => ['você', 'tu'].includes(l))
      if (base.saida.text === c.saida.text) continue
      contexto.regiaoDiferentes++
      // Variação lexical e de tratamento são as duas camadas que a região TEM
      // de mudar (GRAMMAR.md 5). Qualquer outra diferença é bandeira vermelha:
      // a gramática deve ser a mesma em toda variedade.
      if (variaLexicalmente) continue
      if (temSegundaPessoa && REGIOES_COM_TU.has(c.opcoes.region)) continue
      achados.push({
        caso: c,
        motivo: `região ${c.opcoes.region} mudou a frase sem variante lexical nem tratamento: "${base.saida.text}" → "${c.saida.text}"`,
      })
    }
  }
  return achados
}

function comparaRegistro(familia) {
  const achados = []
  const porRegiao = new Map()
  for (const c of familia) {
    if (!porRegiao.has(c.opcoes.region)) porRegiao.set(c.opcoes.region, [])
    porRegiao.get(c.opcoes.region).push(c)
  }
  for (const grupo of porRegiao.values()) {
    const col = grupo.find((c) => c.opcoes.register === 'coloquial')
    const nor = grupo.find((c) => c.opcoes.register === 'normativo')
    if (!col || !nor) continue
    contexto.registroComparadas++
    if (col.saida.text === nor.saida.text) continue
    contexto.registroDiferentes++

    // O que o registro pode mudar, e só: "pra"/"para" (e o artigo que vem
    // junto), o imperativo e a conjugação de "tu" — tudo isso é palavra
    // INSERIDA ou forma do MESMO card. Por isso a comparação ignora o que foi
    // inserido, que legitimamente muda em número ("pra escola" tem uma palavra
    // a menos que "para a escola"), e olha só o esqueleto de cards: se ele
    // diverge, o registro mexeu na estrutura, e isso não está previsto em
    // lugar nenhum do GRAMMAR.md.
    const esqueleto = (c) =>
      (c.saida.tokens ?? [])
        .filter((t) => t.cardIndex != null)
        .map((t) => t.cardIndex)
        .join(',')
    if (esqueleto(col) === esqueleto(nor)) continue
    achados.push({
      caso: nor,
      motivo: `registro mudou a estrutura: "${col.saida.text}" (coloquial) vs "${nor.saida.text}" (normativo)`,
    })
  }
  return achados
}

/* ---------------------------------------------------------------- execução */

const fonte = argumento('casos', join(aqui, 'casos.jsonl'))
const destino = argumento('saida', join(aqui, 'suspeitas.jsonl'))
const quantosExemplos = Number(argumento('exemplos', '3'))

const contagem = new Map()
const exemplos = new Map()
const fluxo = createWriteStream(destino, { encoding: 'utf8' })
let total = 0

function anotar(nome, gravidade, caso, motivo) {
  contagem.set(nome, (contagem.get(nome) ?? 0) + 1)
  const lista = exemplos.get(nome) ?? []
  if (lista.length < quantosExemplos) {
    lista.push({ motivo, caso })
    exemplos.set(nome, lista)
  }
  fluxo.write(
    JSON.stringify({
      detector: nome,
      gravidade,
      motivo,
      id: caso.id,
      forma: caso.forma,
      entrada: caso.entrada,
      marcadores: caso.marcadores,
      opcoes: caso.opcoes,
      texto: caso.saida.text,
      raw: caso.saida.raw,
    }) + '\n',
  )
}

const familias = new Map()

const leitor = createInterface({ input: createReadStream(fonte, { encoding: 'utf8' }), crlfDelay: Infinity })
for await (const linha of leitor) {
  if (!linha.trim()) continue
  const caso = JSON.parse(linha)
  total++

  if (caso.saida.erro) {
    anotar('invariante:excecao', 'invariante', caso, caso.saida.erro)
    continue
  }
  for (const d of DETECTORES) {
    if (d.nome === 'invariante:excecao') continue
    for (const motivo of d.fn(caso)) anotar(d.nome, d.gravidade, caso, motivo)
  }
  if (caso.familia) {
    if (!familias.has(caso.familia)) familias.set(caso.familia, [])
    familias.get(caso.familia).push(caso)
  }
}

for (const familia of familias.values()) {
  for (const a of comparaRegiao(familia)) anotar('diferenca-regiao', 'alta', a.caso, a.motivo)
  for (const a of comparaRegistro(familia)) anotar('diferenca-registro', 'media', a.caso, a.motivo)
}

fluxo.end()

/* ------------------------------------------------------------- o relatório */

const ORDEM = { invariante: 0, alta: 1, media: 2, baixa: 3 }
const todos = [
  ...DETECTORES.map((d) => ({ nome: d.nome, gravidade: d.gravidade, descricao: d.descricao })),
  { nome: 'diferenca-regiao', gravidade: 'alta', descricao: 'Trocar a região mudou algo que não é léxico nem tratamento.' },
  { nome: 'diferenca-registro', gravidade: 'media', descricao: 'Coloquial e normativo diferem fora do previsto.' },
].sort((a, b) => ORDEM[a.gravidade] - ORDEM[b.gravidade] || (contagem.get(b.nome) ?? 0) - (contagem.get(a.nome) ?? 0))

const invariantes = todos.filter((d) => d.gravidade === 'invariante').reduce((s, d) => s + (contagem.get(d.nome) ?? 0), 0)
const suspeitas = [...contagem.values()].reduce((s, n) => s + n, 0) - invariantes

console.log(`\ncasos lidos: ${total}   famílias: ${familias.size}`)
console.log(`VIOLAÇÕES DE INVARIANTE: ${invariantes}   suspeitas: ${suspeitas}`)
console.log(
  `variedades: ${contexto.regiaoDiferentes}/${contexto.regiaoComparadas} comparações de região ` +
    `mudaram a frase, ${contexto.registroDiferentes}/${contexto.registroComparadas} de registro\n`,
)

let gravidadeAtual = null
for (const d of todos) {
  const n = contagem.get(d.nome) ?? 0
  if (d.gravidade !== gravidadeAtual) {
    gravidadeAtual = d.gravidade
    console.log(`── ${gravidadeAtual.toUpperCase()} ${'─'.repeat(60 - gravidadeAtual.length)}`)
  }
  console.log(`${String(n).padStart(7)}  ${d.nome}`)
  if (n === 0) continue
  console.log(`         ${d.descricao}`)
  for (const ex of exemplos.get(d.nome) ?? []) {
    console.log(`         · [${ex.caso.forma}] ${JSON.stringify(ex.caso.entrada)}`)
    console.log(`           → "${ex.caso.saida.text}"   (${ex.motivo})`)
  }
}
console.log(`\nfila de revisão: ${destino.replace(/\\/g, '/')}`)
