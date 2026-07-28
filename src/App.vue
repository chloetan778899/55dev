<script setup lang="ts">
import { useHead } from '@vueuse/head'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

useHead({
  titleTemplate: (title) => title ? `${title} | Celtra` : t('home.meta.title'), 
  
  meta: [
    { name: 'description', content: () => t('home.meta.description') },
    { name: 'author', content: 'SevenAtoms Marketing Inc' },
    { property: 'og:site_name', content: 'SevenAtoms Marketing Inc' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#0d0d0d', media: '(prefers-color-scheme: dark)' }
  ]
})
</script>

<template>
  <router-view />
</template>
