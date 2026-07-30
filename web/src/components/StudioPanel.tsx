import { useMemo, useState } from 'react'
import type { Card, Settings } from '../types'
import {
  GERADORES,
  padroesDe,
  semente,
  VIEWBOX,
  type ParamSpec,
  type ParamsForma,
} from '../lib/formas'
import {
  argsPadrao,
  BLOCOS,
  custoEstimado,
  especDe,
  executar,
  type Bloco,
  type EspecArg,
  type TipoBloco,
} from '../lib/blocos'
import {
  criacaoId,
  duplicar as duplicarCriacao,
  mover as moverCriacao,
  nomeSugerido,
  type Criacao,
} from '../lib/criacoes'
import { speak } from '../lib/speech'
import { Faixa } from './Faixa'
import { Dialog } from './Dialog'

interface Props {
  settings: Settings
  /** Montagens salvas — guardam a PILHA, e por isso continuam editáveis. */
  criacoes: Criacao[]
  onCriacoes: (lista: Criacao[]) => void
  /** Guarda o desenho como card — vira célula de prancha própria. */
  onSalvar: (card: Card) => void
  onClose: () => void
}

/**
 * Estúdio de formas — o "Scratch de imagens".
 *
 * POR QUE ISTO EXISTE NUMA PRANCHA DE CAA
 *
 * Uma **fonte** (um gerador de desenho) e uma **pilha de blocos** executada de
 * cima para baixo: repetir, grade, radial, girar, espelhar. Os laços aninham —
 * uma grade de repetições multiplica igual a laço dentro de laço.
 *
 * Laço e aninhamento são a primeira lógica de programação que alguém aprende, e
 * aqui eles aparecem **sem texto e sem sintaxe**: dá para construir uma ideia
 * complexa sem escrever uma linha nem ler uma palavra. Isso importa porque
 * quem não fala é sistematicamente subestimado justamente na hora de mostrar
 * que pensa — e aqui o resultado do pensamento aparece na tela, grande, sem
 * passar pela linguagem.
 *
 * O desenho é **gerado no aparelho**. Nada é baixado, nada sai — o módulo
 * inteiro funciona offline, o que também o torna a resposta mais barata que o
 * app tem para "figura sem depender de acervo".
 */
