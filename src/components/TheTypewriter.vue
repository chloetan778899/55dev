<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  words?: string[]
}>()

const { t } = useI18n()

const wordsList = computed(() => props.words || [
  t('home.partners.typewriter.web_apps'),
  t('home.partners.typewriter.ecommerce'),
  t('home.partners.typewriter.marketing'),
  t('home.partners.typewriter.education'),
  t('home.partners.typewriter.security'),
  t('home.partners.typewriter.finance'),
  t('home.partners.typewriter.healthcare'),
  t('home.partners.typewriter.software'),
  t('home.partners.typewriter.ai')
])

const displayText = ref('')
let wordIndex = 0
let charIndex = 0
let isDeleting = false
let timeoutId: number

const typeLoop = () => {
  const currentWord = wordsList.value[wordIndex]
  
  if (!currentWord) return

  if (isDeleting) {
    displayText.value = currentWord.substring(0, charIndex - 1)
    charIndex--
  } else {
    displayText.value = currentWord.substring(0, charIndex + 1)
    charIndex++
  }

  let typeSpeed = isDeleting ? 50 : 150
  if (!isDeleting && charIndex === currentWord.length) {
    typeSpeed = 2000
    isDeleting = true
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false
    wordIndex = (wordIndex + 1) % wordsList.value.length
    typeSpeed = 500
  }
  timeoutId = window.setTimeout(typeLoop, typeSpeed)
}

watch(wordsList, () => {
  clearTimeout(timeoutId)
  wordIndex = 0
  charIndex = 0
  isDeleting = false
  displayText.value = ''
  typeLoop()
})

onMounted(() => {
  typeLoop()
})

onUnmounted(() => {
  clearTimeout(timeoutId)
})
</script>

<template>
  <span>{{ displayText }}</span>
</template>