/**
 * A inferência: de uma linha da ARASAAC para uma entrada de léxico.
 *
 * Está num módulo separado de propósito. `gerar.mjs` e `medir.mjs` PRECISAM
 * rodar exatamente o mesmo código — se a medição usasse uma cópia das regras,
 * o número medido não diria nada sobre o arquivo publicado, e o relatório de
 * precisão viraria enfeite.
 *
 * Fonte: acervo ARASAAC (CC BY-NC-SA), tabela `keywords`, `lang='pt'`.
 */

/* ------------------------------------------------------------- mojibake */

/**
 * O campo `meaning` do banco está com o texto UTF-8 lido como latin-1 — às
 * vezes DUAS vezes ("ã" virou "Ã£" virou "Ã\x83Â£"). Sem desfazer isso, as
 * marcas "m."/"f." ainda são legíveis, mas qualquer regra que olhe acento
 * quebra. Desfazemos em laço, e só aceitamos a rodada se ela não introduzir
 * caractere de substituição — melhor parar cedo com texto meio torto do que
 * destruir um texto que já estava certo.
 */
export function desfazerMojibake(texto) {
  if (!texto) return ''
  let atual = texto
  for (let volta = 0; volta < 3; volta += 1) {
    if (!/[ÃÂ][-¿]/.test(atual)) break
    const tentativa = Buffer.from(atual, 'latin1').toString('utf8')
    if (tentativa.includes('�')) break
    atual = tentativa
  }
  // Sobras do bagunçado: o U+200B (espaço de largura zero) vira "â€‹" e depois
  // lixo solto no meio das palavras.
  return atual.replace(/[​-‍﻿]/g, '').trim()
}

/* ---------------------------------------------------------------- classe */

/**
 * O `type` da ARASAAC mapeado para as classes do motor.
 *
 * Medido contra o gabarito revisado à mão: 98,1% de concordância (212/216).
 * Os tipos 1, 5 e 6 não têm equivalente confiável (6 é pontuação e símbolo) e
 * saem fora — um pictograma sem classe é tratado pelo motor como palavra
 * desconhecida, que é o comportamento conservador correto.
 */
const CLASSE_POR_TIPO = { 2: 'noun', 3: 'verb', 4: 'adjective' }

export function classeDoTipo(tipo) {
  return CLASSE_POR_TIPO[Number(tipo)] ?? null
}

/* ---------------------------------------------------------------- gênero */

/**
 * Palavras cuja terminação mente. Não é uma lista de exceções "que eu lembrei":
 * cada uma saiu de um erro visto na medição contra o gabarito, ou é um caso de
 * família inteira (o `-or` feminino, o grego em `-ema`).
 */
const GENERO_FIXO = new Map(
  Object.entries({
    dor: 'f', cor: 'f', flor: 'f', colher: 'f', mulher: 'f',
    mão: 'f', tribo: 'f', libido: 'f', foto: 'f', moto: 'f',
    gema: 'f', algema: 'f', raiz: 'f', cicatriz: 'f', perdiz: 'f',
    nariz: 'm', arroz: 'm', giz: 'm', juiz: 'm',
    // O sufixo "-ção/-são" é feminino, mas a REGRA é cega e casa com palavras
    // em que aquelas letras não são sufixo nenhum: arte-são, cora-ção. São
    // poucas e fechadas; a lista sai mais barata que uma análise morfológica.
    artesão: 'm', cortesão: 'm', coração: 'm', calção: 'm', bastião: 'm',
    dia: 'm', mapa: 'm', planeta: 'm', sofá: 'm', pijama: 'm', tapa: 'm',
    guaraná: 'm', cinema: 'm', clima: 'm', mel: 'm', sal: 'm',
    leite: 'm', pai: 'm', mãe: 'f', chá: 'm', pé: 'm', café: 'm',
  }),
)

/**
 * Terminações que decidem sozinhas. A ordem importa: a lista é varrida de cima
 * para baixo e a primeira que casar vence, então o específico vem antes do
 * genérico ("-ção" antes de "-ão", "-eza" antes de "-a").
 *
 * O que NÃO está aqui é tão importante quanto o que está: `-e` final é
 * ambíguo em pt-BR (leite é m., carne é f.) e foi deliberadamente deixado de
 * fora — ele erra perto de metade das vezes e envenenaria a votação.
 */
