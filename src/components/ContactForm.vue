<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from './ui/FormCard.vue'
import SuccessModal from './ui/SuccessModal.vue'

const { t } = useI18n()
const isLoading = ref(false)

const contactName = ref('')
const contactEmail = ref('')
const message = ref('')
const internalName = ref('')
const internalControl = ref('')

// Modal State
const showModal = ref(false)
// FIX: We use 'success' or 'error' to match your Modal's "type" prop
const modalType = ref<'success' | 'error'>('success')
const modalTitle = ref('') 
const modalMessage = ref('')
const modalButtonText = ref('')

const handleSubmit = async (event: Event) => {
  if (!event.isTrusted) return
  if (internalName.value || internalControl.value) return

  isLoading.value = true
  
  // Reset defaults
  modalType.value = 'success'

  try {
    const response = await fetch('httpxxxx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: contactName.value,
        email: contactEmail.value,
        message: message.value
      })
    })

    if (!response.ok) throw new Error('Message sending failed')

    // --- SUCCESS ---
    modalType.value = 'success' // Green Icon
    modalTitle.value = t('contact.modal_title')
    modalMessage.value = t('contact.modal_msg')
    modalButtonText.value = t('contact.btn_close')
    showModal.value = true
    
    // Clear form
    contactName.value = ''
    contactEmail.value = ''
    message.value = ''
    
  } catch (error) {
    console.error(error)
    
    // --- ERROR ---
    modalType.value = 'error' // Red Icon
    modalTitle.value = t('contact.error_title') 
    modalMessage.value = t('contact.error_send')
    modalButtonText.value = t('contact.btn_close')
    showModal.value = true

  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <FormCard :title="$t('contact.title')">
    <template #subtitle>
      <p class="text-text-sub mb-4">{{ $t('contact.subtitle') }}</p>
    </template>

    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
      
      <div class="absolute opacity-0 -z-50 -left-2499.75 pointer-events-none" aria-hidden="true">
        <input v-model="internalName" type="text" name="name" tabindex="-1" autocomplete="off">
        <input v-model="internalControl" type="email" name="email" tabindex="-1" autocomplete="off">
      </div>

      <div class="form-group relative flex flex-col mb-4">
        <input v-model="contactName" type="text" autocomplete="name" spellcheck="false" :disabled="isLoading" class="peer w-full p-[14px_16px] text-base rounded bg-transparent border border-black/20 dark:border-white/20 text-text-main outline-none focus:border-[#635bff] focus:border-2 focus:p-[13px_15px] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" placeholder=" " required>
        <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-bg-body px-1 text-text-sub text-base font-normal leading-none transition-[top,transform,scale,color] ease-standard will-change-[top,transform] pointer-events-none origin-left peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-[#635bff] peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-placeholder-shown:text-text-sub dark:text-[#ededed] dark:peer-placeholder-shown:text-[#ededed] disabled:opacity-50 disabled:cursor-not-allowed">{{ $t('contact.name') }}</label>
      </div>

      <div class="form-group relative flex flex-col mb-4">
        <input v-model="contactEmail" type="email" autocomplete="email" spellcheck="false" :disabled="isLoading" class="peer w-full p-[14px_16px] rounded bg-transparent border border-black/20 dark:border-white/20 text-text-main text-base outline-none focus:border-[#635bff] focus:border-2 focus:p-[13px_15px] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" placeholder=" " required>
        <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-bg-body px-1 text-text-sub text-base font-normal leading-none transition-[top,transform,scale,color] ease-standard will-change-[top,transform] pointer-events-none origin-left peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-[#635bff] peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-placeholder-shown:text-text-sub dark:text-[#ededed] dark:peer-placeholder-shown:text-[#ededed] disabled:opacity-50 disabled:cursor-not-allowed">{{ $t('contact.email') }}</label>
      </div>

      <div class="form-group relative flex flex-col mb-4">
        <textarea v-model="message" :disabled="isLoading" rows="4" class="peer w-full p-[14px_16px] rounded bg-transparent border border-black/20 dark:border-white/20 text-text-main text-base outline-none focus:border-[#635bff] focus:border-2 focus:p-[13px_15px] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" placeholder=" " required></textarea>
        <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-bg-body px-1 text-text-sub text-base font-normal leading-none transition-[top,transform,scale,color] ease-standard will-change-[top,transform] pointer-events-none origin-left peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-[#635bff] peer-placeholder-shown:top-6.75 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-placeholder-shown:text-text-sub dark:text-[#ededed] dark:peer-placeholder-shown:text-[#ededed] disabled:opacity-50 disabled:cursor-not-allowed">{{ $t('contact.message') }}</label>
      </div>

      <button type="submit" :disabled="isLoading" class="btn-primary w-full p-3.5 rounded-md bg-[#0d0d0d] text-white font-semibold dark:bg-[#ededed] dark:text-[#0d0d0d] hover:opacity-90 active:opacity-75 flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed">
        <span v-if="isLoading" class="spinner border-2 border-transparent border-t-current rounded-full w-4 h-4 animate-spin"></span>
        <span v-else>{{ $t('contact.submit') }}</span>
      </button>
    </form>
    
    <SuccessModal 
      :show="showModal" 
      :title="modalTitle" 
      :message="modalMessage" 
      :buttonText="modalButtonText"
      :type="modalType"
      @close="showModal = false" 
    />
  </FormCard>
</template>
