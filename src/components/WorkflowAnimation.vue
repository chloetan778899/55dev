<script setup lang="ts">
defineProps<{
  isHovered: boolean
}>()
</script>

<template>
  <div class="relative w-full h-full flex items-center justify-center bg-transparent perspective-[1000px]">
    
    <div class="absolute w-48 h-48 transition-all duration-700 pointer-events-none"
        style="background: radial-gradient(circle, rgba(74, 222, 128, 0.4) 0%, transparent 70%); transform: translateZ(0);"
        :class="isHovered ? 'opacity-100 scale-110' : 'opacity-40 scale-90'">
    </div>

    <div class="relative w-36 h-24">
      
      <div class="absolute inset-0 bg-white/40 border border-gray-200 rounded-xl backdrop-blur-[2px] transition-all duration-500 ease-out origin-bottom-left"
           :class="isHovered ? '-rotate-6 -translate-x-4 scale-90 opacity-100 shadow-sm' : 'rotate-0 translate-x-0 scale-95 opacity-0'">
      </div>

      <div class="absolute inset-0 bg-white/60 border border-gray-200 rounded-xl backdrop-blur-sm transition-all duration-500 ease-out origin-bottom-left flex flex-col p-3 gap-2"
           :class="isHovered ? '-rotate-3 -translate-x-2 shadow-md' : 'rotate-0 translate-x-0'">
           <div class="w-1/2 h-1.5 bg-gray-200 rounded-full"></div>
           <div class="w-full h-1.5 bg-gray-100 rounded-full"></div>
      </div>

      <div class="relative w-full h-full bg-white/80 border rounded-xl backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col justify-between p-3 overflow-hidden"
           :class="isHovered ? 'border-green-400/50 translate-x-2 -translate-y-1 shadow-xl shadow-green-900/5' : 'border-gray-200 shadow-sm'">
           
           <div class="absolute inset-0 bg-linear-to-br from-white to-transparent opacity-50 transition-opacity duration-500"></div>

           <div class="relative z-10 flex flex-col gap-2">
             <div class="flex items-center justify-between">
               <div class="w-7 h-7 rounded-full flex items-center justify-center border border-gray-100 bg-gray-50 transition-colors duration-300"
                    :class="isHovered ? 'bg-green-50 border-green-200' : ''">
                 <svg class="w-3.5 h-3.5 transition-all duration-300" 
                      :class="isHovered ? 'text-green-500 scale-100' : 'text-gray-300 scale-100'" 
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                   <polyline points="20 6 9 17 4 12"></polyline>
                 </svg>
               </div>
               
               <div class="w-1.5 h-1.5 rounded-full bg-gray-200" :class="isHovered ? 'bg-green-500 shadow-[0_0_8px_#4ade80]' : ''"></div>
             </div>
             
             <div class="w-3/4 h-1.5 bg-gray-200 rounded-full transition-colors duration-300" 
                  :class="isHovered ? 'bg-gray-300' : ''"></div>
             <div class="w-1/2 h-1.5 bg-gray-100 rounded-full transition-colors duration-300"
                  :class="isHovered ? 'bg-gray-200' : ''"></div>
           </div>

           <div class="relative z-10 w-full h-0.5 bg-gray-100 rounded-full overflow-hidden mt-1">
             <div class="h-full bg-green-500 transition-all duration-700 ease-out"
                  :class="isHovered ? 'w-full' : 'w-0'"></div>
           </div>
      </div>

    </div>
  </div>
</template>