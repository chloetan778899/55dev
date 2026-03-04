<script setup lang="ts">
import TheNavBar from '../components/TheNavBar.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useHead } from '@vueuse/head' 
import { useI18n } from 'vue-i18n'     

const router = useRouter()
const route = useRoute()
const activeSection = ref('terms')
const { t } = useI18n()

interface FooterImage {
  id: string | number;
  url: string; 
}
const backendImages = ref<FooterImage[]>([])

const fetchImages = async () => {
  try {
    const API_URL = 'https://后端链接/images'
    
    if (API_URL.includes('YOUR-BACKEND')) return

    const response = await fetch(API_URL)
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) {
        backendImages.value = data
      }
    }
  } catch (error) {
    console.error('Image load failed', error)
  }
}

useHead({
  title: () => t('terms.title'), 
  meta: [
    { 
      name: 'description', 
      content: 'Read our Terms of Service, Privacy Policy, and Cookie Policy.' 
    },
    {
      name: 'robots',
      content: 'noindex, follow' 
    }
  ]
})

const handleScroll = () => {
  const sections = ['terms', 'privacy', 'cookies', 'registration']
  
  for (const section of sections) {
    const el = document.getElementById(section)
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= 200 && rect.bottom >= 200) {
        activeSection.value = section
        break
      }
    }
  }
}

