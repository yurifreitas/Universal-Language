import { useState } from 'react'
import {
  AREAS,
  criar,
  desregistrar,
  leitura,
  MODELOS,
  naSemana,
  registrar,
  semanaDe,
  totalRegistros,
  type Area,
  type Objetivo,
} from '../lib/objetivos'
import { letraDoDia, hoje } from '../lib/diario'
import { Faixa } from './Faixa'
import { Dialog } from './Dialog'

interface Props {
  objetivos: Objetivo[]
  onChange: (objetivos: Objetivo[]) => void
  onClose: () => void
}

/**
 * Objetivos individuais.
 *
 * A tela de quem acompanha: fonoaudiólogo, professor de apoio, família. Ver
 * `lib/objetivos.ts` para o que ela deliberadamente não faz — não avalia, não
 * dá nota, e uma semana vazia sugere rever a meta em vez de cobrar a pessoa.
 *
 * O registro é de UM TOQUE, na tela inicial do painel, ao lado do objetivo.
 * Isso é o desenho inteiro: um registro que exige abrir formulário não é
 * feito no meio de um atendimento, e o que não é registrado na hora vira
 * memória — que é justamente o que o caderno já fazia mal.
 */
export function ObjectivesPanel({ objetivos, onChange, onClose }: Props) {
  const [novo, setNovo] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [area, setArea] = useState<Area>('comunicacao')
  const [criterio, setCriterio] = useState('')
  const [alvo, setAlvo] = useState(7)
  const [abrir, setAbrir] = useState<string | null>(null)
  const [verArquivados, setVerArquivados] = useState(false)
  const [confirmar, setConfirmar] = useState<string | null>(null)

  const dia = hoje()
  const ativos = objetivos.filter((o) => !o.arquivado)
  const arquivados = objetivos.filter((o) => o.arquivado)
  const lista = verArquivados ? arquivados : ativos

  const patch = (id: string, fn: (o: Objetivo) => Objetivo) =>
    onChange(objetivos.map((o) => (o.id === id ? fn(o) : o)))

  const adicionar = (t: string, a: Area, c: string, alvoSemanal: number) => {
    if (!t.trim()) return
    const o = criar(t, a, c, alvoSemanal, objetivos)
    onChange([...objetivos, o])
    setTitulo('')
    setCriterio('')
    setNovo(false)
    setAbrir(o.id)
  }

  return (
    <Dialog title="Objetivos" onClose={onClose}>
      <div className="shell objetivos">
        <p className="settings__note">
          O plano de quem acompanha, dentro do app. Um toque em <strong>+1</strong> registra que
          aconteceu hoje — e registrar na hora é o ponto: o que fica para o fim do dia vira
          memória. Nada aqui dá nota nem avalia ninguém.
        </p>

        <div className="objetivos__topo">
          <Faixa className="phrases__tabs" nome="listas" role="group" ariaLabel="Listas">
            <button
              type="button"
              className={`tab ${!verArquivados ? 'tab--active' : ''}`}
              onClick={() => setVerArquivados(false)}
            >
              <span className="tab__name">Ativos ({ativos.length})</span>
            </button>
            <button
              type="button"
              className={`tab ${verArquivados ? 'tab--active' : ''}`}
              onClick={() => setVerArquivados(true)}
            >
              <span className="tab__name">Concluídos ({arquivados.length})</span>
            </button>
          </Faixa>
          <button
            type="button"
            className={`btn btn--ghost ${novo ? 'btn--saved' : ''}`}
            aria-pressed={novo}
            onClick={() => setNovo((n) => !n)}
          >
            + <span className="btn__text">Novo objetivo</span>
          </button>
        </div>

        {novo && (
          <section className="settings__group objetivos__novo">
            <h3>Novo objetivo</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                adicionar(titulo, area, criterio, alvo)
              }}
            >
              <label className="field">
                <span>O que se espera que aconteça</span>
                <input
                  type="text"
                  value={titulo}
                  placeholder="Pedir usando a prancha em vez de puxar pela mão"
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Como reconhecer que aconteceu</span>
                <input
                  type="text"
                  value={criterio}
                  placeholder="Tocou o card antes de puxar alguém."
                  onChange={(e) => setCriterio(e.target.value)}
                />
              </label>
              <div className="objetivos__par">
                <label className="field">
                  <span>Área</span>
                  <select value={area} onChange={(e) => setArea(e.target.value as Area)}>
                    {AREAS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.icone} {a.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Vezes por semana — {alvo === 0 ? 'sem meta' : alvo}</span>
                  <input
                    type="range"
                    min={0}
                    max={21}
                    step={1}
                    value={alvo}
                    onChange={(e) => setAlvo(Number(e.target.value))}
                  />
                </label>
              </div>
              <p className="settings__note">
                A meta numérica é opcional — zero significa "acompanhar sem contar". Ela existe
                para dar uma leitura da semana, nunca para cobrar.
              </p>
              <button type="submit" className="btn btn--speak btn--wide" disabled={!titulo.trim()}>
                Criar objetivo
              </button>
            </form>

            <div className="roteiros__ou">
              <span>ou comece de um modelo</span>
            </div>
            <div className="objetivos__modelos">
              {MODELOS.map((m) => (
                <button
                  key={m.titulo}
                  type="button"
                  className="objetivos__modelo"
                  onClick={() => adicionar(m.titulo, m.area, m.criterio, m.alvoSemanal)}
                >
                  <span className="objetivos__modelo-area" aria-hidden="true">
                    {AREAS.find((a) => a.id === m.area)?.icone}
                  </span>
                  <span>
                    <strong>{m.titulo}</strong>
                    <small>{m.criterio}</small>
                  </span>
                </button>
              ))}
            </div>
            <p className="settings__note">
              Os modelos não são "o plano certo" — plano é clínico e individual. São começo de
              conversa para quem abre a tela em branco.
            </p>
          </section>
        )}

        {lista.length === 0 ? (
          <p className="settings__note">
            {verArquivados
              ? 'Nenhum objetivo concluído ainda.'
              : 'Nenhum objetivo ativo. Crie um, ou comece de um modelo.'}
          </p>
        ) : (
          <ul className="objetivos__lista">
            {lista.map((o) => {
              const semana = semanaDe(o, dia)
              const feitos = naSemana(o, dia)
              const pct = o.alvoSemanal ? Math.min(100, (feitos / o.alvoSemanal) * 100) : 0
              const aberto = abrir === o.id
              const areaInfo = AREAS.find((a) => a.id === o.area)
              return (
                <li key={o.id} className="objetivo">
                  <div className="objetivo__linha">
                    <span className="objetivo__area" aria-hidden="true">
                      {areaInfo?.icone}
                    </span>
                    <button
                      type="button"
                      className="objetivo__abrir"
                      aria-expanded={aberto}
                      onClick={() => setAbrir(aberto ? null : o.id)}
                    >
                      <strong>{o.titulo}</strong>
                      <small>{leitura(o, dia)}</small>
                    </button>
                    {/* Registrar é o único botão grande da linha: é a ação que
                        acontece no meio do atendimento, com uma mão só. */}
                    <button
                      type="button"
                      className="objetivo__mais"
                      onClick={() => patch(o.id, (x) => registrar(x, dia))}
                      aria-label={`Registrar uma ocorrência de "${o.titulo}" hoje`}
                    >
                      +1
                    </button>
                  </div>

                  {o.alvoSemanal > 0 && (
                    <div className="progresso__barra objetivo__barra">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  )}

                  {aberto && (
                    <div className="objetivo__detalhe">
                      {o.criterio && (
                        <p className="objetivo__criterio">
                          <strong>Conta quando:</strong> {o.criterio}
                        </p>
                      )}

                      <ol className="prog-semana objetivo__semana">
                        {semana.map((d) => (
                          <li
                            key={d.dia}
                            className={`prog-dia ${d.dia === dia ? 'prog-dia--hoje' : ''}`}
                          >
                            <span className="objetivo__conta">{d.n || '·'}</span>
                            <span className="prog-dia__letra" aria-hidden="true">
                              {letraDoDia(d.dia)}
                            </span>
                            <span className="sr-only">
                              {d.dia}: {d.n} registros
                            </span>
                          </li>
                        ))}
                      </ol>

                      <label className="field">
                        <span>Observações</span>
                        <input
                          type="text"
                          defaultValue={o.notas}
                          placeholder="O que ajudou, o que atrapalhou…"
                          onBlur={(e) => patch(o.id, (x) => ({ ...x, notas: e.target.value }))}
                        />
                      </label>

                      <div className="objetivo__acoes">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled={(o.registros[dia] ?? 0) === 0}
                          onClick={() => patch(o.id, (x) => desregistrar(x, dia))}
                        >
                          ↺ Desfazer o de hoje
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => patch(o.id, (x) => ({ ...x, arquivado: !x.arquivado }))}
                        >
                          {o.arquivado ? '↩ Reativar' : '✓ Concluir'}
                        </button>
                        <button
                          type="button"
                          className={`btn btn--ghost btn--danger ${
                            confirmar === o.id ? 'btn--armed' : ''
                          }`}
                          onClick={() => {
                            if (confirmar !== o.id) {
                              setConfirmar(o.id)
                              return
                            }
                            onChange(objetivos.filter((x) => x.id !== o.id))
                            setConfirmar(null)
                          }}
                        >
                          {confirmar === o.id ? '✕ Tocar de novo para apagar' : '✕ Apagar'}
                        </button>
                      </div>

                      <p className="settings__note">
                        {totalRegistros(o)} {totalRegistros(o) === 1 ? 'registro' : 'registros'}{' '}
                        desde {o.desde}.
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Dialog>
  )
}
