import { Dialog } from './Dialog'

interface Props {
  onClose: () => void
}

const KEYS: { keys: string; what: string }[] = [
  { keys: '← ↑ → ↓', what: 'Mover entre os cards' },
  { keys: 'Home / End', what: 'Primeiro / último card' },
  { keys: 'Enter ou Espaço', what: 'Falar a frase montada' },
  { keys: 'Backspace', what: 'Apagar o último card' },
  { keys: '1 … 9', what: 'Trocar de prancha' },
  { keys: 'B', what: 'Abrir a busca' },
  { keys: 'Esc', what: 'Fechar / interromper a varredura' },
  { keys: 'Toque longo', what: 'Falar o card sem inseri-lo na frase' },
]

export function HelpOverlay({ onClose }: Props) {
  return (
    <Dialog title="Atalhos e acesso" onClose={onClose}>
      <div className="shell settings">
          <section className="settings__group">
            <h3>Teclado</h3>
            <dl className="keys">
              {KEYS.map((k) => (
                <div className="keys__row" key={k.keys}>
                  <dt>
                    <kbd>{k.keys}</kbd>
                  </dt>
                  <dd>{k.what}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="settings__group">
            <h3>Varredura</h3>
            <p className="settings__note">
              Para quem não consegue apontar, a varredura percorre a grade sozinha: primeiro
              destaca cada <strong>linha</strong>, e depois de um acionamento passa a destacar
              cada <strong>célula</strong> daquela linha. O segundo acionamento seleciona.
            </p>
            <p className="settings__note">
              Acione com <kbd>Espaço</kbd> ou <kbd>Enter</kbd> — é assim que a maioria dos
              switches comerciais se apresenta ao sistema. Se a linha terminar sem acionamento,
              a varredura volta às linhas sozinha, para que um erro não prenda a pessoa.
              A velocidade se ajusta em Ajustes; o valor certo é individual e clínico.
            </p>
          </section>

          <section className="settings__group">
            <h3>Por que as células não se movem</h3>
            <p className="settings__note">
              O app nunca reordena os cards por frequência de uso, e não coloca "recentes" no
              início. O aprendizado de uma prancha se apoia em memória motora: a pessoa aprende
              que "quero" fica na terceira célula da primeira linha. Mover a célula apaga esse
              aprendizado. Favoritos, por isso, vivem numa prancha própria.
            </p>
          </section>
      </div>
    </Dialog>
  )
}
