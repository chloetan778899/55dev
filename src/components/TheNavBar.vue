<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
import ThemeLangSwitch from './ui/ThemeLangSwitch.vue'
import { useUserStore } from '@/store/modules/user'

const { isDark } = useTheme()
//const isOpen = ref(false)

//const toggleMenu = (event: Event) => {
//  event.stopPropagation()
//  isOpen.value = !isOpen.value
//}

//const closeMenu = () => {
//  if (isOpen.value) {
//    isOpen.value = false
//  }
//}
</script>

<template>
  <nav 
    id="mainNav" 
    class="fixed top-2.5 left-0 right-0 mx-auto z-1000 w-[95%] max-w-250 flex flex-col md:flex-row items-center justify-between py-2.5 md:py-2 px-3 md:px-4 rounded-2xl bg-white/50 dark:bg-black/40 backdrop-blur-2xl backdrop-saturate-200 border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]"
  >
    
    <div class="w-full md:w-auto flex justify-between items-center">
        <router-link to="/" class="nav-logo-container flex items-center shrink-0" aria-label="Home">
            <img src="/images/logodark.png" alt="Logo" class="h-6 md:h-7 w-auto block dark:hidden">
            <img src="/images/logolight.png" alt="Logo" class="h-6 md:h-7 w-auto hidden dark:block">
        </router-link>

        <ThemeLangSwitch class="md:hidden" />
    </div>

    <div class="w-full md:w-auto flex items-center justify-between md:justify-end gap-2 mt-2.5 md:mt-0 md:ml-auto">
        
        <ThemeLangSwitch class="hidden md:flex mr-2" />
        
        <template v-if="useUserStore().token">
            <router-link to="/dashboard" class="btn-primary w-full md:w-auto bg-btn-bg text-btn-text border-none rounded-lg md:rounded-md font-semibold cursor-pointer text-sm px-4 py-2 hover:opacity-90 transition-opacity duration-300 text-center no-underline leading-tight">
                Start
            </router-link>
        </template>
        
        <template v-else>
            <router-link to="/auth" class="link-btn flex-1 md:flex-none text-text-main font-medium text-[13px] md:text-sm text-center px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl hover:bg-gray-500/10 no-underline whitespace-nowrap">
                {{ $t('nav.signin') }}
            </router-link>
            
            <router-link to="/auth?mode=signup" class="btn-primary flex-1 md:flex-none bg-btn-bg text-btn-text border-none rounded-lg md:rounded-md font-semibold cursor-pointer text-[13px] md:text-sm text-center px-2 md:px-4 py-1.5 md:py-2 hover:opacity-90 transition-opacity duration-300 no-underline whitespace-nowrap leading-tight">
                {{ $t('nav.signup') }}
            </router-link>
        </template>
    </div>

  </nav>
</template>
