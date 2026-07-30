/**
 * formas.ts — Geradores de desenhos simetricos para colorir.
 *
 * POR QUE EXISTE
 *
 * Desenho para pintar e uma atividade sem certo e errado: nao ha resposta a
 * acertar, nao ha tempo, e o resultado e sempre valido. Isso a torna um lugar
 * de descanso dentro de um app cujo resto e comunicacao — e comunicacao, por
 * mais bem feita que esteja, custa esforco.
 *
 * A escolha por SIMETRIA (radial e de translacao) nao e estetica. Figuras
 * simetricas dao a quem pinta uma regra visivel: se este setor foi pintado
 * assim, o proximo pede o mesmo. Isso transforma pintar em previsao, e
 * previsao e o que sustenta atencao longa sem exigir supervisao. Um desenho
 * figurativo ("um gato") impoe a interpretacao de outra pessoa; uma mandala
 * nao impoe nada, so oferece estrutura.
 *
 * TRES DECISOES DE PORTE
 *
 * 1. **Sem DOM e sem aleatoriedade global.** `desenhar` recebe string de
 *    parametros e uma funcao `aleatorio`, e devolve string. Assim o mesmo
 *    desenho pode ser reproduzido a partir de uma semente guardada — a crianca
 *    fecha o app e reencontra a figura que estava pintando, e nao uma parecida.
 * 2. **Retorna o MIOLO do `<svg>`, nao o `<svg>`.** Quem monta o elemento e o
 *    React, que precisa controlar tamanho, foco e eventos de toque. Uma string
 *    de SVG completo obrigaria `dangerouslySetInnerHTML` num elemento externo
 *    e tiraria esse controle.
 * 3. **`params` descreve a si mesmo.** A UI monta os controles lendo
 *    `ParamSpec`, sem conhecer gerador nenhum. Adicionar uma forma nova nao
 *    deve pedir mudanca no painel.
 *
 * O original desenhava em 720x720 (pensado para impressao). Aqui a tela e
 * 400x400 porque o alvo e o dedo numa tela, nao a folha — as constantes de raio
 * e margem sao derivadas de `ESCALA` para manter as proporcoes do original.
 */

export interface ParamsForma {
  [chave: string]: number | string | boolean
}

export type ParamSpec =
  | { tipo: 'range'; min: number; max: number; passo?: number; padrao: number; rotulo: string }
  | { tipo: 'select'; opcoes: string[]; padrao: string; rotulo: string }
  | { tipo: 'bool'; padrao: boolean; rotulo: string }

export interface Gerador {
  id: string
  nome: string
  icone: string
  /** Uma frase sobre o que ele desenha. */
  descricao: string
  /** Faixas dos parametros, para a UI montar controles sozinha. */
  params: Record<string, ParamSpec>
  /** String entra, string sai. SEM document, SEM window, SEM Math.random direto. */
  desenhar: (params: ParamsForma, aleatorio: () => number) => string
}

export const VIEWBOX = '0 0 400 400'

/** Lado da tela. Tudo abaixo e derivado daqui — nada de coordenada solta. */
const L = 400
/** O original desenhava em 720; as constantes de raio vieram de la. */
const ESCALA = L / 720
const CX = L / 2
const CY = L / 2
/** Raio util maximo: deixa margem para o traco nao encostar na borda. */
const RAIO_MAX = 320 * ESCALA
const TAU = Math.PI * 2

/**
 * Sorteador deterministico a partir de uma semente — para o mesmo desenho sair
 * igual. E o mulberry32 do original: rapido, sem dependencia, e com periodo
 * folgado demais para o que se pede aqui (algumas dezenas de sorteios).
 */
