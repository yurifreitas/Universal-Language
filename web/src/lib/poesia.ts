/**
 * Oficina de poesia.
 *
 * POR QUE POESIA NUMA PRANCHA DE CAA
 *
 * Todo o resto do app serve para **resolver**: pedir, avisar, responder,
 * combinar. Isso é metade do que a linguagem faz, e é a metade que sempre
 * chega primeiro para quem usa CAA — o aparelho aparece na vida da pessoa como
 * ferramenta de necessidade. A outra metade, a de brincar com a língua, chega
 * tarde ou não chega, e é justamente ela que faz alguém querer falar mais.
 *
 * Poesia é a forma mais barata dessa metade: cabe em três palavras, não exige
 * vocabulário grande, não tem resposta certa e **não pode ser corrigida**. Uma
 * criança que ainda diz duas palavras juntas já faz um poema de repetição — e
 * um poema é a primeira coisa que ela vai dizer sem que ninguém tenha pedido.
 *
 * O MÓDULO NÃO CORRIGE NADA
 *
 * A contagem de sílabas é sugestão, nunca trava. A rima é oferta, nunca
 * exigência. Nenhum modelo obriga a preencher todas as linhas, e um poema de
 * uma linha só é um poema. Se a oficina passasse a cobrar métrica, viraria
 * lição de casa — e lição de casa é exatamente o que ela não é.
 */

/* ------------------------------------------------------------------ sílabas */

const VOGAIS = 'aeiouáéíóúâêôãõàäëïöü'

/**
 * Contagem aproximada de sílabas em português.
 *
 * Aproximada de propósito, e o app diz isso na tela. Contar sílaba de verdade
 * exige saber onde há ditongo, hiato e crase de vogais — decisão que muda com
 * a pronúncia regional, que este app já sabe que varia. Um número aproximado
 * ajuda a sentir o ritmo; um número apresentado como exato ensinaria errado.
 */
export function silabas(palavra: string): number {
  const limpa = palavra.toLowerCase().replace(/[^a-záéíóúâêôãõàçüïöëä\s]/g, '')
  if (!limpa.trim()) return 0
  let total = 0
  for (const p of limpa.split(/\s+/).filter(Boolean)) {
    let n = 0
    let dentro = false
    for (const ch of p) {
      const vogal = VOGAIS.includes(ch)
      // Grupo de vogais seguidas conta como uma só: é a aproximação que erra
      // menos, porque a maioria dos grupos em português é ditongo.
      if (vogal && !dentro) n++
      dentro = vogal
    }
    total += Math.max(1, n)
  }
  return total
}

/** Sílabas de um verso inteiro. */
export const silabasDoVerso = (verso: string): number => silabas(verso)

/* --------------------------------------------------------------------- rima */

/** Sem acento e minúsculo — a rima é de som, e o acento gráfico atrapalha. */
function simples(p: string): string {
  return p
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')
}

/**
 * Terminação que decide a rima.
 *
 * Da última vogal em diante — "cachorro" e "socorro" terminam em "orro", e é
 * isso que o ouvido reconhece. Não é a regra acadêmica (que parte da sílaba
 * tônica), é a que funciona sem saber onde cai o acento.
 */
export function terminacao(palavra: string): string {
  const p = simples(palavra)
  if (p.length < 2) return p
  for (let i = p.length - 1; i >= 0; i--) {
    if ('aeiou'.includes(p[i]!)) {
      const t = p.slice(i)
      // Uma vogal solta no fim ("casa" → "a") rima com meio dicionário. Nesse
      // caso volta mais uma letra para ter alguma consoante junto.
      if (t.length === 1 && i > 0) return p.slice(i - 1)
      return t
    }
  }
  return p.slice(-2)
}

export function rima(a: string, b: string): boolean {
  if (simples(a) === simples(b)) return false // a palavra não rima consigo mesma
  const ta = terminacao(a)
  const tb = terminacao(b)
  return ta.length >= 2 && ta === tb
}

