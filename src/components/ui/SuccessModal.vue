<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';

const props = defineProps<{
  show: boolean;
  title?: string;
  message?: string;
  buttonText?: string;
  cancelText?: string;
  type?: 'success' | 'error' | 'warning';
  isConfirm?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show) emit('close');
};

const iconColorClass = computed(() => {
  if (props.type === 'error') return 'text-[#d32f2f] dark:text-[#ef5350] bg-red-50 dark:bg-red-900/20';
  if (props.type === 'warning') return 'text-[#f59e0b] dark:text-[#fbbf24] bg-amber-50 dark:bg-amber-900/20';
  return 'text-[#10b981] dark:text-[#34d399] bg-green-50 dark:bg-green-900/20';
});

const iconName = computed(() => {
  if (props.type === 'error') return 'error_outline';
  if (props.type === 'warning') return 'logout';
  return 'check_circle';
});

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-100 flex items-center justify-center px-4 bg-black/40 backdrop-blur-[2px]"
        @click.self="emit('close')"
      >
        <Transition
          enter-active-class="transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          enter-from-class="opacity-0 scale-90 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-90 translate-y-4"
        >
          <div
            v-if="show"
            class="relative w-full max-w-85 p-8 text-center rounded-3xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col items-center"
            role="dialog"
          >
            <div class="mb-5 w-12 h-12 flex items-center justify-center rounded-full" :class="iconColorClass">
              <span class="material-icons-round text-2xl leading-none">{{ iconName }}</span>
            </div>

            <h3 class="text-xl font-semibold text-black dark:text-white mb-3">
              {{ title }}
            </h3>
            
            <p class="text-[0.95rem] text-[#666] dark:text-[#a1a1a1] mb-8 leading-relaxed">
              {{ message }}
            </p>

            <div class="flex gap-3 w-full">
              <button
                  v-if="isConfirm"
                  @click="emit('close')"
                  class="flex-1 py-3 px-4 rounded-xl text-sm font-medium bg-[#fafafa] dark:bg-[#111] text-[#666] dark:text-[#a1a1a1] hover:bg-gray-100 dark:hover:bg-[#222] border border-black/5 dark:border-white/5 focus:outline-none transition-colors"
              >
                {{ cancelText || 'Cancel' }}
              </button>
              <button
                  @click="isConfirm ? emit('confirm') : emit('close')"
                  class="flex-1 py-3 px-4 rounded-xl text-sm font-medium bg-[#0d0d0d] text-white hover:opacity-90 active:opacity-75 dark:bg-[#ededed] dark:text-[#0d0d0d] focus:outline-none transition-opacity"
              >
              {{ buttonText || (isConfirm ? 'Confirm' : 'OK') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>