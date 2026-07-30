/**
 * Blocos — o "Scratch de imagens".
 *
 * O QUE É
 *
 * Uma pilha de blocos que se executa de cima para baixo sobre um desenho SVG.
 * Cada bloco recebe o desenho inteiro que veio dos blocos acima e devolve um
 * desenho novo: repetido, espalhado numa grade, girado, espelhado, animado.
 * Entra uma string de SVG, sai uma string de SVG — nada de DOM, nada de sorteio.
 *
 * POR QUE ISTO EXISTE NUM APP DE CAA
 *
 * Laço e aninhamento são a primeira lógica de programação que alguém encontra —
 * "faça isto tantas vezes", e depois "faça isto dentro daquilo". Aqui elas
 * aparecem **sem texto e sem sintaxe**: dá para construir uma ideia complexa sem
 * escrever uma linha nem ler uma palavra. Quem não fala e quem não lê é
 * justamente quem costuma ser deixado de fora do "ensinar a programar", porque
 * toda a porta de entrada é textual. Esta não é.
 *
 * E o retorno é imediato e visual: mexeu no número, a tela mudou. A relação
 * causa→efeito não precisa ser explicada por ninguém, ela se vê.
 *
 * COMO O ANINHAMENTO FUNCIONA AQUI
 *
 * A pilha é PLANA — não há bloco com "boca" que engole outros. O aninhamento
 * acontece por encadeamento: como cada bloco envolve TUDO o que veio antes,
 * `grade` seguido de `repetir` produz uma grade de repetições. Multiplica,
 * exatamente como um laço dentro de outro.
 *
 * Foi decisão, não limitação: uma pilha plana é arrastar-e-soltar numa lista, o
 * gesto mais simples que existe. Blocos com boca exigiriam soltar DENTRO de um
 * alvo pequeno — precisão motora que nem todo mundo tem, para ganhar um poder
 * que o encadeamento já dá.
 *
 * O PREÇO DO ANINHAMENTO
 *
 * Multiplicação cresce rápido: três laços de 8 são 512 cópias. Por isso existe
 * `custoEstimado` — a UI pergunta ANTES de a tela travar, em vez de congelar o
 * aparelho de alguém que só queria ver o que acontece. Travar é a pior resposta
 * possível a uma criança experimentando.
 */

/** Tamanho da tela dos desenhos; o centro é o pivô de quase toda transformação. */
const L = 720
const A = 720
const CX = 360
const CY = 360

/**
 * Teto de caracteres do SVG gerado. É o freio de mão: mesmo com a UI checando
 * `custoEstimado`, uma pilha salva antiga pode chegar aqui, e é melhor devolver
 * um desenho incompleto do que devolver o aparelho travado.
 */
const TETO_CARACTERES = 1_300_000

export type TipoBloco =
  | 'repetir'
  | 'grade'
  | 'radial'
  | 'mover'
  | 'escalar'
  | 'girar'
  | 'inclinar'
  | 'espelhar'
  | 'ondular'
  | 'traco'
  | 'animarGirar'
  | 'animarPulsar'
  | 'animarFlutuar'

export interface Bloco {
  id: string
  tipo: TipoBloco
  /** Os ajustes do bloco, por nome. Ex.: { vezes: 6, passoX: 40 } */
  args: Record<string, number | string | boolean>
}

export type EspecArg =
  | { tipo: 'range'; min: number; max: number; passo?: number; padrao: number; rotulo: string }
  | { tipo: 'select'; opcoes: string[]; padrao: string; rotulo: string }
  | { tipo: 'bool'; padrao: boolean; rotulo: string }

export interface EspecBloco {
  tipo: TipoBloco
  nome: string
  icone: string
  /** 'laco' | 'transformar' | 'aparencia' | 'animacao' — para agrupar na UI. */
  grupo: string
  /** Uma frase sobre o que ele faz, em linguagem de criança. */
  descricao: string
  args: Record<string, EspecArg>
}

/**
 * O catálogo — a UI monta a paleta de blocos a partir daqui.
 *
 * Os nomes e as descrições são parte do produto, não enfeite: quem usa não lê
 * documentação. "Faz várias cópias, cada uma um pouco mais longe" é a
 * especificação do bloco tanto quanto o código que o executa.
 */
