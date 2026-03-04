<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface TerminalLine {
  type: 'cmd' | 'output'
  text?: string
  path?: string
  prompt?: string
  class?: string
}

const terminalRef = ref<HTMLElement | null>(null)
const charMeasureRef = ref<HTMLElement | null>(null)
const terminalSize = ref('80x24')

const allLines: TerminalLine[] = [
  { 
    type: 'cmd', 
    prompt: '$', 
    path: '~/agi-lab', 
    text: 'pip install reality-check' 
  },
  { 
    type: 'output', 
    text: 'Requirement already satisfied: reality-check in /usr/lib/python3.9/site-packages (0.0.1)',
    class: 'text-gray-500' 
  },
  { 
    type: 'cmd', 
    prompt: '$', 
    path: '~/agi-lab', 
    text: 'python3 train_superintelligence.py --gpu=0' 
  },
  { 
    type: 'output', 
    text: '[INFO] Loading "GPT-Omni-Max-Pro" (Parameters: 175 Trillion)\n[INFO] Mapping weights to device cuda:0...',
    class: 'text-gray-400' 
  },
  { 
    type: 'output', 
    text: 'Loading checkpoint: 10% |██▎                  | 40GB/???GB',
    class: 'text-blue-400'
  },
  { 
    type: 'output', 
    text: 'Loading checkpoint: 25% |█████                | 120GB/???GB',
    class: 'text-blue-400'
  },
  { 
    type: 'output', 
    text: 'Loading checkpoint: 40% |████████             | 350GB/???GB',
    class: 'text-blue-400'
  },
  { 
    type: 'output', 
    text: '\nTraceback (most recent call last):\n  File "train_superintelligence.py", line 42, in <module>\n    model.to("cuda")\nRuntimeError: CUDA out of memory. Tried to allocate 800.00 GiB (GPU 0; 8.00 GiB total capacity; 0 bytes free; nice try though)',
    class: 'text-red-400'
  }
]

const displayedLines = ref<TerminalLine[]>([])
const currentLineIndex = ref(0)
const currentCharIndex = ref(0)
let typeTimeoutId: number | undefined

const typeNextChar = () => {
  if (currentLineIndex.value >= allLines.length) return

  const line = allLines[currentLineIndex.value]

  if (currentCharIndex.value === 0) {
    displayedLines.value.push({ 
      ...line, 
      text: line.type === 'cmd' ? '' : line.text 
    })
  }

  if (line.type === 'cmd' && line.text) {
    if (currentCharIndex.value < line.text.length) {
      const currentDisplayed = displayedLines.value[currentLineIndex.value]
      if (currentDisplayed && typeof currentDisplayed.text === 'string') {
         currentDisplayed.text += line.text[currentCharIndex.value]
      }
      currentCharIndex.value++
      typeTimeoutId = window.setTimeout(typeNextChar, 40 + Math.random() * 30) 
    } else {
      currentLineIndex.value++
      currentCharIndex.value = 0
      typeTimeoutId = window.setTimeout(typeNextChar, 300)
    }
  } 
  else {
    currentLineIndex.value++
    currentCharIndex.value = 0
    const delay = line.text?.includes('Loading') ? 600 : 100
    typeTimeoutId = window.setTimeout(typeNextChar, delay)
  }
}

const updateTerminalDimensions = () => {
  if (!terminalRef.value || !charMeasureRef.value) return
  const width = terminalRef.value.clientWidth
  const height = terminalRef.value.clientHeight - 36
  const rect = charMeasureRef.value.getBoundingClientRect()
  const charWidth = rect.width || 8
  const charHeight = rect.height || 18
  const cols = Math.floor(width / charWidth)
  const rows = Math.floor(height / charHeight)
  terminalSize.value = `${cols}x${rows}`
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  typeTimeoutId = window.setTimeout(typeNextChar, 500)
  if (terminalRef.value) {
    resizeObserver = new ResizeObserver(() => updateTerminalDimensions())
    resizeObserver.observe(terminalRef.value)
  }
  window.addEventListener('resize', updateTerminalDimensions)
  updateTerminalDimensions()
})

onUnmounted(() => {
  clearTimeout(typeTimeoutId)
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', updateTerminalDimensions)
})
</script>

<template>
  <div 
    ref="terminalRef"
    class="terminal-window bg-[#0d1117] rounded-lg overflow-hidden shadow-2xl text-left font-mono text-xs sm:text-sm relative mx-auto w-full max-w-3xl border border-[#30363d]"
  >
    <div class="terminal-header bg-[#161b22] h-9 px-3 flex items-center justify-between select-none border-b border-[#30363d]">
      <div class="flex gap-1.5 w-16">
        <div class="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
        <div class="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#d39e25]"></div>
        <div class="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1caf32]"></div>
      </div>
      
      <div class="text-gray-300 text-[11px] font-sans font-medium tracking-wide flex items-center gap-2 opacity-90">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        user@dev-box: ~/agi-lab — {{ terminalSize }}
      </div>

      <div class="w-16"></div>
    </div>

    <div class="terminal-body p-3 bg-[#0d1117] text-[#c9d1d9] min-h-80 overflow-y-auto font-mono text-[13px] leading-tight">
      <span ref="charMeasureRef" class="absolute opacity-0 pointer-events-none select-none -z-50">M</span>

      <div v-for="(line, index) in displayedLines" :key="index" class="wrap-break-word">
        
        <div v-if="line.type === 'cmd'" class="mt-2 mb-1">
          <span class="text-green-500 font-bold select-none">{{ line.prompt }}</span>
          <span class="text-blue-400 font-bold select-none ml-2">{{ line.path }}</span>
          <span class="text-gray-100 ml-2">{{ line.text }}</span>
          <span v-if="index === displayedLines.length - 1" class="inline-block w-1.5 h-4 bg-gray-400 ml-1 align-middle animate-pulse"></span>
        </div>

        <div v-else class="whitespace-pre-wrap pl-1" :class="line.class || 'text-gray-400'">
          {{ line.text }}
        </div>

      </div>
    </div>
  </div>
</template>