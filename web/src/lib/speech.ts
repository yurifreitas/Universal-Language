import type { Settings } from '../types'

/**
 * Camada de voz sobre a Web Speech API.
 *
 * O acervo ARASAAC nao tem NENHUMA locucao gravada em portugues (`hasLocution`
 * = 0 em pt, contra 12.235 em espanhol), entao sintese e o unico caminho —
 * nao ha audio pronto para cair de volta.
 */

let cachedVoices: SpeechSynthesisVoice[] = []

/**
 * O Chrome popula as vozes de forma assincrona e devolve lista vazia na
 * primeira chamada. Resolve no `voiceschanged`, com timeout para navegadores
 * que nunca disparam o evento.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length) {
    cachedVoices = now
    return Promise.resolve(now)
  }
  return new Promise((resolve) => {
    const done = () => {
      cachedVoices = speechSynthesis.getVoices()
      resolve(cachedVoices)
    }
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
}

/** Vozes em portugues primeiro; pt-BR antes de pt-PT. */
export function portugueseVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith('pt'))
    .sort((a, b) => {
      const br = (v: SpeechSynthesisVoice) => (v.lang.toLowerCase() === 'pt-br' ? 0 : 1)
      return br(a) - br(b) || a.name.localeCompare(b.name)
    })
}

function pickVoice(settings: Settings): SpeechSynthesisVoice | undefined {
  if (settings.voiceURI) {
    const exact = cachedVoices.find((v) => v.voiceURI === settings.voiceURI)
    if (exact) return exact
  }
  return portugueseVoices(cachedVoices)[0] ?? cachedVoices[0]
}

export function speak(text: string, settings: Settings): void {
  if (!text.trim() || !('speechSynthesis' in window)) return
  // Cancelar antes de falar evita fila acumulada quando a pessoa toca rapido.
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(settings)
  if (voice) {
    u.voice = voice
    u.lang = voice.lang
  } else {
    u.lang = 'pt-BR'
  }
  u.rate = settings.rate
  u.pitch = settings.pitch
  speechSynthesis.speak(u)
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
