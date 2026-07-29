import { DEFAULT_SETTINGS, type Settings } from '../types'

const KEY = 'autista-caa:settings:v1'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    // Merge com o default para que uma versao nova do app que adicione um campo
    // nao quebre um perfil salvo antes.
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // modo privado / cota cheia: preferencias viram sessao unica, sem quebrar o app
  }
}

/* ---------------------------------------------------------------- favoritos */

import type { Card } from '../types'

const FAV_KEY = 'autista-caa:favorites:v1'

/**
 * Favoritos vivem numa PRANCHA PROPRIA, nunca reordenando as pranchas fixas.
 * Personalizar e essencial (a foto do copo daquela casa vale mais que o
 * pictograma generico), mas nao pode custar a estabilidade posicional das
 * celulas ja aprendidas.
 */
export function loadFavorites(): Card[] {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (c): c is Card =>
        typeof c === 'object' && c !== null && 'id' in c && 'label' in c,
    )
  } catch {
    return []
  }
}

export function saveFavorites(cards: Card[]): void {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(cards))
  } catch {
    /* idem */
  }
}
