import type { Board } from '../types'
import {
  diasPraticados,
  letraDoDia,
  META_DIARIA,
  nivelDe,
  pontosDe,
  proximoNivel,
  recado,
  semana,
  sequencia,
  total,
  hoje,
  type Diario,
} from '../lib/diario'
import { seloDe, vezes, type ScriptStats } from '../lib/ensaio'
import { BUILT_IN_SCRIPTS, scriptIcon, type Script } from '../lib/scripts'
import { Pictogram } from './Pictogram'
import { Dialog } from './Dialog'

interface Props {
  diario: Diario
  /** Rodadas do jogo por prancha. */
  jogoStats: ScriptStats
  /** Ensaios por roteiro. */
  scriptStats: ScriptStats
  boards: Board[]
  scripts: Script[]
  onClose: () => void
}

/**
 * Meu progresso.
 *
 * Reúne num lugar só o que estava espalhado: pontos do dia, sequência, semana,
 * nível, e os selos de cada roteiro e de cada prancha.
 *
 * **Tudo aqui é de PRÁTICA, nada é de fala.** O painel não sabe quantas frases
 * a pessoa disse, e é de propósito — ver a linha que `lib/diario.ts` não cruza.
 * Por isso também não há nada a perder nesta tela: não existe ponto negativo,
 * nem sequência que zera, nem selo que regride.
 */
export function ProgressPanel({
  diario,
  jogoStats,
  scriptStats,
  boards,
  scripts,
  onClose,
}: Props) {
  const dia = hoje()
  const pontosHoje = pontosDe(diario, dia)
  const acumulado = total(diario)
  const nivel = nivelDe(acumulado)
  const falta = proximoNivel(acumulado)
  const seq = sequencia(diario)
  const dias = semana(diario)
  const teto = Math.max(META_DIARIA, ...dias.map((d) => d.pontos))
  /** Porcentagem da meta, com teto em 100 para o anel não passar da volta. */
  const pct = Math.min(100, Math.round((pontosHoje / META_DIARIA) * 100))

  const todosRoteiros = [...BUILT_IN_SCRIPTS, ...scripts].filter(
    (s) => vezes(scriptStats, s.id) > 0,
  )
  const pranchasJogadas = boards.filter((b) => vezes(jogoStats, b.id) > 0)

  return (
    <Dialog title="Meu progresso" onClose={onClose}>
      <div className="shell progresso-painel">
        {/* ------------------------------------------------------- hoje */}
        <section className="prog-hoje">
          {/* Anel de meta: um `conic-gradient` girado pela variável `--pct`.
              Sem SVG e sem animação de rotação — a barra que enche é o único
              movimento, e ele é curto. */}
          <div
            className="prog-anel"
            style={{ '--pct': `${pct}%` } as React.CSSProperties}
            role="img"
            aria-label={`${pontosHoje} de ${META_DIARIA} pontos hoje`}
          >
            <div className="prog-anel__miolo">
              <strong>{pontosHoje}</strong>
              <small>de {META_DIARIA}</small>
            </div>
          </div>

          <div className="prog-hoje__texto">
            <h3 className="prog-titulo">Hoje</h3>
            <p className="prog-recado">{recado(pontosHoje, seq)}</p>
            <div className="prog-chips">
              <span className="prog-chip prog-chip--nivel">
                <span aria-hidden="true">{nivel.icone}</span> {nivel.nome}
              </span>
              {seq > 0 && (
                <span className="prog-chip">
                  🔥 {seq} {seq === 1 ? 'dia seguido' : 'dias seguidos'}
                </span>
              )}
              <span className="prog-chip">{acumulado} pontos no total</span>
            </div>
            {falta && (
              <p className="settings__note">
                Mais {falta.faltam} {falta.faltam === 1 ? 'ponto' : 'pontos'} para{' '}
                <strong>
                  {falta.nivel.icone} {falta.nivel.nome}
                </strong>
                .
              </p>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------ semana */}
        <section className="settings__group">
          <h3>Últimos 7 dias</h3>
          <ol className="prog-semana">
            {dias.map((d) => (
              <li key={d.dia} className={`prog-dia ${d.dia === dia ? 'prog-dia--hoje' : ''}`}>
                <span className="prog-dia__barra" aria-hidden="true">
                  {/* Altura mínima de 4px mesmo em zero: uma coluna invisível
                      lê como dado ausente, e "não praticou" é um dado. */}
                  <span
                    style={{
                      height: `${d.pontos === 0 ? 4 : Math.max(8, (d.pontos / teto) * 100)}${
                        d.pontos === 0 ? 'px' : '%'
                      }`,
                    }}
                    className={d.pontos >= META_DIARIA ? 'prog-dia__meta' : ''}
                  />
                </span>
                <span className="prog-dia__letra" aria-hidden="true">
                  {letraDoDia(d.dia)}
                </span>
                <span className="sr-only">
                  {d.dia}: {d.pontos} pontos
                </span>
              </li>
            ))}
          </ol>
          <p className="settings__note">
            A linha da meta é {META_DIARIA} pontos: uma rodada do jogo e um ensaio já passam dela.
            Faltar um dia não zera a sequência — só dois dias seguidos recomeçam a conta.
          </p>
        </section>

        {/* ------------------------------------------------------- selos */}
        <section className="settings__group">
          <h3>Roteiros ensaiados</h3>
          {todosRoteiros.length === 0 ? (
            <p className="settings__note">
              Nenhum roteiro ensaiado ainda. Abra <strong>Roteiros</strong> e toque em Ensaiar.
            </p>
          ) : (
            <ul className="prog-lista">
              {todosRoteiros.map((s) => {
                const n = vezes(scriptStats, s.id)
                return (
                  <li key={s.id} className="prog-item">
                    <Pictogram card={{ id: scriptIcon(s), label: s.name }} />
                    <span className="prog-item__nome">{s.name}</span>
                    <span className="prog-item__selo">
                      <span aria-hidden="true">{seloDe(n)?.icone}</span> {n}×
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="settings__group">
          <h3>Pranchas no jogo de achar</h3>
          {pranchasJogadas.length === 0 ? (
            <p className="settings__note">
              Nenhuma rodada completa ainda. O botão <strong>Achar</strong> começa uma.
            </p>
          ) : (
            <ul className="prog-lista">
              {pranchasJogadas.map((b) => {
                const n = vezes(jogoStats, b.id)
                return (
                  <li key={b.id} className="prog-item">
                    <span className="prog-item__icone" aria-hidden="true">
                      {b.icon}
                    </span>
                    <span className="prog-item__nome">{b.name}</span>
                    <span className="prog-item__selo">
                      <span aria-hidden="true">{seloDe(n)?.icone}</span> {n}×
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <p className="settings__note">
          Estes pontos contam <strong>prática</strong> — o jogo de achar a palavra e o ensaio de
          roteiro. <strong>Falar não pontua</strong>, e isso é de propósito: no momento em que
          dizer alguma coisa valesse ponto, a pessoa passaria a dizer coisas para pontuar. O
          aparelho é voz, não tarefa. Você praticou em {diasPraticados(diario)}{' '}
          {diasPraticados(diario) === 1 ? 'dia' : 'dias'} até agora.
        </p>
      </div>
    </Dialog>
  )
}
