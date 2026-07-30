import { createContext, useContext, type ReactNode } from 'react'

/**
 * NAVEGAÇÃO ENTRE PAINÉIS.
 *
 * O app tem doze painéis e, até aqui, cada um era um beco sem saída: a única
 * porta era ✕, e ✕ devolve para a prancha. Ir de Frases para Roteiros — duas
 * coisas que são a mesma tarefa, dizer algo pronto — custava três ações:
 * fechar, procurar o botão na barra de cima, abrir.
 *
 * Três é muito para quem usa varredura, onde cada ação é uma espera; e é muito
 * para quem acompanha, que fica alternando entre Objetivos e Progresso o tempo
 * todo. O caminho mais curto entre dois painéis irmãos tem que ser um toque.
 *
 * Isto vive num contexto, e não numa prop, de propósito: `Dialog` é a casca dos
 * doze painéis, então ensinar o `Dialog` a navegar ensina os doze de uma vez.
 * Passar prop teria custado doze assinaturas iguais e a certeza de que a décima
 * terceira ia esquecer.
 */

export interface Destino {
  chave: string
  icone: string
  rotulo: string
  /** Frase curta para leitor de tela — o rótulo sozinho é ambíguo fora do contexto. */
  aria: string
}

interface Navegacao {
  /** O painel aberto agora. */
  atual: string
  /** Os irmãos dele — só os do mesmo grupo, e sem ele mesmo. */
  irmaos: readonly Destino[]
  ir: (chave: string) => void
}

const Ctx = createContext<Navegacao | null>(null)

export function ProvedorDeNavegacao({
  valor,
  children,
}: {
  valor: Navegacao
  children: ReactNode
}) {
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

/**
 * Devolve os irmãos do painel aberto, ou `null` quando não há para onde ir.
 *
 * `null` e não uma lista vazia: um painel sem irmãos não deve desenhar uma
 * trilha vazia ocupando altura à toa.
 */
export function useNavegacao(): Navegacao | null {
  const ctx = useContext(Ctx)
  if (!ctx || ctx.irmaos.length === 0) return null
  return ctx
}

/**
 * Os grupos. Um painel só oferece atalho para os do PRÓPRIO grupo — mostrar os
 * doze devolveria à barra de onze botões que já se provou ilegível, e misturar
 * "Ajustes" com "Frases" mistura de novo quem usa a prancha com quem a
 * configura.
 */
export const GRUPOS: Record<string, readonly Destino[]> = {
  falar: [
    { chave: 'phrases', icone: '💬', rotulo: 'Frases', aria: 'Frases prontas' },
    { chave: 'scripts', icone: '📋', rotulo: 'Roteiros', aria: 'Roteiros de situações' },
    { chave: 'numeros', icone: '🔢', rotulo: 'Números', aria: 'Números, contas e símbolos' },
    { chave: 'progresso', icone: '🏆', rotulo: 'Progresso', aria: 'Meu progresso' },
  ],
  criar: [
    { chave: 'padroes', icone: '◇', rotulo: 'Padrões', aria: 'Padrões visuais' },
    { chave: 'poesia', icone: '✒', rotulo: 'Poesia', aria: 'Oficina de poesia' },
    { chave: 'estudio', icone: '🧩', rotulo: 'Estúdio', aria: 'Estúdio de formas' },
  ],
  cuidar: [
    { chave: 'search', icone: '🔍', rotulo: 'Buscar', aria: 'Buscar pictograma' },
    { chave: 'editor', icone: '✎', rotulo: 'Editar', aria: 'Editar pranchas e cards' },
    { chave: 'objetivos', icone: '🧭', rotulo: 'Objetivos', aria: 'Objetivos individuais' },
    { chave: 'settings', icone: '⚙', rotulo: 'Ajustes', aria: 'Configurações' },
    { chave: 'help', icone: '?', rotulo: 'Ajuda', aria: 'Atalhos e acesso' },
  ],
}

/** Em que grupo mora um painel. `undefined` para quem não tem irmãos. */
export function grupoDe(painel: string): keyof typeof GRUPOS | undefined {
  for (const [nome, lista] of Object.entries(GRUPOS)) {
    if (lista.some((d) => d.chave === painel)) return nome
  }
  return undefined
}
