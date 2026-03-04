<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const features = computed(() => [
  { 
    id: 'assign',
    code: 'ai-suggest-assignee', 
    filterClass: 'saturate-150', 
    icon: 'person_add',
    header: t('home.fluid.assign.header'),
    sub: t('home.fluid.assign.sub'),
    action: t('home.fluid.assign.action')
  },
  { 
    id: 'label',
    code: 'auto-label-content', 
    filterClass: 'contrast-125', 
    icon: 'label',
    header: t('home.fluid.label.header'),
    sub: t('home.fluid.label.sub'),
    action: t('home.fluid.label.action')
  },
  { 
    id: 'route',
    code: 'smart-team-route', 
    filterClass: 'hue-rotate-15', 
    icon: 'alt_route',
    header: t('home.fluid.route.header'),
    sub: t('home.fluid.route.sub'),
    action: t('home.fluid.route.action')
  }
])

const currentIndex = ref(0)
const cardWidth = 280 
const gap = 40 
const totalItemWidth = cardWidth + gap 
let timer: number

const startCarousel = () => {
  timer = window.setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % features.value.length
  }, 3000)
}

const trackStyle = computed(() => ({
  transform: `translateX(-${(currentIndex.value * totalItemWidth) + (cardWidth / 2)}px)`
}))

onMounted(() => {
  startCarousel()
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <div class="relative w-full h-full overflow-hidden flex flex-col items-center justify-center bg-gray-50 dark:bg-[#050505]">
    
    <div class="absolute inset-0 z-0 opacity-[0.4] pointer-events-none" 
         style="background-image: radial-gradient(#94a3b8 1px, transparent 1px); background-size: 24px 24px;">
    </div>

    <div class="relative z-10 w-full h-125 flex items-center justify-center overflow-hidden pointer-events-none">
        
        <div class="absolute left-1/2 flex gap-10 transition-transform duration-700 cubic-bezier(0.25, 1, 0.5, 1) will-change-transform"
             :style="trackStyle">
             
            <div v-for="(feat, index) in features" :key="index"
                 class="group relative shrink-0 flex flex-col items-center justify-center"
                 :class="{'opacity-100 scale-100 z-10': index === currentIndex, 'opacity-40 scale-90 blur-[2px] z-0': index !== currentIndex}"
                 style="width: 280px;">
                
                <div class="mb-5 font-mono text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-500/30 shadow-sm">
                    {{ feat.code }}
                </div>

                <div class="w-full aspect-4/5 bg-white dark:bg-[#121212] p-4 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-white/10 flex flex-col relative overflow-hidden ring-1 ring-black/5">
                    
                    <div class="relative w-full flex-1 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl overflow-hidden flex flex-col border border-slate-100 dark:border-white/5">
                        
                        <div class="absolute inset-0 bg-linear-to-br from-white/40 to-transparent z-10 pointer-events-none mix-blend-overlay"></div>
                        <div class="absolute inset-0 z-0 opacity-20"
                             :class="feat.filterClass">
                             <div class="w-full h-full bg-linear-to-tr from-blue-500 to-purple-500"></div>
                        </div>

                        <div class="relative z-20 p-5 flex flex-col h-full justify-between">
                            
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-lg bg-white dark:bg-[#222] shadow-sm flex items-center justify-center text-gray-700 dark:text-gray-200">
                                    <span class="material-icons-round text-[18px]">{{ feat.icon }}</span>
                                </div>
                                <div>
                                    <div class="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">{{ $t('home.fluid.ai_detection') }}</div>
                                    <div class="text-xs font-semibold text-gray-800 dark:text-gray-200">{{ feat.header }}</div>
                                </div>
                            </div>

                            <div class="py-4">
                                <div v-if="feat.id === 'assign'" class="flex items-center gap-3 bg-white/60 dark:bg-black/20 p-2 rounded-lg backdrop-blur-sm border border-white/40 dark:border-white/5">
                                    <div class="w-8 h-8 rounded-full bg-linear-to-tr from-pink-400 to-orange-400"></div>
                                    <div class="flex-1">
                                        <div class="h-2 w-16 bg-gray-200 dark:bg-white/20 rounded mb-1"></div>
                                        <div class="h-1.5 w-10 bg-gray-200 dark:bg-white/10 rounded"></div>
                                    </div>
                                    <span class="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">98%</span>
                                </div>

                                <div v-if="feat.id === 'label'" class="flex flex-wrap gap-2">
                                    <span class="px-2 py-1 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">Bug</span>
                                    <span class="px-2 py-1 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50">High</span>
                                    <span class="px-2 py-1 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400 opacity-50 border border-gray-200 dark:border-white/5">UI</span>
                                </div>

                                <div v-if="feat.id === 'route'" class="relative h-12 flex items-center justify-between px-1">
                                    <div class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                    <div class="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-1 relative overflow-hidden">
                                        <div class="absolute inset-0 bg-blue-500 w-1/2 animate-flow-horizontal"></div>
                                    </div>
                                    <div class="px-2 py-1 rounded bg-blue-500 text-white text-[10px] font-bold shadow-md shadow-blue-500/20">Frontend</div>
                                </div>
                            </div>

                            <div class="pt-3 border-t border-gray-100 dark:border-white/5">
                                <div class="text-[10px] text-gray-400 mb-1">{{ feat.sub }}</div>
                                <div class="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    {{ feat.action }}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.animate-flow-horizontal {
    animation: flow-horizontal 1.5s infinite linear;
}

@keyframes flow-horizontal {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
}
</style>