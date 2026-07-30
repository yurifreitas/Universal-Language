import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Faixa rolavel com botao nas pontas.
 *
 * POR QUE ISTO EXISTE
 *
 * Arrastar de lado e o gesto mais mal resolvido da interface. Ele nao se
 * anuncia — nada na tela diz que ha mais coisa a direita —, exige preensao e
 * deslize contínuo (justamente o que falta a quem tem comprometimento motor),
 * nao existe para quem usa teclado ou switch, e em telas de toque ele briga
 * com a rolagem vertical da propria prancha.
 *
 * O conserto e um par de botoes: alvo grande, posicao fixa, um toque por vez.
 * Quem consegue arrastar continua arrastando; quem nao consegue passa a ter
 * caminho. E, como os botoes so aparecem quando ha para onde ir, eles tambem
 * RESPONDEM a pergunta que a faixa nunca respondia: tem mais? tem, para que
 * lado.
 *
 * O hook devolve o que a faixa precisa saber e nada mais — a forma visual fica
 * no componente `Faixa`.
 */
export interface FaixaState {
  ref: React.RefObject<HTMLDivElement | null>
  /** Ha conteudo escondido para cada lado? */
  esquerda: boolean
  direita: boolean
  rolar: (direcao: -1 | 1) => void
  /** Recalcula depois de uma mudanca de conteudo que o observer nao pegue. */
  medir: () => void
}

export function useFaixa(): FaixaState {
  const ref = useRef<HTMLDivElement>(null)
  const [esquerda, setEsquerda] = useState(false)
  const [direita, setDireita] = useState(false)

  const medir = useCallback(() => {
    const el = ref.current
    if (!el) return
    // 2px de tolerancia: zoom do navegador e telas com densidade fracionaria
    // deixam `scrollLeft` com resto, e sem folga o botao da direita fica aceso
    // para sempre no fim da faixa.
    const max = el.scrollWidth - el.clientWidth
    setEsquerda(el.scrollLeft > 2)
    setDireita(el.scrollLeft < max - 2)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    medir()
    el.addEventListener('scroll', medir, { passive: true })

    // O conteudo muda sem a faixa mudar de tamanho (uma prancha nova, um grupo
    // que aparece), e a faixa muda de tamanho sem o conteudo mudar (girar o
    // aparelho). Os dois observadores cobrem os dois casos.
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    for (const filho of el.children) ro.observe(filho)
    const mo = new MutationObserver(medir)
    mo.observe(el, { childList: true, subtree: true })

    return () => {
      el.removeEventListener('scroll', medir)
      ro.disconnect()
      mo.disconnect()
    }
  }, [medir])

  const rolar = useCallback((direcao: -1 | 1) => {
    const el = ref.current
    if (!el) return
    // Rola quase uma tela cheia, e nao uma tela exata: a sobreposicao de ~15%
    // mantem um item visivel dos dois lados do salto. Sem ela a faixa "pisca"
    // para um conteudo totalmente novo e a pessoa perde a referencia de onde
    // estava.
    const passo = Math.max(120, el.clientWidth * 0.85)
    const suave = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: passo * direcao, behavior: suave ? 'smooth' : 'auto' })
  }, [])

  return { ref, esquerda, direita, rolar, medir }
}
