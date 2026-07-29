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
  { keys: 'F', what: 'Abrir as frases prontas' },
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
            <h3>Roteiros e edição</h3>
            <p className="settings__note">
              <strong>Roteiros</strong> guardam a ordem do que se costuma dizer numa situação que
              se repete — médico, padaria, chegar na escola. Nenhum passo é obrigatório: tocar
              qualquer um fala e avança a marcação, e sair não exige nada. Roteiros próprios são
              montados com as frases que você salvou e as que disse há pouco.
            </p>
            <p className="settings__note">
              <strong>Editar</strong> renomeia, esconde, acrescenta e move cards, e cria pranchas
              suas. As pranchas de fábrica não são alteradas — tudo é uma camada por cima, e
              "restaurar" desfaz. Renomear é a edição que mais compensa: o pictograma genérico com
              o nome que a família usa de verdade.
            </p>

            <h3>Frases prontas</h3>
            <p className="settings__note">
              Um toque fala a frase inteira. Existem porque montar card a card leva tempo, e a
              diferença pesa justamente quando a mensagem não pode esperar — dor, sobrecarga,
              pedido de ajuda. Por isso o grupo <strong>Urgente</strong> vem primeiro.
            </p>
            <p className="settings__note">
              O grupo <strong>Me entenderam errado</strong> é o de comunicação de reparo: sem
              essas frases, um mal-entendido só termina quando o interlocutor decide que
              terminou.
            </p>
            <p className="settings__note">
              A frase que você acabou de montar pode ser salva em <strong>Minhas frases</strong>,
              e as últimas ditas ficam em <strong>Disse agora há pouco</strong> — repetir é uma
              das coisas mais frequentes numa conversa real.
            </p>
          </section>

          <section className="settings__group">
            <h3>Marcadores gramaticais</h3>
            <p className="settings__note">
              Com "compor frase em português" ligado, a faixa abaixo da frase traz os
              marcadores: <strong>tempo</strong> (automático, passado, agora, futuro),{' '}
              <strong>não</strong>, <strong>?</strong> (pergunta), <strong>…ndo</strong>{' '}
              (acontecendo agora), <strong>✋</strong> (pedido) e <strong>+1</strong> (plural).
              Eles valem para a frase atual e somem quando ela é limpa.
            </p>
            <p className="settings__note">
              O tempo automático segue as próprias palavras: escolher ONTEM já põe a frase no
              passado, escolher AMANHÃ no futuro. Os marcadores existem para os casos em que não
              há palavra de tempo na frase.
            </p>
            <p className="settings__note">
              Na frase falada, o que o app acrescentou aparece <em>pontilhado</em>, e a palavra
              que mudou de forma aparece <em>sublinhada</em>. Nada disso altera os cards
              escolhidos — a frase literal volta desligando o ajuste.
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
