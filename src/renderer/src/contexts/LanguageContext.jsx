/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect } from 'react'
import en from '../locales/en.json'
import id from '../locales/id.json'

const LanguageContext = createContext()

const translations = { en, id }

export function LanguageProvider({ children }) {
  // Load saved language from localStorage or default to 'en'
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'id'
  })

  // Save language to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  const t = (key) => {
    return translations[language][key] || key
  }

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'id' : 'en'))
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