export function semente(n: number): () => number {
  let a = n >>> 0
  return function sortear(): number {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Valores iniciais de um gerador, prontos para virar estado do painel. */
export function padroesDe(g: Gerador): ParamsForma {
  const saida: ParamsForma = {}
  for (const [chave, spec] of Object.entries(g.params)) saida[chave] = spec.padrao
  return saida
}

// ─────────────────────────── leitura de parametros ───────────────────────────
// Os controles da UI devolvem string ate para numeros (input range e string).
// Ler com fallback aqui evita espalhar Number(...) e `??` por todo o modulo.

function num(p: ParamsForma, chave: string, padrao: number): number {
  const v = p[chave]
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : padrao
}

function texto(p: ParamsForma, chave: string, padrao: string): string {
  const v = p[chave]
  return typeof v === 'string' && v.length > 0 ? v : padrao
}

// ────────────────────────────── tijolos de SVG ───────────────────────────────
// Duas casas decimais bastam numa tela de 400px e cortam o tamanho da string
// quase pela metade — importa porque o desenho e guardado no storage.

const d2 = (v: number): string => (Number.isFinite(v) ? v : 0).toFixed(2)

/**
 * Regiao pintavel. O `fill` sai de uma variavel CSS para que o app decida a cor
 * no momento do toque sem regerar o desenho.
 */
const regiao = (d: string): string => `<path class="regiao" fill="var(--pintura, none)" d="${d}"/>`

const circulo = (x: number, y: number, r: number): string =>
  `<circle class="regiao" fill="var(--pintura, none)" cx="${d2(x)}" cy="${d2(y)}" r="${d2(Math.max(0, r))}"/>`

const contorno = (x: number, y: number, r: number): string =>
  `<circle fill="none" cx="${d2(x)}" cy="${d2(y)}" r="${d2(Math.max(0, r))}"/>`

const poligono = (pts: ReadonlyArray<readonly [number, number]>): string =>
  `<polygon class="regiao" fill="var(--pintura, none)" points="${pts
    .map((p) => `${d2(p[0])},${d2(p[1])}`)
    .join(' ')}"/>`

const linha = (x1: number, y1: number, x2: number, y2: number): string =>
  `<line x1="${d2(x1)}" y1="${d2(y1)}" x2="${d2(x2)}" y2="${d2(y2)}"/>`

/**
 * Todo desenho sai dentro de um `<g>` com o traco: e o unico lugar onde a cor
 * da linha e a espessura sao decididas, e `currentColor` deixa o tema do app
 * mandar (linha preta no claro, clara no escuro).
 */
function moldar(partes: readonly string[]): string {
  return (
    '<g fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linejoin="round" stroke-linecap="round">' +
    partes.join('') +
    '</g>'
  )
}

/** Poligono regular de `lados` lados — base de varias formas. */
function ngon(cx: number, cy: number, raio: number, lados: number, rot: number): string {
  const pts: Array<readonly [number, number]> = []
  const n = Math.max(3, Math.round(lados))
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU
    pts.push([cx + Math.cos(a) * raio, cy + Math.sin(a) * raio])
  }
  return poligono(pts)
}

/** Celula de anel: a fatia entre dois raios e dois angulos. */
function celulaAnel(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
): string {
  const x = (a: number, r: number): number => cx + Math.cos(a) * r
  const y = (a: number, r: number): number => cy + Math.sin(a) * r
  const grande = a1 - a0 > Math.PI ? 1 : 0
  return (
    `M ${d2(x(a0, r0))} ${d2(y(a0, r0))}` +
    ` L ${d2(x(a0, r1))} ${d2(y(a0, r1))}` +
    ` A ${d2(r1)} ${d2(r1)} 0 ${grande} 1 ${d2(x(a1, r1))} ${d2(y(a1, r1))}` +
    ` L ${d2(x(a1, r0))} ${d2(y(a1, r0))}` +
    ` A ${d2(r0)} ${d2(r0)} 0 ${grande} 0 ${d2(x(a0, r0))} ${d2(y(a0, r0))} Z`
  )
}

// ─────────────────────────────── FORMA SIMPLES ───────────────────────────────

const TIPOS_FORMA = [
  'circulo',
  'quadrado',
  'triangulo',
  'hexagono',
  'estrela',
  'coracao',
  'gota',
  'folha',
  'flor',
  'anel',
  'onda',
] as const

function desenharForma(p: ParamsForma): string {
  const tipo = texto(p, 'tipo', 'gota')
  const R = 210 * ESCALA * (num(p, 'tamanho', 100) / 100)
  const partes: string[] = []

  switch (tipo) {
    case 'quadrado': {
      const s = R * 0.85
      partes.push(
        `<rect class="regiao" fill="var(--pintura, none)" x="${d2(CX - s)}" y="${d2(
          CY - s,
        )}" width="${d2(2 * s)}" height="${d2(2 * s)}"/>`,
      )
      break
    }
    case 'triangulo':
      partes.push(ngon(CX, CY, R, 3, -Math.PI / 2))
      break
    case 'hexagono':
      partes.push(ngon(CX, CY, R, 6, -Math.PI / 2))
      break
    case 'estrela': {
      const pts: Array<readonly [number, number]> = []
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU - Math.PI / 2
        const r = i % 2 ? R * 0.42 : R
        pts.push([CX + Math.cos(a) * r, CY + Math.sin(a) * r])
      }
      partes.push(poligono(pts))
      break
    }
    case 'coracao':
      partes.push(
        regiao(
          `M ${d2(CX)} ${d2(CY + R * 0.62)}` +
            ` C ${d2(CX - R)} ${d2(CY - R * 0.1)} ${d2(CX - R * 0.5)} ${d2(CY - R * 0.85)} ${d2(
              CX,
            )} ${d2(CY - R * 0.25)}` +
            ` C ${d2(CX + R * 0.5)} ${d2(CY - R * 0.85)} ${d2(CX + R)} ${d2(CY - R * 0.1)} ${d2(
              CX,
            )} ${d2(CY + R * 0.62)} Z`,
        ),
      )
      break
    case 'gota':
      partes.push(
        regiao(
          `M ${d2(CX)} ${d2(CY - R)}` +
            ` C ${d2(CX + R * 0.9)} ${d2(CY - R * 0.1)} ${d2(CX + R * 0.6)} ${d2(
              CY + R * 0.7,
            )} ${d2(CX)} ${d2(CY + R * 0.7)}` +
            ` C ${d2(CX - R * 0.6)} ${d2(CY + R * 0.7)} ${d2(CX - R * 0.9)} ${d2(
              CY - R * 0.1,
            )} ${d2(CX)} ${d2(CY - R)} Z`,
        ),
      )
      break
    case 'folha':
      partes.push(
        regiao(
          `M ${d2(CX)} ${d2(CY + R)}` +
            ` C ${d2(CX - R * 0.8)} ${d2(CY)} ${d2(CX - R * 0.5)} ${d2(CY - R)} ${d2(CX)} ${d2(
              CY - R,
            )}` +
            ` C ${d2(CX + R * 0.5)} ${d2(CY - R)} ${d2(CX + R * 0.8)} ${d2(CY)} ${d2(CX)} ${d2(
              CY + R,
            )} Z`,
        ),
        linha(CX, CY + R, CX, CY - R),
      )
      break
    case 'flor': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU
        partes.push(circulo(CX + Math.cos(a) * R * 0.52, CY + Math.sin(a) * R * 0.52, R * 0.42))
      }
      partes.push(circulo(CX, CY, R * 0.34))
      break
    }
    case 'anel':
      partes.push(circulo(CX, CY, R), circulo(CX, CY, R * 0.5))
      break
    case 'onda': {
      const x0 = CX - R
      const larg = 2 * R
      const passos = 14
      let d = `M ${d2(x0)} ${d2(CY)}`
      for (let i = 0; i <= passos; i++) {
        const t = i / passos
        d += ` L ${d2(x0 + t * larg)} ${d2(CY + Math.sin(t * Math.PI * 4) * R * 0.28)}`
      }
      for (let i = passos; i >= 0; i--) {
        const t = i / passos
        d += ` L ${d2(x0 + t * larg)} ${d2(CY + R * 0.45 + Math.sin(t * Math.PI * 4) * R * 0.28)}`
      }
      partes.push(regiao(`${d} Z`))
      break
    }
    default:
      partes.push(circulo(CX, CY, R))
  }

  return moldar(partes)
}

