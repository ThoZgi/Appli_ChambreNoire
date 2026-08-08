import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { requestPersistentStorage } from './utils/autoBackup'

registerSW({ immediate: true })

// Sans cela le navigateur s'autorise à effacer la base pour récupérer de l'espace.
void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