const TERMINACOES = [
  // Sufixos abstratos, os mais previsíveis da língua.
  [/(ção|são|ções|sões)$/, 'f'],
  [/(dade|tude|ice|ise|eza|ura|ância|ência|agem|igem|ugem|idão)$/, 'f'],
  [/(mento|ismo|ário|eiro|ório|dor|tor|sor)$/, 'm'],
  // Grego em -ema/-oma: problema, sistema, cinema, idioma, sintoma. O -ama
  // genérico ficou de fora porque engolia "cama" — só entram os -grama/-drama,
  // que de fato vêm do grego.
  [/(ema|oma)$/, 'm'],
  [/(grama|drama|trama|panorama)$/, 'm'],
  // "ã" sem til de -ão: irmã, manhã, maçã, lã.
  [/ã$/, 'f'],
  [/(ão|ões)$/, 'm'],
  [/ez$/, 'f'],
  [/(az|oz|uz)$/, 'm'],
  [/(or|ar|ol|el|il|al|ul|um|om|im|ume)$/, 'm'],
  [/a$/, 'f'],
  [/o$/, 'm'],
]

/* ------------------------------------------- comuns de dois gêneros */

/**
 * Sufixos de substantivo COMUM DE DOIS GÊNEROS: *o* dentista e *a* dentista,
 * *o* estudante e *a* estudante. A forma é uma só; quem muda é o artigo.
 *
 * Isto não é uma imprecisão da inferência que dá para apertar — é uma classe
 * inteira de palavras que **não tem** gênero para inferir. A terminação em `-a`
 * mentia sobre as 72 palavras em `-ista` do acervo e ia mentir sempre.
 */
const SUFIXOS_DOIS_GENEROS = [
  /ista$/,
  /nte$/,
  /ense$/,
  /crata$/,
  /iatra$/,
  /nauta$/,
  // -cida é ambíguo por dois motivos ao mesmo tempo: como agente é comum de
  // dois gêneros (o/a suicida) e como substância é masculino (o inseticida).
  // Nenhum dos dois é feminino, que é o que a terminação dizia.
  /cida$/,
]

/**
 * Onde aquelas letras finais não são sufixo nenhum — mesma armadilha do
 * "arte-são". `lista`, `pista` e `vista` não são profissões, e `restaurante`
 * não é quem restaura.
 */
const NAO_SAO_AGENTES = new Set([
  'lista', 'pista', 'vista', 'crista', 'entrevista', 'revista', 'conquista',
  'restaurante', 'elefante', 'diamante', 'ponte', 'fonte', 'monte', 'dente',
  'ambiente', 'presente', 'ingrediente', 'continente', 'instante', 'semente',
  'corrente', 'lente', 'ponte-levadiça', 'gente', 'mente', 'frente', 'ventre',
  'defesa',
])

/**
 * Palavra a palavra, para as que nenhum sufixo pega. `guia` está aqui e não
 * como regra `-guia$` de propósito: águia, enguia e audioguia são femininas de
 * verdade, e uma regra larga levaria as três junto.
 */
const PALAVRAS_DOIS_GENEROS = new Set([
  'colega', 'jovem', 'intérprete', 'interprete', 'atleta', 'guia', 'chefe',
  'cliente', 'estudante', 'gerente', 'agente', 'paciente', 'doente', 'parente',
  'adolescente', 'assistente', 'ajudante', 'cantante', 'personagem', 'mártir',
  'indígena', 'camarada', 'suicida', 'homicida',
])

/**
 * NÃO confundir com SOBRECOMUM. `criança`, `pessoa`, `vítima` e `testemunha`
 * têm gênero FIXO, o mesmo para homem e mulher: diz-se "a criança" de um menino
 * e "a testemunha" de um homem. Tirar o gênero delas seria estragar concordância
 * certa para consertar um problema que não existe ali — a medição pegou
 * `criança` no ato quando a incluí por engano.
 */

/**
 * Esta palavra tem os dois gêneros?
 *
 * Quando a resposta é sim, a entrada sai com CLASSE e sem gênero. Numa prancha
 * de CAA a pessoa fala de si ou de quem está na frente dela o tempo todo, e
 * "a dentista" para um homem não é um errinho de concordância: é o app pondo a
 * pessoa errada na frase. Pela mesma política que rege o resto — errar é pior
 * que omitir — a resposta certa aqui é calar sobre o gênero.
 *
 * Perder o gênero de uma palavra que tinha custa uma concordância. Inventar
 * gênero numa que não tem custa a identidade de quem está falando.
 */
