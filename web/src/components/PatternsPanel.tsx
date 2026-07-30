import { useCallback, useEffect, useState } from 'react'
import type { Settings } from '../types'
import {
  anotar,
  leituraDoPerfil,
  montar,
  sortearTipo,
  TIPOS,
  type Desafio,
  type Figura,
  type Perfil,
  type Tipo,
} from '../lib/padroes'
import { speak } from '../lib/speech'
import { earcon } from '../lib/audio'
import { Faixa } from './Faixa'
import { Dialog } from './Dialog'

interface Props {
  settings: Settings
  perfil: Perfil
  onPerfil: (p: Perfil) => void
  /** Um desafio resolvido vale ponto de prática, como o jogo e o ensaio. */
  onPratica: () => void
  onClose: () => void
}

/** Uma figura desenhada. Nada de imagem: forma, cor e tamanho são o conteúdo. */
function Fig({ f, grande }: { f: Figura; grande?: boolean }) {
  return (
    <span
      className={`fig fig--${f.forma} fig--cor-${f.cor} fig--t${f.tamanho} ${
        grande ? 'fig--grande' : ''
      }`}
      aria-hidden="true"
    />
  )
}

/**
 * Padrões visuais.
 *
 * Não é teste de inteligência, e a tela diz isso — ver `lib/padroes.ts` para o
 * porquê, que é o ponto inteiro do módulo. Aqui não há tempo, não há nota, e
 * errar só mostra a explicação e oferece de novo.
 */