// ─────────────────────────────────── MANDALA ─────────────────────────────────

function desenharMandala(p: ParamsForma): string {
  const complexidade = Math.round(num(p, 'complexidade', 3))
  const petalas = Math.max(3, Math.round(num(p, 'petalas', 10)))
  const aneis = 2 + complexidade
  const partes: string[] = [circulo(CX, CY, 26 * ESCALA)]

  const rInterno = 36 * ESCALA
  const passo = (RAIO_MAX - 40 * ESCALA) / aneis

  for (let k = 0; k < aneis; k++) {
    const r0 = rInterno + k * passo
    const r1 = r0 + passo - 6 * ESCALA
    for (let i = 0; i < petalas; i++) {
      const a0 = (i / petalas) * TAU
      const a1 = ((i + 1) / petalas) * TAU
      partes.push(regiao(celulaAnel(CX, CY, r0, r1, a0, a1)))

      const am = (a0 + a1) / 2
      const rm = (r0 + r1) / 2
      if (k % 2 === 1) {
        // Ponto no meio da celula: quebra a monotonia dos aneis pares.
        const raio = Math.min(passo, (a1 - a0) * rm) * 0.22
        partes.push(circulo(CX + Math.cos(am) * rm, CY + Math.sin(am) * rm, Math.max(2.5, raio)))
      } else if (complexidade >= 3) {
        // Petala radial: so entra em complexidade alta para nao virar sujeira
        // em desenhos pequenos, onde a regiao ficaria menor que o dedo.
        const p1x = CX + Math.cos(am) * r0
        const p1y = CY + Math.sin(am) * r0
        const p2x = CX + Math.cos(am) * r1
        const p2y = CY + Math.sin(am) * r1
        const ox = Math.cos(am + Math.PI / 2) * (passo * 0.18)
        const oy = Math.sin(am + Math.PI / 2) * (passo * 0.18)
        partes.push(
          regiao(
            `M ${d2(p1x)} ${d2(p1y)}` +
              ` Q ${d2((p1x + p2x) / 2 + ox)} ${d2((p1y + p2y) / 2 + oy)} ${d2(p2x)} ${d2(p2y)}` +
              ` Q ${d2((p1x + p2x) / 2 - ox)} ${d2((p1y + p2y) / 2 - oy)} ${d2(p1x)} ${d2(p1y)} Z`,
          ),
        )
      }
    }
  }

  partes.push(contorno(CX, CY, rInterno + aneis * passo))
  return moldar(partes)
}

