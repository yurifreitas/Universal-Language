import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Varredura linha-coluna (row-column scanning).
 *
 * O metodo de acesso indireto padrao em CAA para quem nao aponta: a interface
 * destaca cada LINHA em sequencia; ao acionar, passa a destacar cada CELULA
 * daquela linha; ao acionar de novo, seleciona. Bem mais eficiente que a
 * varredura linear numa grade — em vez de percorrer N celulas, percorre
 * sqrt(N) duas vezes. Ver REFERENCES.md secao 5.
 *
 * Acionamento por Espaco/Enter porque switches comerciais tipicamente se
 * apresentam ao sistema operacional como teclado.
 */

export type ScanPhase = 'idle' | 'rows' | 'cells'

/** Uma acao alcancavel pela varredura, fora da grade de cards. */
export interface ScanAction {
  label: string
  run: () => void
  /** Acao indisponivel agora (ex.: "Falar" com a frase vazia) e pulada. */
  disabled?: boolean
}

interface Options {
  enabled: boolean
  /** ms entre passos */
  speed: number
  total: number
  columns: number
  onSelect: (index: number) => void
  /**
   * Chamado a cada passo. `phase` diz se o destaque mudou de linha ou de
   * celula; `index` e a primeira celula da linha na fase de linhas. Usado para
   * emitir earcon e anunciar a pista auditiva.
   */
  onStep?: (phase: 'rows' | 'cells', index: number) => void
  /** Se falso, a varredura pausa (ex.: um overlay esta aberto). */
  active?: boolean
  /**
   * Comandos que a varredura alcanca ANTES da grade, como uma linha zero.
   *
   * Sem isto, quem usa switch conseguia empilhar palavras indefinidamente e
   * **nunca falar**: a varredura so percorria os cards, e Espaco/Enter
   * pertenciam ao switch, o que desativava o atalho de falar. A frase era
   * montada e morria na tela.
   *
   * A linha zero vem primeiro de proposito: e a acao mais frequente depois de
   * escolher palavras, e esperar a varredura percorrer a prancha inteira para
   * chegar em "Falar" custaria dezenas de segundos.
   */
  actions?: ScanAction[]
}

export interface ScanState {
  phase: ScanPhase
  /** Linha da GRADE em destaque; -1 quando o destaque esta na linha de acoes. */
  row: number
  index: number
  rows: number
  /** O destaque esta na linha de acoes? */
  onActions: boolean
  /** Qual acao esta em destaque, quando `onActions`. */
  actionIndex: number
}

export function useScanning({
  enabled,
  speed,
  total,
  columns,
  onSelect,
  onStep,
  active = true,
  actions = [],
}: Options): ScanState {
  // Acoes indisponiveis nao entram na varredura: parar em "Falar" com a frase
  // vazia gasta um ciclo inteiro de quem tem menos tempo a gastar.
  const acoes = actions.filter((a) => !a.disabled)
  const temAcoes = acoes.length > 0
  const gridRows = Math.max(1, Math.ceil(total / columns))
  const rows = gridRows + (temAcoes ? 1 : 0)
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [row, setRow] = useState(0)
  const [col, setCol] = useState(0)

  // Refs espelham o estado para que o listener de teclado — registrado uma unica
  // vez — leia sempre o valor corrente sem se reinscrever a cada passo.
  const phaseRef = useRef(phase)
  const rowRef = useRef(row)
  const colRef = useRef(col)
  phaseRef.current = phase
  rowRef.current = row
  colRef.current = col

  /** Linha 0 e a de acoes quando ela existe; o resto e deslocado em 1. */
  const cellsInRow = useCallback(
    (r: number) => {
      if (temAcoes && r === 0) return acoes.length
      const g = temAcoes ? r - 1 : r
      return Math.min(columns, Math.max(0, total - g * columns))
    },
    [columns, total, temAcoes, acoes.length],
  )

  // Reinicia quando a prancha muda de tamanho, para nao destacar celula ausente.
  useEffect(() => {
    setPhase('idle')
    setRow(0)
    setCol(0)
  }, [total, columns, enabled, temAcoes])

  // Avanco automatico.
  useEffect(() => {
    if (!enabled || !active || phase === 'idle' || total === 0) return
    const id = window.setInterval(() => {
      if (phaseRef.current === 'rows') {
        setRow((r) => (r + 1) % rows)
      } else {
        setCol((c) => {
          const n = cellsInRow(rowRef.current)
          // Ao terminar a linha, volta para a varredura de linhas: um erro de
          // acionamento nao prende a pessoa dentro da mesma linha para sempre.
          if (n === 0 || c + 1 >= n) {
            setPhase('rows')
            return 0
          }
          return c + 1
        })
      }
    }, speed)
    return () => window.clearInterval(id)
  }, [enabled, active, phase, speed, rows, total, cellsInRow])

  // Acionamento.
  useEffect(() => {
    if (!enabled || !active) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return

      if (e.key === 'Escape') {
        setPhase('idle')
        setRow(0)
        setCol(0)
        return
      }
      if (e.key !== ' ' && e.key !== 'Enter') return
      e.preventDefault()

      if (phaseRef.current === 'idle') {
        setRow(0)
        setCol(0)
        setPhase('rows')
      } else if (phaseRef.current === 'rows') {
        setCol(0)
        setPhase('cells')
      } else {
        if (temAcoes && rowRef.current === 0) {
          acoes[colRef.current]?.run()
          setPhase('rows')
          setRow(0)
          setCol(0)
          return
        }
        const g = temAcoes ? rowRef.current - 1 : rowRef.current
        const index = g * columns + colRef.current
        if (index < total) onSelect(index)
        // Volta a varrer linhas a partir do topo: a proxima palavra quase nunca
        // esta na mesma linha da anterior.
        setPhase('rows')
        setRow(0)
        setCol(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, active, columns, total, onSelect, temAcoes, acoes])

  // Notifica o passo depois do render, para que o destaque visual e a pista
  // sonora cheguem juntos.
  const lastStep = useRef('')
  useEffect(() => {
    if (!enabled || !active || phase === 'idle') {
      lastStep.current = ''
      return
    }
    const key = `${phase}:${row}:${col}`
    if (key === lastStep.current) return
    lastStep.current = key
    const g = temAcoes ? row - 1 : row
    onStep?.(phase, phase === 'rows' ? g * columns : g * columns + col)
  }, [enabled, active, phase, row, col, columns, onStep, temAcoes])

  const naLinhaDeAcoes = temAcoes && row === 0
  const gradeRow = temAcoes ? row - 1 : row

  return {
    phase: enabled ? phase : 'idle',
    row: gradeRow,
    index: gradeRow * columns + col,
    rows,
    onActions: enabled && phase !== 'idle' && naLinhaDeAcoes,
    actionIndex: col,
  }
}
