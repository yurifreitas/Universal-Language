export interface Card {
  /** id do pictograma na ARASAAC */
  id: number
  /** rotulo pt-BR — sempre o nosso, nunca o termo pt-PT da base */
  label: string
  plural?: string | null
  skin?: boolean
  hair?: boolean
}

export interface Board {
  id: string
  name: string
  icon: string
  cards: Card[]
}

/** Registro do indice de busca: `i` = id, `k` = termos pt */
export interface SearchRecord {
  i: number
  k: string[]
}

export interface Settings {
  /** colunas da grade — menos colunas = alvos maiores */
  columns: number
  voiceURI: string | null
  rate: number
  pitch: number
  /** fala cada card no toque, alem da frase inteira */
  speakOnTap: boolean
  /** esconde configuracoes e busca; evita que a crianca saia da prancha */
  locked: boolean
  theme: 'dark' | 'light'
  highContrast: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  columns: 5,
  voiceURI: null,
  rate: 0.95,
  pitch: 1,
  speakOnTap: true,
  locked: false,
  theme: 'dark',
  highContrast: false,
}
