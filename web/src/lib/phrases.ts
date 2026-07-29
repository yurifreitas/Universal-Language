import type { Card } from '../types'

/**
 * Frases prontas.
 *
 * Por que existem, se o app ja monta frase card a card: **velocidade**. A
 * taxa de comunicacao por selecao de simbolo fica muito abaixo da fala, e a
 * diferenca importa mais justamente quando a mensagem nao pode esperar — dor,
 * sobrecarga sensorial, pedido de ajuda. Montar `EU · DOR · BARRIGA` leva tres
 * toques e alguns segundos; uma frase pronta leva um toque.
 *
 * A ordem dos grupos nao e alfabetica nem tematica: e por urgencia. O que nao
 * pode esperar vem primeiro, no caminho mais curto.
 *
 * Duas coisas que estas frases NAO sao:
 *
 * - **Nao substituem a prancha.** Frase pronta e um atalho para o que se repete;
 *   a prancha e onde a pessoa diz o que ninguem previu por ela. Um app que so
 *   tem frases prontas nao e CAA, e um controle remoto.
 * - **Nao passam pelo motor de frases.** Ja estao em portugues correto; flexionar
 *   de novo so poderia estragar.
 *
 * O grupo de **regulacao sensorial** merece nota: pedir para baixar o som, sair
 * do ambiente ou nao ser tocado sao mensagens que a pessoa muitas vezes so
 * consegue emitir depois de ja estar sobrecarregada — ou seja, no exato momento
 * em que montar frase fica mais dificil. E o caso mais forte a favor de um
 * toque so.
 */

export interface PhraseGroup {
  id: string
  name: string
  icon: string
  /** `id` e o pictograma; `label` e a frase inteira, ja em portugues. */
  phrases: Card[]
}

export const PHRASE_GROUPS: PhraseGroup[] = [
  {
    id: 'urgente',
    name: 'Urgente',
    icon: '⚠',
    phrases: [
      { id: 12252, label: 'Preciso de ajuda.' },
      { id: 2367, label: 'Estou com dor.' },
      { id: 38625, label: 'Preciso ir ao banheiro.' },
      { id: 3308, label: 'Estou passando mal.' },
      { id: 2458, label: 'Chama a minha mãe.' },
      { id: 8163, label: 'Preciso do meu remédio.' },
      { id: 5470, label: 'Estou com febre.' },
      { id: 35569, label: 'Estou enjoado.' },
    ],
  },
  {
    id: 'regulacao',
    name: 'Preciso de calma',
    icon: '🌿',
    phrases: [
      { id: 7157, label: 'Está muito barulho para mim.' },
      { id: 8619, label: 'Está muita luz aqui.' },
      { id: 38445, label: 'Tem gente demais aqui.' },
      { id: 36109, label: 'Preciso de uma pausa.' },
      { id: 39247, label: 'Preciso ficar um tempo sozinho.' },
      { id: 2806, label: 'Preciso sair daqui.' },
      { id: 27630, label: 'Por favor, não me toque agora.' },
      { id: 8293, label: 'Posso colocar meu fone?' },
      { id: 31310, label: 'Já estou mais calmo.' },
    ],
  },
  {
    id: 'sim-nao',
    name: 'Sim e não',
    icon: '✓',
    phrases: [
      { id: 5583, label: 'Sim, é isso.' },
      { id: 5526, label: 'Não, não é isso.' },
      { id: 11696, label: 'Eu não sei.' },
      { id: 8109, label: 'Espera um pouco, por favor.' },
      { id: 17004, label: 'Já terminei.' },
      { id: 6483, label: 'Quero escolher outro.' },
      { id: 37163, label: 'De novo, por favor.' },
      { id: 7195, label: 'Para, por favor.' },
    ],
  },
  {
    id: 'quero',
    name: 'Eu quero',
    icon: '✋',
    phrases: [
      { id: 5441, label: 'Eu quero isso.' },
      { id: 5526, label: 'Eu não quero isso.' },
      { id: 3220, label: 'Eu quero mais, por favor.' },
      { id: 5358, label: 'Já chega, obrigado.' },
      { id: 35559, label: 'Estou com fome.' },
      { id: 7273, label: 'Estou com sede.' },
      { id: 6537, label: 'Eu quero brincar.' },
      { id: 6479, label: 'Eu quero dormir.' },
    ],
  },
  {
    id: 'conversa',
    name: 'Conversa',
    icon: '💬',
    phrases: [
      { id: 6009, label: 'Oi, tudo bem?' },
      { id: 6944, label: 'Bom dia!' },
      { id: 6942, label: 'Boa noite!' },
      { id: 7061, label: 'Prazer, esse é o meu nome.' },
      { id: 8128, label: 'Obrigado!' },
      { id: 8194, label: 'Por favor.' },
      { id: 6023, label: 'Posso te dar um abraço?' },
      { id: 32360, label: 'Estou com saudade de você.' },
      { id: 5896, label: 'Tchau, até logo!' },
    ],
  },
  {
    id: 'escola',
    name: 'Escola',
    icon: '🎒',
    phrases: [
      { id: 11697, label: 'Eu não entendi.' },
      { id: 11752, label: 'Pode repetir, por favor?' },
      { id: 4676, label: 'Pode falar mais devagar?' },
      { id: 7072, label: 'Preciso de mais tempo.' },
      { id: 38625, label: 'Posso ir ao banheiro?' },
      { id: 4570, label: 'Preciso de ajuda com isso.' },
      { id: 7217, label: 'Eu tenho uma pergunta.' },
      { id: 17004, label: 'Já terminei a tarefa.' },
    ],
  },
]

