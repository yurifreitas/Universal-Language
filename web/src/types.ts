import type { Region, Register } from './lib/regional'
import type { Tratamento } from './lib/tratamento'

export interface Card {
  /** id do pictograma na ARASAAC */
  id: number
  /** rotulo pt-BR — sempre o nosso, nunca o termo pt-PT da base */
  label: string
  plural?: string | null
  skin?: boolean
  hair?: boolean
  /**
   * Celula de TEXTO: nao ha pictograma, o proprio rotulo e a figura.
   *
   * Numero, sinal de conta e pontuacao nao tem desenho que ajude — "7"
   * desenhado de sete maneiras diferentes atrapalha mais do que o algarismo,
   * que e o simbolo que a pessoa vai encontrar no mundo. Ver `lib/matematica.ts`.
   */
  texto?: boolean
  /**
   * Imagem propria, em vez do pictograma do acervo.
   *
   * Hoje so o Estudio de formas usa: o desenho vira uma `data:` URL de SVG e
   * cabe no mesmo lugar onde antes havia um id. Sem servidor, sem arquivo, sem
   * requisicao — o card continua funcionando offline como todos os outros.
   */
  imagem?: string
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
   * pode ser falada, e desligar aqui volta a ela.
   *
   * LIGADO por padrao. Vinha desligado, e o resultado pratico era que ninguem
   * descobria o recurso: a faixa de marcadores — tempo, negacao, pergunta — so
   * aparece com o motor ligado, entao a tela nao dava nenhuma pista de que
   * existia. A garantia que importa nao e "vir desligado", e sim **poder
   * desligar com um toque**, e essa continua valendo. Ver GRAMMAR.md.
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
  /**
   * Nivel de fala: mamae / mae / minha mae.
   *
   * O rotulo do card nao e legenda — e a palavra que a pessoa vai dizer. Uma
   * crianca de tres anos nao diz "mae", e um adolescente de quinze nao diz
   * "mamae"; ser feito dizer isso pelo proprio aparelho e constrangedor de um
   * jeito que quem fala nao precisa suportar. Ver `lib/tratamento.ts`.
   */
  tratamento: Tratamento

  /* ------------------------------------------------------------ tipografia */

  /**
   * Faixa de palavras-nucleo acima da grade, igual em todas as pranchas.
   * Poupa a troca de prancha a cada palavra funcional — que e o custo que o
   * planejamento motor mais penaliza. Ver `lib/coreStrip.ts`.
   */
  coreStrip: boolean
  /**
   * Faixa de sugestao da proxima palavra, aprendida do que a propria pessoa
   * disse. Nunca reorganiza a grade. Ver `lib/predict.ts`.
   */
  suggestions: boolean

  /** `auto` segue o modo dislexia; o resto sao pilhas de fonte do sistema. */
  font: 'auto' | 'verdana' | 'tahoma' | 'century' | 'comic'
  /** Multiplicador do corpo do texto. */
  textScale: number
  /** Entreletras extra em `em`. 0 = o que o tema ja define. */
  letterSpacing: number
  /** Entrelinhas absoluta. 0 = automatica. */
  lineHeight: number

  /* ------------------------------------------------------ modulos avancados

     Tudo aqui vem DESLIGADO, e essa e a decisao — nao a lista.

     Uma prancha de comunicacao tem de abrir e funcionar para quem so precisa
     pedir agua. Cada botao a mais no caminho e um custo cobrado dessa pessoa,
     todo dia, para servir a outra. Entao o app simples continua sendo o
     padrao, e quem quiser mais liga item a item — nunca o contrario.

     A ordem tambem importa: os modulos entram no menu depois do que ja
     existia, jamais deslocando um botao que a mao ja aprendeu. */

  /** Padroes visuais: sequencia, intruso, analogia. Ver `lib/padroes.ts`. */
  padroes: boolean
  /** Matematica alem de contar: fracao, tabuada, porcentagem, formas. */
  matAvancada: boolean
  /** Oficina de poesia: rima, silaba, modelos de poema. Ver `lib/poesia.ts`. */
  poesia: boolean
  /**
   * Estudio de formas: gerador de desenho + pilha de blocos, tipo Scratch.
   *
   * Laco e aninhamento sao a primeira logica de programacao, e aqui aparecem
   * **sem texto e sem sintaxe** — da para construir uma ideia complexa sem
   * escrever uma linha nem ler uma palavra. Ver `lib/blocos.ts`.
   */
  estudio: boolean
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
  grammar: true,
  speakerGender: 'n',
  wordColors: 'off',
  region: 'padrao',
  register: 'coloquial',
  tratamento: 'neutro',
  coreStrip: true,
  suggestions: true,
  font: 'auto',
  textScale: 1,
  letterSpacing: 0,
  lineHeight: 0,
  padroes: false,
  matAvancada: false,
  poesia: false,
  estudio: false,
}
