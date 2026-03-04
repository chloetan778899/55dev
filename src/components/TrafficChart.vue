<script setup lang="ts">
import { ref, watch, onUnmounted, toRef } from 'vue'

const props = defineProps<{
  isHovered: boolean
}>()

const width = 340
const height = 180
const pointsCount = 8

const generateData = () => Array.from({ length: pointsCount }, () => Math.random() * 50 + 20)
let data = generateData()
let targetData = generateData()
const pathD = ref('')
let animationFrame: number

const getPath = (dataPoints: number[]) => {
  const step = width / (pointsCount - 1)
  let d = `M 0,${height} `
  d += `L 0,${height - dataPoints[0]} `
  for (let i = 0; i < dataPoints.length - 1; i++) {
    const x0 = i * step
    const y0 = height - dataPoints[i]
    const x1 = (i + 1) * step
    const y1 = height - dataPoints[i + 1]
    const cpx1 = x0 + step * 0.5
    const cpx2 = x1 - step * 0.5
    d += `C ${cpx1},${y0} ${cpx2},${y1} ${x1},${y1} `
  }
  d += `L ${width},${height} Z`
  return d
}

pathD.value = getPath(data)

const animate = () => {
  let changed = false
  for (let i = 0; i < pointsCount; i++) {
    const diff = targetData[i] - data[i]
    if (Math.abs(diff) > 0.5) {
      data[i] += diff * 0.05
      changed = true
    }
  }
  
  if (!changed) {
    targetData = generateData()
  }

  pathD.value = getPath(data)
  
  if (props.isHovered) {
    animationFrame = requestAnimationFrame(animate)
  }
}

watch(() => props.isHovered, (newVal) => {
  if (newVal) {
    animate()
  } else {
    cancelAnimationFrame(animationFrame)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <div class="w-full h-full relative overflow-hidden flex items-end">
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-full preserve-3d">
      <defs>
        <linearGradient id="yellowGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(243, 223, 80, 0.5)" />
          <stop offset="100%" stop-color="rgba(243, 223, 80, 0)" />
        </linearGradient>
      </defs>
      <path 
        :d="pathD" 
        fill="url(#yellowGradient)" 
        stroke="#f3df50" 
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="transition-[d] duration-75 ease-linear"
      />
    </svg>
  </div>
</template>