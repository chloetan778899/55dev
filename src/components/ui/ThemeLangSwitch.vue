<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { loadLocaleMessages } from '../../i18n'

const { isDark, toggleTheme } = useTheme()
const { locale } = useI18n()
const isOpen = ref(false)
const isLoading = ref(false)

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pt', label: 'Português' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'zh-HK', label: '繁體中文 (香港)' },
]

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectLanguage = async (code: string) => {
  if (locale.value === code) {
    isOpen.value = false
    return
  }

  try {
    isLoading.value = true
    await loadLocaleMessages(code)
    isOpen.value = false
  } catch (e) {
    console.error('Failed to load language', e)
  } finally {
    isLoading.value = false
  }
}

const closeDropdown = () => {
  if (isOpen.value) {
    isOpen.value = false
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button 
      @click="toggleTheme" 
      class="w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1a1b1e] focus:outline-none transition-colors"
      aria-label="Toggle Dark Mode"
    >
      <span class="material-icons-round text-text-main text-xl transition-transform duration-150" :class="{ 'rotate-180': isDark }">
        {{ isDark ? 'light_mode' : 'dark_mode' }}
      </span>
    </button>

    <div class="relative" v-click-outside="closeDropdown">
      <button 
        @click="toggleDropdown" 
        class="w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1a1b1e] focus:outline-none transition-colors"
        :class="{ 'bg-gray-100 dark:bg-[#1a1b1e]': isOpen }"
        aria-label="Select Language"
        :disabled="isLoading"
      >
        <span v-if="isLoading" class="material-icons-round text-text-main text-xl animate-spin">sync</span>
        <span v-else class="material-icons-round text-text-main text-xl">language</span>
      </button>

      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0 -translate-y-2"
        enter-to-class="transform scale-100 opacity-100 translate-y-0"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100 translate-y-0"
        leave-to-class="transform scale-95 opacity-0 -translate-y-2"
      >
        <div 
          v-if="isOpen" 
          class="absolute right-0 mt-2 w-48 py-2 bg-white dark:bg-[#08090a] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 origin-top-right"
        >
          <div class="max-h-[60vh] overflow-y-auto custom-scrollbar">
            <button
              v-for="lang in languages"
              :key="lang.code"
              @click="selectLanguage(lang.code)"
              class="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-[#1a1b1e]"
              :class="locale === lang.code ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200'"
            >
              <span>{{ lang.label }}</span>
              <span 
                v-if="locale === lang.code" 
                class="material-icons-round text-sm"
              >check</span>
            </button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>