/**
 * Frases de comunicacao de reparo — quando o parceiro entendeu errado.
 *
 * Sao as que o usuario de CAA menos costuma ter a mao e mais precisa: sem elas,
 * um mal-entendido so termina quando o interlocutor decide que terminou.
 */
export const REPAIR_GROUP: PhraseGroup = {
  id: 'reparo',
  name: 'Me entenderam errado',
  icon: '↺',
  phrases: [
    { id: 5526, label: 'Não é isso que eu quis dizer.' },
    { id: 8109, label: 'Espera, deixa eu terminar.' },
    { id: 11752, label: 'Deixa eu dizer de outro jeito.' },
    { id: 7217, label: 'Você entendeu o que eu disse?' },
    { id: 4676, label: 'Preciso de mais tempo para responder.' },
    { id: 6564, label: 'Olha para a minha prancha, por favor.' },
    { id: 7116, label: 'Fala comigo, não com quem está do meu lado.' },
  ],
}

export const ALL_GROUPS: PhraseGroup[] = [...PHRASE_GROUPS, REPAIR_GROUP]

/**
 * Frases prontas nao passam pelo motor, entao nao herdam a concordancia de
 * genero dele. Como algumas trazem adjetivo referente a quem fala, elas ficam
 * no masculino nao marcado por padrao e sao trocadas por inteiro quando o
 * usuario escolheu feminino em Ajustes.
 *
 * Uma tabela e nao uma regra: sao poucas frases, e trocar terminacao por regexp
 * em texto livre erra ("Chama a minha mae" nao tem nada a flexionar).
 */
const FEMININE: Record<string, string> = {
  'Estou enjoado.': 'Estou enjoada.',
  'Já estou mais calmo.': 'Já estou mais calma.',
  'Preciso ficar um tempo sozinho.': 'Preciso ficar um tempo sozinha.',
  'Obrigado!': 'Obrigada!',
  'Já chega, obrigado.': 'Já chega, obrigada.',
}

export function inflectGroup(group: PhraseGroup, gender: 'n' | 'm' | 'f'): PhraseGroup {
  if (gender !== 'f') return group
  if (!group.phrases.some((p) => FEMININE[p.label])) return group
  return {
    ...group,
    phrases: group.phrases.map((p) => {
      const f = FEMININE[p.label]
      return f ? { ...p, label: f } : p
    }),
  }
}
