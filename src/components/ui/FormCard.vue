<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="form-card w-full max-w-95 min-h-150 p-8 rounded-2xl shadow-2xl border border-border bg-bg-card relative z-10 backdrop-blur-sm flex flex-col justify-center mx-auto">
    
    <div class="text-center mb-8">
      <h1 class="text-[2rem] font-extrabold text-text-primary m-0 mb-2">
        {{ title }}
      </h1>
      <slot name="subtitle"></slot>
    </div>
    
    <div class="w-full">
      <slot></slot>
    </div>

    <div class="mt-6 text-center text-[0.9rem] text-text-sub">
      <slot name="footer"></slot>
    </div>
  </div>
</template>