export function comumDeDoisGeneros(palavra) {
  const p = palavra.toLowerCase()
  if (NAO_SAO_AGENTES.has(p)) return false
  if (PALAVRAS_DOIS_GENEROS.has(p)) return true
  return SUFIXOS_DOIS_GENEROS.some((re) => re.test(p))
}

/** Sinal 1: a terminação. */
export function generoPorTerminacao(palavra) {
  const p = palavra.toLowerCase()
  if (GENERO_FIXO.has(p)) return GENERO_FIXO.get(p)
  for (const [re, genero] of TERMINACOES) if (re.test(p)) return genero
  return null
}

/**
 * Sinal 2: a marca lexicográfica no começo da definição ("m. ...", "f. ...").
 *
 * "m. e f." e "adj. e s." não decidem nada e devolvem `null` — a definição
 * está dizendo que a palavra vale para os dois, e um voto ali seria um chute
 * disfarçado de evidência.
 */
export function generoPorDefinicao(definicao) {
  const d = definicao.trim().toLowerCase()
  if (/^(m\.\s*e\s*f\.|f\.\s*e\s*m\.|amb\.)/.test(d)) return null
  if (/^m\.\s/.test(d) || /^s\.\s*m\./.test(d)) return 'm'
  if (/^f\.\s/.test(d) || /^s\.\s*f\./.test(d)) return 'f'
  return null
}

/**
 * Sinal 3: um artigo colado à própria palavra dentro da definição
 * ("...separar o teclado do monitor" numa definição de "teclado").
 *
 * É o sinal mais raro dos três, mas é evidência de USO e não de forma — por
 * isso vale como voto quando aparece, sobretudo nas palavras em `-e` que a
 * terminação se recusa a julgar.
 */
export function generoPorArtigo(palavra, definicao) {
  const p = palavra.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const d = ' ' + definicao.toLowerCase() + ' '
  const masc = new RegExp(`[\\s(](o|um|ao|do|no|pelo|esse|este|aquele)\\s+${p}[\\s,.;:)]`)
  const fem = new RegExp(`[\\s(](a|uma|à|da|na|pela|essa|esta|aquela)\\s+${p}[\\s,.;:)]`)
  const m = masc.test(d)
  const f = fem.test(d)
  if (m === f) return null
  return m ? 'm' : 'f'
}

/* ------------------------------------------------------- gênero de adjetivo */

/**
 * Adjetivo terminado em `-o` que na verdade não flexiona — quase sempre nome de
 * cor tirado de um substantivo. "Um carro vinho", nunca "uma blusa vinha".
 */
const ADJETIVOS_INVARIAVEIS_EM_O = new Set([
  'vinho', 'gelo', 'ouro', 'chocolate', 'salmão', 'creme', 'marfim', 'bordô',
])

/**
 * O gênero de um ADJETIVO não quer dizer o que o de um substantivo quer dizer.
 *
 * Em substantivo, `gender` é o gênero da palavra. Em adjetivo, ele é uma marca
 * de "esta palavra tem duas formas, e a que está aqui é a masculina" — leia
 * `agree()` em `grammar.ts`:
 *
 *     if (gender === 'f' && lex?.gender === 'm' && out.endsWith('o'))
 *       out = out.slice(0, -1) + 'a'
 *
 * Ou seja, `gender: 'm'` é a CHAVE que liga a flexão; ausência de gênero quer
 * dizer invariável, e é por isso que "feliz" e "grande" não têm o campo. É o
 * que o comentário do `Lexeme` em `lexicon.ts` já dizia.
 *
 * A regra sai inteira daí: só o `-o` final é acionável, então só ele é marcado.
 * `-ês`, `-or`, `-eu` e `-ão` também são biformes (português/portuguesa,
 * trabalhador/trabalhadora), mas `agree()` não os toca — marcá-los não mudaria
 * uma frase hoje e traria junto os invariáveis que se parecem com eles
 * (melhor, pior, anterior, cortês). Ganho zero, risco real: ficam de fora.
 *
 * Os 27 adjetivos do gabarito confirmam o corte sem uma exceção: os 20 com
 * `gender: 'm'` terminam em `-o`, e os 7 sem gênero são todos invariáveis
 * (feliz, triste, doente, grande, quente, legal, igual).
 */
export function generoDeAdjetivo(palavra) {
  const p = palavra.toLowerCase()
  if (ADJETIVOS_INVARIAVEIS_EM_O.has(p)) return null
  // Invariáveis: -e, -l, -z, -m, -s, -ar, -il. Não recebem gênero nenhum, que
  // é a armadilha simétrica à do "-ista": marcar "feliz" como masculino faria
  // `agree()` tentar flexionar o que não flexiona.
  return /o$/.test(p) ? 'm' : null
}