// ────────────────────────────── CALEIDOSCOPIO ────────────────────────────────

interface PecaCaleidoscopio {
  ang: number
  raio: number
  tamanho: number
  tipo: number
  lados: number
  rot: number
}

function desenharCaleidoscopio(p: ParamsForma, aleatorio: () => number): string {
  const simetria = Math.max(2, Math.round(num(p, 'simetria', 8)))
  const fatia = TAU / simetria
  const rMax = RAIO_MAX

  // Sorteia as pecas UMA vez e replica: e o que faz o desenho ser simetrico em
  // vez de so aleatorio. Sortear dentro do laco de replicacao mataria a regra.
  const pecas: PecaCaleidoscopio[] = []
  const quantas = 4 + Math.floor(aleatorio() * 6)
  for (let i = 0; i < quantas; i++) {
    pecas.push({
      ang: aleatorio() * fatia,
      raio: 26 * ESCALA + aleatorio() * (rMax - 50 * ESCALA),
      tamanho: (10 + aleatorio() * 42) * ESCALA,
      tipo: Math.floor(aleatorio() * 3),
      lados: 3 + Math.floor(aleatorio() * 5),
      rot: aleatorio() * Math.PI,
    })
  }

  const partes: string[] = [circulo(CX, CY, (18 + aleatorio() * 18) * ESCALA)]

  for (let k = 0; k < simetria; k++) {
    const base = k * fatia
    // mir = 1 espelha a fatia: gera simetria de reflexao alem da de rotacao.
    for (let mir = 0; mir < 2; mir++) {
      for (const peca of pecas) {
        const a = base + (mir ? fatia - peca.ang : peca.ang)
        const x = CX + Math.cos(a) * peca.raio
        const y = CY + Math.sin(a) * peca.raio
        if (peca.tipo === 0) {
          partes.push(circulo(x, y, peca.tamanho))
        } else if (peca.tipo === 1) {
          partes.push(ngon(x, y, peca.tamanho, peca.lados, a + peca.rot))
        } else {
          const s = peca.tamanho
          partes.push(
            regiao(`M ${d2(x)} ${d2(y)} m ${d2(-s)} 0 a ${d2(s)} ${d2(s)} 0 0 1 ${d2(s * 2)} 0 Z`),
          )
        }
      }
    }
  }

  partes.push(contorno(CX, CY, rMax + 20 * ESCALA))
  return moldar(partes)
}

