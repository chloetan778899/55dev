import { createI18n, type Composer } from 'vue-i18n'
import en from './locales/en.json'

const savedLocale = typeof window !== 'undefined' ? localStorage.getItem('locale') : null
const defaultLocale = savedLocale || 'en'

const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en',
  globalInjection: true,
  messages: {
    en
  }
})

export default i18n

export async function loadLocaleMessages(locale: string) {
  const global = i18n.global as unknown as Composer

  if (Object.keys(global.getLocaleMessage(locale)).length > 0) {
    global.locale.value = locale
    return
  }

  try {
    const messages = await import(`./locales/${locale}.json`)
    
    global.setLocaleMessage(locale, messages.default)
    
    global.locale.value = locale
    
    localStorage.setItem('locale', locale)
    
    document.querySelector('html')?.setAttribute('lang', locale)
  } catch (error) {
    console.error(`Failed to load locale: ${locale}`, error)
  }
}

if (defaultLocale !== 'en') {
  loadLocaleMessages(defaultLocale)
}