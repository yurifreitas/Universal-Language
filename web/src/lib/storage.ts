import { DEFAULT_SETTINGS, type Settings } from '../types'
import type { BoardEdits, CustomBoard } from './boardEdits'
import type { Script } from './scripts'
import type { ScriptStats } from './ensaio'
import { DIARIO_VAZIO, type Diario } from './diario'
import type { Objetivo } from './objetivos'
import { PERFIL_VAZIO, type Perfil } from './padroes'

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

/* -------------------------------------------------- edicao de pranchas */

const EDITS_KEY = 'autista-caa:board-edits:v1'
const CUSTOM_KEY = 'autista-caa:custom-boards:v1'

export function loadEdits(): BoardEdits {
  try {
    const raw = localStorage.getItem(EDITS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as BoardEdits
  } catch {
    return {}
  }
}

export function saveEdits(edits: BoardEdits): void {
  try {
    localStorage.setItem(EDITS_KEY, JSON.stringify(edits))
  } catch {
    /* idem */
  }
}

export function loadCustomBoards(): CustomBoard[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (b): b is CustomBoard =>
        typeof b === 'object' && b !== null && 'id' in b && 'name' in b && 'cards' in b,
    )
  } catch {
    return []
  }
}

export function saveCustomBoards(boards: CustomBoard[]): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(boards))
  } catch {
    /* idem */
  }
}

/* --------------------------------------------------------------- roteiros */

const SCRIPTS_KEY = 'autista-caa:scripts:v1'

export function loadScripts(): Script[] {
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (s): s is Script =>
        typeof s === 'object' && s !== null && 'id' in s && 'name' in s && 'steps' in s,
    )
  } catch {
    return []
  }
}

export function saveScripts(scripts: Script[]): void {
  try {
    localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts))
  } catch {
    /* idem */
  }
}

const STATS_KEY = 'autista-caa:script-stats:v1'

/**
 * Quantas vezes cada roteiro foi ensaiado inteiro. Ver `lib/ensaio.ts` para o
 * que isto e — e para o que ele deliberadamente nao mede.
 */
export function loadScriptStats(): ScriptStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    // Sem filtrar os valores aqui de proposito: `vezes()` ja trata numero
    // quebrado, negativo e fracionario, e ha teste para isso.
    return parsed as ScriptStats
  } catch {
    return {}
  }
}

export function saveScriptStats(stats: ScriptStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    /* idem */
  }
}

/* ------------------------------------------------------------------ jogo */

const GAME_KEY = 'autista-caa:game-stats:v1'

/**
 * Rodadas do "Cadê?" completadas, por prancha. Mesma forma e mesma politica dos
 * ensaios de roteiro: conta presenca, nunca acerto — ver `lib/ensaio.ts`.
 */
export function loadGameStats(): ScriptStats {
  try {
    const raw = localStorage.getItem(GAME_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as ScriptStats
  } catch {
    return {}
  }
}

export function saveGameStats(stats: ScriptStats): void {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(stats))
  } catch {
    /* idem */
  }
}

/* -------------------------------------------------------- diário de prática */

const DIARIO_KEY = 'autista-caa:diario:v1'

/**
 * Pontos de prática por dia. **Não** guarda nada sobre falar — ver a linha que
 * `lib/diario.ts` não cruza.
 */
export function loadDiario(): Diario {
  try {
    const raw = localStorage.getItem(DIARIO_KEY)
    if (!raw) return DIARIO_VAZIO
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return DIARIO_VAZIO
    const dias = (parsed as Diario).dias
    if (!dias || typeof dias !== 'object' || Array.isArray(dias)) return DIARIO_VAZIO
    return { dias }
  } catch {
    return DIARIO_VAZIO
  }
}

export function saveDiario(diario: Diario): void {
  try {
    localStorage.setItem(DIARIO_KEY, JSON.stringify(diario))
  } catch {
    /* idem */
  }
}

const OBJ_KEY = 'autista-caa:objetivos:v1'

