<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const closeDialog = () => {
  emit('update:modelValue', false);
};
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div 
        v-if="modelValue" 
        class="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto dialog-overlay"
        @click.self="closeDialog"
      >
        <div class="relative w-full max-w-4xl max-h-[85dvh] sm:max-h-[90dvh] dialog-content flex flex-col">
            
          <button 
            @click="closeDialog" 
            class="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full border-2 border-black/20 dark:border-white/20 bg-white/80 dark:bg-[#111]/80 backdrop-blur-md text-black dark:text-white hover:scale-105 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all shadow-sm"
            aria-label="Close dialog"
          >
            <span class="material-icons-round text-xl">close</span>
          </button>

          <div class="w-full max-h-full flex flex-col md:flex-row bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-2xl overflow-y-auto md:overflow-hidden shadow-black/50">
            
            <div class="w-full md:w-1/2 shrink-0 bg-[#e9edfc] dark:bg-[#0c1f7b]/20 flex items-center justify-center py-12 sm:py-16 md:p-8 border-b md:border-b-0 md:border-r border-black/5 dark:border-white/5">
              <img 
                src="/images/rewards.webp" 
                alt="Special Reward" 
                class="w-full max-w-28 sm:max-w-32 md:max-w-44 object-contain drop-shadow-2xl"
                loading="lazy"
              />
            </div>

            <div class="w-full md:w-1/2 md:overflow-y-auto p-6 sm:p-8 md:p-10 flex flex-col">
              
              <div class="space-y-4">
                <span class="inline-block px-3 py-1 bg-[#4269e2]/10 dark:bg-[#cdd9fe]/10 text-[#4269e2] dark:text-[#cdd9fe] text-xs font-bold uppercase tracking-wider rounded-full border border-[#4269e2]/20">
                  {{ t('dashboard.special_rewards.badge') }}
                </span>
                
                <h2 class="text-2xl font-extrabold text-black dark:text-white wrap-break-word tracking-tight leading-snug">
                  {{ t('dashboard.special_rewards.title') }}
                </h2>
                
                <div class="space-y-4 text-[14px] md:text-[15px] text-[#666] dark:text-[#aaa] leading-relaxed wrap-break-word pb-4">
                  <p>
                    {{ t('dashboard.special_rewards.desc_1') }}
                  </p>
                  
                  <div class="bg-[#fafafa] dark:bg-[#111] border border-black/5 dark:border-white/5 p-4 rounded-lg">
                    <strong class="text-black dark:text-[#eee] text-[15px]">
                      {{ t('dashboard.special_rewards.how_it_works') }}
                    </strong>
                    <ul class="list-disc pl-5 mt-2 space-y-1.5 marker:text-[#4269e2] dark:marker:text-[#cdd9fe]">
                      <li>{{ t('dashboard.special_rewards.rule_1') }}</li>
                      <li>{{ t('dashboard.special_rewards.rule_2') }}</li>
                      <li>{{ t('dashboard.special_rewards.rule_3') }}</li>
                    </ul>
                  </div>
                  
                  <p v-html="t('dashboard.special_rewards.desc_2')"></p>
                  
                  <p class="text-[13px] opacity-90">
                    {{ t('dashboard.special_rewards.disclaimer') }}
                  </p>
                  
                  <p class="font-medium text-black dark:text-[#eee] italic pt-2">
                    {{ t('dashboard.special_rewards.closing') }}
                  </p>
                </div>
              </div>
              
            </div>
          </div>
        </div> 
        
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: opacity;
}

.dialog-fade-enter-active .dialog-content,
.dialog-fade-leave-active .dialog-content {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog-content,
.dialog-fade-leave-to .dialog-content {
  transform: scale(0.95) translateY(10px);
}
</style>