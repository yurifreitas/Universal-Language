import { compose, NO_MARKS } from '../src/lib/grammar'
import type { Card } from '../src/types'

/** Revisão linguística — descartável. O que o motor ainda não sabe fazer. */

const c = (label: string): Card => ({ id: 0, label })
const m = (rotulo: string, seq: string[], marks = {}, esperado = '') => {
  const saida = compose(seq.map(c), {
    marks: { ...NO_MARKS, ...marks },
    articles: [],
    speakerGender: 'n',
    region: 'padrao',
    register: 'coloquial',
  }).text
  const marca = esperado && saida !== esperado ? ' ✗' : ''
  console.log(`${rotulo.padEnd(26)} ${seq.join('·').padEnd(30)} => ${saida}${marca}`)
  if (esperado && saida !== esperado) console.log(`${''.padEnd(28)} esperado: ${esperado}`)
}

console.log('══ PRONOME OBLÍQUO DEPOIS DE PREPOSIÇÃO ══')
m('para mim', ['isso', 'para', 'eu'], {}, 'Isso para mim.')
m('de mim', ['você', 'gostar', 'eu'], {})
m('sem mim', ['você', 'ir', 'sem', 'eu'], {})

console.log('\n══ POSSE COM NOME PRÓPRIO/PARENTE ══')
m('o carro do papai', ['carro', 'pai'], {})
m('a boneca da irmã', ['boneca', 'irmã'], {})

console.log('\n══ EXISTENCIAL ══')
m('tem bolo?', ['ter', 'bolo'], { question: true })
m('não tem mais', ['não', 'ter', 'mais'], {})

console.log('\n══ INTERROGATIVOS ══')
m('o que é isso?', ['que', 'isso'], { question: true })
m('quem é?', ['quem'], { question: true })
m('onde está a mãe?', ['onde', 'mãe'], { question: true })
m('quando?', ['quando'], { question: true })
m('por que?', ['porque'], { question: true })
m('quanto?', ['quanto'], { question: true })

console.log('\n══ HORTATIVO / CONVITE ══')
m('vamos brincar!', ['nós', 'ir', 'brincar'], {})
m('vamos!', ['vamos'], {})
m('deixa eu ver', ['deixar', 'eu', 'ver'], {})

console.log('\n══ REFLEXIVO ══')
m('eu me machuquei', ['eu', 'machucar', 'eu'], { tense: 'past' })
m('eu me visto', ['eu', 'vestir', 'eu'], {})

console.log('\n══ FUTURO DO PRETÉRITO / PEDIDO POLIDO ══')
m('eu queria água', ['eu', 'querer', 'água'], { tense: 'imperfect' })
m('você podia me ajudar?', ['você', 'poder', 'ajudar', 'eu'], { question: true })

console.log('\n══ COMPARAÇÃO ══')
m('maior que', ['isso', 'grande', 'que', 'aquilo'], {})
m('eu quero mais', ['eu', 'querer', 'mais'], {})

console.log('\n══ IMPERATIVO NEGATIVO ══')
m('não faz isso', ['não', 'fazer', 'isso'], { request: true })
m('para!', ['parar'], { request: true })

console.log('\n══ "A GENTE" ══')
m('a gente vai', ['a gente', 'ir'], {})
m('a gente quer brincar', ['a gente', 'querer', 'brincar'], {})

console.log('\n══ FICAR + ADJETIVO ══')
m('eu fiquei triste', ['eu', 'ficar', 'triste'], { tense: 'past' })
m('fica quieto', ['ficar', 'quieto'], { request: true })

console.log('\n══ DOIS OBJETOS ══')
m('dá o bolo pra mim', ['dar', 'bolo', 'eu'], { request: true })
m('eu falei pra mãe', ['eu', 'falar', 'mãe'], { tense: 'past' })

console.log('\n══ ADVÉRBIO DE INTENSIDADE ══')
m('muito feliz', ['eu', 'muito', 'feliz'], {})
m('um pouco triste', ['eu', 'pouco', 'triste'], {})

console.log('\n══ TEMPO COMPOSTO ══')
m('eu já comi', ['já', 'eu', 'comer'], { tense: 'past' })
m('ainda não', ['ainda', 'não'], {})
