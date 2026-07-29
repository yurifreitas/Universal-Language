import { useEffect, useState } from 'react'
import type { Settings } from '../types'
import { loadVoices, portugueseVoices, speak } from '../lib/speech'
import { Dialog } from './Dialog'

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onClose: () => void
}

export function SettingsPanel({ settings, onChange, onClose }: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

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
            O modo bloqueado esconde busca e configurações, deixando só a prancha. Para sair,
            mantenha pressionado o cadeado por 2 segundos.
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
