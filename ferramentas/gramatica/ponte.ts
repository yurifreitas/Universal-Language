/**
 * Ponte entre o motor de frases (TypeScript de browser) e as ferramentas .mjs.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * O motor vive em `web/src/lib/`, é TypeScript e importa por caminho relativo.
 * As ferramentas são Node puro. Em vez de duplicar tipos ou reescrever o motor
 * em JavaScript — que é a forma garantida de a ferramenta testar um motor que
 * não é o motor —, este arquivo reexporta o que a ferramenta precisa e é
 * empacotado com esbuild, o mesmo mecanismo que a suíte de testes já usa.
 *
 * Nada é reimplementado aqui. Se um dia a ferramenta precisar de algo que o
 * motor não expõe, o certo é exportar de lá, não copiar para cá.
 */

export { compose, NO_MARKS, ARTICLE_MODES, conjugate, gerund, imperative } from '../../web/src/lib/grammar'
export type { GrammarMarks, ComposeOptions, Composed, Token, ArticleMode, SpeakerGender } from '../../web/src/lib/grammar'
export { LEXICON, lookup, TIME_ADVERBS } from '../../web/src/lib/lexicon'
export type { Lexeme, WordClass, Person, Tense } from '../../web/src/lib/lexicon'
export { REGIONS, REGIONAL_WORDS, regionalLabel, secondPerson } from '../../web/src/lib/regional'
export type { Region, Register } from '../../web/src/lib/regional'
export { definirLexicoGerado } from '../../web/src/lib/lexicoGerado'
