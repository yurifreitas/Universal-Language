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

/**
 * Pista auditiva da varredura ("auditory cue").
 *
 * Pratica estabelecida em CAA: a opcao percorrida e anunciada numa **voz
 * secundaria**, distinta da voz da mensagem, para que o usuario diferencie
 * "o que esta sendo oferecido" de "o que eu disse". Dispositivos comerciais
 * fazem isso com alto-falante privado (fone ou pillow speaker); no navegador
 * nao ha saida separada, entao a distincao e feita por tom mais agudo e fala
 * mais rapida.
 *
 * Ver SENSORY.md secao 4 e REFERENCES.md secao 5.
 */
export function speakCue(text: string, settings: Settings): void {
  if (!text.trim() || !('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(settings)
  if (voice) {
    u.voice = voice
    u.lang = voice.lang
  } else {
    u.lang = 'pt-BR'
  }
  // Mais rapida que a fala da mensagem: a pista precisa caber no passo da
  // varredura, senao atrasa a proxima opcao.
  u.rate = Math.min(2, settings.rate * 1.35)
  u.pitch = Math.min(2, settings.pitch + 0.45)
  u.volume = 0.85
  speechSynthesis.speak(u)
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
