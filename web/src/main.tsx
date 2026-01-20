import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply stored accent color immediately
const storedAccent = localStorage.getItem('agent_accent_color');
if (storedAccent) {
  document.documentElement.style.setProperty('--color-terminal-accent', storedAccent);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