export function PatternsPanel({ settings, perfil, onPerfil, onPratica, onClose }: Props) {
  const [tipo, setTipo] = useState<Tipo | 'misto'>('misto')
  const [desafio, setDesafio] = useState<Desafio | null>(null)
  const [escolha, setEscolha] = useState<number | null>(null)
  const [errosNesta, setErrosNesta] = useState(0)
  const [feitos, setFeitos] = useState(0)

  const novo = useCallback(
    (t: Tipo | 'misto') => {
      setDesafio(montar(t === 'misto' ? sortearTipo() : t))
      setEscolha(null)
      setErrosNesta(0)
    },
    [],
  )

  useEffect(() => novo(tipo), [tipo, novo])

  const responder = (i: number) => {
    if (!desafio || escolha !== null) return
    setEscolha(i)
    if (i === desafio.certa) {
      if (settings.sounds) earcon.select()
      onPerfil(anotar(perfil, desafio.tipo, errosNesta === 0))
      onPratica()
      setFeitos((n) => n + 1)
      speak('Isso.', settings)
    } else {
      // Errar não encerra e não conta contra: a explicação aparece e o desafio
      // continua aberto para tentar de novo.
      setErrosNesta((n) => n + 1)
      setTimeout(() => setEscolha(null), 900)
    }
  }

  const acertou = desafio !== null && escolha === desafio.certa
  const leitura = leituraDoPerfil(perfil)

  return (
    <Dialog title="Padrões" onClose={onClose}>
      <div className="shell padroes">
        <p className="settings__note">
          Aqui se pensa <strong>sem precisar falar</strong>: as quatro atividades se resolvem
          apontando. Não há tempo, não há nota e não há comparação com ninguém — isto{' '}
          <strong>não é teste de inteligência</strong>. O que o app devolve é por onde você entra
          mais rápido, que serve para escolher o caminho de apresentar coisa nova.
        </p>

        <Faixa className="phrases__tabs" nome="tipos" role="tablist" ariaLabel="Tipos de padrão">
          <button
            type="button"
            role="tab"
            aria-selected={tipo === 'misto'}
            className={`tab ${tipo === 'misto' ? 'tab--active' : ''}`}
            onClick={() => setTipo('misto')}
          >
            <span className="tab__icon" aria-hidden="true">
              🎲
            </span>
            <span className="tab__name">Misturado</span>
          </button>
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tipo === t.id}
              className={`tab ${tipo === t.id ? 'tab--active' : ''}`}
              onClick={() => setTipo(t.id)}
            >
              <span className="tab__name">{t.nome}</span>
            </button>
          ))}
        </Faixa>

        {desafio && (
          <section className="padrao">
            <header className="padrao__topo">
              <h3 className="padrao__enunciado">{desafio.enunciado}</h3>
              <span className="prog-chip">{feitos} nesta sessão</span>
            </header>

            {desafio.mostra.length > 0 && (
              <div className="padrao__mostra">
                {desafio.mostra.map((f, i) => (
                  <span key={i} className="padrao__slot">
                    <Fig f={f} grande />
                  </span>
                ))}
                {/* A lacuna é explícita: sem ela, a última figura mostrada
                    parece ser a resposta, e a pergunta muda de sentido. */}
                <span className="padrao__slot padrao__slot--vago" aria-hidden="true">
                  ?
                </span>
              </div>
            )}

            <div className="padrao__opcoes" role="group" aria-label="Escolhas">
              {desafio.opcoes.map((f, i) => {
                const estado =
                  escolha === null
                    ? ''
                    : i === desafio.certa && escolha === i
                      ? 'padrao__opcao--certa'
                      : escolha === i
                        ? 'padrao__opcao--errada'
                        : ''
                return (
                  <button
                    key={i}
                    type="button"
                    className={`padrao__opcao ${estado}`}
                    onClick={() => responder(i)}
                    aria-label={`Opção ${i + 1}`}
                  >
                    <Fig f={f} />
                  </button>
                )
              })}
            </div>

            {/* A explicação aparece SEMPRE que se acerta — não só quando erra.
                Acertar sem saber por quê não ensina nada, e é justamente o
                caso mais comum num exercício de padrão. */}
            {acertou && (
              <div className="padrao__porque" role="status">
                <strong>Isso. </strong>
                {desafio.porque}
              </div>
            )}
            {escolha !== null && !acertou && (
              <div className="padrao__porque padrao__porque--dica" role="status">
                Essa não. Olha de novo — {desafio.porque.toLowerCase()}
              </div>
            )}

            <div className="padrao__acoes">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => speak(desafio.enunciado, settings)}
              >
                🔊 <span className="btn__text">Ler a pergunta</span>
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setEscolha(desafio.certa)
                  speak(desafio.porque, settings)
                }}
              >
                💡 <span className="btn__text">Mostra</span>
              </button>
              <button type="button" className="btn btn--speak" onClick={() => novo(tipo)}>
                {acertou ? 'Próximo ›' : 'Trocar'}
              </button>
            </div>
          </section>
        )}

        <section className="settings__group">
          <h3>Por onde você entra</h3>
          {leitura ? (
            <p className="settings__note">{leitura}</p>
          ) : (
            <p className="settings__note">
              Faça algumas de cada tipo e aparece aqui uma leitura de caminho — nunca uma nota.
            </p>
          )}
          <ul className="prog-lista">
            {TIPOS.map((t) => {
              const p = perfil[t.id] ?? { feitos: 0, deprimeira: 0 }
              return (
                <li key={t.id} className="prog-item">
                  <span className="prog-item__icone" aria-hidden="true">
                    ◇
                  </span>
                  <span className="prog-item__nome">
                    {t.nome}
                    <small className="padroes__sobre"> — {t.sobre}</small>
                  </span>
                  <span className="prog-item__selo">
                    {p.feitos === 0 ? '—' : `${p.deprimeira}/${p.feitos} direto`}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="settings__note">
            "Direto" quer dizer resolvido sem tentar antes — e não "certo". Ninguém está sendo
            avaliado aqui: a história de quem não fala está cheia de laudo que confundiu falta de
            fala com falta de pensamento, e esta tela existe para o contrário disso.
          </p>
        </section>
      </div>
    </Dialog>
  )
}
