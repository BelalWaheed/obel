import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { scrubLocalStorage } from './lib/storage'

// Clean any legacy localStorage keys on startup
scrubLocalStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
