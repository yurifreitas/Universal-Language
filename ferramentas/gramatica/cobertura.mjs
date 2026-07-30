/**
 * Cobertura combinatória por pares e trios.
 *
 * POR QUE NÃO FORÇA BRUTA
 *
 * O espaço declarado no PLANO.md — sujeito × verbo × complemento × tempo ×
 * negação × pergunta × progressivo × pedido × plural × artigo × gênero do
 * falante × região × registro — passa de centenas de milhares antes de entrar
 * uma única palavra do léxico. Com o léxico, passa de bilhões. Percorrer isso
 * não é caro: é impossível, e insistir produziria milhões de casos quase
 * idênticos enquanto combinações inteiras nunca apareceriam.
 *
 * A alternativa que a literatura de teste combinatório sustenta é cobrir todo
 * PAR de valores de dimensões diferentes. O argumento não é estatístico, é
 * empírico: a esmagadora maioria dos defeitos de interação envolve duas
 * variáveis — "passado + negação", "modal + substantivo incontável" —, não
 * treze. Um conjunto que cobre todos os pares cabe em milhares de casos, não
 * bilhões.
 *
 * Trios ficam reservados às dimensões pequenas (marcadores, forma da frase,
 * região, registro), onde cabem inteiros e onde os defeitos achados à mão
 * apareceram. Trio de dimensão lexical seria voltar à força bruta pela porta
 * dos fundos.
 *
 * O algoritmo é guloso: pega um alvo ainda não coberto, fixa-o, e preenche o
 * resto escolhendo, entre alguns candidatos sorteados, o valor que cobre mais
 * alvos novos. Não é ótimo — cobertura combinatória mínima é NP-difícil — e
 * não precisa ser: precisa ser reprodutível e cobrir tudo em tempo linear.
 */

/** Identidade numérica de (dimensão, valor). Chave de par cabe num inteiro. */
const id = (d, v) => d * 4096 + v
const par = (a, b) => (a < b ? a * 16777216 + b : b * 16777216 + a)

export function gerarCasos({ dimensoes, casos, aleatorio, trios = [], candidatos = 8 }) {
  const nomes = Object.keys(dimensoes)
  const valores = nomes.map((n) => dimensoes[n])

  /* Alvos de par. Só entram dimensões com mais de um valor: uma dimensão de
     valor único não tem par a cobrir, e contá-la infla a cobertura de graça. */
  const alvos = []
  for (let i = 0; i < nomes.length; i++) {
    for (let j = i + 1; j < nomes.length; j++) {
      for (let a = 0; a < valores[i].length; a++) {
        for (let b = 0; b < valores[j].length; b++) {
          alvos.push([i, a, j, b])
        }
      }
    }
  }

  const indiceTrio = trios.map((n) => nomes.indexOf(n)).filter((i) => i >= 0)
  const alvosTrio = []
  for (let x = 0; x < indiceTrio.length; x++) {
    for (let y = x + 1; y < indiceTrio.length; y++) {
      for (let z = y + 1; z < indiceTrio.length; z++) {
        const [i, j, k] = [indiceTrio[x], indiceTrio[y], indiceTrio[z]]
        for (let a = 0; a < valores[i].length; a++) {
          for (let b = 0; b < valores[j].length; b++) {
            for (let c = 0; c < valores[k].length; c++) {
              alvosTrio.push([i, a, j, b, k, c])
            }
          }
        }
      }
    }
  }

  const cobertosPar = new Set()
  const cobertosTrio = new Set()
  const chaveTrio = (i, a, j, b, k, c) => `${id(i, a)}.${id(j, b)}.${id(k, c)}`

  const saida = []
  let ponteiroPar = 0
  let ponteiroTrio = 0

  const registrar = (combo) => {
    for (let i = 0; i < combo.length; i++) {
      for (let j = i + 1; j < combo.length; j++) {
        cobertosPar.add(par(id(i, combo[i]), id(j, combo[j])))
      }
    }
  }

  /*
   * Registrar trio por varredura da lista inteira seria O(alvos) por caso.
   * Em vez disso, os trios são indexados pelas dimensões que participam, e só
   * essas combinações são consultadas.
   */
  const combosTrio = []
  for (let x = 0; x < indiceTrio.length; x++) {
    for (let y = x + 1; y < indiceTrio.length; y++) {
      for (let z = y + 1; z < indiceTrio.length; z++) {
        combosTrio.push([indiceTrio[x], indiceTrio[y], indiceTrio[z]])
      }
    }
  }
  const registrarTrios = (combo) => {
    for (const [i, j, k] of combosTrio) {
      cobertosTrio.add(chaveTrio(i, combo[i], j, combo[j], k, combo[k]))
    }
  }

  const ganho = (d, v, combo, fixos) => {
    let n = 0
    for (const f of fixos) {
      if (!cobertosPar.has(par(id(d, v), id(f, combo[f])))) n++
    }
    return n
  }

  while (saida.length < casos) {
    const combo = new Array(nomes.length).fill(-1)
    const fixos = []

    /* Semeia o caso com um alvo ainda descoberto: primeiro os trios, que são
       menos numerosos e mais difíceis de sair por acaso, depois os pares. */
    while (ponteiroTrio < alvosTrio.length) {
      const [i, a, j, b, k, c] = alvosTrio[ponteiroTrio]
      if (!cobertosTrio.has(chaveTrio(i, a, j, b, k, c))) {
        combo[i] = a
        combo[j] = b
        combo[k] = c
        fixos.push(i, j, k)
        break
      }
      ponteiroTrio++
    }
    if (fixos.length === 0) {
      while (ponteiroPar < alvos.length) {
        const [i, a, j, b] = alvos[ponteiroPar]
        if (!cobertosPar.has(par(id(i, a), id(j, b)))) {
          combo[i] = a
          combo[j] = b
          fixos.push(i, j)
          break
        }
        ponteiroPar++
      }
    }

    for (let d = 0; d < nomes.length; d++) {
      if (combo[d] !== -1) continue
      const total = valores[d].length
      let melhor = Math.floor(aleatorio() * total) % total
      if (fixos.length > 0 && total > 1) {
        let melhorGanho = -1
        for (let t = 0; t < Math.min(candidatos, total); t++) {
          const v = Math.floor(aleatorio() * total) % total
          const g = ganho(d, v, combo, fixos)
          if (g > melhorGanho) {
            melhorGanho = g
            melhor = v
          }
          if (melhorGanho === fixos.length) break
        }
      }
      combo[d] = melhor
      fixos.push(d)
    }

    registrar(combo)
    registrarTrios(combo)
    saida.push(Object.fromEntries(nomes.map((n, i) => [n, valores[i][combo[i]]])))
  }

  return {
    casos: saida,
    paresTotais: alvos.length,
    paresCobertos: cobertosPar.size,
    triosTotais: alvosTrio.length,
    triosCobertos: cobertosTrio.size,
  }
}