/* ------------------------------------------ o que o `type=4` traz de errado */

/**
 * O `type=4` da ARASAAC não é "adjetivo": é "modificador", e dentro dele vêm
 * advérbio, numeral, possessivo e demonstrativo junto com adjetivo de verdade.
 *
 * Publicar `depressa` como adjetivo fazia o motor pôr cópula onde cabia
 * adjunto — "Nosso dia não vai estar depressa". O defeito aparecia no detector
 * de concordância, mas nunca foi de concordância: era de CLASSE. Advérbio não
 * concorda com substantivo nenhum porque não é para concordar.
 *
 * Estas são CLASSES FECHADAS — dá para listá-las inteiras, e listar é mais
 * seguro que inferir. Onde a lista não alcança, a palavra fica como está.
 */

/** `-mente` não aparece uma única vez no acervo; a regra produtiva seria morta. */
const ADVERBIOS = new Set([
  'agora', 'depressa', 'nunca', 'fora', 'ali', 'aqui', 'lá', 'cá', 'aí',
  'atrás', 'adiante', 'diante', 'longe', 'perto', 'dentro', 'debaixo', 'acima',
  'abaixo', 'bem', 'mal', 'demais', 'hoje', 'ontem', 'amanhã', 'anteontem',
  'sempre', 'jamais', 'já', 'ainda', 'também', 'talvez', 'antes', 'depois',
  'logo', 'assim', 'devagar', 'cedo', 'tarde', 'quase', 'apenas', 'junto',
])

/**
 * Cardinais viram `quantifier` com `plural: true`, na forma que o léxico manual
 * já usa para `dois`, `três` e `dez`. Os ordinais NÃO entram: "primeira",
 * "segunda", "terceira" são adjetivos de verdade e flexionam como tais.
 */
const NUMERAIS = new Set([
  'zero', 'seis', 'sete', 'oito', 'nove', 'onze', 'doze', 'treze', 'catorze',
  'quatorze', 'quinze', 'dezasseis', 'dezesseis', 'dezassete', 'dezessete',
  'dezoito', 'dezanove', 'dezenove', 'vinte', 'trinta', 'quarenta', 'cinquenta',
  'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa', 'cem', 'cento',
  'duzentos', 'duzentas', 'trezentos', 'trezentas', 'quatrocentos',
  'quatrocentas', 'quinhentos', 'quinhentas', 'seiscentos', 'seiscentas',
  'setecentos', 'setecentas', 'oitocentos', 'oitocentas', 'novecentos',
  'novecentas', 'mil', 'milhão', 'milhões', 'bilhão', 'bilião', 'milhar',
])

/** `mais` e `menos` são quantificadores, não advérbios — é o que o manual faz. */
const QUANTIFICADORES = new Set(['menos', 'muitíssimo', 'muitíssima', 'bastante'])

/**
 * Possessivo é `determiner` e demonstrativo é `article` — não é escolha minha,
 * é o que o léxico revisado à mão já faz (`meu` determiner, `esse` article).
 * O valor é `[classe, gênero, plural]`.
 */
const FECHADAS_COM_FLEXAO = new Map(Object.entries({
  meu: ['determiner', 'm', false], meus: ['determiner', 'm', true],
  minha: ['determiner', 'f', false], minhas: ['determiner', 'f', true],
  teu: ['determiner', 'm', false], teus: ['determiner', 'm', true],
  tua: ['determiner', 'f', false], tuas: ['determiner', 'f', true],
  seu: ['determiner', 'm', false], seus: ['determiner', 'm', true],
  sua: ['determiner', 'f', false], suas: ['determiner', 'f', true],
  nossos: ['determiner', 'm', true], nossas: ['determiner', 'f', true],
  este: ['article', 'm', false], esta: ['article', 'f', false],
  estes: ['article', 'm', true], estas: ['article', 'f', true],
  essa: ['article', 'f', false], essas: ['article', 'f', true],
  esses: ['article', 'm', true],
  aquele: ['article', 'm', false], aquela: ['article', 'f', false],
  aqueles: ['article', 'm', true], aquelas: ['article', 'f', true],
  algum: ['determiner', 'm', false], alguma: ['determiner', 'f', false],
  alguns: ['determiner', 'm', true], algumas: ['determiner', 'f', true],
  nenhum: ['determiner', 'm', false], nenhuma: ['determiner', 'f', false],
  outro: ['determiner', 'm', false], outra: ['determiner', 'f', false],
  outros: ['determiner', 'm', true], outras: ['determiner', 'f', true],
  vários: ['determiner', 'm', true], várias: ['determiner', 'f', true],
  diversos: ['determiner', 'm', true], diversas: ['determiner', 'f', true],
  ambos: ['determiner', 'm', true], ambas: ['determiner', 'f', true],
  qualquer: ['determiner', null, false], quaisquer: ['determiner', null, true],
  tal: ['determiner', null, false], tais: ['determiner', null, true],
  cada: ['determiner', null, false],
}))

