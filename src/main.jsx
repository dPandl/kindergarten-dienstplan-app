import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Standard-Browser-Kontextmenü global unterbinden (außer in Eingabefeldern für Kopieren/Einfügen)
window.addEventListener('contextmenu', (e) => {
  if (e.target && typeof e.target.closest === 'function') {
    if (e.target.closest('input, textarea, [contenteditable="true"]')) {
      return;
    }
  }
  e.preventDefault();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
