import './assets/main.css'
import './utils/loadIcons' // Load icons for offline use

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { GamesProvider } from './contexts/GamesContext'

import { ToastProvider } from './components/Toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <GamesProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </GamesProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>
)