/**
 * Interrogativos. Saem do arquivo em vez de entrarem como advérbio: eles têm
 * classe própria (`question`) e regem estrutura de pergunta, coisa que a
 * inferência não sabe montar. Publicar `onde` como advérbio trocaria um erro
 * por outro; deixá-los para `guess()` é o comportamento de antes.
 */
const INTERROGATIVOS = new Set([
  'como', 'onde', 'quando', 'quanto', 'quanta', 'quantos', 'quantas',
  'porque', 'porquê', 'qual', 'quais', 'quem', 'aonde',
])

/**
 * Reclassifica o que veio do `type=4` e não é adjetivo.
 *
 * Devolve `'descartar'`, uma entrada nova, ou `null` para deixar como está.
 * A ordem é a da confiança: lista fechada primeiro, marca do dicionário
 * (`adv.` no começo da definição) por último, porque a lista é certa e a marca
 * é evidência.
 */
export function reclassificar(termo, definicoes) {
  const p = termo.toLowerCase()

  if (INTERROGATIVOS.has(p)) return 'descartar'
  if (NUMERAIS.has(p)) return { class: 'quantifier', plural: true }
  if (QUANTIFICADORES.has(p)) return { class: 'quantifier' }

  const fechada = FECHADAS_COM_FLEXAO.get(p)
  if (fechada) {
    const [classe, genero, plural] = fechada
    const entrada = { class: classe }
    if (genero) entrada.gender = genero
    if (plural) entrada.plural = true
    return entrada
  }

  if (ADVERBIOS.has(p)) return { class: 'adverb' }

  // A marca do dicionário, que o próprio acervo traz: "adv. Com celeridade..."
  // em `depressa`. Vale como último recurso e só para advérbio — o marcador
  // `pron.` existe mas vem contaminado (a ARASAAC o usa também em numeral).
  if (definicoes.some((d) => /^adv\./i.test(d.trim()))) return { class: 'adverb' }

  return null
}

/* ------------------------------------------------------------ femininoBase */

/**
 * Adjetivo INVARIÁVEL terminado em `-a`. Converter estes produz "otimisto".
 *
 * A maioria já é barrada por `comumDeDoisGeneros()` (todo o `-ista`, `-crata`,
 * `-iatra`), que é a mesma família vista de outro ângulo: palavra de forma
 * única não tem par masculino para virar. Aqui ficam só as que nenhum sufixo
 * pega.
 */
const ADJETIVOS_INVARIAVEIS_EM_A = new Set([
  'hipócrita', 'agrícola', 'indígena', 'azteca', 'asteca', 'careca', 'grávida',
  'rosa', 'poliglota', 'belga', 'celta', 'persa', 'cor-de-rosa',
])

/**
 * A classe do termo, pela maioria das linhas. Separada de `inferir()` porque o
 * contexto precisa saber a classe de TODO o acervo antes de qualquer inferência
 * rodar — e chamar `inferir()` para descobrir isso seria circular.
 */