export const BLOCOS: EspecBloco[] = [
  {
    tipo: 'repetir',
    nome: 'Repetir',
    icone: '🔁',
    grupo: 'laco',
    descricao: 'Faz várias cópias, cada uma um pouquinho mais longe que a outra.',
    args: {
      vezes: { tipo: 'range', min: 2, max: 24, padrao: 6, rotulo: 'Quantas vezes' },
      passoX: { tipo: 'range', min: -200, max: 200, padrao: 0, rotulo: 'Anda para o lado' },
      passoY: { tipo: 'range', min: -200, max: 200, padrao: 0, rotulo: 'Anda para baixo' },
      giro: { tipo: 'range', min: -180, max: 180, padrao: 30, rotulo: 'Vira um pouco' },
      escala: { tipo: 'range', min: 50, max: 130, padrao: 100, rotulo: 'Cresce ou encolhe (%)' },
    },
  },
  {
    tipo: 'grade',
    nome: 'Grade',
    icone: '▦',
    grupo: 'laco',
    descricao: 'Enche a tela de cópias, em fileiras e colunas.',
    args: {
      colunas: { tipo: 'range', min: 1, max: 10, padrao: 3, rotulo: 'Colunas' },
      linhas: { tipo: 'range', min: 1, max: 10, padrao: 3, rotulo: 'Linhas' },
      espacoX: { tipo: 'range', min: 20, max: 240, padrao: 120, rotulo: 'Espaço entre colunas' },
      espacoY: { tipo: 'range', min: 20, max: 240, padrao: 120, rotulo: 'Espaço entre linhas' },
    },
  },
  {
    tipo: 'radial',
    nome: 'Radial',
    icone: '✺',
    grupo: 'laco',
    descricao: 'Põe as cópias em roda, como pétalas de uma flor.',
    args: {
      vezes: { tipo: 'range', min: 2, max: 24, padrao: 8, rotulo: 'Quantas pétalas' },
      raio: { tipo: 'range', min: 0, max: 300, padrao: 0, rotulo: 'Distância do meio' },
      acompanhar: { tipo: 'bool', padrao: true, rotulo: 'As cópias viram junto' },
    },
  },
  {
    tipo: 'mover',
    nome: 'Mover',
    icone: '↔',
    grupo: 'transformar',
    descricao: 'Empurra o desenho para o lado ou para baixo.',
    args: {
      dx: { tipo: 'range', min: -300, max: 300, padrao: 0, rotulo: 'Para o lado' },
      dy: { tipo: 'range', min: -300, max: 300, padrao: 0, rotulo: 'Para baixo' },
    },
  },
  {
    // O "Esticar (X/Y)" do estúdio original virou este mesmo bloco: um só
    // controle com dois lados é menos coisa na tela, e escalar igual é só
    // deixar os dois números juntos.
    tipo: 'escalar',
    nome: 'Escalar',
    icone: '⤢',
    grupo: 'transformar',
    descricao: 'Deixa o desenho maior ou menor.',
    args: {
      largura: { tipo: 'range', min: 10, max: 300, padrao: 100, rotulo: 'Largura (%)' },
      altura: { tipo: 'range', min: 10, max: 300, padrao: 100, rotulo: 'Altura (%)' },
    },
  },
  {
    tipo: 'girar',
    nome: 'Girar',
    icone: '⟳',
    grupo: 'transformar',
    descricao: 'Vira o desenho inteiro.',
    args: { graus: { tipo: 'range', min: -180, max: 180, padrao: 0, rotulo: 'Quanto virar' } },
  },
  {
    tipo: 'inclinar',
    nome: 'Inclinar',
    icone: '⫽',
    grupo: 'transformar',
    descricao: 'Entorta o desenho, como se empurrasse de lado.',
    args: {
      grauX: { tipo: 'range', min: -60, max: 60, padrao: 0, rotulo: 'Entorta na horizontal' },
      grauY: { tipo: 'range', min: -60, max: 60, padrao: 0, rotulo: 'Entorta na vertical' },
    },
  },
  {
    // Espelhar e "Inverter" eram dois blocos no original: um duplicava, o outro
    // virava no lugar. São a mesma conta com uma decisão diferente — viraram um
    // bloco só com um interruptor, porque dois blocos quase iguais na paleta é
    // uma escolha a mais para fazer sem ganho nenhum.
    tipo: 'espelhar',
    nome: 'Espelhar',
    icone: '🪞',
    grupo: 'transformar',
    descricao: 'Faz o reflexo do desenho, como num espelho.',
    args: {
      eixo: { tipo: 'select', opcoes: ['h', 'v', 'quad'], padrao: 'h', rotulo: 'Para que lado' },
      duplicar: { tipo: 'bool', padrao: true, rotulo: 'Manter o original também' },
    },
  },
  {
    tipo: 'ondular',
    nome: 'Ondular',
    icone: '〰',
    grupo: 'aparencia',
    descricao: 'Faz as linhas ficarem tremidas, como debaixo d’água.',
    args: { forca: { tipo: 'range', min: 0, max: 30, padrao: 8, rotulo: 'Quanto treme' } },
  },
  {
    tipo: 'traco',
    nome: 'Traço',
    icone: '🖊',
    grupo: 'aparencia',
    descricao: 'Muda a grossura e a cor da linha do desenho.',
    args: {
      espessura: { tipo: 'range', min: 0, max: 300, padrao: 100, rotulo: 'Grossura (%)' },
      cor: {
        tipo: 'select',
        opcoes: ['#1b1b1b', '#e63946', '#f4a261', '#06d6a0', '#3a86ff', '#9b5de5', '#ffffff'],
        padrao: '#1b1b1b',
        rotulo: 'Cor da linha',
      },
    },
  },
  {
    tipo: 'animarGirar',
    nome: 'Girar sem parar',
    icone: '🌀',
    grupo: 'animacao',
    descricao: 'O desenho roda sozinho, sem parar.',
    args: {
      velocidade: { tipo: 'range', min: 1, max: 20, padrao: 6, rotulo: 'Velocidade' },
      sentido: { tipo: 'select', opcoes: ['horario', 'anti'], padrao: 'horario', rotulo: 'Para que lado' },
    },
  },
  {
    tipo: 'animarPulsar',
    nome: 'Pulsar',
    icone: '💓',
    grupo: 'animacao',
    descricao: 'O desenho cresce e encolhe, como um coração batendo.',
    args: {
      intensidade: { tipo: 'range', min: 5, max: 80, padrao: 25, rotulo: 'Quanto cresce' },
      velocidade: { tipo: 'range', min: 1, max: 20, padrao: 6, rotulo: 'Velocidade' },
    },
  },
  {
    tipo: 'animarFlutuar',
    nome: 'Flutuar',
    icone: '🍃',
    grupo: 'animacao',
    descricao: 'O desenho sobe e desce devagarinho, como uma folha no ar.',
    args: {
      distancia: { tipo: 'range', min: 5, max: 140, padrao: 40, rotulo: 'Quanto sobe' },
      velocidade: { tipo: 'range', min: 1, max: 20, padrao: 6, rotulo: 'Velocidade' },
    },
  },
]

