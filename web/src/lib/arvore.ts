import type { Card } from '../types'
import type { Lexeme } from './lexicon'
import type { Region, Register } from './regional'

/**
 * A árvore da frase — raiz, tronco, galho, folha.
 *
 * POR QUE ISTO EXISTE
 *
 * O motor de frases monta a saída numa passada só, da esquerda para a direita,
 * escrevendo direto num vetor de tokens. Cada decisão é tomada com o que se
 * sabe naquele ponto e **nunca mais é revista** — e é daí que veio uma classe
 * inteira de defeitos que não têm conserto local:
 *
 *   - a negação escrita no primeiro verbo antes de existir um segundo;
 *   - o artigo do bloco posto por cima de um determinante que já estava lá;
 *   - o plural formado antes de a variante regional entrar;
 *   - a cópula inserida que não conta como verbo e não abre oração.
 *
 * A árvore separa **decidir** de **escrever**. Constrói-se a estrutura inteira
 * primeiro, com tudo que se sabe; só depois ela é percorrida para gerar texto.
 * Uma decisão que precisa olhar para frente passa a ser possível, porque na
 * hora de escrever a frase inteira já existe.
 *
 * Ver `ARVORE.md` para o desenho completo e a estratégia de troca — que é
 * gradual e verificada por comparação diferencial contra o motor atual, nunca
 * por substituição direta.
 *
 * ESTADO: este módulo ainda NÃO alimenta o app. Ele é construído ao lado, e
 * `grammar.ts` continua sendo o motor. Ver a Fase 2 do documento.
 */

/* ------------------------------------------------------------------ folhas */

/**
 * De onde a palavra veio. É o que sustenta as três garantias duras do
 * GRAMMAR.md — e aqui elas passam a ser verificáveis **por construção**, em vez
 * de por comparação de strings depois do fato.
 */
export type Origem =
  /** A pessoa escolheu este card, e a palavra saiu como estava. */
  | 'card'
  /** A pessoa escolheu, e o motor flexionou (conjugou, pluralizou, concordou). */
  | 'flexionada'
  /** O motor pôs. É sempre palavra funcional — nunca conteúdo. */
  | 'inserida'

/**
 * O que a palavra faz na frase.
 *
 * Existe para a linearização saber a ordem sem adivinhar, e para o app poder
 * explicar a frase: hoje ele mostra QUE o motor inseriu algo, não O QUÊ.
 */
export type Papel =
  | 'nucleo'
  | 'determinante'
  | 'preposicao'
  | 'negacao'
  | 'conector'
  | 'copula'
  | 'auxiliar'
  | 'complementizador'
  | 'pontuacao'

export interface Folha {
  tipo: 'folha'
  texto: string
  origem: Origem
  papel: Papel
  /** Qual card produziu esta folha, quando veio de um. */
  cardIndex?: number
  /** A forma original, quando o motor flexionou. */
  original?: string
  /**
   * Pode sumir sem quebrar a frase.
   *
   * Toda palavra INSERIDA é opcional por definição: ela é conveniência do
   * motor, não escolha da pessoa. É o que destrava, de uma vez, "tirar o
   * artigo", o modo telegráfico e desfazer uma inserção específica — três
   * coisas que hoje não têm onde existir.
   */
  opcional: boolean
}

export function folha(
  texto: string,
  papel: Papel,
  origem: Origem = 'inserida',
  extra: Partial<Folha> = {},
): Folha {
  return {
    tipo: 'folha',
    texto,
    papel,
    origem,
    // Só o que o motor pôs é dispensável. O que a pessoa escolheu, nunca.
    opcional: origem === 'inserida',
    ...extra,
  }
}

/* ------------------------------------------------------------------ galhos */

export type TipoGalho =
  /** Sintagma nominal: determinante + núcleo + modificadores. */
  | 'sn'
  /** Sintagma preposicionado: preposição + SN. */
  | 'sp'
  /** Predicado: verbo (ou cópula) + complementos. */
  | 'predicado'

export interface Galho {
  tipo: 'galho'
  qual: TipoGalho
  filhos: No[]
  /**
   * Gênero e número do sintagma.
   *
   * Ficam no NÓ, e não numa variável que guarda "o último substantivo visto" —
   * que é como funciona hoje e como nasceu "O beijo está preguiçosa". Um
   * adjetivo pergunta ao pai; o pai sempre sabe.
   */
  genero?: 'm' | 'f'
  plural?: boolean
  /** A preposição que rege, num `sp`. */
  prep?: string
}

export function galho(qual: TipoGalho, filhos: No[], extra: Partial<Galho> = {}): Galho {
  return { tipo: 'galho', qual, filhos, ...extra }
}

/* ------------------------------------------------------------------ tronco */

/**
 * Como esta oração se liga à anterior.
 *
 * É o que decide o que aparece entre as duas — e a decisão passa a ser um
 * DADO, em vez de estar espalhada por três lugares que emitem vírgula, "e",
 * "nem" ou "que" cada um por sua conta.
 */
