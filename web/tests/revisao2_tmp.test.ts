import { compose, NO_MARKS } from '../src/lib/grammar'
import type { Card } from '../src/types'

const c = (label: string): Card => ({ id: 0, label })
const m = (rotulo: string, seq: string[], marks = {}) => {
  const saida = compose(seq.map(c), {
    marks: { ...NO_MARKS, ...marks },
    articles: [],
    speakerGender: 'n',
    region: 'padrao',
    register: 'coloquial',
  }).text
  console.log(`${rotulo.padEnd(28)} ${seq.join('·').padEnd(28)} => ${saida}`)
}

console.log('══ EXISTENCIAL (o conserto desta rodada) ══')
m('tem bolo?', ['ter', 'bolo'], { question: true })
m('tem mais bolo?', ['ter', 'mais', 'bolo'], { question: true })
m('não tem bolo?', ['não', 'ter', 'bolo'], { question: true })
m('você tem bolo? (posse)', ['você', 'ter', 'bolo'], { question: true })
m('tenho fome (não muda)', ['ter', 'fome'], {})
m('tenho dor (não muda)', ['ter', 'dor'], {})
m('eu tenho bolo (não muda)', ['eu', 'ter', 'bolo'], {})

console.log('\n══ QUANTIDADE E MEDIDA ══')
m('mais um', ['mais', 'um'], {})
m('só um pouco', ['pouco'], {})
m('todos os dias', ['todo', 'dia'], {})
m('outro copo', ['outro', 'copo'], {})
m('o mesmo', ['mesmo'], {})

console.log('\n══ LUGAR E DIREÇÃO ══')
m('eu vou na escola', ['eu', 'ir', 'escola'], {})
m('eu venho da escola', ['eu', 'vir', 'escola'], {})
m('está em cima', ['estar', 'cima'], {})
m('põe aqui', ['pôr', 'aqui'], { request: true })
m('lá fora', ['fora'], {})

console.log('\n══ TEMPO ══')
m('hoje eu vou', ['hoje', 'eu', 'ir'], {})
m('amanhã eu vou', ['amanhã', 'eu', 'ir'], {})
m('depois do almoço', ['depois', 'almoço'], {})
m('daqui a pouco', ['pouco', 'depois'], {})
m('toda hora', ['todo', 'hora'], {})

console.log('\n══ CORTESIA E INTERAÇÃO ══')
m('por favor', ['favor'], {})
m('obrigado', ['obrigado'], {})
m('com licença', ['com', 'licença'], {})
m('eu quero, por favor', ['eu', 'querer', 'água', 'favor'], {})

console.log('\n══ DOIS COMPLEMENTOS ══')
m('dá água pra mãe', ['dar', 'água', 'mãe'], { request: true })
m('conta pro pai', ['contar', 'pai'], { request: true })
m('mostra pra mim', ['mostrar', 'eu'], { request: true })

console.log('\n══ ADJETIVO ANTES DO SUBSTANTIVO ══')
m('água quente', ['água', 'quente'], {})
m('eu quero água quente', ['eu', 'querer', 'água', 'quente'], {})
m('o menino grande', ['menino', 'grande'], {})

console.log('\n══ SÉRIE DE TRÊS ══')
m('a, b e c', ['pão', 'leite', 'bolo'], {})
m('eu, mãe e pai', ['eu', 'mãe', 'pai'], {})
m('correr, pular e cair', ['correr', 'pular', 'cair'], {})

console.log('\n══ PERGUNTA COM SUJEITO ══')
m('a mãe vem?', ['mãe', 'vir'], { question: true })
m('você quer?', ['você', 'querer'], { question: true })
m('cadê a mãe?', ['onde', 'estar', 'mãe'], { question: true })

console.log('\n══ NEGAÇÃO EM LUGARES DIFERENTES ══')
m('eu não quero isso', ['eu', 'não', 'querer', 'isso'], {})
m('isso não é meu', ['isso', 'não', 'meu'], {})
m('ninguém veio', ['ninguém', 'vir'], { tense: 'past' })
m('nunca mais', ['nunca', 'mais'], {})

console.log('\n══ PLURAL E CONCORDÂNCIA LONGA ══')
m('os meninos bonitos', ['menino', 'bonito'], { plural: true })
m('as mães estão felizes', ['mãe', 'feliz'], { plural: true })
m('eu quero duas maçãs', ['eu', 'querer', '2', 'maçã'], {})
