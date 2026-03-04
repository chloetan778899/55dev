<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const steps = computed(() => [
  {
    id: 'firewall',
    title: t('home.security.firewall.title'),
    subtitle: t('home.security.firewall.subtitle'),
    description: t('home.security.firewall.desc'),
    icon: 'security',
    activeClass: 'border-green-500/50 shadow-[0_10px_40px_-10px_rgba(34,197,94,0.1)]',
    iconClass: 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400',
    dotClass: 'bg-green-500 shadow-[0_0_8px_#22c55e]',
    mobileBorder: 'bg-green-500'
  },
  {
    id: 'waf',
    title: t('home.security.waf.title'),
    subtitle: t('home.security.waf.subtitle'),
    description: t('home.security.waf.desc'),
    icon: 'public', 
    activeClass: 'border-blue-500/50 shadow-[0_10px_40px_-10px_rgba(59,130,246,0.1)]',
    iconClass: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    dotClass: 'bg-blue-500 shadow-[0_0_8px_#3b82f6]',
    mobileBorder: 'bg-blue-500'
  },
  {
    id: 'workspace',
    title: t('home.security.workspace.title'),
    subtitle: t('home.security.workspace.subtitle'),
    description: t('home.security.workspace.desc'),
    icon: 'admin_panel_settings',
    activeClass: 'border-violet-500/50 shadow-[0_10px_40px_-10px_rgba(139,92,246,0.1)]',
    iconClass: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    dotClass: 'bg-violet-500 shadow-[0_0_8px_#8b5cf6]',
    mobileBorder: 'bg-violet-500'
  }
])

const currentStep = ref(0)
const textRefs = ref<HTMLElement[]>([])

let observer: IntersectionObserver | null = null

onMounted(() => {
  const options = {
    root: null,
    rootMargin: '-10% 0px -10% 0px',
    threshold: 0
  }

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        currentStep.value = Number(entry.target.getAttribute('data-index'))
      }
    })
  }, options)

  textRefs.value.forEach((el) => {
    if (el) observer?.observe(el)
  })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <section class="relative w-full py-12 lg:py-0 bg-bg-body">
    
    <div class="lg:flex w-full max-w-7xl mx-auto">
      
      <div class="hidden lg:flex lg:w-1/2 h-screen sticky top-0 items-center justify-center p-10">
        
        <div class="relative w-full max-w-md flex flex-col items-center">
          
          <div class="mb-4 text-xs font-mono uppercase tracking-widest text-text-sub opacity-50">
            Incoming Traffic
          </div>
          
          <div class="absolute top-8 bottom-8 w-0.5 bg-border z-0 overflow-hidden">
             <div class="w-full bg-text-primary transition-[height] duration-700 ease-in-out"
                  :style="{ height: `${(currentStep + 1) * 34}%` }"></div>
          </div>

          <div v-for="(step, index) in steps" :key="step.id"
               class="relative z-10 w-72 p-5 mb-8 rounded-2xl border bg-bg-card transition-[transform,opacity,box-shadow,border-color] duration-500 ease-out"
               :class="currentStep >= index 
                  ? `${step.activeClass} translate-y-0 opacity-100` 
                  : 'border-border opacity-50 translate-y-4'">
              
              <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                       :class="currentStep >= index ? step.iconClass : 'bg-gray-100 text-gray-400 dark:bg-white/5'">
                      <span class="material-icons-round">{{ step.icon }}</span>
                  </div>
                  
                  <div class="flex flex-col">
                      <span class="text-xs font-bold uppercase tracking-wider text-text-sub">Layer {{ index + 1 }}</span>
                      <span class="font-semibold text-text-primary">{{ step.title }}</span>
                  </div>
              </div>

              <div class="absolute top-5 right-5 w-2 h-2 rounded-full"
                   :class="currentStep >= index ? step.dotClass : 'bg-gray-300 dark:bg-gray-700'"></div>
          </div>

        </div>
      </div>

      <div class="w-full lg:w-1/2 flex flex-col relative z-10 lg:block">
        
        <div 
          v-for="(step, index) in steps" 
          :key="step.id"
          :data-index="index"
          :ref="(el) => textRefs[index] = el as HTMLElement"
          
          class="flex w-full relative opacity-100
                 /* Mobile: Normal padding */
                 min-h-auto py-8 px-4
                 /* Desktop: 100vh + Left Align + Vertical Positioning */
                 lg:flex-col lg:items-start lg:text-left lg:pl-20 lg:pr-10 lg:min-h-screen"
          
          :class="[
            index === 0 
               ? 'lg:justify-start lg:pt-[25vh]'
               : index === steps.length - 1 
                  ? 'lg:justify-end lg:pb-[25vh]'
                  : 'lg:justify-center'
          ]"
        >
          
          <div class="lg:hidden flex-none w-10.5 flex flex-col items-center mr-5 relative z-10">
              <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-colors duration-500 bg-bg-body"
                  :class="currentStep >= index ? step.iconClass : 'border border-border text-text-sub'">
                  <span class="material-icons-round text-lg">{{ step.icon }}</span>
              </div>
              </div>
          
          <div class="flex-1 min-w-0">
            <div class="hidden lg:flex items-center gap-3 mb-6">
                <span class="font-mono text-sm font-bold uppercase tracking-widest opacity-80"
                      :class="{
                        'text-green-500': index === 0,
                        'text-blue-500': index === 1,
                        'text-violet-500': index === 2,
                        'text-text-sub': currentStep !== index
                      }">
                  0{{ index + 1 }}
                </span>
                <div class="h-px w-10 bg-border"></div>
            </div>

            <h2 class="text-2xl md:text-[2rem] font-bold text-text-primary mb-2 lg:mb-4 tracking-[-0.03em] leading-tight">
              {{ step.title }}
            </h2>
            
            <h3 class="text-lg md:text-xl text-text-main font-medium mb-3 lg:mb-4">
              {{ step.subtitle }}
            </h3>

            <p class="text-base text-text-sub leading-[1.6] max-w-lg">
              {{ step.description }}
            </p>
          </div>

        </div>
      </div>

    </div>
  </section>
</template>