export function StudioPanel({ settings, criacoes, onCriacoes, onSalvar, onClose }: Props) {
  const [geradorId, setGeradorId] = useState(GERADORES[0]!.id)
  const gerador = GERADORES.find((g) => g.id === geradorId) ?? GERADORES[0]!
  const [params, setParams] = useState<ParamsForma>(() => padroesDe(GERADORES[0]!))
  const [sem, setSem] = useState(42)
  const [aberto, setAberto] = useState<string | null>(null)
  const [paleta, setPaleta] = useState(false)
  /** Blocos desligados: ficam na pilha e não desenham. Ver `desligados`. */
  const [desligados, setDesligados] = useState<Set<string>>(new Set())
  /** Criação aberta agora, para "Salvar" saber se atualiza ou cria. */
  const [criacaoAtual, setCriacaoAtual] = useState<string | null>(null)
  const [nomeNovo, setNomeNovo] = useState('')
  const [renomeando, setRenomeando] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const [verCriacoes, setVerCriacoes] = useState(false)

  /**
   * Desfazer e refazer.
   *
   * Numa ferramenta de montar, a coragem de experimentar depende inteiramente
   * de poder voltar. Sem desfazer, quem não tem certeza do que um bloco faz
   * simplesmente não o experimenta — e experimentar é o único jeito de
   * descobrir o que um laço faz.
   *
   * O histórico guarda a PILHA inteira a cada mudança, e não o "delta": pilhas
   * têm no máximo algumas dezenas de blocos, e reconstruir estado por delta é
   * onde nascem os bugs difíceis de desfazer.
   */
  const [historico, setHistorico] = useState<Bloco[][]>([[]])
  const [ondeNoHistorico, setOndeNoHistorico] = useState(0)
  const pilha = historico[ondeNoHistorico] ?? []

  const mudarPilha = (proxima: Bloco[] | ((p: Bloco[]) => Bloco[])) => {
    const nova = typeof proxima === 'function' ? proxima(pilha) : proxima
    setHistorico((h) => [...h.slice(0, ondeNoHistorico + 1), nova].slice(-40))
    setOndeNoHistorico((i) => Math.min(i + 1, 39))
  }
  const setPilha = mudarPilha
  const podeDesfazer = ondeNoHistorico > 0
  const podeRefazer = ondeNoHistorico < historico.length - 1

  /**
   * Quem pediu menos movimento não recebe a tela girando — nem por um bloco de
   * animação que alguém deixou salvo. O bloco continua na pilha e visível; ele
   * só não desenha nada. (WCAG 2.3.3)
   */
  const semAnimacao =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

  /**
   * Só os blocos LIGADOS chegam ao motor.
   *
   * Desligar em vez de apagar é o que permite perguntar "o que este bloco
   * estava fazendo?" sem perdê-lo — e a resposta aparece na hora, no desenho.
   * É a forma mais barata de entender um bloco que existe.
   */
  const pilhaAtiva = useMemo(
    () => pilha.filter((b) => !desligados.has(b.id)),
    [pilha, desligados],
  )

  const custo = useMemo(
    () => custoEstimado(pilhaAtiva, { semAnimacao }),
    [pilhaAtiva, semAnimacao],
  )
  /** Teto de segurança: acima disto a tela trava no aparelho mais fraco. */
  const pesado = custo > 4000

  const svg = useMemo(() => {
    const base = gerador.desenhar(params, semente(sem))
    if (pesado) return base
    return executar(base, pilhaAtiva, { semAnimacao })
  }, [gerador, params, sem, pilhaAtiva, pesado, semAnimacao])

  /**
   * O quadro cresce com os laços.
   *
   * Apareceu no primeiro teste: um `radial` com raio grande joga as cópias para
   * fora do `viewBox` de 400×400 e o desenho aparece cortado pelas bordas —
   * dando a impressão de que o bloco está quebrado quando ele está certo.
   *
   * A folga é por LAÇO, e não pelo deslocamento real de cada bloco: calcular o
   * contorno exato exigiria medir o SVG resultante (só possível no DOM, e este
   * painel não mede nada), e o resultado seria um quadro que muda de tamanho a
   * cada arrasto de controle — pior que um pouco de margem sobrando.
   */
  const lacos = pilhaAtiva.filter((b) => especDe(b.tipo)?.grupo === 'laco').length
  const folga = Math.min(600, lacos * 220)
  const quadro = folga
    ? `${-folga / 2} ${-folga / 2} ${400 + folga} ${400 + folga}`
    : VIEWBOX

  const trocarGerador = (id: string) => {
    const g = GERADORES.find((x) => x.id === id)
    if (!g) return
    setGeradorId(id)
    setParams(padroesDe(g))
  }

  const acrescentar = (tipo: TipoBloco) => {
    const id = `${tipo}-${pilha.length}-${sem}`
    setPilha((p) => [...p, { id, tipo, args: argsPadrao(tipo) }])
    setAberto(id)
    setPaleta(false)
  }

  const mover = (i: number, para: number) => {
    if (para < 0 || para >= pilha.length) return
    const proxima = [...pilha]
    const [b] = proxima.splice(i, 1)
    if (!b) return
    proxima.splice(para, 0, b)
    setPilha(proxima)
  }

  const ajustar = (id: string, chave: string, valor: number | string | boolean) =>
    setPilha((p) => p.map((b) => (b.id === id ? { ...b, args: { ...b.args, [chave]: valor } } : b)))

  /** Duplica o bloco logo abaixo dele — o jeito mais rápido de empilhar dois. */
  const duplicarBloco = (i: number) => {
    const b = pilha[i]
    if (!b) return
    const copia: Bloco = { ...b, id: `${b.tipo}-${Date.now()}`, args: { ...b.args } }
    const proxima = [...pilha]
    proxima.splice(i + 1, 0, copia)
    setPilha(proxima)
    setAberto(copia.id)
  }

  const alternarBloco = (id: string) =>
    setDesligados((d) => {
      const nova = new Set(d)
      if (nova.has(id)) nova.delete(id)
      else nova.add(id)
      return nova
    })

  /* ---------------------------------------------------------- as criações */

  const hoje = () => {
    const d = new Date()
    const dd = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`
  }

  const guardar = () => {
    const nome = nomeNovo.trim() || nomeSugerido(gerador.nome, pilha.length)
    // Com uma criação aberta, "Guardar" ATUALIZA em vez de criar outra. Salvar
    // duas vezes seguidas gerando duas cópias é o jeito mais rápido de encher
    // a lista de lixo e fazer a pessoa parar de salvar.
    if (criacaoAtual && criacoes.some((c) => c.id === criacaoAtual)) {
      onCriacoes(
        criacoes.map((c) =>
          c.id === criacaoAtual
            ? { ...c, nome, geradorId, params: { ...params }, semente: sem, pilha }
            : c,
        ),
      )
      speak('Desenho atualizado.', settings)
      return
    }
    const nova: Criacao = {
      id: criacaoId(nome, criacoes),
      nome,
      geradorId,
      params: { ...params },
      semente: sem,
      pilha,
      criadaEm: hoje(),
    }
    onCriacoes([...criacoes, nova])
    setCriacaoAtual(nova.id)
    setNomeNovo('')
    speak('Desenho guardado.', settings)
  }

  const abrirCriacao = (c: Criacao) => {
    const g = GERADORES.find((x) => x.id === c.geradorId)
    if (g) {
      setGeradorId(g.id)
      setParams({ ...padroesDe(g), ...c.params })
    }
    setSem(c.semente)
    // Abrir zera o histórico: o desfazer volta ao estado salvo, e não a uma
    // pilha de outro desenho — que seria confuso a ponto de parecer defeito.
    setHistorico([c.pilha])
    setOndeNoHistorico(0)
    setDesligados(new Set())
    setCriacaoAtual(c.id)
    setNomeNovo(c.nome)
    setVerCriacoes(false)
  }

  const comecarDoZero = () => {
    setHistorico([[]])
    setOndeNoHistorico(0)
    setDesligados(new Set())
    setCriacaoAtual(null)
    setNomeNovo('')
  }

  /** Um controle por especificação — a UI não sabe nada sobre bloco nenhum. */
  const controle = (
    spec: ParamSpec | EspecArg,
    chave: string,
    valor: number | string | boolean,
    mudar: (v: number | string | boolean) => void,
  ) => (
    <label className="field" key={chave}>
      <span>
        {spec.rotulo}
        {spec.tipo === 'range' ? ` — ${valor}` : ''}
      </span>
      {spec.tipo === 'range' && (
        <input
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.passo ?? 1}
          value={Number(valor)}
          onChange={(e) => mudar(Number(e.target.value))}
        />
      )}
      {spec.tipo === 'select' && (
        <select value={String(valor)} onChange={(e) => mudar(e.target.value)}>
          {spec.opcoes.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
      {spec.tipo === 'bool' && (
        <span className="switch">
          <input type="checkbox" checked={Boolean(valor)} onChange={(e) => mudar(e.target.checked)} />
        </span>
      )}
    </label>
  )

  const grupos = ['laco', 'transformar', 'aparencia', 'animacao'] as const
  const nomeGrupo: Record<string, string> = {
    laco: 'Laços — multiplicam',
    transformar: 'Mover e virar',
    aparencia: 'Aparência',
    animacao: 'Animação',
  }

  return (
    <Dialog title="Estúdio de formas" onClose={onClose}>
      <div className="shell estudio">
        <p className="settings__note">
          Escolha um desenho e empilhe <strong>blocos</strong> por cima. Os laços{' '}
          <strong>multiplicam</strong>: uma grade depois de um repetir é uma grade de repetições —
          é laço dentro de laço, sem escrever uma linha. Tudo é desenhado no próprio aparelho,
          sem baixar nada.
        </p>

        {/* ----------------------------------------------------- criações */}
        <div className="estudio__barra">
          <label className="field estudio__nome">
            <span className="sr-only">Nome do desenho</span>
            <input
              type="text"
              value={nomeNovo}
              placeholder={nomeSugerido(gerador.nome, pilha.length)}
              onChange={(e) => setNomeNovo(e.target.value)}
            />
          </label>
          <button type="button" className="btn btn--speak" onClick={guardar}>
            {criacaoAtual ? '✓ Atualizar' : '★ Guardar'}
          </button>
          <button
            type="button"
            className={`btn btn--ghost ${verCriacoes ? 'btn--saved' : ''}`}
            aria-pressed={verCriacoes}
            onClick={() => setVerCriacoes((v) => !v)}
          >
            📁 <span className="btn__text">Meus desenhos ({criacoes.length})</span>
          </button>
          {criacaoAtual && (
            <button type="button" className="btn btn--ghost" onClick={comecarDoZero}>
              + <span className="btn__text">Começar outro</span>
            </button>
          )}
        </div>

        {verCriacoes && (
          <section className="settings__group">
            <h3>Meus desenhos</h3>
            {criacoes.length === 0 ? (
              <p className="settings__note">
                Nenhum ainda. Monte alguma coisa e toque em <strong>Guardar</strong> — o que fica
                salvo é a <strong>pilha</strong>, não a figura, então dá para abrir amanhã e mexer
                num laço.
              </p>
            ) : (
              <ul className="editor__list">
                {criacoes.map((c, i) => (
                  <li key={c.id} className="editor__row estudio__criacao">
                    {renomeando === c.id ? (
                      <input
                        type="text"
                        className="editor__name"
                        defaultValue={c.nome}
                        aria-label={`Nome de ${c.nome}`}
                        autoFocus
                        onBlur={(e) => {
                          const nome = e.target.value.trim()
                          if (nome) {
                            onCriacoes(criacoes.map((x) => (x.id === c.id ? { ...x, nome } : x)))
                          }
                          setRenomeando(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          if (e.key === 'Escape') setRenomeando(null)
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="estudio__criacao-abrir"
                        onClick={() => abrirCriacao(c)}
                      >
                        <strong>{c.nome}</strong>
                        <small>
                          {c.pilha.length} {c.pilha.length === 1 ? 'bloco' : 'blocos'} ·{' '}
                          {c.criadaEm}
                          {c.id === criacaoAtual ? ' · aberto' : ''}
                        </small>
                      </button>
                    )}
                    <span className="editor__actions">
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => setRenomeando(renomeando === c.id ? null : c.id)}
                        aria-label={`Renomear ${c.nome}`}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => onCriacoes([...criacoes, duplicarCriacao(c, criacoes)])}
                        aria-label={`Duplicar ${c.nome}`}
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => onCriacoes(moverCriacao(criacoes, i, i - 1))}
                        disabled={i === 0}
                        aria-label={`Subir ${c.nome}`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => onCriacoes(moverCriacao(criacoes, i, i + 1))}
                        disabled={i === criacoes.length - 1}
                        aria-label={`Descer ${c.nome}`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={`btn btn--ghost btn--danger ${
                          confirmar === c.id ? 'btn--armed' : ''
                        }`}
                        onClick={() => {
                          if (confirmar !== c.id) {
                            setConfirmar(c.id)
                            return
                          }
                          onCriacoes(criacoes.filter((x) => x.id !== c.id))
                          if (criacaoAtual === c.id) comecarDoZero()
                          setConfirmar(null)
                        }}
                        aria-label={`Apagar ${c.nome}`}
                      >
                        {confirmar === c.id ? '✕!' : '✕'}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* -------------------------------------------------------- prévia */}
        <div className="estudio__palco">
          <svg
            className="estudio__svg"
            viewBox={quadro}
            role="img"
            aria-label={`Desenho: ${gerador.nome} com ${pilha.length} blocos`}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div className="estudio__conta">
            <span className={`prog-chip ${pesado ? 'estudio__aviso' : ''}`}>
              {custo === 1 ? '1 cópia' : `${custo.toLocaleString('pt-BR')} cópias`}
            </span>
            {pesado && (
              <span className="estudio__aviso-texto">
                Muita coisa — a pilha está pausada para o aparelho não travar. Tire um laço ou
                diminua as vezes.
              </span>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- a fonte */}
        <section className="settings__group">
          <h3>O desenho de base</h3>
          <Faixa className="phrases__tabs" nome="desenhos" role="tablist" ariaLabel="Geradores">
            {GERADORES.map((g) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={g.id === geradorId}
                className={`tab ${g.id === geradorId ? 'tab--active' : ''}`}
                onClick={() => trocarGerador(g.id)}
              >
                <span className="tab__icon" aria-hidden="true">
                  {g.icone}
                </span>
                <span className="tab__name">{g.nome}</span>
              </button>
            ))}
          </Faixa>
          <p className="settings__note">{gerador.descricao}</p>

          {Object.entries(gerador.params).map(([chave, spec]) =>
            controle(spec, chave, params[chave] ?? spec.padrao, (v) =>
              setParams((p) => ({ ...p, [chave]: v })),
            ),
          )}

          <button
            type="button"
            className="btn btn--ghost btn--wide"
            onClick={() => setSem((s) => (s * 7 + 13) % 100000)}
          >
            ↻ Outra variação
          </button>
        </section>

        {/* ------------------------------------------------------- a pilha */}
        <section className="settings__group">
          <h3>A pilha de blocos</h3>

          {pilha.length === 0 ? (
            <p className="settings__note">
              Nenhum bloco ainda. O desenho aparece do jeito que saiu do gerador.
            </p>
          ) : (
            <ol className="estudio__pilha">
              {pilha.map((b, i) => {
                const spec = especDe(b.tipo)
                if (!spec) return null
                const abertoAqui = aberto === b.id
                const desligado = desligados.has(b.id)
                return (
                  <li
                    key={b.id}
                    className={`bloco bloco--${spec.grupo} ${desligado ? 'bloco--off' : ''}`}
                  >
                    <div className="bloco__linha">
                      <span className="bloco__icone" aria-hidden="true">
                        {spec.icone}
                      </span>
                      <button
                        type="button"
                        className="bloco__nome"
                        aria-expanded={abertoAqui}
                        onClick={() => setAberto(abertoAqui ? null : b.id)}
                      >
                        <strong>{spec.nome}</strong>
                        <small>{spec.descricao}</small>
                      </button>
                      <span className="editor__actions">
                        {/* Desligar em vez de apagar: dá para ver o que o bloco
                            fazia sem perdê-lo, e a resposta aparece no desenho
                            na hora. É a forma mais barata de entender um bloco. */}
                        <button
                          type="button"
                          className={`btn btn--ghost ${desligado ? 'btn--saved' : ''}`}
                          aria-pressed={!desligado}
                          onClick={() => alternarBloco(b.id)}
                          aria-label={desligado ? `Ligar ${spec.nome}` : `Desligar ${spec.nome}`}
                        >
                          {desligado ? '○' : '●'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => duplicarBloco(i)}
                          aria-label={`Duplicar ${spec.nome}`}
                        >
                          ⧉
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => mover(i, i - 1)}
                          disabled={i === 0}
                          aria-label={`Subir ${spec.nome}`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => mover(i, i + 1)}
                          disabled={i === pilha.length - 1}
                          aria-label={`Descer ${spec.nome}`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setPilha((p) => p.filter((x) => x.id !== b.id))}
                          aria-label={`Tirar ${spec.nome}`}
                        >
                          ✕
                        </button>
                      </span>
                    </div>

                    {abertoAqui && (
                      <div className="bloco__args">
                        {Object.entries(spec.args).map(([chave, argSpec]) =>
                          controle(argSpec, chave, b.args[chave] ?? argSpec.padrao, (v) =>
                            ajustar(b.id, chave, v),
                          ),
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          )}

          <button
            type="button"
            // `btn--armed` e o vermelho de apagar: fechar uma paleta nao destroi nada.
            className={`btn btn--wide ${paleta ? 'btn--ghost' : 'btn--speak'}`}
            aria-expanded={paleta}
            onClick={() => setPaleta((p) => !p)}
          >
            {paleta ? 'Fechar a paleta' : '+ Pôr um bloco'}
          </button>

          {paleta && (
            <div className="estudio__paleta">
              {grupos.map((g) => {
                const doGrupo = BLOCOS.filter((b) => b.grupo === g)
                if (doGrupo.length === 0) return null
                return (
                  <div key={g} className="estudio__grupo">
                    <h4 className="roteiros__grupo-titulo">{nomeGrupo[g] ?? g}</h4>
                    <div className="estudio__blocos">
                      {doGrupo.map((b) => (
                        <button
                          key={b.tipo}
                          type="button"
                          className={`bloco-oferta bloco--${b.grupo}`}
                          onClick={() => acrescentar(b.tipo)}
                        >
                          <span aria-hidden="true">{b.icone}</span>
                          <strong>{b.nome}</strong>
                          <small>{b.descricao}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div className="padrao__acoes">
          <button
            type="button"
            className="btn btn--speak"
            onClick={() => {
              // O desenho vira card por uma URL de dado: não há servidor onde
              // guardar arquivo, e um SVG inteiro cabe no mesmo lugar em que
              // hoje mora o id de um pictograma.
              const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${quadro}" fill="none" stroke="#101a25" stroke-width="2">${svg}</svg>`
              onSalvar({
                id: 0,
                label: `${gerador.nome} (meu desenho)`,
                imagem: `data:image/svg+xml;utf8,${encodeURIComponent(doc)}`,
              })
              speak('Desenho guardado.', settings)
            }}
          >
            ★ Guardar como card
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!podeDesfazer}
            onClick={() => setOndeNoHistorico((i) => Math.max(0, i - 1))}
          >
            ↶ <span className="btn__text">Desfazer</span>
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!podeRefazer}
            onClick={() => setOndeNoHistorico((i) => Math.min(historico.length - 1, i + 1))}
          >
            ↷ <span className="btn__text">Refazer</span>
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={pilha.length === 0}
            onClick={() => setPilha([])}
          >
            ↺ <span className="btn__text">Tirar todos os blocos</span>
          </button>
        </div>
      </div>
    </Dialog>
  )
}
