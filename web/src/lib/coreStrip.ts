import type { Card } from '../types'

/**
 * Faixa de palavras-nucleo, presente em TODAS as pranchas, sempre no mesmo
 * lugar da tela.
 *
 * POR QUE ISTO EXISTE
 *
 * O app tinha uma prancha "Nucleo" separada. Para dizer "quero mais bolo" era
 * preciso: Nucleo → tocar QUERO → Comida → tocar BOLO → Nucleo → tocar MAIS.
 * Tres trocas de prancha para tres palavras.
 *
 * A literatura de planejamento motor (LAMP) identifica exatamente esse custo:
 * o atraso entre o movimento e a fala introduz um elemento de temporizacao que
 * atrapalha a associacao, e e essa associacao que constroi fluencia. E os
 * sistemas comerciais grandes — Proloquo2Go/Crescendo, LAMP Words for Life,
 * Grid 3 — convergem todos para a mesma solucao: **espelhar as palavras-nucleo
 * na mesma posicao em toda pagina de vocabulario**.
 *
 * POR QUE UMA FAIXA, E NAO CELULAS DENTRO DA GRADE
 *
 * Porque acrescentar celulas no inicio de cada prancha deslocaria TODAS as
 * outras — que e a coisa que o LAMP proibe. A faixa fica acima da grade, em
 * posicao fixa, e nenhuma celula existente se move um pixel.
 *
 * A escolha das seis: sao as de maior reutilizacao e as que mais aparecem
 * combinadas com vocabulario de conteudo. Nao ha substantivo aqui de
 * proposito — nucleo e o que serve a qualquer assunto.
 *
 * Ver REFERENCES.md secao 2 e LANGUAGE-SYSTEMS.md secao 5.
 */
export const CORE_STRIP: Card[] = [
  { id: 6632, label: 'eu' },
  { id: 5441, label: 'querer' },
  { id: 3220, label: 'mais' },
  { id: 5526, label: 'não' },
  { id: 28429, label: 'acabou' },
  { id: 32648, label: 'ajudar' },
]
