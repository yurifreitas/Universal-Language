import { Fragment, useState } from 'react'
import type { Card, Settings } from '../types'
import {
  celula,
  COMPARACOES,
  DEZENAS,
  DIGITOS,
  DINHEIRO,
  FORMAS_GEO,
  FRACOES,
  horaEscrita,
  horaFalada,
  OPERADORES,
  QUANTIDADES,
  porcentagemDe,
  PORCENTAGENS,
  reais,
  reaisFalado,
  resultado,
  sequenciaNumerica,
  SIMBOLOS,
  tabuada,
  type Operador,
} from '../lib/matematica'
import { speak } from '../lib/speech'
import { Faixa } from './Faixa'
import { Dialog } from './Dialog'

interface Props {
  settings: Settings
  /** Põe a célula na barra da frase — o mesmo caminho de um card da prancha. */
  onPick: (card: Card) => void
  onClose: () => void
}

type Aba = 'numeros' | 'conta' | 'dinheiro' | 'hora' | 'simbolos' | 'fracoes' | 'tabuada' | 'formas' | 'sequencias'

const ABAS: { id: Aba; icone: string; nome: string }[] = [
  { id: 'numeros', icone: '🔢', nome: 'Números' },
  { id: 'conta', icone: '➕', nome: 'Contas' },
  { id: 'dinheiro', icone: '💵', nome: 'Dinheiro' },
  { id: 'hora', icone: '🕒', nome: 'Horas' },
  { id: 'simbolos', icone: '✳️', nome: 'Símbolos' },
]

/** Só aparecem com o módulo avançado ligado nos ajustes. */
const ABAS_AVANCADAS: { id: Aba; icone: string; nome: string }[] = [
  { id: 'fracoes', icone: '½', nome: 'Frações' },
  { id: 'tabuada', icone: '✖️', nome: 'Tabuada' },
  { id: 'formas', icone: '⬡', nome: 'Formas' },
  { id: 'sequencias', icone: '📈', nome: 'Sequências' },
]

const HORAS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTOS = [0, 15, 30, 45]

/**
 * Números e contas.
 *
 * Falta de fala não é falta de matemática — mas uma prancha sem número trata as
 * duas como a mesma coisa, e isso exclui a pessoa da escola e do comércio. Ver
 * `lib/matematica.ts` para as duas decisões de fundo (algarismo em vez de
 * desenho, e tudo entra na frase).
 *
 * Toda célula daqui vai para a **barra da frase**, igual a um card da prancha:
 * "eu quero 3 pão" é uma frase montada, não um resultado de calculadora. A
 * calculadora existe à parte, na aba Contas, para quando a conta é o assunto.
 */
