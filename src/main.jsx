import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/vars.css'
import { ToastProvider } from './components/Toast/Toast'
import App from './App.jsx'

if ('serviceWorker' in navigator) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then(reg => reg?.update())
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
