import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root ausente')

createRoot(root).render(
  <StrictMode>
    {/* A cerca fica FORA do App: se o que quebrar for o proprio App — carga das
        pranchas, ajustes corrompidos no localStorage — a tela de falha ainda
        aparece, e com ela as frases de urgencia. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
