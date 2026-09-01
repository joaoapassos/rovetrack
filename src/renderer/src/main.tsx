import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppRouter } from './router'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento raiz do renderer não encontrado.')

createRoot(rootElement).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>
)
