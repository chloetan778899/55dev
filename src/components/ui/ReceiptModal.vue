<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  show: boolean;
  amount: number | string;
  date: string;
  description?: string;
}>();

defineEmits(['close']);

const displayDescription = computed(() => {
  if (!props.description || props.description === 'Payout') {
    return 'Cycle Payout';
  }
  return props.description;
});

const formatMoney = (val: number | string) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num);
};
</script>

<template>
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
      class="fixed inset-0 z-110 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="$emit('close')"
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
          class="w-full max-w-112.5 p-8 bg-white border border-zinc-100 relative overflow-hidden shadow-2xl shrink-0 rounded-none"
          style="font-family: 'Inter', sans-serif;"
        >
          <button
            @click="$emit('close')"
            class="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 transition-colors"
          >
            <span class="material-icons-round text-2xl">close</span>
          </button>

          <div class="flex flex-col items-center justify-center mb-8 w-full border-b border-zinc-100 pb-6">
            <img src="/images/logo.png" alt="Company Logo" class="h-16 w-auto object-contain">
          </div>

          <div class="text-center mb-8">
            <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 class="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">PAID</h1>
            <p class="text-4xl font-extrabold text-zinc-900 wrap-break-word">{{ formatMoney(amount) }}</p>
          </div>

          <div class="bg-zinc-50 rounded-2xl p-5 space-y-4 mb-6 border border-zinc-100 text-sm">
            <div class="flex justify-between items-start gap-4">
              <span class="text-zinc-500 font-medium whitespace-nowrap">Payment Method</span>
              <span class="font-semibold text-zinc-800 text-right wrap-break-word">Tokenized Asset</span>
            </div>
            <div class="flex justify-between items-start gap-4">
              <span class="text-zinc-500 font-medium whitespace-nowrap">Description</span>
              <span class="font-semibold text-zinc-800 text-right wrap-break-word">{{ displayDescription }}</span>
            </div>
            
            <div class="flex justify-between items-start gap-4">
              <span class="text-zinc-500 font-medium whitespace-nowrap">Issue Date</span>
              <span class="font-semibold text-zinc-800 text-right wrap-break-word">{{ date }}</span>
            </div>
            
            <div class="flex justify-between items-start gap-4 border-t border-zinc-200 pt-3 mt-1">
              <span class="text-zinc-500 font-medium whitespace-nowrap">Status</span>
              <span class="font-bold text-green-600 text-right wrap-break-word">Processed</span>
            </div>
          </div>

          <div class="border-t border-zinc-200 pt-5">
            <p class="text-[10px] leading-relaxed text-zinc-400 text-justify m-0">
              This document confirms both the financial transaction and the physical/digital presence of the participant as official proof of payments. Payouts are subject to bank or exchange processing times and market exchange rate fluctuations. Any intermediary bank fees or conversion charges are the recipient's responsibility. Once initiated, transactions are final and based on the account details provided.
              <br><br>
              <span class="font-semibold text-zinc-500">Please check your receiving bank or wallet and revert to us, thank you.</span>
            </p>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
