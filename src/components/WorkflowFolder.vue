<script setup lang="ts">
defineProps<{
  isHovered: boolean
}>()
</script>

<template>
    <div class="w-full h-full flex items-center justify-center">
        <div class="linear-folder relative w-35 h-25">
            <div class="folder-back absolute w-full h-full bg-(--icon-bg) border border-(--border-color) rounded-r-lg rounded-bl-lg">
                <div class="folder-tab absolute -top-2.5 -left-px w-12.5 h-2.5 bg-(--icon-bg) border border-(--border-color) border-b-0 rounded-t-md"></div>
                
                <div 
                    class="inner-file absolute bottom-2.5 left-3.75 w-27.5 h-18.75 bg-[#5e6ad2] rounded flex flex-col gap-2 p-3 box-border shadow-[0_0_15px_rgba(94,106,210,0.3)] z-10 transition-transform duration-400 cubic-bezier(0.2,0.8,0.2,1)"
                    :class="isHovered ? '-translate-y-8.75 -rotate-2' : ''"
                >
                    <div class="file-line h-1 bg-white/40 rounded-xs w-full"></div>
                    <div class="file-line h-1 bg-white/40 rounded-xs w-3/5"></div>
                </div>
            </div>
            
            <div 
                class="folder-front absolute bottom-0 w-full h-[85%] backdrop-blur-[5px] z-20 shadow-[0_4px_30px_rgba(0,0,0,0.05)] origin-bottom transition-[transform,box-shadow] duration-400 cubic-bezier(0.2,0.8,0.2,1)"
                :class="isHovered ? '-skew-x-3 scale-y-[0.92] bg-white/20 border-white/40' : 'bg-white/10 border border-white/30'"
            ></div>
        </div>
    </div>
</template>