// ──────────────────────────────────── ROSETA ─────────────────────────────────

function desenharRoseta(p: ParamsForma, aleatorio: () => number): string {
  const petalas = Math.max(3, Math.round(num(p, 'petalas', 10)))
  const camadas = Math.max(1, Math.round(num(p, 'camadas', 4)))
  const rBase = 70 * ESCALA
  const partes: string[] = []

  // De fora para dentro: as camadas internas sao emitidas por ultimo e ficam
  // por cima, entao o contorno delas nunca some sob a camada seguinte.
  for (let c = camadas - 1; c >= 0; c--) {
    const div = Math.max(1, camadas - 1)
    const rOut = rBase + (c / div) * (RAIO_MAX - rBase)
    const rIn = c === 0 ? 0 : rBase + ((c - 1) / div) * (RAIO_MAX - rBase)
    const deslocamento = (c % 2) * (Math.PI / petalas)
    const largura = (Math.PI / petalas) * (0.7 + aleatorio() * 0.5)

    for (let i = 0; i < petalas; i++) {
      const a = deslocamento + (i / petalas) * TAU
      const meio = rIn + (rOut - rIn) * 0.5
      const bx = CX + Math.cos(a) * rIn
      const by = CY + Math.sin(a) * rIn
      partes.push(
        regiao(
          `M ${d2(bx)} ${d2(by)}` +
            ` Q ${d2(CX + Math.cos(a - largura) * meio)} ${d2(
              CY + Math.sin(a - largura) * meio,
            )} ${d2(CX + Math.cos(a) * rOut)} ${d2(CY + Math.sin(a) * rOut)}` +
            ` Q ${d2(CX + Math.cos(a + largura) * meio)} ${d2(
              CY + Math.sin(a + largura) * meio,
            )} ${d2(bx)} ${d2(by)} Z`,
        ),
      )
    }
  }

  partes.push(circulo(CX, CY, 28 * ESCALA))
  return moldar(partes)
}

// ───────────────────────────────── TESSELACAO ────────────────────────────────

function desenharTesselacao(p: ParamsForma): string {
  const tipo = texto(p, 'tipo', 'hexagonos')
  const densidade = Math.max(2, Math.round(num(p, 'densidade', 6)))
  const margem = 40 * ESCALA
  const area = L - margem * 2
  const partes: string[] = []

  if (tipo === 'triangulos') {
    const colunas = densidade + 2
    const s = area / colunas
    const alt = (s * Math.sqrt(3)) / 2
    const linhas = Math.ceil(area / alt)
    for (let lin = 0; lin < linhas; lin++) {
      const y0 = margem + lin * alt
      const y1 = y0 + alt
      for (let col = 0; col < colunas; col++) {
        const x0 = margem + col * s + (lin % 2 ? s / 2 : 0)
        partes.push(poligono([[x0, y1], [x0 + s, y1], [x0 + s / 2, y0]]))
        partes.push(poligono([[x0 + s / 2, y0], [x0 + s + s / 2, y0], [x0 + s, y1]]))
      }
    }
  } else if (tipo === 'losangos') {
    const colunas = densidade + 1
    const s = area / colunas
    const linhas = Math.ceil(area / s)
    for (let lin = 0; lin < linhas; lin++) {
      for (let col = 0; col < colunas; col++) {
        const cx = margem + col * s + (lin % 2 ? s / 2 : 0) + s / 2
        const cy = margem + lin * s + s / 2
        partes.push(
          poligono([
            [cx, cy - s / 2],
            [cx + s / 2, cy],
            [cx, cy + s / 2],
            [cx - s / 2, cy],
          ]),
        )
      }
    }
  } else {
    const colunas = densidade
    const R = area / (colunas * 1.5)
    const larg = Math.sqrt(3) * R
    const linhas = Math.ceil(area / (R * 1.5)) + 1
    for (let lin = 0; lin < linhas; lin++) {
      for (let col = 0; col < colunas + 1; col++) {
        const cx = margem + col * larg + (lin % 2 ? larg / 2 : 0)
        const cy = margem + R + lin * R * 1.5
        // Descarta o hexagono que cairia fora da moldura: meia figura cortada
        // na borda nao e uma regiao pintavel, e so confunde.
        if (cx <= margem - R || cx >= L - margem + R || cy >= L - margem + R) continue
        const pts: Array<readonly [number, number]> = []
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 180) * (60 * i - 90)
          pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R])
        }
        partes.push(poligono(pts))
      }
    }
  }

  partes.push(
    `<rect fill="none" x="${d2(margem)}" y="${d2(margem)}" width="${d2(area)}" height="${d2(
      area,
    )}"/>`,
  )
  return moldar(partes)
}