export type Ligacao =
  /** A primeira da frase. */
  | 'nenhuma'
  /** "e", "nem" — mesmo nível. */
  | 'coordenada'
  /** "quando", "se", "porque" — a pessoa escolheu o conectivo. */
  | 'subordinada'
  /** "quero QUE você venha" — encaixada por verbo volitivo. */
  | 'encaixada'
  /** Duas orações sem nada entre elas: só a vírgula as separa. */
  | 'justaposta'

export interface Tronco {
  tipo: 'tronco'
  sujeito?: Galho
  predicados: Galho[]
  ligacao: Ligacao
  /**
   * A oração está negada.
   *
   * Traço do NÓ, e não um `negationDone` global disputando a ordem de emissão
   * com o separador de lista. O bug que me custou uma reversão — "quero água
   * **não e** quero o pão" — não pode acontecer aqui: não há "escrever antes" e
   * "escrever depois", há um nó que sabe e um percurso que emite na ordem certa
   * por construção.
   */
  negada: boolean
  /** O card de negação que produziu isto, quando houve um. */
  negacaoCardIndex?: number
}

/* -------------------------------------------------------------------- raiz */

/** Traços que valem para a frase inteira. */
export interface TracosDaFrase {
  tense: 'present' | 'past' | 'future' | 'imperfect'
  question: boolean
  progressive: boolean
  request: boolean
  plural: boolean
  speakerGender: 'n' | 'm' | 'f'
  region: Region
  register: Register
}

export interface Raiz {
  tipo: 'raiz'
  troncos: Tronco[]
  tracos: TracosDaFrase
}

export type No = Folha | Galho | Tronco | Raiz

/* --------------------------------------------------------------- percursos */

/** Todas as folhas, na ordem em que aparecem. */
export function folhas(no: No): Folha[] {
  if (no.tipo === 'folha') return [no]
  if (no.tipo === 'galho') return no.filhos.flatMap(folhas)
  if (no.tipo === 'tronco') {
    return [...(no.sujeito ? folhas(no.sujeito) : []), ...no.predicados.flatMap(folhas)]
  }
  return no.troncos.flatMap(folhas)
}

/**
 * O texto, com ou sem as palavras opcionais.
 *
 * `semOpcionais` é o modo telegráfico de verdade: some tudo que o motor pôs e
 * fica só o que a pessoa escolheu. Hoje o app só consegue isso desligando a
 * gramática inteira, que também desliga a conjugação — coisa que a pessoa
 * raramente quer perder junto.
 */
export function linearizar(no: No, opcoes: { semOpcionais?: boolean } = {}): string {
  const usadas = folhas(no).filter((f) => !(opcoes.semOpcionais && f.opcional))
  return usadas.map((f) => f.texto).join(' ')
}

/* --------------------------------------------------- verificação estrutural */

export interface Violacao {
  regra: string
  detalhe: string
}

/**
 * As garantias do GRAMMAR.md, verificadas na PRÓPRIA árvore.
 *
 * Hoje a auditoria as confere comparando strings da saída, o que é frágil:
 * pontuação colada, contração ("de"+"o" → "do") e regionalismo já produziram
 * falso positivo. Perguntando à árvore, a resposta é exata.
 *
 * Recebe as classes dos cards para saber o que é palavra de CONTEÚDO — a regra
 * proíbe inserir conteúdo, não funcional.
 */
export function verificar(
  raiz: Raiz,
  cards: Card[],
  classeDe: (label: string) => Lexeme['class'],
): Violacao[] {
  const problemas: Violacao[] = []
  const todas = folhas(raiz)

  // 1. Nenhuma palavra de conteúdo inserida.
  const CONTEUDO = new Set<Lexeme['class']>(['noun', 'verb', 'adjective', 'adverb'])
  for (const f of todas) {
    if (f.origem !== 'inserida') continue
    if (CONTEUDO.has(classeDe(f.texto))) {
      problemas.push({ regra: 'conteudo-inserido', detalhe: f.texto })
    }
  }

  // 2. Nenhum card perdido.
  const vistos = new Set(todas.filter((f) => f.cardIndex !== undefined).map((f) => f.cardIndex))
  cards.forEach((_, i) => {
    if (!vistos.has(i)) problemas.push({ regra: 'card-perdido', detalhe: String(i) })
  })

  // 3. Nenhuma reordenação: os índices de card saem em ordem crescente.
  const ordem = todas
    .filter((f) => f.cardIndex !== undefined)
    .map((f) => f.cardIndex as number)
  for (let i = 1; i < ordem.length; i++) {
    if (ordem[i]! < ordem[i - 1]!) {
      problemas.push({ regra: 'reordenacao', detalhe: `${ordem[i - 1]} antes de ${ordem[i]}` })
      break
    }
  }

  return problemas
}
