import type { Region, Register } from './lib/regional'

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
  /**
   * Varredura auditiva: cada opcao percorrida e anunciada em voz secundaria.
   * Unico caminho de acesso para quem nao enxerga a grade.
   */
  auditoryScanning: boolean
  /** Earcons — sons curtos marcando passo, selecao e remocao. */
  sounds: boolean
  /**
   * Tipografia para dislexia, conforme o Dyslexia Style Guide da British
   * Dyslexia Association: sans-serif, corpo maior, entreletras aumentada,
   * sem italico nem sublinhado.
   */
  dyslexia: boolean
  /**
   * Conforto sensorial, 0 a 100. Dessatura e esfria a paleta de forma
   * CONTINUA: a literatura de hipersensibilidade no TEA nao aponta "a cor
   * certa", aponta que a resposta e individual e que a pessoa precisa poder
   * ajustar. Um botao liga/desliga servia mal a metade dos casos.
   * Ver SENSORY.md secao 1.
   */
  sensory: number

  /* ------------------------------------------------------- motor de frases */

  /**
   * Compoe a frase flexionada a partir dos cards ("eu querer agua" ->
   * "Eu quero agua"). Sempre reversivel: a frase literal continua visivel e
   * pode ser falada. Ver GRAMMAR.md.
   */
  grammar: boolean
  /**
   * Genero para concordancia de adjetivo referente ao proprio falante
   * ("estou cansado" / "estou cansada"). O portugues nao tem forma neutra;
   * `n` mantem a forma nao-marcada em vez de presumir pelo usuario.
   */
  speakerGender: 'n' | 'm' | 'f'
  /**
   * Codificacao cromatica por classe gramatical (chave de Fitzgerald
   * modificada). `border` colore so a borda — menos estimulo visual e o unico
   * modo compativel com alto contraste.
   */
  wordColors: 'off' | 'border' | 'fill'
  /**
   * Variedade regional do portugues brasileiro. Troca rotulos ("mandioca" →
   * "macaxeira") e o tratamento de 2a pessoa (voce/tu). Ver `lib/regional.ts`.
   */
  region: Region
  /**
   * Registro. `coloquial` fala como se fala ("pra", "abre a porta", "tu quer");
   * `normativo` fala como a escola cobra ("para", "abra a porta", "tu queres").
   */
  register: Register

  /* ------------------------------------------------------------ tipografia */

  /** `auto` segue o modo dislexia; o resto sao pilhas de fonte do sistema. */
  font: 'auto' | 'verdana' | 'tahoma' | 'century' | 'comic'
  /** Multiplicador do corpo do texto. */
  textScale: number
  /** Entreletras extra em `em`. 0 = o que o tema ja define. */
  letterSpacing: number
  /** Entrelinhas absoluta. 0 = automatica. */
  lineHeight: number
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
  auditoryScanning: false,
  sounds: false,
  dyslexia: false,
  sensory: 0,
  grammar: false,
  speakerGender: 'n',
  wordColors: 'off',
  region: 'padrao',
  register: 'coloquial',
  font: 'auto',
  textScale: 1,
  letterSpacing: 0,
  lineHeight: 0,
}
