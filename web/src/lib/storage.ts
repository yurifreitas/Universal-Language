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
