<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const stats = ref([
  { target: 750, suffix: 'B', current: '0', textKey: 'home.stats.lines_code', isFloat: false },
  { target: 35, suffix: '+', current: '0', textKey: 'home.stats.languages', isFloat: false },
  { target: 1, suffix: 'B', current: '0', textKey: 'home.stats.downloads', isFloat: true }
])

const statsRef = ref<HTMLElement | null>(null)
let animationFrameId: number
let observer: IntersectionObserver | null = null

const startCounting = () => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  const duration = 2000 
  let startTime: number | null = null

  const animate = (timestamp: number) => {
    if (!startTime) startTime = timestamp
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)

    stats.value.forEach(stat => {
      if (stat.isFloat) {
        const val = (stat.target * progress).toFixed(1)
        stat.current = (progress === 1) ? stat.target.toString() : val
      } else {
        const val = Math.floor(stat.target * progress)
        stat.current = val.toString()
      }
    })

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate)
    }
  }
  animationFrameId = requestAnimationFrame(animate)
}

onMounted(async () => {
  await nextTick()
  
  if (!statsRef.value) return

  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      startCounting()
      if (observer) observer.disconnect() 
    }
  }, { threshold: 0.1 }) 

  observer.observe(statsRef.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
})
</script>

<template>
  <div ref="statsRef" class="stats-container w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center px-4">
    <div v-for="(stat, index) in stats" :key="index" class="stat-item flex flex-col items-center">
      <h3 class="stat-number font-mono text-[3rem] md:text-[3.5rem] font-normal text-text-primary m-0 mb-2.5 leading-none tracking-[-1px] opacity-90 min-h-[1em]">
        {{ stat.current }}{{ stat.suffix }}
      </h3>
      <p class="text-base text-text-sub leading-[1.4] max-w-50 m-0">
        {{ $t(stat.textKey) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.stat-number { font-variant-numeric: tabular-nums; }
</style>