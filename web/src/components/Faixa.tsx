import type { ReactNode } from 'react'
import { useFaixa } from '../lib/useFaixa'

interface Props {
  children: ReactNode
  /** Classe do trilho — mantém os estilos que a faixa já tinha. */
  className?: string
  /** O que a faixa contém, para o rótulo dos botões ("Ver mais pranchas"). */
  nome: string
  /** Repassado ao trilho: `tablist`, `group`… */
  role?: string
  ariaLabel?: string
  /** Referência externa ao trilho, quando quem chama precisa rolar sozinho. */
  trilhoRef?: (el: HTMLDivElement | null) => void
}

/**
 * Faixa horizontal com botao nas pontas, no lugar do arrasto lateral.
 *
 * Os botoes:
 *  - **so aparecem quando ha para onde ir**, e assim respondem a pergunta que
 *    uma faixa rolavel nunca respondia — "tem mais coisa?";
 *  - ficam POR CIMA das pontas, e nao ao lado: ocupar largura fixa custaria
 *    88px permanentes numa tela de 320, e a faixa existe justamente onde falta
 *    largura;
 *  - saem da arvore de acessibilidade quando a faixa cabe inteira na tela, e
 *    sao `tabIndex={-1}` sempre — quem navega por teclado ja alcanca cada item
 *    pelas setas, e dois botoes de rolagem no meio do caminho seriam duas
 *    paradas inuteis por faixa.
 *
 * Ver `lib/useFaixa.ts` para por que o arrasto sozinho nao bastava.
 */
export function Faixa({ children, className, nome, role, ariaLabel, trilhoRef }: Props) {
  const faixa = useFaixa()

  return (
    <div className={`faixa ${faixa.esquerda ? 'faixa--tem-esq' : ''} ${
      faixa.direita ? 'faixa--tem-dir' : ''
    }`}>
      <button
        type="button"
        className="faixa__seta faixa__seta--esq"
        tabIndex={-1}
        aria-hidden={!faixa.esquerda}
        {...(faixa.esquerda ? {} : { disabled: true })}
        aria-label={`Ver ${nome} anteriores`}
        onClick={() => faixa.rolar(-1)}
      >
        ‹
      </button>

      <div
        ref={(el) => {
          faixa.ref.current = el
          trilhoRef?.(el)
        }}
        className={`faixa__trilho ${className ?? ''}`}
        {...(role ? { role } : {})}
        {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
      >
        {children}
      </div>

      <button
        type="button"
        className="faixa__seta faixa__seta--dir"
        tabIndex={-1}
        aria-hidden={!faixa.direita}
        {...(faixa.direita ? {} : { disabled: true })}
        aria-label={`Ver mais ${nome}`}
        onClick={() => faixa.rolar(1)}
      >
        ›
      </button>
    </div>
  )
}
