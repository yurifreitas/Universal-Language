import type { Bloco } from './blocos'
import type { ParamsForma } from './formas'

/**
 * Criações do Estúdio — a montagem salva.
 *
 * POR QUE ISTO EXISTE
 *
 * Sem salvar, o Estúdio é um brinquedo de sessão: a pessoa empilha seis blocos,
 * chega num desenho que é dela, fecha o painel e perde tudo. O que se perde não
 * é o desenho — esse dá para refazer — é a **construção**: a sequência de
 * decisões que levou até ali. Numa ferramenta que ensina laço e aninhamento,
 * a construção é o conteúdo, e jogá-la fora a cada fechada é jogar fora o que
 * a pessoa aprendeu a fazer.
 *
 * Guardar a PILHA, e não a imagem, tem uma consequência prática: a criação
 * salva continua editável. Abrir uma criação de ontem e mexer num laço é
 * exatamente o gesto que faz alguém entender o que aquele laço faz.
 *
 * O QUE UMA CRIAÇÃO NÃO É
 *
 * Não é arquivo, não é conta, não vai para servidor nenhum. Mora no aparelho,
 * como todo o resto, e entra no perfil exportável junto com o que já ia.
 */

export interface Criacao {
  id: string
  nome: string
  /** Qual gerador desenha a base. */
  geradorId: string
  params: ParamsForma
  semente: number
  pilha: Bloco[]
  /** `AAAA-MM-DD` em hora local. */
  criadaEm: string
}

/** Id estável a partir do nome, sem relógio nem sorteio — como em `scripts.ts`. */
export function criacaoId(nome: string, existentes: Criacao[]): string {
  const slug =
    nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'desenho'
  if (!existentes.some((c) => c.id === slug)) return slug
  let n = 2
  while (existentes.some((c) => c.id === `${slug}-${n}`)) n++
  return `${slug}-${n}`
}

/**
 * Nome sugerido quando a pessoa não escreve nenhum.
 *
 * Descreve a montagem em vez de numerar ("Desenho 4"): "Mandala com 3 blocos"
 * diz o que é, e é o que permite achar a criação certa numa lista de doze sem
 * abrir uma por uma. Quem não lê reconhece pela figura, que também está lá.
 */
export function nomeSugerido(nomeDoGerador: string, blocos: number): string {
  if (blocos === 0) return nomeDoGerador
  return `${nomeDoGerador} com ${blocos} ${blocos === 1 ? 'bloco' : 'blocos'}`
}

export function duplicar(c: Criacao, existentes: Criacao[]): Criacao {
  const nome = `${c.nome} (cópia)`
  return {
    ...c,
    id: criacaoId(nome, existentes),
    nome,
    // Cópia profunda da pilha: sem isto, mexer num bloco da cópia mexeria no
    // original — os dois apontariam para os mesmos objetos de argumentos.
    pilha: c.pilha.map((b) => ({ ...b, args: { ...b.args } })),
    params: { ...c.params },
  }
}

export function mover(lista: Criacao[], de: number, para: number): Criacao[] {
  if (para < 0 || para >= lista.length || de === para) return lista
  const proxima = [...lista]
  const [item] = proxima.splice(de, 1)
  if (!item) return lista
  proxima.splice(para, 0, item)
  return proxima
}

/**
 * Uma criação vinda de fora (perfil importado, versão antiga) pode estar
 * incompleta. Ficar com o que dá e descartar o resto é melhor que recusar o
 * arquivo inteiro — a mesma política do léxico gerado.
 */
export function valida(x: unknown): x is Criacao {
  if (!x || typeof x !== 'object') return false
  const c = x as Record<string, unknown>
  return (
    typeof c['id'] === 'string' &&
    typeof c['nome'] === 'string' &&
    typeof c['geradorId'] === 'string' &&
    Array.isArray(c['pilha'])
  )
}
