<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { tm } = useI18n()

const openQuestion = ref<string | null>(null)

const toggle = (id: string) => {
  openQuestion.value = openQuestion.value === id ? null : id
}

const faqData = computed(() => {
  return tm('faqData') as any[]
})
</script>

<template>
  <div class="w-full space-y-8">
    <div v-for="(section, index) in faqData" :key="index" class="w-full">
      <h3 class="text-[12px] font-semibold text-[#666] dark:text-[#a1a1a1] uppercase tracking-wider mb-3">
        {{ section.category }}
      </h3>
      
      <div class="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-[#0a0a0a]">
        <div 
          v-for="(item, itemIndex) in section.items" 
          :key="item.id"
          class="border-b border-black/5 dark:border-white/5 last:border-b-0"
        >
          <button 
            @click="toggle(item.id)"
            class="w-full flex items-center justify-between p-4 text-left hover:bg-[#fafafa] dark:hover:bg-[#111] transition-colors focus:outline-none"
          >
            <span class="text-[14px] font-medium text-black dark:text-white pr-4">
              {{ item.question }}
            </span>
            <span 
              class="material-icons-round text-[#666] dark:text-[#a1a1a1] transform transition-transform duration-200"
              :class="{ 'rotate-180': openQuestion === item.id }"
            >
              expand_more
            </span>
          </button>
          
          <div 
            v-show="openQuestion === item.id"
            class="px-4 pb-4 pt-1 text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed bg-white dark:bg-[#0a0a0a]"
          >
            {{ item.answer }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>