const PORTIPO = new Map<TipoBloco, EspecBloco>(BLOCOS.map((e) => [e.tipo, e]))

/** Blocos que só existem para mexer a tela — os primeiros a cair em `semAnimacao`. */
const ANIMADOS: ReadonlySet<TipoBloco> = new Set<TipoBloco>([
  'animarGirar',
  'animarPulsar',
  'animarFlutuar',
])

export function especDe(tipo: TipoBloco): EspecBloco | undefined {
  return PORTIPO.get(tipo)
}

/** Argumentos padrão de um bloco recém-arrastado para a pilha. */
export function argsPadrao(tipo: TipoBloco): Record<string, number | string | boolean> {
  const espec = PORTIPO.get(tipo)
  const saida: Record<string, number | string | boolean> = {}
  if (!espec) return saida
  for (const [nome, arg] of Object.entries(espec.args)) saida[nome] = arg.padrao
  return saida
}

// ─────────────────── leitura defensiva dos argumentos ───────────────────
// A pilha pode vir do armazenamento local, salva por uma versão anterior do
// app, com argumento faltando ou com nome que mudou. Ler direto quebraria o
// desenho inteiro por causa de um número ausente; aqui o padrão do catálogo
// entra no lugar e o desenho continua aparecendo.

function padraoNumerico(tipo: TipoBloco, chave: string): number {
  const arg = PORTIPO.get(tipo)?.args[chave]
  return arg && arg.tipo === 'range' ? arg.padrao : 0
}