const scrollToSection = (id: string) => {
  const el = document.getElementById(id)
  if (el) {
    const offset = 100 
    const bodyRect = document.body.getBoundingClientRect().top
    const elementRect = el.getBoundingClientRect().top
    const elementPosition = elementRect - bodyRect
    const offsetPosition = elementPosition - offset

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
    
    activeSection.value = id
    router.replace({ hash: `#${id}` }) 
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  
  fetchImages()

  if (route.hash) {
    const id = route.hash.substring(1)
    setTimeout(() => {
      scrollToSection(id)
    }, 100)
  } else {
    handleScroll()
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
    <TheNavBar />
    
    <div class="legal-layout flex flex-col lg:flex-row max-w-300 mx-auto p-[100px_20px_60px] lg:p-[120px_40px_80px] gap-15 relative">
        <aside class="legal-sidebar w-full lg:w-60 shrink-0 mb-10 lg:mb-0 border-b lg:border-none border-(--grid-color) pb-5 lg:pb-0">
            <div class="legal-sidebar-inner sticky top-25">
                <h3 class="text-[0.9rem] uppercase tracking-wider text-text-main mb-5 font-bold">{{ $t('terms.sidebar.title') }}</h3>
                <nav class="legal-nav flex flex-col gap-3">
                    <a 
                      href="#terms" 
                      @click.prevent="scrollToSection('terms')"
                      class="no-underline text-text-sub text-[0.95rem] font-medium pl-2.5 border-l-2 border-transparent hover:text-text-main hover:border-[#635bff] cursor-pointer"
                      :class="{ 'text-text-main! border-[#635bff]!': activeSection === 'terms' }"
                    >{{ $t('terms.sidebar.tos') }}</a>
                    <a 
                      href="#privacy" 
                      @click.prevent="scrollToSection('privacy')"
                      class="no-underline text-text-sub text-[0.95rem] font-medium pl-2.5 border-l-2 border-transparent hover:text-text-main hover:border-[#635bff] cursor-pointer"
                      :class="{ 'text-text-main! border-[#635bff]!': activeSection === 'privacy' }"
                    >{{ $t('terms.sidebar.privacy') }}</a>
                    <a 
                      href="#cookies" 
                      @click.prevent="scrollToSection('cookies')"
                      class="no-underline text-text-sub text-[0.95rem] font-medium pl-2.5 border-l-2 border-transparent hover:text-text-main hover:border-[#635bff] cursor-pointer"
                      :class="{ 'text-text-main! border-[#635bff]!': activeSection === 'cookies' }"
                    >{{ $t('terms.sidebar.cookies') }}</a>
                    <a 
                      href="#registration" 
                      @click.prevent="scrollToSection('registration')"
                      class="no-underline text-text-sub text-[0.95rem] font-medium pl-2.5 border-l-2 border-transparent hover:text-text-main hover:border-[#635bff] cursor-pointer"
                      :class="{ 'text-text-main! border-[#635bff]!': activeSection === 'registration' }"
                    >{{ $t('terms.sidebar.registration') }}</a>
                </nav>
            </div>
        </aside>

        <main class="legal-content flex-1 max-w-200">
            <h1 class="text-[2.5rem] font-extrabold mb-10 text-text-main">{{ $t('terms.title') }}</h1>
            
            <section id="terms" class="scroll-mt-25 mb-12.5">
                <h2 class="text-[1.5rem] font-bold text-text-main mb-4 pb-2.5 border-b border-(--grid-color)">{{ $t('terms.tos.title') }}</h2>
                <span class="last-updated text-text-sub text-[0.9rem] mb-10 block">{{ $t('terms.tos.last_updated') }}</span>
                <div class="text-text-sub leading-[1.7] mb-4 w-full wrap-break-word" v-html="$t('terms.tos.content')"></div>
            </section>

            <hr class="border-0 border-t border-(--grid-color) my-15">
            
            <section id="privacy" class="scroll-mt-25 mb-12.5">
                <h2 class="text-[1.5rem] font-bold text-text-main mb-4 pb-2.5 border-b border-(--grid-color)">{{ $t('terms.privacy.title') }}</h2>
                <span class="last-updated text-text-sub text-[0.9rem] mb-10 block">{{ $t('terms.privacy.last_updated') }}</span>
                <div class="text-text-sub leading-[1.7] mb-4 w-full wrap-break-word" v-html="$t('terms.privacy.content')"></div>
            </section>

            <hr class="border-0 border-t border-(--grid-color) my-15">

             <section id="cookies" class="scroll-mt-25 mb-12.5">
                <h2 class="text-[1.5rem] font-bold text-text-main mb-4 pb-2.5 border-b border-(--grid-color)">{{ $t('terms.cookies.title') }}</h2>
                <span class="last-updated text-text-sub text-[0.9rem] mb-10 block">{{ $t('terms.cookies.last_updated') }}</span>
                <div class="text-text-sub leading-[1.7] mb-4 w-full wrap-break-word" v-html="$t('terms.cookies.content')"></div>
            </section>

            <hr class="border-0 border-t border-(--grid-color) my-15">

            <section id="registration" class="scroll-mt-25 mb-12.5">
                <h2 class="text-[1.5rem] font-bold text-text-main mb-4 pb-2.5 border-b border-(--grid-color)">{{ $t('terms.registration.title') }}</h2>
                <div class="text-text-sub leading-[1.7] mb-4 w-full wrap-break-word" v-html="$t('terms.registration.content')"></div>
            </section>

            <div v-if="backendImages.length > 0" class="mt-20 border-t border-(--grid-color) pt-15">
                <div class="flex flex-wrap gap-5">
                    <div 
                        v-for="(img, index) in backendImages" 
                        :key="img.id || index"
                        class="w-full md:w-[calc(50%-10px)]" 
                    >
                        <a :href="img.url" target="_blank" class="block cursor-pointer hover:opacity-90 transition-opacity">
                            <img 
                                :src="img.url" 
                                alt="Certificate" 
                                class="w-full h-auto rounded-lg border border-(--grid-color)"
                                loading="lazy"
                            />
                        </a>
                    </div>
                </div>
            </div>
            </main>
    </div>

    <footer class="site-footer w-full p-[80px_20px_40px_20px] bg-transparent mt-10 border-t-0">
        <div class="footer-bottom max-w-200 mx-auto pt-5 border-t border-white/5 flex flex-col md:flex-row justify-between flex-wrap gap-5 text-[0.8rem] text-text-sub items-start">
            <p class="w-full wrap-break-word" v-html="$t('terms.footer')"></p>
        </div>
    </footer>
</template>