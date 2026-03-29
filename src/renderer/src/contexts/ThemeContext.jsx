/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('hypertopia-theme-v2') || 'light')

  // On mount: read from config file (file = source of truth, overrides localStorage)
  useEffect(() => {
    window.api.storeRead?.('hypertopia-config.json').then((config) => {
      if (config?.appThemeV2) {
        setTheme(config.appThemeV2)
        localStorage.setItem('hypertopia-theme-v2', config.appThemeV2)
      }
    })
  }, [])

  useEffect(() => {
    let intervalId = null

    const applyTheme = (newTheme) => {
      if (newTheme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.classList.toggle('dark', isDark)
      } else if (newTheme === 'auto') {
        const hour = new Date().getHours()
        const isNight = hour >= 18 || hour < 6
        document.documentElement.classList.toggle('dark', isNight)
      } else {
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
      }
    }

    applyTheme(theme)
    localStorage.setItem('hypertopia-theme-v2', theme)
    // Persist to config file (read-modify-write)
    window.api.storeRead?.('hypertopia-config.json').then((config) => {
      window.api.storeWrite?.('hypertopia-config.json', { ...(config || {}), appThemeV2: theme })
    })

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('system')
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else if (theme === 'auto') {
      // Check every minute if we need to switch (e.g., passing 18:00 or 06:00)
      intervalId = setInterval(() => {
        applyTheme('auto')
      }, 60000)
      return () => clearInterval(intervalId)
    }
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
