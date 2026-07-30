/**
 * Níveis de fala — mamãe, mãe, minha mãe.
 *
 * POR QUE ISTO EXISTE
 *
 * As pranchas de fábrica dizem "mãe", "pai", "avó". Mas uma criança de três
 * anos não diz "mãe" — diz **mamãe**. E um adolescente de quinze não diz
 * mamãe, e ser feito dizer isso pelo próprio aparelho é constrangedor de um
 * jeito que ninguém que fala precisa suportar.
 *
 * O rótulo do card **não é legenda**: é a palavra que a pessoa vai dizer, na
 * frente de quem ela conhece. Já tratamos isso como decisão de produto no
 * regionalismo — "macaxeira" e não "mandioca" — e este é o mesmo problema no
 * outro eixo. Lá a pergunta é *de onde a pessoa é*; aqui é *que idade ela tem,
 * e como se fala na casa dela*.
 *
 * TRÊS NÍVEIS, E POR QUE NÃO DOIS NEM DEZ
 *
 *   - `infantil` — mamãe, papai, vovó, titia, docinho. A forma afetiva, que é
 *     a que a criança pequena ouve e devolve.
 *   - `neutro` — mãe, pai, avó, tia. O padrão de fábrica, que serve da idade
 *     escolar em diante.
 *   - `adulto` — minha mãe, meu pai. A forma que um adulto usa **para falar de**
 *     alguém, e não para chamar. É a que falta em toda prancha que eu conheço,
 *     e a ausência dela é o que faz um adulto usuário de CAA soar como criança
 *     ao falar da própria família.
 *
 * Isto NUNCA muda o léxico interno. A gramática segue trabalhando com "mãe"; só
 * a forma dita e exibida muda — a mesma arquitetura do regionalismo, e pelo
 * mesmo motivo: o motor tem de funcionar igual em qualquer nível.
 */

export type Tratamento = 'infantil' | 'neutro' | 'adulto'

export interface NivelInfo {
  id: Tratamento
  nome: string
  hint: string
  exemplo: string
}

export const TRATAMENTOS: NivelInfo[] = [
  {
    id: 'infantil',
    nome: 'Como criança pequena fala',
    hint: 'Mamãe, papai, vovó. A forma afetiva, que a criança ouve em casa e devolve.',
    exemplo: 'Mamãe, cadê o papai?',
  },
  {
    id: 'neutro',
    nome: 'Neutro',
    hint: 'Mãe, pai, avó. O padrão das pranchas de fábrica, da idade escolar em diante.',
    exemplo: 'Mãe, cadê o pai?',
  },
  {
    id: 'adulto',
    nome: 'Como adulto fala',
    hint: 'Minha mãe, meu pai — para FALAR DE alguém. Chamar continua sendo "mãe".',
    exemplo: 'A minha mãe vem me buscar.',
  },
]

/**
 * As formas por nível.
 *
 * `chamado` é a forma de VOCATIVO — como se chama a pessoa. `referencia` é como
 * se fala DELA. Os dois coincidem quase sempre, e é justamente onde não
 * coincidem que a distinção importa: um adulto chama "mãe" e diz "a minha mãe",
 * nunca o contrário.
 */
interface Formas {
  infantil: string
  neutro: string
  adulto: string
  /** Quando a forma de chamamento difere da de referência. */
  chamadoAdulto?: string
}

const FAMILIA: Record<string, Formas> = {
  mãe: { infantil: 'mamãe', neutro: 'mãe', adulto: 'minha mãe', chamadoAdulto: 'mãe' },
  pai: { infantil: 'papai', neutro: 'pai', adulto: 'meu pai', chamadoAdulto: 'pai' },
  avó: { infantil: 'vovó', neutro: 'avó', adulto: 'minha avó', chamadoAdulto: 'vó' },
  avô: { infantil: 'vovô', neutro: 'avô', adulto: 'meu avô', chamadoAdulto: 'vô' },
  tia: { infantil: 'titia', neutro: 'tia', adulto: 'minha tia', chamadoAdulto: 'tia' },
  tio: { infantil: 'titio', neutro: 'tio', adulto: 'meu tio', chamadoAdulto: 'tio' },
  irmã: { infantil: 'maninha', neutro: 'irmã', adulto: 'minha irmã', chamadoAdulto: 'irmã' },
  irmão: { infantil: 'maninho', neutro: 'irmão', adulto: 'meu irmão', chamadoAdulto: 'irmão' },
  // Fora do parentesco, mas do mesmo eixo: são as palavras que mais denunciam
  // idade num aparelho de fala.
  água: { infantil: 'águinha', neutro: 'água', adulto: 'água' },
  dodói: { infantil: 'dodói', neutro: 'machucado', adulto: 'machucado' },
  xixi: { infantil: 'xixi', neutro: 'xixi', adulto: 'banheiro' },
  cocô: { infantil: 'cocô', neutro: 'cocô', adulto: 'banheiro' },
  papá: { infantil: 'papá', neutro: 'comida', adulto: 'comida' },
  nanar: { infantil: 'nanar', neutro: 'dormir', adulto: 'dormir' },
}

/**
 * A forma da palavra neste nível.
 *
 * `vocativo` importa: no nível adulto, "mãe" chamada continua "mãe", mas
 * referida vira "minha mãe". Chamar alguém de "minha mãe" não é português.
 */
export function tratamentoLabel(
  label: string,
  nivel: Tratamento,
  vocativo = false,
): string {
  const chave = label.trim().toLowerCase()
  const formas = FAMILIA[chave]
  if (!formas) return label
  const forma =
    vocativo && nivel === 'adulto' ? (formas.chamadoAdulto ?? formas.neutro) : formas[nivel]
  if (!forma) return label
  const maiuscula = label.charAt(0) === label.charAt(0).toUpperCase()
  return maiuscula ? forma.charAt(0).toUpperCase() + forma.slice(1) : forma
}

/**
 * O nível traz artigo embutido? "minha mãe" já tem determinante.
 *
 * Sem isto o motor produziria "a minha mãe" — que existe no português falado,
 * mas soa a ênfase ("a MINHA mãe, não a sua"), e não é o que se quer por
 * padrão em toda frase.
 */
export function trazDeterminante(label: string, nivel: Tratamento): boolean {
  const formas = FAMILIA[label.trim().toLowerCase()]
  if (!formas) return false
  return nivel === 'adulto' && formas.adulto.includes(' ')
}
