import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  title: string
  /** Rendered à direita do titulo, no cabecalho (ex.: o campo de busca). */
  headerContent?: ReactNode
  /** Texto de status abaixo do cabecalho, anunciado por leitor de tela. */
  status?: ReactNode
  onClose: () => void
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialogo modal conforme o padrao Dialog (Modal) do WAI-ARIA APG.
 *
 * Implementa os tres requisitos de foco que o padrao exige e que faltavam aqui:
 *   1. foco inicial move para dentro do dialogo ao abrir;
 *   2. Tab e Shift+Tab circulam SO entre os focaveis do dialogo;
 *   3. ao fechar, o foco volta ao elemento que o abriu.
 *
 * Sem (3), quem usa teclado ou leitor de tela e devolvido ao inicio da pagina
 * a cada vez que fecha a busca — e tem de reatravessar tudo.
 *
 * https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 */
export function Dialog({ title, headerContent, status, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const statusId = useId()

  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement | null
    // Foco inicial no primeiro focavel; se nao houver, no proprio dialogo.
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? ref.current)?.focus()

    return () => {
      // `isConnected` evita tentar focar um elemento que saiu do DOM.
      if (restoreTo.current?.isConnected) restoreTo.current.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return

      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (!items.length) return
      const first = items[0]!
      const last = items[items.length - 1]!

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      {...(status ? { 'aria-describedby': statusId } : {})}
      tabIndex={-1}
    >
      <header className="overlay__head">
        <div className="shell">
          {headerContent ?? (
            <h2 className="overlay__title" id={titleId}>
              {title}
            </h2>
          )}
          {headerContent && (
            <span className="sr-only" id={titleId}>
              {title}
            </span>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            aria-label={`Fechar ${title.toLowerCase()}`}
          >
            ✕
          </button>
        </div>
      </header>

      {/* role=status faz o leitor de tela anunciar a contagem de resultados
          sem roubar o foco de quem esta digitando. */}
      <p className="overlay__status" id={statusId} role="status">
        <span className="shell">{status}</span>
      </p>

      <div className="overlay__body">{children}</div>
    </div>
  )
}
