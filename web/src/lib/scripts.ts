import type { Card } from '../types'

/**
 * Roteiros.
 *
 * Um roteiro e uma sequencia de frases para uma situacao que se repete: ir ao
 * medico, comprar pao, se apresentar, chegar na escola. Nao e uma frase nova —
 * e a ORDEM, que e justamente o que uma prancha nao guarda.
 *
 * POR QUE ISTO EXISTE
 *
 * Roteiro social e recurso corrente no trabalho com autismo: saber de antemao a
 * sequencia do que vai acontecer e do que se pode dizer reduz a carga de uma
 * situacao imprevisivel. Numa prancha de CAA isso se soma a um segundo ganho —
 * a pessoa nao precisa remontar cada frase no meio de uma interacao com um
 * estranho, que e quando a pressa alheia mais atrapalha.
 *
 * O passo atual fica marcado, e tocar um passo avanca o ponteiro. Mas qualquer
 * passo pode ser tocado a qualquer momento, e o roteiro nunca bloqueia: uma
 * conversa real nao segue roteiro, e um app que obrigasse a seguir seria pior
 * que nenhum.
 *
 * O QUE UM ROTEIRO NAO E
 *
 * Nao e treino de fala nem script a decorar. E lembrete, e a pessoa sai dele
 * quando quiser.
 */

export interface Script {
  id: string
  name: string
  /** Pictograma que representa a situacao. */
  icon: number
  /** Cada passo e uma frase inteira, como nas frases prontas. */
  steps: Card[]
  /** Roteiro de fabrica: pode ser copiado, nao editado nem apagado. */
  builtIn?: boolean
}

export const BUILT_IN_SCRIPTS: Script[] = [
  {
    id: 'medico',
    name: 'Ir ao médico',
    icon: 6561,
    builtIn: true,
    steps: [
      { id: 6009, label: 'Oi. Eu falo com a minha prancha.' },
      { id: 2367, label: 'Estou com dor aqui.' },
      { id: 7072, label: 'Começou faz pouco tempo.' },
      { id: 4676, label: 'Pode falar mais devagar, por favor?' },
      { id: 11697, label: 'Eu não entendi. Pode repetir?' },
      { id: 7217, label: 'Eu tenho uma pergunta.' },
      { id: 8128, label: 'Obrigado.' },
    ],
  },
  {
    id: 'padaria',
    name: 'Comprar pão',
    icon: 2494,
    builtIn: true,
    steps: [
      { id: 6944, label: 'Bom dia!' },
      { id: 2494, label: 'Eu quero pão, por favor.' },
      { id: 3220, label: 'Quero mais um, por favor.' },
      { id: 5358, label: 'Só isso, obrigado.' },
      { id: 5896, label: 'Tchau!' },
    ],
  },
  {
    id: 'apresentar',
    name: 'Me apresentar',
    icon: 7061,
    builtIn: true,
    steps: [
      { id: 6009, label: 'Oi!' },
      { id: 7061, label: 'Esse é o meu nome.' },
      { id: 8109, label: 'Espera um pouco, eu estou montando a frase.' },
      { id: 6564, label: 'Olha para a minha prancha, por favor.' },
      { id: 6023, label: 'Prazer em te conhecer.' },
    ],
  },
  {
    id: 'escola',
    name: 'Chegar na escola',
    icon: 32446,
    builtIn: true,
    steps: [
      { id: 6944, label: 'Bom dia!' },
      { id: 32446, label: 'Cheguei.' },
      { id: 3129, label: 'Posso sentar aqui?' },
      { id: 4570, label: 'Preciso de ajuda com isso.' },
      { id: 17004, label: 'Já terminei a tarefa.' },
    ],
  },
  {
    id: 'sobrecarga',
    name: 'Quando fica demais',
    icon: 31310,
    builtIn: true,
    steps: [
      { id: 7157, label: 'Está muito barulho para mim.' },
      { id: 36109, label: 'Preciso de uma pausa.' },
      { id: 2806, label: 'Preciso sair daqui.' },
      { id: 39247, label: 'Preciso ficar um tempo sozinho.' },
      { id: 31310, label: 'Já estou mais calmo.' },
    ],
  },
]

/** Id estavel a partir do nome, sem relogio nem sorteio. */
export function scriptId(name: string, existing: Script[]): string {
  const slug =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'roteiro'
  const taken = [...BUILT_IN_SCRIPTS, ...existing]
  if (!taken.some((s) => s.id === slug)) return slug
  let n = 2
  while (taken.some((s) => s.id === `${slug}-${n}`)) n++
  return `${slug}-${n}`
}

/** Copia de um roteiro de fabrica, ja editavel. */
export function duplicate(script: Script, existing: Script[]): Script {
  const name = `${script.name} (minha versão)`
  return { id: scriptId(name, existing), name, icon: script.icon, steps: [...script.steps] }
}

export function moveStep(script: Script, from: number, to: number): Script {
  if (to < 0 || to >= script.steps.length || from === to) return script
  const steps = [...script.steps]
  const [moved] = steps.splice(from, 1)
  if (!moved) return script
  steps.splice(to, 0, moved)
  return { ...script, steps }
}
