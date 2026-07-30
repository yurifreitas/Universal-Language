import {
  fecho,
  proximoSelo,
  registrarEnsaio,
  SELOS,
  seloDe,
  vezes,
  type ScriptStats,
} from '../src/lib/ensaio'

/**
 * Regressao do ensaio de roteiro. Roda com `npm run test:ensaio`.
 *
 * O que este arquivo protege nao e o calculo — e a POLITICA: a contagem so
 * sobe, o selo nunca regride, e nada aqui mede acerto. Se alguem um dia
 * acrescentar "perde um selo se parar no meio", e este arquivo que reclama.
 */

let falhas = 0
let passou = 0
const eq = (nome: string, obtido: unknown, esperado: unknown) => {
  const a = JSON.stringify(obtido)
  const b = JSON.stringify(esperado)
  if (a === b) passou++
  else {
    falhas++
    console.error(`  ${nome}\n     esperado: ${b}\n     obtido:   ${a}`)
  }
}

/* ------------------------------------------------------------- contagem */

const vazio: ScriptStats = {}
eq('roteiro nunca ensaiado conta zero', vezes(vazio, 'medico'), 0)
eq('id inexistente nao quebra', vezes({ medico: 3 }, 'padaria'), 0)
eq('registrar sobe de zero para um', vezes(registrarEnsaio(vazio, 'medico'), 'medico'), 1)
eq(
  'registrar duas vezes conta duas',
  vezes(registrarEnsaio(registrarEnsaio(vazio, 'medico'), 'medico'), 'medico'),
  2,
)
eq('registrar nao mexe nos outros roteiros', registrarEnsaio({ padaria: 2 }, 'medico'), {
  padaria: 2,
  medico: 1,
})
eq('id vazio nao cria entrada', registrarEnsaio(vazio, ''), {})

/* Estado corrompido no localStorage nao pode virar contagem negativa nem NaN. */
eq('valor negativo guardado conta zero', vezes({ medico: -4 } as ScriptStats, 'medico'), 0)
eq('valor quebrado conta zero', vezes({ medico: 'x' } as unknown as ScriptStats, 'medico'), 0)
eq('valor fracionario arredonda para baixo', vezes({ medico: 2.7 }, 'medico'), 2)

/* -------------------------------------------------------------- selos */

eq('sem ensaio nao ha selo', seloDe(0), null)
/* A primeira passagem inteira ja vale reconhecimento: e a que mais custa. */
eq('primeira vez ja ganha selo', seloDe(1)?.nome, 'Primeira vez')
eq('duas vezes ainda e o primeiro selo', seloDe(2)?.nome, 'Primeira vez')
eq('tres vezes sobe de faixa', seloDe(3)?.nome, 'Já conhece')
eq('cinco vezes', seloDe(5)?.nome, 'Sabe de cor')
eq('dez vezes chega no ultimo', seloDe(10)?.nome, 'É seu')
eq('acima do ultimo continua no ultimo', seloDe(97)?.nome, 'É seu')

/* Monotonia: o selo NUNCA regride conforme a contagem sobe. */
let regrediu = false
let anterior = -1
for (let n = 0; n <= 30; n++) {
  const i = seloDe(n) ? SELOS.findIndex((s) => s.nome === seloDe(n)!.nome) : -1
  if (i < anterior) regrediu = true
  anterior = i
}
eq('selo nunca regride', regrediu, false)

/* ------------------------------------------------------- proximo selo */

eq('do zero, faltam um para o primeiro', proximoSelo(0), { selo: SELOS[0], faltam: 1 })
eq('de um, faltam dois para o segundo', proximoSelo(1)?.faltam, 2)
eq('no ultimo selo nao ha proximo', proximoSelo(10), null)
eq('acima do ultimo tambem nao', proximoSelo(40), null)

/* ---------------------------------------------------------------- fecho */

/* O fecho varia — a mesma frase toda vez vira o som do fim, nao um elogio. */
eq('fecho muda entre a primeira e a terceira vez', fecho(1) === fecho(3), false)
eq('fecho nunca fala de rapidez', /rápid|depressa|segundos/i.test(fecho(7)), false)
eq('fecho nunca compara com outra pessoa', /melhor que|mais que os|ranking/i.test(fecho(2)), false)

if (falhas) {
  console.error(`\nensaio de roteiro: ${falhas} de ${falhas + passou} casos falharam.`)
  process.exit(1)
}
console.log(`ensaio de roteiro: ${passou} casos, todos como esperado.`)