/** Palavras do vocabulário que rimam com a dada, das mais próximas primeiro. */
export function rimasDe(palavra: string, vocabulario: string[], limite = 12): string[] {
  const alvo = terminacao(palavra)
  if (alvo.length < 2) return []
  const pontua = (p: string) => {
    const t = terminacao(p)
    if (t !== alvo) return 0
    // Terminação mais longa em comum = rima mais rica.
    let comum = 0
    const a = simples(palavra)
    const b = simples(p)
    while (comum < a.length && comum < b.length && a[a.length - 1 - comum] === b[b.length - 1 - comum])
      comum++
    return comum
  }
  return vocabulario
    .filter((p) => rima(palavra, p))
    .map((p) => ({ p, n: pontua(p) }))
    .sort((x, y) => y.n - x.n)
    .slice(0, limite)
    .map((x) => x.p)
}

/* ------------------------------------------------------------------ modelos */

export interface Modelo {
  id: string
  nome: string
  sobre: string
  /** Cada linha: um começo fixo e o que falta preencher. */
  versos: { fixo: string; dica: string }[]
  /** Sugestão de tamanho por verso; `null` = livre. */
  metrica?: number[] | null
}

/**
 * Os modelos.
 *
 * Todos partem de estrutura repetida, que é o andaime mais generoso: quem tem
 * pouco vocabulário completa a mesma fôrma cinco vezes e sai com um poema
 * inteiro. Nenhum exige rima, e a rima é oferecida à parte.
 */
export const MODELOS: Modelo[] = [
  {
    id: 'gosto',
    nome: 'Eu gosto de',
    sobre: 'A fôrma mais simples: a mesma frase, coisas diferentes.',
    versos: [
      { fixo: 'Eu gosto de', dica: 'uma coisa' },
      { fixo: 'Eu gosto de', dica: 'outra coisa' },
      { fixo: 'Eu gosto de', dica: 'mais uma' },
      { fixo: 'Mas eu não gosto de', dica: 'o contrário' },
    ],
  },
  {
    id: 'sefosse',
    nome: 'Se eu fosse',
    sobre: 'Imaginar é dizer o que se é sem falar de si.',
    versos: [
      { fixo: 'Se eu fosse', dica: 'um bicho, uma cor, um lugar' },
      { fixo: 'Eu seria', dica: 'como' },
      { fixo: 'E eu ia', dica: 'fazer o quê' },
    ],
  },
  {
    id: 'sou',
    nome: 'Eu sou',
    sobre: 'Poema de identidade — o mais usado em oficina com crianças.',
    versos: [
      { fixo: 'Eu sou', dica: 'seu nome ou uma palavra' },
      { fixo: 'Eu gosto de', dica: 'uma coisa' },
      { fixo: 'Eu tenho medo de', dica: 'uma coisa' },
      { fixo: 'Eu quero', dica: 'uma coisa' },
      { fixo: 'Eu sou', dica: 'repete a primeira' },
    ],
  },
  {
    id: 'haicai',
    nome: 'Três linhas',
    sobre: 'Curto e sem rima, no formato do haicai: 5, 7 e 5 sílabas.',
    versos: [
      { fixo: '', dica: 'o que se vê' },
      { fixo: '', dica: 'o que acontece' },
      { fixo: '', dica: 'o que se sente' },
    ],
    metrica: [5, 7, 5],
  },
  {
    id: 'rimado',
    nome: 'Dois que rimam',
    sobre: 'Dois versos que terminam com o mesmo som.',
    versos: [
      { fixo: '', dica: 'termine numa palavra qualquer' },
      { fixo: '', dica: 'termine numa que rime com ela' },
    ],
  },
  {
    id: 'livre',
    nome: 'Sem fôrma',
    sobre: 'Nenhuma regra. Escreva do jeito que vier.',
    versos: [
      { fixo: '', dica: '' },
      { fixo: '', dica: '' },
      { fixo: '', dica: '' },
      { fixo: '', dica: '' },
    ],
  },
]

/** Junta os versos preenchidos num poema, ignorando linha vazia. */
export function montarPoema(modelo: Modelo, preenchidos: string[]): string[] {
  return modelo.versos
    .map((v, i) => {
      const texto = (preenchidos[i] ?? '').trim()
      if (!texto) return ''
      return v.fixo ? `${v.fixo} ${texto}` : texto
    })
    .filter(Boolean)
}
