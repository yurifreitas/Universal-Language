import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * Cerca de erro.
 *
 * Um erro de render em React sem cerca desmonta a arvore inteira e deixa **tela
 * branca**. Em quase todo app isso e um incomodo. Aqui e outra coisa: o
 * aparelho e a voz da pessoa, e uma tela branca no meio de uma consulta medica
 * ou de uma crise a deixa sem como dizer "estou com dor".
 *
 * Por isso a tela de falha nao e um "algo deu errado" com botao de recarregar.
 * Ela **continua falando**: as frases que menos podem esperar ficam ali,
 * funcionando com a sintese de voz do sistema, que nao depende de nada que
 * possa ter quebrado no app.
 *
 * A ideia da cerca por tela veio do ycode (`web/src/components/ErrorBoundary.tsx`),
 * onde ela serve para um painel quebrado nao derrubar o editor. O que muda aqui
 * e o conteudo do fallback — la basta "tentar de novo", aqui o minimo e voz.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  private retry = () => this.setState({ error: null })

  /**
   * Fala sem passar por `lib/speech`: se o que quebrou foi justamente aquele
   * modulo, importar dele aqui repetiria a falha. A Web Speech API crua e o
   * caminho com menos partes moveis.
   */
  private say(text: string) {
    try {
      if (!('speechSynthesis' in window)) return
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'pt-BR'
      u.rate = 0.95
      speechSynthesis.speak(u)
    } catch {
      /* sem voz disponivel: o texto na tela ainda serve para apontar */
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const urgentes = [
      'Preciso de ajuda.',
      'Estou com dor.',
      'Preciso ir ao banheiro.',
      'Preciso de uma pausa.',
      'Chama a minha mãe.',
      'Sim.',
      'Não.',
    ]

    return (
      <div className="crash">
        <div className="crash__box">
          <h1 className="crash__title">O app travou — mas você continua podendo falar</h1>
          <p className="crash__hint">
            Toque numa frase para o aparelho dizer em voz alta. Se ninguém estiver por perto,
            mostre esta tela.
          </p>

          <div className="crash__grid">
            {urgentes.map((frase) => (
              <button
                key={frase}
                type="button"
                className="crash__phrase"
                onClick={() => this.say(frase)}
              >
                {frase}
              </button>
            ))}
          </div>

          <div className="crash__actions">
            <button type="button" className="btn btn--speak" onClick={this.retry}>
              Tentar voltar
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => window.location.reload()}
            >
              Recarregar o app
            </button>
          </div>

          {/* A mensagem tecnica fica por ultimo e discreta: serve a quem for
              relatar o problema, e nao a quem esta tentando se comunicar. */}
          <details className="crash__details">
            <summary>Detalhe técnico</summary>
            <code>{error.message}</code>
          </details>
        </div>
      </div>
    )
  }
}