function num(b: Bloco, chave: string): number {
  const v = b.args[chave]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  return padraoNumerico(b.tipo, chave)
}

/** Inteiro positivo — os laços contam repetições, e repetir 2,5 vezes não existe. */
function inteiro(b: Bloco, chave: string, minimo: number, maximo: number): number {
  return Math.max(minimo, Math.min(maximo, Math.round(num(b, chave))))
}

function texto(b: Bloco, chave: string): string {
  const v = b.args[chave]
  if (typeof v === 'string') return v
  const arg = PORTIPO.get(b.tipo)?.args[chave]
  return arg && arg.tipo === 'select' ? arg.padrao : ''
}

function bool(b: Bloco, chave: string): boolean {
  const v = b.args[chave]
  if (typeof v === 'boolean') return v
  // Documentos antigos guardavam 0/1 nestes campos.
  if (typeof v === 'number') return v !== 0
  const arg = PORTIPO.get(b.tipo)?.args[chave]
  return arg && arg.tipo === 'bool' ? arg.padrao : false
}

/** Números em atributo de SVG: curtos, sem notação científica, sem `-0`. */
function n(x: number): string {
  if (!Number.isFinite(x)) return '0'
  const r = Math.round(x * 1000) / 1000
  return Object.is(r, -0) ? '0' : String(r)
}

