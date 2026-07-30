import { useMemo, useState } from 'react'
import type { Card, Settings } from '../types'
import { MODELOS, montarPoema, rimasDe, silabas } from '../lib/poesia'
import { speak } from '../lib/speech'
import { Faixa } from './Faixa'
import { Dialog } from './Dialog'

interface Props {
  settings: Settings
  /** Todo o vocabulário do app — é dele que saem as rimas. */
  vocabulario: string[]
  /** Guardar o poema em "Minhas frases", para poder dizer depois. */
  onSalvar: (card: Card) => void
  onClose: () => void
}

/**
 * Oficina de poesia.
 *
 * Ver `lib/poesia.ts` para por que isto existe num app de comunicação — em uma
 * frase: todo o resto serve para resolver, e brincar com a língua é a metade
 * que costuma não chegar para quem usa CAA.
 *
 * **Nada aqui corrige.** A contagem de sílabas é sugestão e nunca trava; a
 * rima é oferta e nunca exigência; um poema de uma linha é um poema.
 */
export function PoetryPanel({ settings, vocabulario, onSalvar, onClose }: Props) {
  const [modeloId, setModeloId] = useState(MODELOS[0]!.id)
  const [versos, setVersos] = useState<string[]>([])
  const [buscaRima, setBuscaRima] = useState('')
  const [linhaAtiva, setLinhaAtiva] = useState(0)

  const modelo = MODELOS.find((m) => m.id === modeloId) ?? MODELOS[0]!
  const poema = montarPoema(modelo, versos)

  const rimas = useMemo(
    () => (buscaRima.trim().length >= 2 ? rimasDe(buscaRima.trim(), vocabulario) : []),
    [buscaRima, vocabulario],
  )

  const trocarModelo = (id: string) => {
    setModeloId(id)
    setVersos([])
    setLinhaAtiva(0)
  }

  const editar = (i: number, v: string) =>
    setVersos((atual) => {
      const proximo = [...atual]
      while (proximo.length <= i) proximo.push('')
      proximo[i] = v
      return proximo
    })

  /**
   * Ler o poema em voz alta, verso a verso.
   *
   * Encadeado pelo fim de cada locução, e não por cronômetro: verso tem
   * tamanho irregular por definição, e um intervalo fixo cortaria uns e
   * deixaria silêncio nos outros — que num poema é o que estraga o ritmo.
   */
  const ler = (i = 0) => {
    const verso = poema[i]
    if (!verso) return
    speak(verso, settings, () => ler(i + 1))
  }

  return (
    <Dialog title="Poesia" onClose={onClose}>
      <div className="shell poesia">
        <p className="settings__note">
          Todo o resto do app serve para <strong>resolver</strong> — pedir, avisar, combinar.
          Aqui é a outra metade: brincar com a língua, que é a que costuma não chegar para quem
          usa uma prancha. Não há resposta certa, nada é corrigido, e um poema de uma linha já é
          um poema.
        </p>

        <Faixa className="phrases__tabs" nome="modelos" role="tablist" ariaLabel="Modelos de poema">
          {MODELOS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === modeloId}
              className={`tab ${m.id === modeloId ? 'tab--active' : ''}`}
              onClick={() => trocarModelo(m.id)}
            >
              <span className="tab__name">{m.nome}</span>
            </button>
          ))}
        </Faixa>

        <p className="settings__note poesia__sobre">{modelo.sobre}</p>

        <section className="settings__group">
          <h3>Os versos</h3>
          <ol className="poesia__versos">
            {modelo.versos.map((v, i) => {
              const texto = versos[i] ?? ''
              const linha = v.fixo ? `${v.fixo} ${texto}` : texto
              const n = silabas(linha)
              const alvo = modelo.metrica?.[i]
              return (
                <li key={i} className="poesia__verso">
                  {v.fixo && <span className="poesia__fixo">{v.fixo}</span>}
                  <input
                    type="text"
                    className="poesia__campo"
                    value={texto}
                    placeholder={v.dica}
                    aria-label={`Verso ${i + 1}${v.fixo ? `, começa com ${v.fixo}` : ''}`}
                    onFocus={() => setLinhaAtiva(i)}
                    onChange={(e) => editar(i, e.target.value)}
                  />
                  {/* A contagem é sugestão e NUNCA trava: contar sílaba de
                      verdade depende da pronúncia, que muda de região — o app
                      já sabe disso. O número serve para sentir o ritmo. */}
                  {texto.trim() !== '' && (
                    <span
                      className={`poesia__silabas ${
                        alvo && n === alvo ? 'poesia__silabas--certo' : ''
                      }`}
                    >
                      {n} {n === 1 ? 'sílaba' : 'sílabas'}
                      {alvo ? ` · sugerido ${alvo}` : ''}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </section>

        <section className="settings__group">
          <h3>Procurar rima</h3>
          <label className="field">
            <span>Palavra que termina o verso</span>
            <input
              type="search"
              value={buscaRima}
              placeholder="coração, bolo, chuva…"
              onChange={(e) => setBuscaRima(e.target.value)}
            />
          </label>
          {buscaRima.trim().length >= 2 && rimas.length === 0 && (
            <p className="settings__note">
              Nada rimando com "{buscaRima.trim()}" no vocabulário do app. Rima também pode ser
              inventada — verso não presta contas a dicionário.
            </p>
          )}
          {rimas.length > 0 && (
            <div className="poesia__rimas">
              {rimas.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="poesia__rima"
                  onClick={() => {
                    const atual = versos[linhaAtiva] ?? ''
                    editar(linhaAtiva, atual ? `${atual} ${r}` : r)
                    speak(r, settings)
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          <p className="settings__note">
            As rimas saem do vocabulário do próprio app, e vão para o verso em que você estava.
            São oferta, não exigência: o modelo nenhum obriga a rimar.
          </p>
        </section>

        {poema.length > 0 && (
          <section className="poesia__pronto">
            <h3 className="prog-titulo">O poema</h3>
            <div className="poesia__texto">
              {poema.map((linha, i) => (
                <p key={i}>{linha}</p>
              ))}
            </div>
            <div className="padrao__acoes">
              <button type="button" className="btn btn--speak" onClick={() => ler(0)}>
                🔊 Ler em voz alta
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onSalvar({ id: 8109, label: poema.join(' / ') })}
              >
                ★ Guardar em Minhas frases
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setVersos([])
                  setBuscaRima('')
                }}
              >
                ↺ Começar outro
              </button>
            </div>
          </section>
        )}
      </div>
    </Dialog>
  )
}
