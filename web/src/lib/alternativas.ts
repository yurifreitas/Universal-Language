import { REGIONS, regionalLabel, type Region } from './regional'
import { TRATAMENTOS, tratamentoLabel, type Tratamento } from './tratamento'
import { lookup } from './lexicon'
import { pluralize } from './grammar'

/**
 * As outras formas da mesma palavra — para trocar dentro da própria frase.
 *
 * POR QUE ISTO EXISTE
 *
 * O app já sabe dizer "mamãe", "mãe" ou "minha mãe"; "biscoito" ou "bolacha";
 * "pão" ou "pães". Mas essas escolhas moram todas em **Ajustes**, valem para o
 * app inteiro e de uma vez só — e a fala real não é assim.
 *
 * A mesma criança diz "mamãe" em casa e "minha mãe" na escola. A mesma pessoa
 * quer "um pão" agora e "dois pães" na frase seguinte. Obrigar a abrir os
 * ajustes, mudar um seletor global e voltar é caro demais para uma decisão que
 * é **de uma palavra, nesta frase**.
 *
 * Aqui as alternativas aparecem no bloco onde a palavra está. A escolha vale
 * para aquela posição e não muda ajuste nenhum — nem a próxima frase.
 *
 * O QUE NÃO ENTRA
 *
 * Sinônimo livre. Trocar "água" por "suco" não é escolher outra forma da mesma
 * palavra: é dizer outra coisa, e para isso existe a prancha. O motor não
 * decide o que a pessoa quer dizer — este módulo só oferece as formas em que a
 * MESMA palavra pode aparecer.
 */

export interface Alternativa {
  /** A forma. É o que vai virar o rótulo do card. */
  label: string
  /** De onde ela vem, para a UI explicar a escolha. */
  origem: 'atual' | 'nivel' | 'regiao' | 'numero'
  /** Uma linha curta: "como criança pequena fala", "no Sul", "mais de um". */
  nota: string
}

/**
 * Todas as formas de uma palavra, sem repetir.
 *
 * A primeira é sempre a que está na frase agora — a lista é para trocar, e
 * mostrar de onde se está saindo evita a troca por engano.
 */
export function alternativasDe(
  label: string,
  contexto: { region: Region; tratamento: Tratamento },
): Alternativa[] {
  const atual = label.trim()
  const saida: Alternativa[] = [{ label: atual, origem: 'atual', nota: 'na frase agora' }]
  const vistas = new Set([atual.toLowerCase()])

  const por = (forma: string, origem: Alternativa['origem'], nota: string) => {
    const limpa = forma.trim()
    if (!limpa || vistas.has(limpa.toLowerCase())) return
    vistas.add(limpa.toLowerCase())
    saida.push({ label: limpa, origem, nota })
  }

  // 1. Níveis de fala — mamãe / mãe / minha mãe.
  for (const nivel of TRATAMENTOS) {
    if (nivel.id === contexto.tratamento) continue
    por(tratamentoLabel(atual, nivel.id), 'nivel', nivel.nome.toLowerCase())
  }

  // 2. Variedades regionais — biscoito / bolacha / bolacha.
  //
  // Só as que DIFEREM da atual: oferecer oito regiões onde seis dizem a mesma
  // coisa seria uma lista de repetições.
  for (const r of REGIONS) {
    if (r.id === contexto.region) continue
    por(regionalLabel(atual, r.id), 'regiao', r.name.toLowerCase())
  }

  // 3. Número — pão / pães.
  //
  // Vem por último porque é a única que muda o SENTIDO, e não só a forma: as
  // outras dizem a mesma coisa de outro jeito, esta diz quantos.
  const lex = lookup(atual)
  if (lex.class === 'noun' && !lex.plural && !lex.mass) {
    por(pluralize(atual, lex), 'numero', 'mais de um')
  }

  return saida
}

/** Há mais de uma forma? A UI só mostra o botão quando há. */
export function temAlternativas(
  label: string,
  contexto: { region: Region; tratamento: Tratamento },
): boolean {
  return alternativasDe(label, contexto).length > 1
}
