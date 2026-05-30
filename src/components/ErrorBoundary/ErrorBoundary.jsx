import { Component } from 'react'
import s from './ErrorBoundary.module.css'

// Fängt Render-Fehler in einem Tab/Tool ab, damit nie die ganze App weiß wird.
// Wird mit key={currentTab} gemountet → Tab-Wechsel setzt den Fehler automatisch zurück.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Stiller Log — Daten bleiben im localStorage unangetastet.
    console.error('Tool-Crash abgefangen:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className={s.wrap}>
          <div className={s.icon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 className={s.title}>Hier ist etwas abgestürzt</h2>
          <p className={s.text}>
            Deine Daten sind sicher gespeichert. Wechsle den Tab oder lade die App neu.
          </p>
          <button className={s.btn} onClick={() => window.location.reload()}>
            App neu laden
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