/** Objetivos individuais e seus registros. Ver `lib/objetivos.ts`. */
export function loadObjetivos(): Objetivo[] {
  try {
    const raw = localStorage.getItem(OBJ_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (o): o is Objetivo =>
        typeof o === 'object' && o !== null && 'id' in o && 'titulo' in o && 'registros' in o,
    )
  } catch {
    return []
  }
}

export function saveObjetivos(objetivos: Objetivo[]): void {
  try {
    localStorage.setItem(OBJ_KEY, JSON.stringify(objetivos))
  } catch {
    /* idem */
  }
}

const PADROES_KEY = 'autista-caa:padroes:v1'

/**
 * Perfil de padroes visuais. Nao e nota nem QI — ver `lib/padroes.ts`, que
 * explica por que essa distincao e a decisao mais importante do modulo.
 */
export function loadPerfilPadroes(): Perfil {
  try {
    const raw = localStorage.getItem(PADROES_KEY)
    if (!raw) return PERFIL_VAZIO
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return PERFIL_VAZIO
    return { ...PERFIL_VAZIO, ...(parsed as Perfil) }
  } catch {
    return PERFIL_VAZIO
  }
}

export function savePerfilPadroes(perfil: Perfil): void {
  try {
    localStorage.setItem(PADROES_KEY, JSON.stringify(perfil))
  } catch {
    /* idem */
  }
}

/* --------------------------------------------------------- uso de frases */

const USES_KEY = 'autista-caa:phrase-uses:v1'

/**
 * Quantas vezes cada frase pronta foi dita.
 *
 * Serve a UM proposito: montar o grupo "As mais faladas", que poupa procurar
 * numa lista de sete grupos a mesma frase de sempre. **Nao reordena grade
 * nenhuma** — o grupo e separado, e a posicao de toda celula existente
 * continua onde estava (LAMP). Nada disto vira placar.
 */
export function loadPhraseUses(): ScriptStats {
  try {
    const raw = localStorage.getItem(USES_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as ScriptStats
  } catch {
    return {}
  }
}

export function savePhraseUses(uses: ScriptStats): void {
  try {
    localStorage.setItem(USES_KEY, JSON.stringify(uses))
  } catch {
    /* idem */
  }
}

/* -------------------------------------------------------------- perfil */

export interface Profile {
  version: 1
  settings: Partial<Settings>
  favorites: Card[]
  phrases: Card[]
  /** Ausentes em perfis exportados pela primeira versao do formato. */
  edits?: BoardEdits
  customBoards?: CustomBoard[]
  scripts?: Script[]
  /** Ensaios de roteiro. Ausente em perfis exportados antes do modo ensaio. */
  scriptStats?: ScriptStats
  /** Rodadas do jogo por prancha e diário de prática. */
  gameStats?: ScriptStats
  diario?: Diario
  /** Objetivos individuais — parte do plano, vai junto no perfil. */
  objetivos?: Objetivo[]
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
export function exportProfile(profile: Omit<Profile, 'version'>): string {
  return JSON.stringify({ version: 1, ...profile } satisfies Profile, null, 2)
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
      edits: typeof p.edits === 'object' && p.edits ? p.edits : {},
      customBoards: Array.isArray(p.customBoards) ? p.customBoards : [],
      scripts: Array.isArray(p.scripts) ? p.scripts : [],
      scriptStats:
        typeof p.scriptStats === 'object' && p.scriptStats && !Array.isArray(p.scriptStats)
          ? p.scriptStats
          : {},
      gameStats:
        typeof p.gameStats === 'object' && p.gameStats && !Array.isArray(p.gameStats)
          ? p.gameStats
          : {},
      diario:
        typeof p.diario === 'object' && p.diario && typeof p.diario.dias === 'object'
          ? p.diario
          : DIARIO_VAZIO,
      objetivos: Array.isArray(p.objetivos) ? p.objetivos : [],
    }
  } catch {
    return null
  }
}
