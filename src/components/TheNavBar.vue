<script setup lang="ts">
import { ref } from 'vue'
import { useTheme } from '../composables/useTheme'
import ThemeLangSwitch from './ui/ThemeLangSwitch.vue'

const { isDark } = useTheme()
const isOpen = ref(false)

const toggleMenu = (event: Event) => {
  event.stopPropagation()
  isOpen.value = !isOpen.value
}

const closeMenu = () => {
  if (isOpen.value) {
    isOpen.value = false
  }
}
</script>

<template>
  <nav 
    v-click-outside="closeMenu"
    id="mainNav" 
    class="fixed top-2.5 left-0 right-0 mx-auto z-1000 w-[95%] max-w-250 flex flex-col md:flex-row items-center justify-between py-2 px-4 rounded-2xl bg-white/50 dark:bg-black/40 backdrop-blur-2xl backdrop-saturate-200 border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-[height] duration-300 ease-in-out data-[state=open]:gap-4 [&.open]:gap-4"
    :data-state="isOpen ? 'open' : 'closed'"
    :class="{ 'open': isOpen }"
  >
    <div class="w-full md:w-auto flex justify-between items-center">
        <router-link to="/" class="nav-logo-container flex items-center" aria-label="Home" @click="closeMenu">
            <img src="/images/logodark.png" alt="Logo" class="h-7 w-auto block dark:hidden">
            <img src="/images/logolight.png" alt="Logo" class="h-7 w-auto hidden dark:block">
        </router-link>

        <div class="mobile-actions flex items-center gap-1 md:hidden">
            <ThemeLangSwitch />
            
            <button @click="toggleMenu" class="icon-btn hamburger bg-transparent border-none cursor-pointer text-text-main flex items-center justify-center w-12 h-12 p-0 rounded-full hover:bg-gray-500/10" aria-label="Menu">
                <span class="material-icons-round">{{ isOpen ? 'close' : 'menu' }}</span>
            </button>
        </div>
    </div>

    <div 
      id="navMenu" 
      class="hidden md:flex flex-col md:flex-row items-center w-full md:w-auto md:grow justify-end md:ml-5 transition-all duration-300"
      :class="{ 'flex! w-full animate-in fade-in': isOpen, 'hidden': !isOpen }"
    >
        <div class="spacer grow hidden md:block"></div>

        <div class="nav-actions flex flex-col md:flex-row w-full md:w-auto items-center gap-3 md:gap-2">
            <ThemeLangSwitch class="hidden md:flex" />
            
            <router-link to="/auth" class="link-btn text-text-main font-medium text-sm w-full md:w-auto text-center px-4 py-3 md:py-2 rounded-xl md:rounded-3xl hover:bg-gray-500/10 no-underline" @click="closeMenu">
                {{ $t('nav.signin') }}
            </router-link>
            <router-link to="/auth?mode=signup" class="btn-primary bg-btn-bg text-btn-text border-none rounded-lg md:rounded-md font-semibold cursor-pointer text-sm w-full md:w-auto px-3.5 py-3 md:py-2 hover:opacity-90 transition-opacity duration-300 whitespace-nowrap text-center no-underline leading-tight" @click="closeMenu">
                {{ $t('nav.signup') }}
            </router-link>
        </div>
    </div>
  </nav>
</template>