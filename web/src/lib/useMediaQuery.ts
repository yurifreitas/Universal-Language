import { useEffect, useState } from 'react'

/**
 * Media query como estado de React.
 *
 * Existe porque nem tudo que depende do tamanho da tela pode ser resolvido em
 * CSS: `grid-template-columns: repeat(N, ...)` exige um inteiro, e `min()` nao
 * e aceito ali. O numero de colunas da prancha precisa ser decidido em
 * JavaScript.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && 'matchMedia' in window
      ? window.matchMedia(query).matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/**
 * Colunas efetivas da prancha.
 *
 * O ajuste de colunas e do usuario e nao deve ser sobrescrito por capricho —
 * mas 5 colunas numa tela de 390px dao celulas de 62px, abaixo de qualquer
 * alvo de toque aceitavel para quem tem dificuldade motora fina, que e
 * justamente o publico do ajuste.
 *
 * O teto aqui e propriedade do APARELHO, nao preferencia: quem usa a prancha
 * no celular aprende a posicao no celular, e ela nao muda enquanto for o mesmo
 * aparelho na mesma orientacao. A estabilidade posicional que o LAMP exige
 * (ver LANGUAGE-SYSTEMS.md secao 5) e preservada onde ela importa.
 */
export function useEffectiveColumns(columns: number): number {
  const veryNarrow = useMediaQuery('(max-width: 380px)')
  const narrow = useMediaQuery('(max-width: 560px)')
  const medium = useMediaQuery('(max-width: 820px)')

  if (veryNarrow) return Math.min(columns, 2)
  if (narrow) return Math.min(columns, 3)
  if (medium) return Math.min(columns, 4)
  return columns
}
