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
    let timeoutId = null

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
      const scheduleNextSwitch = () => {
        const now = new Date()
        const nextSwitch = new Date(now)
        if (now.getHours() < 6) {
          nextSwitch.setHours(6, 0, 0, 0)
        } else if (now.getHours() < 18) {
          nextSwitch.setHours(18, 0, 0, 0)
        } else {
          nextSwitch.setDate(nextSwitch.getDate() + 1)
          nextSwitch.setHours(6, 0, 0, 0)
        }

        timeoutId = setTimeout(
          () => {
            applyTheme('auto')
            scheduleNextSwitch()
          },
          Math.max(1000, nextSwitch - now)
        )
      }

      scheduleNextSwitch()
      return () => clearTimeout(timeoutId)
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