// ──────────────────────────────── catalogo ───────────────────────────────────

export const GERADORES: Gerador[] = [
  {
    id: 'forma',
    nome: 'Forma simples',
    icone: '⬠',
    descricao: 'Uma forma ou curva basica — circulo, estrela, gota, coracao, onda.',
    params: {
      tipo: {
        tipo: 'select',
        opcoes: [...TIPOS_FORMA],
        padrao: 'gota',
        rotulo: 'Forma',
      },
      tamanho: { tipo: 'range', min: 40, max: 160, passo: 5, padrao: 100, rotulo: 'Tamanho' },
    },
    desenhar: (params) => desenharForma(params),
  },
  {
    id: 'mandala',
    nome: 'Mandala',
    icone: '❂',
    descricao: 'Simetria radial em aneis e petalas, para foco e calma.',
    params: {
      complexidade: { tipo: 'range', min: 1, max: 6, passo: 1, padrao: 3, rotulo: 'Complexidade' },
      petalas: { tipo: 'range', min: 6, max: 16, passo: 1, padrao: 10, rotulo: 'Petalas' },
    },
    desenhar: (params) => desenharMandala(params),
  },
  {
    id: 'caleidoscopio',
    nome: 'Caleidoscopio',
    icone: '🔮',
    descricao: 'Formas sorteadas replicadas por rotacao e reflexao — nunca repete.',
    params: {
      simetria: {
        tipo: 'select',
        opcoes: ['4', '5', '6', '8', '10', '12', '16'],
        padrao: '8',
        rotulo: 'Simetria',
      },
    },
    desenhar: (params, aleatorio) => desenharCaleidoscopio(params, aleatorio),
  },
  {
    id: 'roseta',
    nome: 'Roseta',
    icone: '🌸',
    descricao: 'Camadas concentricas de petalas formando uma rosacea.',
    params: {
      petalas: { tipo: 'range', min: 5, max: 20, passo: 1, padrao: 10, rotulo: 'Petalas por camada' },
      camadas: { tipo: 'range', min: 2, max: 7, passo: 1, padrao: 4, rotulo: 'Camadas' },
    },
    desenhar: (params, aleatorio) => desenharRoseta(params, aleatorio),
  },
  {
    id: 'tesselacao',
    nome: 'Tesselacao',
    icone: '▦',
    descricao: 'Malha de poligonos que se encaixam sem sobras no plano.',
    params: {
      tipo: {
        tipo: 'select',
        opcoes: ['triangulos', 'hexagonos', 'losangos'],
        padrao: 'hexagonos',
        rotulo: 'Forma',
      },
      densidade: { tipo: 'range', min: 3, max: 10, passo: 1, padrao: 6, rotulo: 'Densidade' },
    },
    desenhar: (params) => desenharTesselacao(params),
  },
]
