import { useCallback, useRef, useState } from 'react'

/**
 * Roving tabindex horizontal — base dos padroes Tabs e Toolbar do WAI-ARIA APG.
 *
 * Apenas um item do conjunto fica na ordem de tabulacao; as setas movem entre
 * eles. E o que faz `Tab` pular o grupo inteiro em vez de parar em cada botao.
 *
 * https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
 */
export function useRovingFocus(count: number, onActivate?: (i: number) => void) {
  const [focused, setFocused] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  const setRef = useCallback(
    (i: number) => (el: HTMLElement | null) => {
      refs.current[i] = el
    },
    [],
  )

  const move = useCallback(
    (i: number) => {
      // Circular: das setas na ultima volta para a primeira, como manda o APG.
      const next = ((i % count) + count) % count
      setFocused(next)
      refs.current[next]?.focus()
      onActivate?.(next)
    },
    [count, onActivate],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, i: number) => {
      const map: Record<string, number | undefined> = {
        ArrowRight: i + 1,
        ArrowLeft: i - 1,
        Home: 0,
        End: count - 1,
      }
      const next = map[e.key]
      if (next === undefined) return
      e.preventDefault()
      move(next)
    },
    [count, move],
  )

  return { focused, setFocused, setRef, onKeyDown, move }
}
