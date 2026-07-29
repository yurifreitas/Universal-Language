/**
 * Earcons — sons abstratos curtos que marcam eventos da interface.
 *
 * Blattner, Sumikawa & Greenberg (1989) estabeleceram que **ritmo** e a
 * caracteristica mais reconhecivel de um earcon: ouvintes distinguem variacao
 * ritmica com muito mais facilidade que variacao de altura. Por isso os motivos
 * aqui se diferenciam primeiro pelo ritmo (1 nota, 2 curtas, 2 longas) e so
 * depois pela direcao melodica.
 *
 * Sintetizados via Web Audio API — nenhum arquivo, nada a baixar, funciona
 * offline. Ondas senoidais com envelope suave: sem ataque abrupto, que e
 * desconfortavel para hipersensibilidade auditiva.
 *
 * Ver SENSORY.md secao 4.
 */

let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  // O AudioContext so pode ser criado apos um gesto do usuario; a primeira
  // chamada vem sempre de um toque ou tecla, entao isso e seguro.
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface Note {
  /** Hz */
  freq: number
  /** segundos desde o inicio do motivo */
  at: number
  /** duracao em segundos */
  dur: number
}

function play(notes: Note[], gain: number): void {
  const ac = context()
  if (!ac) return
  const t0 = ac.currentTime
  for (const n of notes) {
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = n.freq
    // Envelope com ataque de 12ms e queda exponencial: sem clique nem estalo.
    env.gain.setValueAtTime(0, t0 + n.at)
    env.gain.linearRampToValueAtTime(gain, t0 + n.at + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur)
    osc.connect(env).connect(ac.destination)
    osc.start(t0 + n.at)
    osc.stop(t0 + n.at + n.dur + 0.02)
  }
}

/** Familia de motivos. Volumes baixos: isto acompanha a fala, nao compete com ela. */
export const earcon = {
  /** Passo da varredura entre LINHAS — grave, uma nota. */
  scanRow: () => play([{ freq: 340, at: 0, dur: 0.07 }], 0.05),

  /** Passo da varredura entre CELULAS — agudo, uma nota. Mesma familia, altura acima. */
  scanCell: () => play([{ freq: 560, at: 0, dur: 0.06 }], 0.05),

  /** Selecao — duas notas ascendentes: algo entrou na frase. */
  select: () =>
    play(
      [
        { freq: 620, at: 0, dur: 0.08 },
        { freq: 880, at: 0.075, dur: 0.12 },
      ],
      0.07,
    ),

  /** Remocao — o mesmo motivo invertido, descendente. */
  remove: () =>
    play(
      [
        { freq: 620, at: 0, dur: 0.07 },
        { freq: 420, at: 0.07, dur: 0.11 },
      ],
      0.06,
    ),

  /** Troca de prancha — duas notas iguais, ritmo distinto da selecao. */
  board: () =>
    play(
      [
        { freq: 700, at: 0, dur: 0.05 },
        { freq: 700, at: 0.09, dur: 0.08 },
      ],
      0.045,
    ),
}

export type EarconName = keyof typeof earcon
