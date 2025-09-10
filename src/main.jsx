import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'  // Adicione esta linha
import './index.css'
import App from './App.jsx'
import './styles/variables.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>  {/* Adicione este wrapper */}
      <App />
    </BrowserRouter>
  </StrictMode>,
)