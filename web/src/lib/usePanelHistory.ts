import { useEffect, useRef } from 'react'

/**
 * Painel aberto entra no historico do navegador.
 *
 * O PROBLEMA
 *
 * Em Android, o gesto e o botao "voltar" sao a forma universal de sair de uma
 * tela. Num app web que abre paineis por estado de React, esse gesto **fecha o
 * app inteiro** — com a frase montada dentro. A pessoa perde o que estava
 * dizendo por fazer o que o sistema inteiro ensinou a fazer.
 *
 * Numa prancha instalada como PWA isso e pior: nao ha barra de endereco nem
 * aba, entao "voltar" e a unica saida visivel, e ela mata a sessao.
 *
 * COMO FUNCIONA
 *
 * Abrir painel empurra uma entrada de historico; voltar dispara `popstate` e o
 * painel fecha. Fechar pelo botao ✕ desfaz a entrada, para o historico nao
 * acumular uma pilha de estados vazios — senao seriam necessarios cinco
 * "voltar" para sair de um app onde se abriu cinco paineis.
 *
 * O `ignore` evita o laco: `history.back()` tambem dispara `popstate`, e sem a
 * guarda o fechamento pelo ✕ seria interpretado como um segundo "voltar".
 */
export function usePanelHistory(isOpen: boolean, close: () => void): void {
  const pushed = useRef(false)
  const ignore = useRef(false)

  useEffect(() => {
    if (isOpen && !pushed.current) {
      pushed.current = true
      history.pushState({ painel: true }, '')
    } else if (!isOpen && pushed.current) {
      pushed.current = false
      if (!ignore.current) {
        ignore.current = true
        history.back()
      } else {
        ignore.current = false
      }
    }
  }, [isOpen])

  useEffect(() => {
    const onPop = () => {
      if (!pushed.current) return
      // Veio do botao voltar: a entrada ja saiu do historico sozinha.
      pushed.current = false
      ignore.current = true
      close()
      // Solta a guarda no proximo ciclo, depois que o efeito de cima rodou.
      queueMicrotask(() => {
        ignore.current = false
      })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [close])
}