export function MathPanel({ settings, onPick, onClose }: Props) {
  const [aba, setAba] = useState<Aba>('numeros')

  /* ----------------------------------------------------------- calculadora */
  const [acumulado, setAcumulado] = useState<number | null>(null)
  const [operador, setOperador] = useState<Operador | null>(null)
  const [digitando, setDigitando] = useState('')
  const [fim, setFim] = useState<string | null>(null)

  const mostrador = fim ?? (digitando || (acumulado !== null ? resultado(acumulado) : '0'))

  const teclar = (d: string) => {
    setFim(null)
    // Um zero à esquerda não é número: "07" nunca deve aparecer no mostrador.
    setDigitando((x) => (x === '0' ? d : (x + d).slice(0, 9)))
  }

  const escolherOperador = (op: Operador) => {
    const valor = digitando ? Number(digitando) : acumulado
    if (valor === null) return
    setAcumulado(acumulado !== null && operador && digitando ? operador.aplica(acumulado, valor) : valor)
    setOperador(op)
    setDigitando('')
    setFim(null)
  }

  const calcular = () => {
    if (acumulado === null || !operador || !digitando) return
    const r = operador.aplica(acumulado, Number(digitando))
    const texto = resultado(r)
    setFim(texto)
    setAcumulado(Number.isFinite(r) ? r : null)
    setOperador(null)
    setDigitando('')
    speak(`${acumulado} ${operador.nome} ${digitando} é ${texto}`, settings)
  }

  const limpar = () => {
    setAcumulado(null)
    setOperador(null)
    setDigitando('')
    setFim(null)
  }

  /* -------------------------------------------------------------- dinheiro */
  const [carteira, setCarteira] = useState<number[]>([])
  const somaCarteira = carteira.reduce((s, c) => s + c, 0)

  /* ------------------------------------------------------------------ hora */
  const [hora, setHora] = useState(3)
  const [minuto, setMinuto] = useState(0)

  /* --------------------------------------------------------------- avançado */
  const [fracao, setFracao] = useState(FRACOES[0]!)
  const [tab, setTab] = useState(2)
  const [pct, setPct] = useState(50)
  const [pctDe, setPctDe] = useState(80)
  const [seqInicio, setSeqInicio] = useState(2)
  const [seqPasso, setSeqPasso] = useState(2)
  const [seqRevelado, setSeqRevelado] = useState(false)
  const seq = sequenciaNumerica(seqInicio, seqPasso)

  const abas = [...ABAS, ...(settings.matAvancada ? ABAS_AVANCADAS : [])]

  /** Célula de texto: fala e entra na frase, como qualquer card. */
  const pegar = (label: string, fala?: string) => {
    speak(fala ?? label, settings)
    onPick(celula(label))
  }

  return (
    <Dialog title="Números e contas" onClose={onClose}>
      <div className="shell mat">
        <Faixa className="phrases__tabs" nome="áreas" role="tablist" ariaLabel="Áreas de matemática">
          {abas.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              className={`tab ${aba === a.id ? 'tab--active' : ''}`}
              onClick={() => setAba(a.id)}
            >
              <span className="tab__icon" aria-hidden="true">
                {a.icone}
              </span>
              <span className="tab__name">{a.nome}</span>
            </button>
          ))}
        </Faixa>

        {/* ------------------------------------------------------- números */}
        {aba === 'numeros' && (
          <div className="mat__secoes">
            <section className="mat__secao">
              <h3>Algarismos</h3>
              <div className="mat__grade mat__grade--digitos">
                {DIGITOS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    className="mat__tecla"
                    onClick={() => pegar(c.label)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="mat__secao">
              <h3>Dezenas</h3>
              <div className="mat__grade">
                {DEZENAS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    className="mat__tecla mat__tecla--media"
                    onClick={() => pegar(c.label)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="mat__secao">
              <h3>Quantidade em palavra</h3>
              <p className="settings__note">
                "Quero <strong>dois</strong> pães" é o que sai da boca; "quero 2 pães" é o que se
                escreve. As duas linhas dizem a mesma coisa em voz alta — quem ainda não lê usa
                esta.
              </p>
              <div className="mat__grade mat__grade--palavras">
                {QUANTIDADES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    className="mat__tecla mat__tecla--palavra"
                    onClick={() => pegar(c.label)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="mat__secao">
              <h3>Comparar</h3>
              <div className="mat__grade">
                {COMPARACOES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    className="mat__tecla mat__tecla--media"
                    onClick={() => pegar(c.label, (c as { fala?: string }).fala)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* -------------------------------------------------------- contas */}
        {aba === 'conta' && (
          <div className="mat__calc">
            <output className="mat__visor" aria-live="polite">
              <span className="mat__visor-conta">
                {acumulado !== null && operador
                  ? `${resultado(acumulado)} ${operador.sinal}`
                  : ' '}
              </span>
              <strong>{mostrador}</strong>
            </output>

            {/* Layout de calculadora de verdade: três colunas de dígitos e a
                coluna dos operadores à direita, na ordem que a mão já conhece.
                As teclas são listadas linha a linha de propósito — uma grade
                alimentada por um array de dez dígitos embaralhava tudo assim
                que a coluna de operadores entrou. */}
            <div className="mat__teclado">
              {[
                ['7', '8', '9'],
                ['4', '5', '6'],
                ['1', '2', '3'],
              ].map((linha, i) => (
                <Fragment key={linha.join('')}>
                  {linha.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="mat__tecla"
                      onClick={() => teclar(d)}
                    >
                      {d}
                    </button>
                  ))}
                  {OPERADORES[i] && (
                    <button
                      type="button"
                      className={`mat__tecla mat__tecla--op ${
                        operador?.sinal === OPERADORES[i]!.sinal ? 'mat__tecla--op-on' : ''
                      }`}
                      aria-label={OPERADORES[i]!.nome}
                      onClick={() => escolherOperador(OPERADORES[i]!)}
                    >
                      {OPERADORES[i]!.sinal}
                    </button>
                  )}
                </Fragment>
              ))}

              <button
                type="button"
                className="mat__tecla mat__tecla--zero"
                onClick={() => teclar('0')}
              >
                0
              </button>
              <button type="button" className="mat__tecla mat__tecla--acao" onClick={limpar}>
                C
              </button>
              {OPERADORES[3] && (
                <button
                  type="button"
                  className={`mat__tecla mat__tecla--op ${
                    operador?.sinal === OPERADORES[3]!.sinal ? 'mat__tecla--op-on' : ''
                  }`}
                  aria-label={OPERADORES[3]!.nome}
                  onClick={() => escolherOperador(OPERADORES[3]!)}
                >
                  {OPERADORES[3]!.sinal}
                </button>
              )}

              <button
                type="button"
                className="mat__tecla mat__tecla--igual"
                onClick={calcular}
                aria-label="Calcular"
              >
                =
              </button>
            </div>

            <div className="mat__calc-acoes">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => speak(mostrador, settings)}
              >
                🔊 Falar o número
              </button>
              <button
                type="button"
                className="btn btn--speak"
                disabled={mostrador === 'não dá'}
                onClick={() => onPick(celula(mostrador))}
              >
                ↑ Pôr na frase
              </button>
            </div>
            <p className="settings__note">
              A conta fica aqui; o <strong>resultado</strong> é que vai para a frase. Assim dá para
              dizer "são 12 reais" sem transformar a barra da frase numa calculadora.
            </p>
          </div>
        )}

        {/* ------------------------------------------------------ dinheiro */}
        {aba === 'dinheiro' && (
          <div className="mat__secoes">
            <section className="mat__secao">
              <h3>Juntar dinheiro</h3>
              <p className="settings__note">
                Toque nas notas e moedas para somar. Serve para conferir troco no balcão sem
                precisar da palavra certa na hora — e para treinar antes de precisar.
              </p>
              <div className="mat__grade">
                {DINHEIRO.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    className={`mat__cedula ${d.moeda ? 'mat__cedula--moeda' : ''}`}
                    onClick={() => {
                      setCarteira((c) => [...c, d.centavos])
                      speak(reaisFalado(d.centavos), settings)
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="mat__secao">
              <div className="mat__total">
                <span className="mat__total-rotulo">Total</span>
                <strong>{reais(somaCarteira)}</strong>
                <span className="mat__total-itens">
                  {carteira.length} {carteira.length === 1 ? 'peça' : 'peças'}
                </span>
              </div>
              <div className="mat__calc-acoes">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => speak(reaisFalado(somaCarteira), settings)}
                >
                  🔊 Falar o total
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={carteira.length === 0}
                  onClick={() => setCarteira((c) => c.slice(0, -1))}
                >
                  ↺ Tirar a última
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={carteira.length === 0}
                  onClick={() => setCarteira([])}
                >
                  Limpar
                </button>
                <button
                  type="button"
                  className="btn btn--speak"
                  disabled={carteira.length === 0}
                  onClick={() => onPick(celula(reais(somaCarteira)))}
                >
                  ↑ Pôr na frase
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ---------------------------------------------------------- hora */}
        {aba === 'hora' && (
          <div className="mat__secoes">
            <section className="mat__secao">
              <h3>Que horas</h3>
              <div className="mat__hora-visor">
                <strong>{horaEscrita(hora, minuto)}</strong>
                <span>{horaFalada(hora, minuto)}</span>
              </div>
              <p className="settings__note">
                A hora é dita <strong>como se fala</strong> — "três e meia", "quinze para as
                quatro" —, e não como o relógio digital escreve. É a forma que a pessoa vai ouvir
                de quem combina o horário com ela.
              </p>
            </section>

            <section className="mat__secao">
              <h3>Hora</h3>
              <div className="mat__grade">
                {HORAS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`mat__tecla mat__tecla--media ${hora === h ? 'mat__tecla--on' : ''}`}
                    onClick={() => setHora(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </section>

            <section className="mat__secao">
              <h3>Minuto</h3>
              <div className="mat__grade">
                {MINUTOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`mat__tecla mat__tecla--media ${
                      minuto === m ? 'mat__tecla--on' : ''
                    }`}
                    onClick={() => setMinuto(m)}
                  >
                    :{String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
              <div className="mat__calc-acoes">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => speak(horaFalada(hora, minuto), settings)}
                >
                  🔊 Falar a hora
                </button>
                <button
                  type="button"
                  className="btn btn--speak"
                  onClick={() => onPick(celula(horaEscrita(hora, minuto)))}
                >
                  ↑ Pôr na frase
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ================================================== avançado ==== */}

        {/* Fração desenhada, e não escrita. "1/4" é notação; o pedaço da roda é
            a ideia. Quem entende a roda entende a notação depois — o caminho
            contrário quase nunca funciona. */}
        {aba === 'fracoes' && (
          <div className="mat__secoes">
            <section className="mat__secao">
              <h3>A parte e o inteiro</h3>
              <div className="mat__fracao">
                <span
                  className="mat__roda"
                  style={
                    { '--parte': `${(fracao.cima / fracao.baixo) * 100}%` } as React.CSSProperties
                  }
                  role="img"
                  aria-label={`${fracao.cima} de ${fracao.baixo}`}
                />
                <div className="mat__fracao-texto">
                  <strong>
                    {fracao.cima}/{fracao.baixo}
                  </strong>
                  <span>{fracao.nome}</span>
                  <small>{Math.round((fracao.cima / fracao.baixo) * 100)}% do inteiro</small>
                </div>
              </div>
              <div className="mat__grade mat__grade--palavras">
                {FRACOES.map((f) => (
                  <button
                    key={f.nome}
                    type="button"
                    className={`mat__tecla mat__tecla--palavra ${
                      f.nome === fracao.nome ? 'mat__tecla--on' : ''
                    }`}
                    onClick={() => {
                      setFracao(f)
                      speak(f.nome, settings)
                    }}
                  >
                    {f.cima}/{f.baixo}
                  </button>
                ))}
              </div>
              <div className="mat__calc-acoes">
                <button
                  type="button"
                  className="btn btn--speak"
                  onClick={() => onPick(celula(`${fracao.cima}/${fracao.baixo}`))}
                >
                  ↑ Pôr na frase
                </button>
              </div>
            </section>

            <section className="mat__secao">
              <h3>Porcentagem</h3>
              <p className="settings__note">
                A conta do desconto e da bateria. O resultado é dito por extenso — "30 por cento
                de 80 é 24" — porque é assim que ele é usado numa conversa.
              </p>
              <div className="mat__grade">
                {PORCENTAGENS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`mat__tecla mat__tecla--media ${n === pct ? 'mat__tecla--on' : ''}`}
                    onClick={() => setPct(n)}
                  >
                    {n}%
                  </button>
                ))}
              </div>
              <label className="field">
                <span>De quanto — {pctDe}</span>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={pctDe}
                  onChange={(e) => setPctDe(Number(e.target.value))}
                />
              </label>
              <div className="mat__total">
                <span className="mat__total-rotulo">
                  {pct}% de {pctDe}
                </span>
                <strong>{resultado(porcentagemDe(pct, pctDe))}</strong>
              </div>
              <div className="mat__calc-acoes">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() =>
                    speak(
                      `${pct} por cento de ${pctDe} é ${resultado(porcentagemDe(pct, pctDe))}`,
                      settings,
                    )
                  }
                >
                  🔊 Falar a conta
                </button>
                <button
                  type="button"
                  className="btn btn--speak"
                  onClick={() => onPick(celula(resultado(porcentagemDe(pct, pctDe))))}
                >
                  ↑ Pôr na frase
                </button>
              </div>
            </section>
          </div>
        )}

        {aba === 'tabuada' && (
          <div className="mat__secoes">
            <section className="mat__secao">
              <h3>Tabuada do {tab}</h3>
              <div className="mat__grade">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`mat__tecla mat__tecla--media ${n === tab ? 'mat__tecla--on' : ''}`}
                    onClick={() => setTab(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </section>
            <section className="mat__secao">
              {/* Cada linha fala e entra na frase: a tabuada aqui não é para
                  decorar, é para consultar — que é o que ela faz na vida. */}
              <ul className="mat__tabuada">
                {tabuada(tab).map((l) => (
                  <li key={l.b}>
                    <button
                      type="button"
                      className="mat__linha-tab"
                      onClick={() => {
                        speak(`${l.a} vezes ${l.b} é ${l.r}`, settings)
                        onPick(celula(String(l.r)))
                      }}
                    >
                      <span>
                        {l.a} × {l.b}
                      </span>
                      <strong>{l.r}</strong>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {aba === 'formas' && (
          <div className="mat__secoes">
            <section className="mat__secao">
              <h3>Formas</h3>
              <p className="settings__note">
                Desenhadas por geometria, não por imagem — uma forma é o número de lados, e é isso
                que precisa aparecer. Toque para dizer o nome e pôr na frase.
              </p>
              <div className="mat__formas">
                {FORMAS_GEO.map((f) => (
                  <button
                    key={f.nome}
                    type="button"
                    className="mat__forma"
                    onClick={() => {
                      speak(f.nome, settings)
                      onPick(celula(f.nome))
                    }}
                  >
                    <span
                      className="mat__forma-desenho"
                      style={{ clipPath: f.clip } as React.CSSProperties}
                      aria-hidden="true"
                    />
                    <span className="mat__forma-nome">{f.nome}</span>
                    <small>{f.lados === 0 ? 'sem lados' : `${f.lados} lados`}</small>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {aba === 'sequencias' && (
          <div className="mat__secoes">
            <section className="mat__secao">
              <h3>Qual vem depois</h3>
              <p className="settings__note">
                A mesma habilidade do módulo de <strong>Padrões</strong>, do outro lado: lá a
                regra é de forma e cor, aqui é de quantidade. Quem não enxerga uma às vezes
                enxerga a outra — por isso existem as duas.
              </p>
              <ol className="mat__sequencia">
                {seq.termos.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
                <li className="mat__sequencia-vago">{seqRevelado ? seq.proximo : '?'}</li>
              </ol>
              <p className="settings__note">
                {seqRevelado ? `A regra: ${seq.regra}.` : 'Olhe a fila e pense antes de revelar.'}
              </p>
              <div className="mat__calc-acoes">
                <button
                  type="button"
                  className="btn btn--speak"
                  onClick={() => {
                    setSeqRevelado(true)
                    speak(`${seq.proximo}. A regra é ${seq.regra}.`, settings)
                  }}
                >
                  Revelar
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setSeqRevelado(false)
                    setSeqInicio(1 + Math.floor(Math.random() * 9))
                    setSeqPasso([2, 3, 5, 10, -2, -3][Math.floor(Math.random() * 6)] ?? 2)
                  }}
                >
                  ↻ Outra fila
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ------------------------------------------------------ símbolos */}
        {aba === 'simbolos' && (
          <div className="mat__secoes">
            <section className="mat__secao">
              <h3>Símbolos e pontuação</h3>
              <p className="settings__note">
                Não são enfeite: <strong>?</strong> muda uma frase inteira de sentido, e quem
                escreve num aplicativo de mensagem precisa deles.
              </p>
              <div className="mat__grade">
                {SIMBOLOS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    className="mat__tecla mat__tecla--media"
                    aria-label={c.fala ?? c.label}
                    onClick={() => pegar(c.label, c.fala)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </Dialog>
  )
}
