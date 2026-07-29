import { DEFAULT_SETTINGS, type Settings } from '../types'

const KEY = 'autista-caa:settings:v1'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    // Merge com o default para que uma versao nova do app que adicione um campo
    // nao quebre um perfil salvo antes.
    const stored = JSON.parse(raw) as Partial<Settings> & { palette?: 'default' | 'calm' }
    const merged = { ...DEFAULT_SETTINGS, ...stored }

    // O conforto sensorial era um par liga/desliga (`palette`) e virou um
    // controle continuo (`sensory`). Quem tinha a paleta sensorial ligada
    // recebe o equivalente no topo da escala — a preferencia ja manifestada
    // nao pode ser perdida numa atualizacao.
    if (stored.palette === 'calm' && stored.sensory === undefined) merged.sensory = 100
    delete (merged as { palette?: unknown }).palette

    return merged
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

/* ------------------------------------------------------- frases e historico */

const MY_PHRASES_KEY = 'autista-caa:phrases:v1'
const HISTORY_KEY = 'autista-caa:history:v1'

/** O historico e curto de proposito: e atalho para repetir, nao arquivo. */
export const HISTORY_LIMIT = 16

function loadCards(key: string): Card[] {
  try {
    const raw = localStorage.getItem(key)
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

function saveCards(key: string, cards: Card[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(cards))
  } catch {
    /* idem */
  }
}

/**
 * Frases que o proprio usuario salvou a partir da barra da frase. Ficam num
 * grupo separado das frases de fabrica, e nunca reordenam os grupos fixos —
 * mesma regra das celulas da prancha.
 */
export const loadMyPhrases = (): Card[] => loadCards(MY_PHRASES_KEY)
export const saveMyPhrases = (p: Card[]): void => saveCards(MY_PHRASES_KEY, p)

/**
 * Ultimas frases ditas. Repetir o que acabou de ser dito e uma das operacoes
 * mais frequentes numa conversa real — o parceiro nao ouviu, o ambiente estava
 * barulhento, chegou alguem novo. Sem historico, a pessoa remonta tudo.
 */
export const loadHistory = (): Card[] => loadCards(HISTORY_KEY)
export const saveHistory = (h: Card[]): void => saveCards(HISTORY_KEY, h)

/* -------------------------------------------------------------- perfil */

export interface Profile {
  version: 1
  settings: Partial<Settings>
  favorites: Card[]
  phrases: Card[]
}

/**
 * Exportar/importar perfil.
 *
 * Um ajuste de CAA e trabalho clinico: velocidade de varredura, voz, colunas,
 * conforto sensorial e vocabulario favorito levam semanas para chegar no ponto.
 * Sem exportacao, tudo isso mora num unico navegador e desaparece com ele — e
 * como o app e offline e nao tem conta, nao ha servidor de onde recuperar.
 * O arquivo tambem e o caminho para levar o mesmo perfil da escola para casa.
 */
export function exportProfile(settings: Settings, favorites: Card[], phrases: Card[]): string {
  const profile: Profile = { version: 1, settings, favorites, phrases }
  return JSON.stringify(profile, null, 2)
}

export function parseProfile(raw: string): Profile | null {
  try {
    const p = JSON.parse(raw) as Partial<Profile>
    if (!p || typeof p !== 'object' || p.version !== 1) return null
    return {
      version: 1,
      settings: typeof p.settings === 'object' && p.settings ? p.settings : {},
      favorites: Array.isArray(p.favorites) ? p.favorites : [],
      phrases: Array.isArray(p.phrases) ? p.phrases : [],
    }
  } catch {
    return null
  }
}