export function classeDoTermo(linhas) {
  const porClasse = new Map()
  for (const l of linhas) {
    const c = classeDoTipo(l.type)
    if (!c) continue
    porClasse.set(c, (porClasse.get(c) ?? 0) + 1)
  }
  if (porClasse.size === 0) return null
  return [...porClasse.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * O conjunto dos adjetivos do acervo — a evidência de que `femininoBase`
 * precisa. Monte uma vez e passe para `inferir()`.
 */
export function construirContexto(acervo) {
  const adjetivos = new Set()
  for (const [termo, linhas] of acervo) {
    if (classeDoTermo(linhas) === 'adjective') adjetivos.add(termo)
  }
  return { adjetivos }
}

/**
 * O rótulo está na forma feminina de um par biforme?
 *
 * **A marca não se deduz da terminação.** Adjetivo invariável em `-a` é comum
 * (otimista, hipócrita, agrícola), e marcá-lo faria o motor imprimir
 * "otimisto" — o mesmo erro do `-ista`, de roupa nova.
 *
 * O sinal usado é direto e não inferido: **o par masculino existe no acervo,
 * também como adjetivo**. "amarela" tem "amarelo" ao lado; "otimista" não tem
 * "otimisto", e nunca vai ter.
 *
 * Onde o par não existe, a resposta é NÃO. Olhei as 44 palavras em `-a` sem par
 * e cerca de um terço nem adjetivo é — o `type=4` da ARASAAC recolhe advérbio
 * (agora, depressa, nunca), numeral (trinta, oitenta) e determinante (essa,
 * minha). Junto vinham invariáveis de verdade (careca, grávida, poliglota).
 * Marcar esse bloco por terminação acertaria talvez dois terços, o que está
 * muito abaixo do corte do resto do arquivo. As biformes legítimas que se
 * perdem ali (bêbada, medrosa, espanhola) continuam saindo com a classe, que é
 * o comportamento de hoje: nada piora, só não melhora.
 */
export function temFemininoBase(palavra, contexto) {
  const p = palavra.toLowerCase()
  if (!p.endsWith('a')) return false
  if (ADJETIVOS_INVARIAVEIS_EM_A.has(p)) return false
  if (comumDeDoisGeneros(p)) return false
  return Boolean(contexto?.adjetivos?.has(p.slice(0, -1) + 'o'))
}

/* ---------------------------------------------------------------- plural */

/**
 * Porte fiel de `pluralize()` em `web/src/lib/grammar.ts`.
 *
 * Fiel de propósito, defeitos inclusive ("mão" → "mões"). A pergunta que este
 * arquivo responde não é "qual é o plural certo" — é "o motor já chega nele
 * sozinho?". Uma versão *melhor* do que a do motor faria a ferramenta calar
 * justamente nos casos em que o motor erra, que são os únicos que interessam.
 * Se `grammar.ts` mudar, esta função muda junto e `medir.mjs` avisa.
 */
export function pluralDoMotor(palavra) {
  const p = palavra.toLowerCase()
  if (p.endsWith('z')) return p + 'es'
  if (p.endsWith('s')) return /[aeiou]s$/.test(p) ? p + 'es' : p
  if (p.endsWith('m')) return p.slice(0, -1) + 'ns'
  if (/[rl]$/.test(p)) return p.endsWith('l') ? p.slice(0, -1) + 'is' : p + 'es'
  if (p.endsWith('ão')) return p.slice(0, -2) + 'ões'
  return p + 's'
}

/**
 * Só emitimos `pluralForm` quando o plural do acervo FOGE da regra que o motor
 * já aplica. Repetir o que o motor sabe seria inflar o arquivo com dado morto
 * — e cada campo repetido é mais uma chance de os dois discordarem no futuro.
 *
 * O campo `plural` da ARASAAC foi conferido nos 15 plurais irregulares do
 * gabarito e acertou todos os 15. É dado confiável.
 */
export function pluralIrregular(palavra, plural) {
  if (!plural) return null
  const pl = plural.trim().toLowerCase()
  const p = palavra.toLowerCase()
  if (!pl || pl === p) return null
  if (/[\s\d]/.test(pl)) return null
  // Plural de português termina em -s. Sem esta linha entram os erros de
  // digitação do acervo ("cabaçaa") e os plurais latinos ("curricula"), que
  // sairiam impressos na frase da pessoa.
  if (!pl.endsWith('s')) return null
  if (pluralDoMotor(p) === pl) return null

  // O plural tem de ser o plural DESTA palavra. O acervo às vezes guarda a
  // forma de pt-PT ao lado do singular de pt-BR — "atividade"/"actividades" —
  // e emitir isso faria o motor imprimir uma grafia que a pessoa não escolheu.
  // Um plural de verdade divide quase toda a palavra com o singular.
  let comum = 0
  while (comum < p.length && p[comum] === pl[comum]) comum += 1
  if (comum < p.length - 2) return null

  return pl
}

/* ------------------------------------------------------------- a decisão */

/**
 * Junta os sinais de um termo (que costuma ter várias linhas no banco, uma por
 * pictograma) numa entrada só.
 *
 * A regra de confiança ALTA:
 *   - verbo e adjetivo entram direto — não carregam gênero no léxico, então o
 *     único dado em jogo é a classe, que mede 99,5%;
 *   - substantivo entra com **2 pontos a favor e ZERO contra**.
 *
 * Os pesos não são gosto: saíram da medição de cada sinal isolado contra o
 * gabarito. A terminação acerta 98,8% sozinha e vale 2 pontos — decide por si.
 * A definição acerta 91% e o artigo é raro demais para ter média confiável;
 * valem 1 ponto cada, então precisam de companhia. E **qualquer** ponto do lado
 * perdedor derruba para baixa, mesmo quando a terminação venceria: sinal
 * discordante quer dizer que a palavra é daquelas que enganam, e é exatamente
 * aí que não se deve arriscar.
 *
 * Por que tão apertado: errar o artigo ("o mão") é pior do que não pôr artigo
 * nenhum. O motor já é conservador com palavra desconhecida, e o custo de uma
 * palavra a menos no léxico é uma frase mais telegráfica — o custo de uma
 * palavra errada é a frase dizer outra coisa. O resto vai para revisão humana.
 */
export function inferir(termo, linhas, contexto) {
  const classe = classeDoTermo(linhas)
  if (!classe) return null

  let plural = null
  for (const l of linhas) {
    const irr = pluralIrregular(termo, l.plural)
    if (irr) { plural = irr; break }
  }

  const entrada = { class: classe }
  if (plural && classe === 'noun') entrada.pluralForm = plural

  if (classe === 'adjective') {
    // O `type=4` traz advérbio, numeral e possessivo junto com adjetivo. Isso
    // vem ANTES de qualquer regra de gênero: não adianta acertar o gênero de
    // uma palavra que nem adjetivo é.
    const outra = reclassificar(termo, linhas.map((l) => desfazerMojibake(l.meaning || '')))
    if (outra === 'descartar') return null
    if (outra) {
      if (entrada.pluralForm) delete entrada.pluralForm
      return { entrada: { ...outra }, confianca: 'alta', sinais: {}, pontos: 0, reclassificado: true }
    }

    // Sem gênero aqui significa INVARIÁVEL, e é uma afirmação, não uma dúvida.
    const g = generoDeAdjetivo(termo)
    if (g) entrada.gender = g
    // `gender` e `femininoBase` se excluem: um diz "o rótulo é a forma
    // masculina", o outro diz "é a feminina". Nunca os dois.
    else if (temFemininoBase(termo, contexto)) entrada.femininoBase = true
    return { entrada, confianca: 'alta', sinais: {}, pontos: 0 }
  }

  if (classe !== 'noun') {
    return { entrada, confianca: 'alta', sinais: {}, pontos: 0 }
  }

  // Comum de dois gêneros: a ausência de gênero aqui é a RESPOSTA, não uma
  // lacuna. Por isso sai com confiança alta e vai para o app — a classe é o que
  // ela tem para dar, e é dado bom.
  if (comumDeDoisGeneros(termo)) {
    return { entrada, confianca: 'alta', sinais: {}, pontos: 0, doisGeneros: true }
  }

  // Cada sinal vota uma vez pelo termo inteiro, não uma vez por linha: um termo
  // com nove pictogramas não tem nove vezes mais evidência que um com um.
  const definicoes = linhas.map((l) => desfazerMojibake(l.meaning || '')).filter(Boolean)
  const sinais = {
    terminacao: generoPorTerminacao(termo),
    definicao: maioria(definicoes.map(generoPorDefinicao)),
    artigo: maioria(definicoes.map((d) => generoPorArtigo(termo, d))),
  }

  const PESO = { terminacao: 2, definicao: 1, artigo: 1 }
  let m = 0
  let f = 0
  for (const [nome, voto] of Object.entries(sinais)) {
    if (voto === 'm') m += PESO[nome]
    else if (voto === 'f') f += PESO[nome]
  }

  let genero = null
  let confianca = 'baixa'
  if (m > f) { genero = 'm'; confianca = m >= 2 && f === 0 ? 'alta' : 'baixa' }
  else if (f > m) { genero = 'f'; confianca = f >= 2 && m === 0 ? 'alta' : 'baixa' }
  // Empate com votos dos dois lados não produz gênero nenhum: um chute 50/50
  // no artigo não é melhor que a omissão que o motor já faz.

  if (genero) entrada.gender = genero
  return { entrada, confianca, sinais, pontos: Math.max(m, f) }
}

function maioria(valores) {
  const m = valores.filter((v) => v === 'm').length
  const f = valores.filter((v) => v === 'f').length
  if (m === f) return null
  return m > f ? 'm' : 'f'
}

/* ------------------------------------------------------- leitura do banco */

/** Termos de uma palavra só, sem pontuação e sem dígito, agrupados por termo. */
export function lerAcervo(caminhoDoBanco) {
  const { DatabaseSync } = require_sqlite()
  const db = new DatabaseSync(caminhoDoBanco, { readOnly: true })
  const linhas = db
    .prepare("select keyword, plural, meaning, type from keywords where lang='pt'")
    .all()
  db.close()

  const porTermo = new Map()
  for (const l of linhas) {
    const termo = String(l.keyword ?? '').trim().toLowerCase()
    if (!termo) continue
    // Uma palavra só: locução ("escovar os dentes") precisa de anotação que a
    // inferência não sabe dar, e entraria errada com cara de certa.
    if (!/^[a-zà-öø-ÿ'-]+$/i.test(termo)) continue
    if (termo.length < 2) continue
    if (!porTermo.has(termo)) porTermo.set(termo, [])
    porTermo.get(termo).push(l)
  }
  return porTermo
}

function require_sqlite() {
  // `node:sqlite` é experimental; o import direto emite aviso e, em Node antigo,
  // explode. Falhar aqui com mensagem clara é melhor que rastreio de pilha.
  try {
    return process.getBuiltinModule
      ? process.getBuiltinModule('node:sqlite')
      : require('node:sqlite')
  } catch {
    throw new Error('Este Node não tem `node:sqlite`. Use Node 22+.')
  }
}

/* ------------------------------------------------------- léxico revisado */

/**
 * Toda palavra que `lexicon.ts` já trata à mão — e que esta ferramenta não pode
 * tocar.
 *
 * Regex e não import porque `lexicon.ts` é TypeScript e um script Node puro não
 * o lê sem cadeia de build — e porque a única coisa que precisamos daqui é a
 * LISTA DE PALAVRAS.
 *
 * A varredura vai do `LEXICON` até o fim do arquivo DE PROPÓSITO, e por isso
 * recolhe mais que as ~250 entradas do léxico: pega também as chaves de
 * `IRREGULAR_VERBS`, `SUBJUNCTIVE`, `GERUND`, `TIME_ADVERBS`. Isso é o que se
 * quer. Toda palavra que aparece em qualquer uma dessas tabelas já foi olhada
 * por uma pessoa e já tem tratamento próprio no motor; inferir por cima dela
 * seria, na melhor hipótese, redundante. Errar para MAIS palavras preservadas
 * custa cobertura; errar para menos corrompe trabalho manual.
 *
 * O modo de falhar do regex é justamente devolver POUCAS chaves — silenciosa e
 * na direção ruim. Por isso `gerar.mjs` aborta se a contagem despencar.
 */
export function chavesRevisadas(fonteTs) {
  const bloco = fonteTs.slice(fonteTs.indexOf('export const LEXICON'))
  const chaves = new Set()
  const re = /^\s{2}(?:'([^']+)'|"([^"]+)"|([\wà-öø-ÿ]+)):\s/gmiu
  let m
  while ((m = re.exec(bloco))) chaves.add((m[1] ?? m[2] ?? m[3]).toLowerCase())
  return chaves
}

/** O gabarito: palavra → { class, gender, pluralForm } do léxico manual. */
export function gabarito(fonteTs) {
  const inicio = fonteTs.indexOf('export const LEXICON')
  const bloco = fonteTs.slice(inicio, fonteTs.indexOf('\n}', inicio))
  const saida = new Map()
  const re = /^\s{2}(?:'([^']+)'|"([^"]+)"|([\wà-öø-ÿ]+)):\s*(.+)$/gmiu
  let m
  while ((m = re.exec(bloco))) {
    const chave = (m[1] ?? m[2] ?? m[3]).toLowerCase()
    const valor = m[4]
    let classe = null
    if (/^V\(/.test(valor)) classe = 'verb'
    else if (/^N\(/.test(valor)) classe = 'noun'
    else if (/^ADJ\(/.test(valor)) classe = 'adjective'
    else {
      const c = valor.match(/class:\s*'([a-z]+)'/)
      if (c) classe = c[1]
    }
    if (!classe) continue
    const g = valor.match(/^(?:N|ADJ)\('([mf])'/) || valor.match(/gender:\s*'([mf])'/)
    const pf = valor.match(/pluralForm:\s*'([^']+)'/)
    saida.set(chave, {
      class: classe,
      gender: g ? g[1] : undefined,
      pluralForm: pf ? pf[1] : undefined,
    })
  }
  return saida
}
