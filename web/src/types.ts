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
  /**
   * Varredura linha-coluna: a interface percorre as linhas, o usuario aciona
   * (Espaco/Enter, ou um switch que emula teclado), e entao percorre as celulas
   * daquela linha. E o metodo de acesso padrao para comprometimento motor
   * severo. Ver REFERENCES.md secao 5.
   */
  scanning: boolean
  /** Intervalo entre passos da varredura, em ms. Ajuste e individual e clinico. */
  scanSpeed: number
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
  scanning: false,
  scanSpeed: 1200,
}