/** Só sai daqui o que couber num atributo — a entrada pode vir de fora. */
function seguro(s: string): string {
  return s.replace(/[^A-Za-z0-9#,.\-_ ()%]/g, '')
}

function envolver(transformacao: string, conteudo: string): string {
  return '<g transform="' + transformacao + '">' + conteudo + '</g>'
}

/** Escalar/inclinar em torno do centro, e não do canto de cima. */
function noCentro(meio: string): string {
  return 'translate(' + CX + ' ' + CY + ') ' + meio + ' translate(' + -CX + ' ' + -CY + ')'
}

/**
 * Suavização das animações. Movimento linear "de máquina" é justamente o que
 * mais incomoda quem é sensível a movimento; a curva deixa tudo com aceleração
 * de coisa viva, que cansa menos.
 */
const SUAVE = ' calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"'

interface Contexto {
  /** Os filtros de `ondular`; saem juntos num `<defs>` na frente do desenho. */
  defs: string[]
}

function aplicar(b: Bloco, conteudo: string, ctx: Contexto): string {
  switch (b.tipo) {
    case 'repetir': {
      const vezes = inteiro(b, 'vezes', 1, 64)
      const dx = num(b, 'passoX')
      const dy = num(b, 'passoY')
      const giro = num(b, 'giro')
      const escala = num(b, 'escala') / 100
      let saida = ''
      for (let i = 0; i < vezes; i++) {
        const s = Math.pow(escala <= 0 ? 1 : escala, i)
        const tr =
          'translate(' + n(dx * i) + ' ' + n(dy * i) + ') ' +
          'rotate(' + n(giro * i) + ' ' + CX + ' ' + CY + ') ' +
          noCentro('scale(' + n(s) + ')')
        saida += envolver(tr, conteudo)
        if (saida.length > TETO_CARACTERES) break
      }
      return saida
    }

    case 'grade': {
      const colunas = inteiro(b, 'colunas', 1, 20)
      const linhas = inteiro(b, 'linhas', 1, 20)
      const espX = num(b, 'espacoX')
      const espY = num(b, 'espacoY')
      // A grade nasce centrada: senão ela cresce só para a direita e para baixo
      // e o desenho foge da tela assim que se aumenta o número de colunas.
      const meioC = (colunas - 1) / 2
      const meioL = (linhas - 1) / 2
      let saida = ''
      for (let l = 0; l < linhas; l++) {
        for (let c = 0; c < colunas; c++) {
          saida += envolver(
            'translate(' + n((c - meioC) * espX) + ' ' + n((l - meioL) * espY) + ')',
            conteudo,
          )
          if (saida.length > TETO_CARACTERES) return saida
        }
      }
      return saida
    }

    case 'radial': {
      const vezes = inteiro(b, 'vezes', 1, 64)
      const raio = num(b, 'raio')
      const acompanhar = bool(b, 'acompanhar')
      let saida = ''
      for (let i = 0; i < vezes; i++) {
        const ang = (360 / vezes) * i
        // Sem "acompanhar", cada cópia desgira o mesmo tanto e continua em pé —
        // é a diferença entre uma flor e um carrossel.
        const desgiro = acompanhar ? '' : ' rotate(' + n(-ang) + ' ' + CX + ' ' + CY + ')'
        saida += envolver(
          'rotate(' + n(ang) + ' ' + CX + ' ' + CY + ') translate(0 ' + n(-raio) + ')' + desgiro,
          conteudo,
        )
        if (saida.length > TETO_CARACTERES) break
      }
      return saida
    }

    case 'mover':
      return envolver('translate(' + n(num(b, 'dx')) + ' ' + n(num(b, 'dy')) + ')', conteudo)

    case 'escalar': {
      const sx = num(b, 'largura') / 100
      const sy = num(b, 'altura') / 100
      return envolver(noCentro('scale(' + n(sx) + ' ' + n(sy) + ')'), conteudo)
    }

    case 'girar':
      return envolver('rotate(' + n(num(b, 'graus')) + ' ' + CX + ' ' + CY + ')', conteudo)

    case 'inclinar':
      return envolver(
        noCentro('skewX(' + n(num(b, 'grauX')) + ') skewY(' + n(num(b, 'grauY')) + ')'),
        conteudo,
      )

    case 'espelhar': {
      const eixo = texto(b, 'eixo')
      const manter = bool(b, 'duplicar')
      const horizontal = 'matrix(-1,0,0,1,' + L + ',0)'
      const vertical = 'matrix(1,0,0,-1,0,' + A + ')'
      const ambos = 'matrix(-1,0,0,-1,' + L + ',' + A + ')'
      if (!manter) {
        // Sem duplicar, "quad" não faz sentido (viraria o desenho duas vezes,
        // de volta ao lugar) — trata como reflexo simples no eixo escolhido.
        return envolver(eixo === 'v' ? vertical : horizontal, conteudo)
      }
      if (eixo === 'v') return conteudo + envolver(vertical, conteudo)
      if (eixo === 'quad') {
        return (
          conteudo +
          envolver(horizontal, conteudo) +
          envolver(vertical, conteudo) +
          envolver(ambos, conteudo)
        )
      }
      return conteudo + envolver(horizontal, conteudo)
    }

    case 'ondular': {
      const forca = num(b, 'forca')
      if (forca <= 0) return conteudo
      // O id vem da posição na lista de filtros, não de sorteio: o mesmo
      // documento tem de gerar exatamente o mesmo SVG toda vez, senão salvar e
      // comparar (e testar) deixa de funcionar.
      const id = 'ond' + ctx.defs.length
      const freq = n(0.005 + forca * 0.0016)
      ctx.defs.push(
        '<filter id="' + id + '" x="-20%" y="-20%" width="140%" height="140%">' +
          '<feTurbulence type="fractalNoise" baseFrequency="' + freq + '" numOctaves="2" seed="4" result="ruido"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="ruido" scale="' + n(forca) + '" xChannelSelector="R" yChannelSelector="G"/>' +
          '</filter>',
      )
      return '<g filter="url(#' + id + ')">' + conteudo + '</g>'
    }

    case 'traco': {
      const cor = seguro(texto(b, 'cor')) || '#1b1b1b'
      const largura = n((2.2 * num(b, 'espessura')) / 100)
      return '<g stroke="' + cor + '" stroke-width="' + largura + '">' + conteudo + '</g>'
    }

    case 'animarGirar': {
      const dur = n(28 / Math.max(1, num(b, 'velocidade')))
      const anti = texto(b, 'sentido') === 'anti'
      const de = anti ? 360 : 0
      const ate = anti ? 0 : 360
      return (
        '<g><animateTransform attributeName="transform" type="rotate" from="' +
        de + ' ' + CX + ' ' + CY + '" to="' + ate + ' ' + CX + ' ' + CY +
        '" dur="' + dur + 's" repeatCount="indefinite"/>' + conteudo + '</g>'
      )
    }

    case 'animarPulsar': {
      const dur = n(14 / Math.max(1, num(b, 'velocidade')))
      const k = n(1 + num(b, 'intensidade') / 100)
      // `scale` no SMIL sempre parte da origem, então o desenho é levado ao
      // centro, pulsa lá, e volta — senão ele pulsa fugindo para o canto.
      return (
        '<g transform="translate(' + CX + ' ' + CY + ')"><g>' +
        '<animateTransform attributeName="transform" type="scale" values="1;' + k + ';1"' +
        ' keyTimes="0;0.5;1" dur="' + dur + 's" repeatCount="indefinite"' + SUAVE + '/>' +
        '<g transform="translate(' + -CX + ' ' + -CY + ')">' + conteudo + '</g></g></g>'
      )
    }

    case 'animarFlutuar': {
      const dur = n(12 / Math.max(1, num(b, 'velocidade')))
      const d = n(-num(b, 'distancia'))
      return (
        '<g><animateTransform attributeName="transform" type="translate"' +
        ' values="0 0;0 ' + d + ';0 0" keyTimes="0;0.5;1" dur="' + dur +
        's" repeatCount="indefinite"' + SUAVE + '/>' + conteudo + '</g>'
      )
    }
  }
}

export interface OpcoesExecucao {
  /**
   * Pula os blocos de animação. Quem pediu menos movimento — nas preferências
   * do app ou no sistema — não pode receber a tela girando por causa de um bloco
   * que alguém deixou salvo. O bloco continua na pilha e visível na UI; ele só
   * não desenha nada.
   */
  semAnimacao?: boolean
}

/** Executa a pilha de cima para baixo sobre o SVG de entrada. */
export function executar(
  svgInterno: string,
  pilha: Bloco[],
  opcoes: OpcoesExecucao = {},
): string {
  const ctx: Contexto = { defs: [] }
  let conteudo = svgInterno
  for (const b of pilha) {
    if (opcoes.semAnimacao && ANIMADOS.has(b.tipo)) continue
    if (!PORTIPO.has(b.tipo)) continue
    conteudo = aplicar(b, conteudo, ctx)
    if (conteudo.length > TETO_CARACTERES) break
  }
  // Os `<defs>` vão na frente porque o resultado é colado dentro de um `<svg>`
  // que este módulo não escreve — não há outro lugar onde pendurá-los.
  return ctx.defs.length > 0 ? '<defs>' + ctx.defs.join('') + '</defs>' + conteudo : conteudo
}

/**
 * Quantos elementos a pilha vai produzir — para avisar antes de travar a tela.
 *
 * É o produto dos multiplicadores, na mesma ordem em que os blocos rodam: é
 * literalmente a conta de laços aninhados. Blocos que só transformam não
 * multiplicam nada e valem 1; `espelhar` com duplicar dobra (ou quadruplica).
 */
export function custoEstimado(pilha: Bloco[], opcoes: OpcoesExecucao = {}): number {
  let total = 1
  for (const b of pilha) {
    if (opcoes.semAnimacao && ANIMADOS.has(b.tipo)) continue
    total *= multiplicador(b)
    // Sem o teto, uma pilha absurda vira Infinity e a UI perde o número que ia
    // mostrar a quem está experimentando.
    if (total > 1e9) return 1e9
  }
  return total
}

function multiplicador(b: Bloco): number {
  switch (b.tipo) {
    case 'repetir':
    case 'radial':
      return inteiro(b, 'vezes', 1, 64)
    case 'grade':
      return inteiro(b, 'colunas', 1, 20) * inteiro(b, 'linhas', 1, 20)
    case 'espelhar':
      if (!bool(b, 'duplicar')) return 1
      return texto(b, 'eixo') === 'quad' ? 4 : 2
    default:
      return 1
  }
}
