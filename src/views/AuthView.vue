<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@vueuse/head' 
import { useI18n } from 'vue-i18n'     
import { useRoute } from 'vue-router'  
import AuthForm from '../components/AuthForm.vue'
import ThemeLangSwitch from '../components/ui/ThemeLangSwitch.vue'

const { t } = useI18n()
const route = useRoute()

const pageTitle = computed(() => {
  return route.query.mode === 'signup' ? t('nav.signup') : t('nav.signin')
})

useHead({
  title: pageTitle,
  meta: [
    { name: 'description', content: 'Access your Verdia dashboard securely.' },
    { name: 'robots', content: 'noindex, nofollow' } 
  ]
})
</script>

<template>
    <div class="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-full hero-bg-grid opacity-60"></div>
        <div class="absolute top-[-10%] right-[-10%] w-125 h-125 bg-purple-500/10 rounded-full blur-[100px]"></div>
        <div class="absolute bottom-[-10%] left-[-10%] w-125 h-125 bg-blue-500/10 rounded-full blur-[100px]"></div>
    </div>

    <nav class="auth-nav absolute top-5 left-0 right-0 px-[5%] max-w-300 mx-auto flex justify-between items-center z-51">
    <router-link to="/" class="nav-logo-container flex items-center">
        <img src="/images/logodark.png" alt="Logo" class="h-7 w-auto block dark:hidden">
        <img src="/images/logolight.png" alt="Logo" class="h-7 w-auto hidden dark:block">
    </router-link>
    
    <div class="nav-actions flex items-center">
        <ThemeLangSwitch />
    </div>
</nav>

    <main class="auth-container min-h-screen flex flex-col items-center justify-center pt-25 pb-10 px-5 relative z-10">
        <AuthForm />
        <footer class="auth-footer-links text-[0.8rem] text-text-sub flex gap-5 flex-wrap justify-center mt-15">
             <router-link to="/terms" class="text-text-sub no-underline hover:text-text-primary">{{ $t('auth.footer.terms') }}</router-link>
             <router-link to="/terms#privacy" class="text-text-sub no-underline hover:text-text-primary">{{ $t('auth.footer.privacy') }}</router-link>
             <router-link to="/terms#cookies" class="text-text-sub no-underline hover:text-text-primary">{{ $t('auth.footer.cookies') }}</router-link>
             <router-link to="/terms#registration" class="text-text-sub no-underline hover:text-text-primary">{{ $t('auth.footer.legal') }}</router-link>
        </footer>
    </main>
</template>