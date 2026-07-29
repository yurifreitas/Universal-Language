import { useEffect, useRef, useState } from 'react'
import type { Card, Settings } from '../types'
import { loadVoices, portugueseVoices, speak } from '../lib/speech'
import { exportProfile, parseProfile, type Profile } from '../lib/storage'
import type { BoardEdits, CustomBoard } from '../lib/boardEdits'
import type { Script } from '../lib/scripts'
import { REGIONS } from '../lib/regional'
import { Dialog } from './Dialog'

interface Props {
  settings: Settings
  favorites: Card[]
  phrases: Card[]
  edits: BoardEdits
  customBoards: CustomBoard[]
  scripts: Script[]
  onChange: (patch: Partial<Settings>) => void
  onImport: (profile: Profile) => void
  onClose: () => void
}

export function SettingsPanel({
  settings,
  favorites,
  phrases,
  edits,
  customBoards,
  scripts,
  onChange,
  onImport,
  onClose,
}: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [transfer, setTransfer] = useState<string | null>(null)

  const download = () => {
    const blob = new Blob([exportProfile({ settings, favorites, phrases, edits, customBoards, scripts })], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'perfil-fala.json'
    a.click()
    URL.revokeObjectURL(url)
    setTransfer('Perfil salvo como perfil-fala.json.')
  }

  const upload = (file: File) => {
    file
      .text()
      .then((raw) => {
        const profile = parseProfile(raw)
        if (!profile) {
          setTransfer('Arquivo não reconhecido. Escolha um perfil exportado por este app.')
          return
        }
        onImport(profile)
        setTransfer('Perfil restaurado.')
      })
      .catch(() => setTransfer('Não foi possível ler o arquivo.'))
  }

  useEffect(() => {
    loadVoices().then((all) => {
      const pt = portugueseVoices(all)
      setVoices(pt.length ? pt : all)
    })
  }, [])

  return (
    <Dialog title="Configurações" onClose={onClose}>
      <div className="shell settings">
        <section className="settings__group">
          <h3>Voz</h3>
          {voices.length === 0 ? (
            <p className="settings__note">
              Nenhuma voz encontrada. Em Android, instale uma voz em português nas configurações
              de Texto&nbsp;para&nbsp;fala do sistema.
            </p>
          ) : (
            <label className="field">
              <span>Voz</span>
              <select
                value={settings.voiceURI ?? ''}
                onChange={(e) => onChange({ voiceURI: e.target.value || null })}
              >
                <option value="">Automática (pt-BR)</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} — {v.lang}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field">
            <span>Velocidade — {settings.rate.toFixed(2)}×</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={settings.rate}
              onChange={(e) => onChange({ rate: Number(e.target.value) })}
            />
          </label>

          <label className="field">
            <span>Tom — {settings.pitch.toFixed(2)}</span>
            <input
              type="range"
              min={0.5}
              max={1.6}
              step={0.05}
              value={settings.pitch}
              onChange={(e) => onChange({ pitch: Number(e.target.value) })}
            />
          </label>

          <button
            type="button"
            className="btn btn--speak btn--wide"
            onClick={() => speak('Oi, eu quero brincar', settings)}
          >
            Testar voz
          </button>

          <label className="switch">
            <input
              type="checkbox"
              checked={settings.speakOnTap}
              onChange={(e) => onChange({ speakOnTap: e.target.checked })}
            />
            <span>Falar cada card ao tocar</span>
          </label>
          <p className="settings__note">
            O acervo ARASAAC não possui áudio gravado em português — a voz é sempre sintetizada
            pelo dispositivo.
          </p>
        </section>

        <section className="settings__group">
          <h3>Grade</h3>
          <label className="field">
            <span>Colunas — {settings.columns}</span>
            <input
              type="range"
              min={2}
              max={8}
              step={1}
              value={settings.columns}
              onChange={(e) => onChange({ columns: Number(e.target.value) })}
            />
          </label>
          <p className="settings__note">
            Menos colunas deixam os alvos maiores. Para quem tem dificuldade motora fina,
            2 ou 3 colunas costumam funcionar melhor que uma grade cheia.
          </p>
        </section>

        <section className="settings__group">
          <h3>Varredura (acesso por switch)</h3>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.scanning}
              onChange={(e) => onChange({ scanning: e.target.checked })}
            />
            <span>Ativar varredura linha-coluna</span>
          </label>
          <label className="field">
            <span>Velocidade — {(settings.scanSpeed / 1000).toFixed(1)} s por passo</span>
            <input
              type="range"
              min={400}
              max={3000}
              step={100}
              value={settings.scanSpeed}
              disabled={!settings.scanning}
              onChange={(e) => onChange({ scanSpeed: Number(e.target.value) })}
            />
          </label>
          <p className="settings__note">
            Para quem não aponta. A grade percorre as linhas sozinha; um acionamento
            (<kbd>Espaço</kbd>, <kbd>Enter</kbd> ou switch) entra na linha, o seguinte
            seleciona a célula. Com a varredura ligada, Espaço e Enter deixam de falar a
            frase — passam a pertencer ao switch.
          </p>
          <p className="settings__note">
            O valor de velocidade certo é individual e clínico; 1,2 s é apenas um ponto de
            partida.
          </p>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.auditoryScanning}
              disabled={!settings.scanning}
              onChange={(e) => onChange({ auditoryScanning: e.target.checked })}
            />
            <span>Varredura auditiva</span>
          </label>
          <p className="settings__note">
            Cada opção percorrida é anunciada numa voz mais aguda e rápida, distinta da voz
            da mensagem — é assim que se diferencia "o que está sendo oferecido" de "o que eu
            disse". É o único caminho de acesso para quem não enxerga a grade. Com fone de
            ouvido, a pista fica privada e só a frase sai no alto-falante.
          </p>
        </section>

        <section className="settings__group">
          <h3>Som</h3>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.sounds}
              onChange={(e) => onChange({ sounds: e.target.checked })}
            />
            <span>Sons de interface (earcons)</span>
          </label>
          <p className="settings__note">
            Sons curtos e sintetizados marcam passo da varredura, seleção e troca de prancha.
            Os motivos se distinguem primeiro pelo <strong>ritmo</strong> — a característica
            que ouvintes reconhecem com mais facilidade — e só depois pela altura. Envelope
            suave, sem ataque abrupto, para não incomodar quem tem hipersensibilidade
            auditiva. Desligado por padrão.
          </p>
        </section>

        <section className="settings__group">
          <h3>Frases</h3>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.grammar}
              onChange={(e) => onChange({ grammar: e.target.checked })}
            />
            <span>Compor frase em português</span>
          </label>
          <p className="settings__note">
            Transforma a seleção de cards em frase flexionada — "eu&nbsp;querer&nbsp;água" vira
            "Eu quero água". O motor conjuga o verbo, concorda o adjetivo e insere artigo e
            preposição; <strong>nunca acrescenta palavra de conteúdo e nunca reordena</strong> o
            que a pessoa escolheu. O que ele acrescentou aparece marcado na barra da frase, e
            desligar aqui volta à fala literal a qualquer momento.
          </p>
          <label className="field">
            <span>Concordância na 1ª pessoa</span>
            <select
              value={settings.speakerGender}
              onChange={(e) =>
                onChange({ speakerGender: e.target.value as Settings['speakerGender'] })
              }
            >
              <option value="n">Não flexionar</option>
              <option value="f">Feminino — "estou cansada"</option>
              <option value="m">Masculino — "estou cansado"</option>
            </select>
          </label>
          <p className="settings__note">
            O português não tem forma neutra de adjetivo: quem diz "estou cansad__" precisa
            escolher. Sem este ajuste o app mantém a forma não marcada em vez de presumir pela
            pessoa.
          </p>
          <label className="field">
            <span>Como se fala na sua região</span>
            <select
              value={settings.region}
              onChange={(e) => onChange({ region: e.target.value as Settings['region'] })}
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <p className="settings__note">
            {REGIONS.find((r) => r.id === settings.region)?.hint}
          </p>
          <p className="settings__note">
            O rótulo de um card não é legenda — é a palavra que a pessoa vai dizer e que ouve em
            casa. Uma criança do Recife que aponta a mandioca e ouve "mandioca" recebe um modelo
            de língua que não é o da família dela. Nenhuma variedade é mais correta que outra; o
            padrão de um app nacional acaba sendo o Sudeste por inércia, e isso é uma escolha,
            não um fato.
          </p>

          <label className="field">
            <span>Registro</span>
            <select
              value={settings.register}
              onChange={(e) => onChange({ register: e.target.value as Settings['register'] })}
            >
              <option value="coloquial">Como se fala — "pra", "abre a porta"</option>
              <option value="normativo">Como a escola cobra — "para", "abra a porta"</option>
            </select>
          </label>
          <p className="settings__note">
            As duas formas existem e nenhuma é erro. O coloquial serve à conversa do dia a dia; o
            normativo existe para contexto escolar, onde a pessoa pode precisar da forma que a
            professora espera. Com "tu", muda também o verbo: <em>tu quer</em> no coloquial,{' '}
            <em>tu queres</em> no normativo.
          </p>

          <label className="field">
            <span>Cor por classe de palavra</span>
            <select
              value={settings.wordColors}
              onChange={(e) => onChange({ wordColors: e.target.value as Settings['wordColors'] })}
            >
              <option value="off">Desligada</option>
              <option value="border">Só na borda</option>
              <option value="fill">Borda e fundo</option>
            </select>
          </label>
          <p className="settings__note">
            Chave de Fitzgerald modificada, a convenção mais difundida em CAA: amarelo para
            quem, verde para o que faz, azul para como é, laranja para as coisas, roxo para
            perguntas. A cor nunca é a única pista — o rótulo escrito continua lá. Desligada por
            padrão, porque cor a mais também é estímulo a mais.
          </p>
        </section>

        <section className="settings__group">
          <h3>Leitura e cor</h3>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.dyslexia}
              onChange={(e) => onChange({ dyslexia: e.target.checked })}
            />
            <span>Tipografia para dislexia</span>
          </label>
          <p className="settings__note">
            Fonte sem serifa, corpo maior, entreletras e entrelinhas aumentadas, linhas mais
            curtas, itálico convertido em negrito. Segue o <em>Dyslexia Style Guide</em> da
            British Dyslexia Association.
          </p>

          <label className="field">
            <span>Fonte</span>
            <select
              value={settings.font}
              onChange={(e) => onChange({ font: e.target.value as Settings['font'] })}
            >
              <option value="auto">Automática</option>
              <option value="verdana">Verdana</option>
              <option value="tahoma">Tahoma</option>
              <option value="century">Century Gothic</option>
              <option value="comic">Comic Sans</option>
            </select>
          </label>
          <p className="settings__note">
            Todas são fontes do sistema — nenhuma é baixada, para o app continuar funcionando
            offline. Comic Sans está na lista porque o guia da BDA a recomenda (formas de letra
            menos ambíguas). Fontes vendidas especificamente "para dislexia" têm evidência fraca
            e contestada; o ganho documentado está no espaçamento, não no desenho da letra — por
            isso os controles abaixo.
          </p>

          <label className="field">
            <span>Tamanho do texto — {Math.round(settings.textScale * 100)}%</span>
            <input
              type="range"
              min={0.9}
              max={1.5}
              step={0.05}
              value={settings.textScale}
              onChange={(e) => onChange({ textScale: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>
              Entreletras — {settings.letterSpacing === 0 ? 'automática' : `${settings.letterSpacing.toFixed(3)} em`}
            </span>
            <input
              type="range"
              min={0}
              max={0.12}
              step={0.005}
              value={settings.letterSpacing}
              onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>
              Entrelinhas — {settings.lineHeight === 0 ? 'automática' : settings.lineHeight.toFixed(2)}
            </span>
            <input
              type="range"
              min={0}
              max={2.2}
              step={0.05}
              value={settings.lineHeight}
              // Zero e "automatico"; qualquer valor entre 0 e 1,3 seria pior que
              // o padrao do tema, entao a faixa colapsa de volta ao automatico.
              onChange={(e) => {
                const v = Number(e.target.value)
                onChange({ lineHeight: v > 0 && v < 1.3 ? 0 : v })
              }}
            />
          </label>
          <p className="settings__note">
            No zero, cada controle devolve o valor que o tema já usava. Entrelinhas abaixo de 1,3
            não são oferecidas: linhas apertadas são justamente o que a leitura com dislexia
            perde de vista.
          </p>

          <label className="field">
            <span>Conforto sensorial — {settings.sensory === 0 ? 'desligado' : `${settings.sensory}%`}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.sensory}
              onChange={(e) => onChange({ sensory: Number(e.target.value) })}
            />
          </label>
          <p className="settings__note">
            Dessatura e esfria a paleta de forma contínua: quanto mais alto, mais o verde vivo
            vira sage e o branco dos cards vira creme. É contínuo, e não um liga/desliga, porque
            a literatura é clara em que a sensibilidade a cor varia por pessoa — vermelhos,
            laranjas e branco puro são os que mais sobrecarregam, mas o ponto exato é individual.
            Com alto contraste ligado, este ajuste não se aplica.
          </p>
        </section>

        <section className="settings__group">
          <h3>Tela</h3>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.theme === 'light'}
              onChange={(e) => onChange({ theme: e.target.checked ? 'light' : 'dark' })}
            />
            <span>Tema claro</span>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => onChange({ highContrast: e.target.checked })}
            />
            <span>Alto contraste</span>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.locked}
              onChange={(e) => onChange({ locked: e.target.checked })}
            />
            <span>Modo bloqueado</span>
          </label>
          <p className="settings__note">
            O modo bloqueado esconde busca e configurações, deixando só a prancha. As frases
            prontas continuam acessíveis: elas são fala, não controle de cuidador, e incluem
            "preciso de ajuda" e "estou com dor". Para sair, mantenha pressionado o cadeado por 2
            segundos.
          </p>
        </section>

        <section className="settings__group">
          <h3>Perfil</h3>
          <p className="settings__note">
            Chegar no ajuste certo é trabalho clínico: velocidade de varredura, voz, colunas,
            conforto sensorial e vocabulário favorito levam semanas. Como o app é offline e não
            tem conta, tudo isso mora só neste navegador — e some com ele. O arquivo abaixo é a
            cópia de segurança, e também o caminho para levar o mesmo perfil da escola para casa.
          </p>
          <p className="settings__note">
            Vão no arquivo: todos os ajustes, {favorites.length}{' '}
            {favorites.length === 1 ? 'favorito' : 'favoritos'}, {phrases.length}{' '}
            {phrases.length === 1 ? 'frase salva' : 'frases salvas'}, {scripts.length}{' '}
            {scripts.length === 1 ? 'roteiro' : 'roteiros'}, as pranchas que você criou e todas
            as edições de card. O histórico do que foi dito não vai — é conversa, não
            configuração.
          </p>
          <button type="button" className="btn btn--ghost btn--wide" onClick={download}>
            ⭳ Exportar perfil
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--wide"
            onClick={() => fileInput.current?.click()}
          >
            ⭱ Importar perfil
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) upload(f)
              e.target.value = ''
            }}
          />
          {transfer && (
            <p className="settings__note" role="status">
              {transfer}
            </p>
          )}
          <p className="settings__note">
            Importar <strong>substitui</strong> os ajustes, os favoritos e as frases salvas deste
            aparelho.
          </p>
        </section>

        <section className="settings__group">
          <h3>Créditos</h3>
          <p className="settings__note">
            Pictogramas: <strong>Sergio Palao</strong> para{' '}
            <a href="https://arasaac.org" target="_blank" rel="noreferrer">
              ARASAAC
            </a>
            , Governo de Aragão — licença{' '}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt_BR"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-NC-SA
            </a>
            . Uso não comercial.
          </p>
        </section>
      </div>
    </Dialog>
  )
}
