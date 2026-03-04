<script setup lang="ts">
import { reactive, defineAsyncComponent } from 'vue'
import { useHead } from '@vueuse/head' 
import { useI18n } from 'vue-i18n'     
import TheNavBar from '../components/TheNavBar.vue'
import TheFluidBackground from '../components/TheFluidBackground.vue'

const { t } = useI18n()

useHead({
  title: () => t('home.meta.title'), 
  meta: [
    { 
      name: 'description', 
      content: () => t('home.meta.description') 
    },
    { 
      property: 'og:title', 
      content: () => t('home.meta.title') 
    },
    { 
      property: 'og:description', 
      content: () => t('home.meta.description') 
    }
  ]
})

const TheGlobe = defineAsyncComponent({
  loader: () => import('../components/TheGlobe.vue'),
  loadingComponent: {
    template: '<div class="w-full h-full flex items-center justify-center text-gray-400">Loading Globe...</div>'
  },
  delay: 200, 
})

const WorkflowAnimation = defineAsyncComponent(() => import('../components/WorkflowAnimation.vue'))
const WorkflowFolder = defineAsyncComponent(() => import('../components/WorkflowFolder.vue'))
const TheSecurityScroll = defineAsyncComponent(() => import('../components/TheSecurityScroll.vue'))
const InteractiveTerminal = defineAsyncComponent(() => import('../components/InteractiveTerminal.vue'))
const TheStats = defineAsyncComponent(() => import('../components/TheStats.vue'))
const TrafficChart = defineAsyncComponent(() => import('../components/TrafficChart.vue'))
const TheTypewriter = defineAsyncComponent(() => import('../components/TheTypewriter.vue'))
const ContactForm = defineAsyncComponent(() => import('../components/ContactForm.vue'))

const cards = reactive([
  { id: 'tracking', x: -100, y: -100, isHovered: false },
  { id: 'processing', x: -100, y: -100, isHovered: false },
  { id: 'unifying', x: -100, y: -100, isHovered: false }
])

let rafId: number | null = null

const onCardMove = (e: MouseEvent, index: number) => {
  if (rafId !== null) return

  const target = e.currentTarget as HTMLElement
  const { clientX, clientY } = e

  rafId = requestAnimationFrame(() => {
    const rect = target.getBoundingClientRect()
    cards[index].x = clientX - rect.left
    cards[index].y = clientY - rect.top
    cards[index].isHovered = true
    rafId = null
  })
}

const onCardLeave = (index: number) => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  
  cards[index].x = -100
  cards[index].y = -100
  cards[index].isHovered = false
}
</script>

<template>
  <TheNavBar />
  
  <main>
    
    <section id="hero" class="hero-section relative w-full min-h-screen overflow-hidden flex items-center justify-center pt-10 pb-15">
        <div class="hero-bg-grid absolute top-0 left-0 w-full h-full z-0 pointer-events-none"></div>
        <div class="layout-grid relative z-1 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] w-full max-w-300 mx-auto px-6 lg:px-10 items-center justify-items-start gap-10 lg:gap-10 text-center lg:text-left">
            <div class="text-section w-full z-10 max-w-175 lg:max-w-none mx-auto lg:mx-0">
                <h1 class="heading-primary text-text-primary text-[48px] sm:text-[76px] font-extrabold leading-[1.1] tracking-[-0.025em] mb-6 sm:mb-8 w-full" v-html="$t('home.hero.title')">
                </h1>
                <p class="subtext text-text-sub text-[18px] sm:text-[22px] leading-[1.6] font-normal max-w-135 m-0 mx-auto lg:mx-0">
                    {{ $t('home.hero.subtitle') }}
                </p>
            </div>
            <div class="visual-section w-full h-[40vh] lg:h-150 flex items-center justify-center relative -order-1 lg:order-1 mb-5 lg:mb-0">
                <div class="w-full h-full min-h-100 block outline-none [&_canvas]:scale-110 [&_canvas]:lg:scale-100">
                    <TheGlobe />
                </div>
            </div>
        </div>
    </section>

    <section id="partners" class="partners-section w-full pb-20">
         <div class="typewriter-box flex justify-center items-center text-center w-full pt-10 mb-15 min-h-40 font-sans text-2xl sm:text-[2rem] font-semibold text-text-sub px-5">
            <p class="m-0 inline-block">
                {{ $t('home.partners.trusted_prefix') }} 
                <span class="dynamic-text text-text-primary min-w-2.5 inline-block">
                    <TheTypewriter />
                </span>
                <span class="cursor text-text-primary font-semibold inline-block ml-0.5">|</span> 
                {{ $t('home.partners.trusted_suffix') }}
            </p>
        </div>
        <div class="team-grid grid grid-cols-2 sm:grid-cols-3 gap-7.5 sm:gap-10 max-w-200 mx-auto px-5 sm:px-20 justify-items-center items-center [&_img]:w-full [&_img]:max-w-25 [&_img]:max-h-11.25 [&_img]:block [&_img]:opacity-100 dark:[&_img]:invert dark:[&_img]:brightness-200 dark:[&_img]:opacity-80">
             <img src="/svg/scale.svg" alt="Scale">
             <img src="/svg/lichtblick.svg" alt="Lichtblick">
             <img src="/svg/pinecone.svg" alt="Pinecone">
             <img src="/svg/softbank.svg" alt="Softbank">
             <img src="/svg/ewtnnews.svg" alt="EWTN News">
             <img src="/svg/nationalhealthcare.svg" alt="National Healthcare">
             <img src="/svg/octopusenergy.svg" alt="Octopus Energy">
             <img src="/svg/terminalthree.svg" alt="Terminal 3">
             <img src="/svg/liveblocks.svg" alt="Liveblocks">
        </div>
    </section>

    <section id="workflow" class="workflow-section w-full flex justify-center py-20 px-5 box-border relative z-5">
        <div class="integrator-container flex flex-col gap-7.5 w-full max-w-225">
            <div class="card-wrapper wrapper-1 w-full group" @mousemove="(e) => onCardMove(e, 0)" @mouseleave="() => onCardLeave(0)" :style="{ '--mouse-x': `${cards[0].x}px`, '--mouse-y': `${cards[0].y}px` }">
                <div class="workflow-card relative w-full bg-bg-card border border-border rounded-3xl p-10 flex flex-col-reverse lg:flex-row items-center text-center lg:text-left justify-center lg:justify-between shadow-(--card-shadow) lg:h-85 overflow-hidden">
                    <div class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style="background: radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(243, 223, 80, 0.06), transparent 40%);"></div>
                    <div class="content pointer-events-none relative z-5 w-full flex flex-col items-center lg:items-start lg:flex-1 lg:mr-5">
                        <div class="icon-box relative w-9 h-9 bg-(--icon-bg) border border-border rounded-xl text-[#f3df50] mb-5 lg:mb-6 transition-transform duration-300 lg:-translate-y-6.25 flex items-center justify-center group-hover:border-[#f3df50]/50 group-hover:bg-[#f3df50]/15 group-hover:-translate-y-0.5 lg:group-hover:-translate-y-6.75">
                            <svg class="relative z-10" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                        </div>
                        <div class="eyebrow text-[11px] tracking-[1px] text-text-sub flex items-center gap-2 mb-3 uppercase">
                            <span class="dot w-1.5 h-1.5 rounded-full bg-[#f3df50] shadow-[0_0_8px_rgba(243,223,80,0.3)]"></span> {{ $t('home.workflow.tracking.eyebrow') }}
                        </div>
                        <h2 class="m-0 text-2xl md:text-[2rem] font-bold text-text-primary">{{ $t('home.workflow.tracking.title') }}</h2>
                        <p class="text-text-sub leading-[1.6] max-w-full mt-2.5 text-base">{{ $t('home.workflow.tracking.desc') }}</p>
                    </div>
                    <div class="animation-container w-75 h-50 relative mb-5 lg:mb-0 lg:flex lg:justify-center lg:items-center z-5">
                        <TrafficChart :is-hovered="cards[0].isHovered" />
                    </div>
                </div>
            </div>

            <div class="card-wrapper wrapper-2 w-full group" @mousemove="(e) => onCardMove(e, 1)" @mouseleave="() => onCardLeave(1)" :style="{ '--mouse-x': `${cards[1].x}px`, '--mouse-y': `${cards[1].y}px` }">
              <div class="workflow-card relative w-full bg-bg-card border border-border rounded-3xl p-10 flex flex-col-reverse lg:flex-row items-center text-center lg:text-left justify-center lg:justify-between shadow-(--card-shadow) lg:h-85 overflow-hidden">
                <div class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style="background: radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(74, 222, 128, 0.06), transparent 40%);"></div>
                <div class="content pointer-events-none relative z-5 w-full flex flex-col items-center lg:items-start lg:flex-1 lg:mr-5">
                  <div class="icon-box relative w-9 h-9 bg-(--icon-bg) border border-border rounded-xl text-[#16a34a] dark:text-[#4ade80] mb-5 lg:mb-6 transition-transform duration-300 lg:-translate-y-6.25 flex items-center justify-center group-hover:border-[#4ade80]/50 group-hover:bg-[#4ade80]/15 group-hover:-translate-y-0.5 lg:group-hover:-translate-y-6.75">
                      <svg class="relative z-10" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                  </div>
                  <div class="eyebrow text-[11px] tracking-[1px] text-text-sub flex items-center gap-2 mb-3 uppercase"><span class="dot w-1.5 h-1.5 rounded-full bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.3)]"></span> {{ $t('home.workflow.processing.eyebrow') }}</div>
                  <h2 class="m-0 text-2xl md:text-[2rem] font-bold text-text-primary">{{ $t('home.workflow.processing.title') }}</h2>
                  <p class="text-text-sub leading-[1.6] max-w-full mt-2.5 text-base">{{ $t('home.workflow.processing.desc') }}</p>
                </div>
                <div class="animation-container w-75 h-50 relative mb-5 lg:mb-0 lg:flex lg:justify-center lg:items-center z-5">
                    <WorkflowAnimation :is-hovered="cards[1].isHovered" />
                </div>
              </div>
            </div>

            <div class="card-wrapper wrapper-3 w-full group" @mousemove="(e) => onCardMove(e, 2)" @mouseleave="() => onCardLeave(2)" :style="{ '--mouse-x': `${cards[2].x}px`, '--mouse-y': `${cards[2].y}px` }">
              <div class="workflow-card relative w-full bg-bg-card border border-border rounded-3xl p-10 flex flex-col-reverse lg:flex-row items-center text-center lg:text-left justify-center lg:justify-between shadow-(--card-shadow) lg:h-85 overflow-hidden">
                <div class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style="background: radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(94, 106, 210, 0.08), transparent 40%);"></div>
                <div class="content pointer-events-none relative z-5 w-full flex flex-col items-center lg:items-start lg:flex-1 lg:mr-5">
                    <div class="icon-box w-9 h-9 flex items-center justify-center bg-(--icon-bg) border border-border rounded-[10px] text-[#5e6ad2] shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-transform duration-300 mb-6 group-hover:border-[#5e6ad2]/50 group-hover:bg-[#5e6ad2]/10 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_15px_rgba(94,106,210,0.3)]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 19V9C22 7.89543 21.1046 7 20 7H12.5858L10.5858 5H4C2.89543 5 2 5.89543 2 7V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <div class="eyebrow text-[11px] tracking-[1px] text-text-sub flex items-center gap-2 mb-3 uppercase"><span class="dot w-1.5 h-1.5 rounded-full bg-[#5e6ad2] shadow-[0_0_8px_rgba(94,106,210,0.3)]"></span> {{ $t('home.workflow.unifying.eyebrow') }}</div>
                    <h2 class="m-0 text-2xl md:text-[2rem] font-bold text-text-primary">{{ $t('home.workflow.unifying.title') }}</h2>
                    <p class="text-text-sub leading-[1.6] max-w-full mt-2.5 text-base">{{ $t('home.workflow.unifying.desc') }}</p>
                </div>
                <div class="folder-wrapper w-75 h-50 relative mb-5 lg:mb-0 lg:mr-0 flex justify-center items-center z-5">
                    <WorkflowFolder :is-hovered="cards[2].isHovered" />
                </div>
              </div>
            </div>

        </div>
    </section>

    <TheSecurityScroll id="security" />

    <section id="code" class="code-section py-20">
        <div class="code-container max-w-250 mx-auto px-5 text-center">
          <h2 class="text-2xl md:text-[2rem] font-extrabold text-text-primary mb-4 tracking-[-0.02em] leading-tight">{{ $t('home.code.title') }}</h2>
          <p class="text-base text-text-sub leading-[1.6] m-0 mx-auto max-w-150 mb-12">{{ $t('home.code.desc') }}</p>
          <InteractiveTerminal />
        </div>
    </section>

    <section id="stats" class="stats-section w-full pt-10 pb-25 px-5 flex justify-center relative z-5">
         <div class="w-full flex justify-center min-h-37.5">
            <TheStats />
         </div>
    </section>

    <section class="fluid-section relative w-full min-h-screen py-24 flex flex-col items-center justify-start text-center overflow-hidden bg-gray-50 dark:bg-[#050505]">
        
        <div class="fluid-content relative z-20 max-w-250 px-5 pointer-events-auto mb-16">
            <h2 class="fluid-heading font-sans text-2xl md:text-[2rem] font-extrabold text-text-primary m-0 mb-4 tracking-[-0.02em] leading-tight">
                {{ $t('home.fluid.title') }}
            </h2>
            <p class="fluid-subtitle font-sans text-base text-text-sub leading-[1.6] max-w-150 m-0 mx-auto">
                {{ $t('home.fluid.desc') }}
            </p>
        </div>

        <div class="w-full h-125 relative z-10">
            <TheFluidBackground />
        </div>
        
    </section>
    
    <section class="final-cta w-full py-15 px-5 text-center">
        <h2 class="text-[2rem] md:text-[3rem] font-extrabold text-text-primary tracking-[-0.03em] m-0">{{ $t('home.cta') }}</h2>
    </section>

    <section id="contact" class="contact-section w-full py-15 px-5 flex justify-center relative z-5">
        <ContactForm />
    </section>

    <footer class="site-footer w-full p-[80px_20px_40px_20px] bg-transparent mt-10 border-t-0">
         <div class="footer-content max-w-200 mx-auto flex flex-col items-start gap-10 mb-15 text-left">
             <div class="footer-top-row w-full flex justify-start">
                <div class="footer-addresses-container flex flex-col items-start w-full text-[0.9rem]">
                    <h3 class="w-full m-[0_0_1rem_0] text-text-primary text-[1.3rem] font-semibold">{{ $t('home.footer.about_title') }}</h3>
                    <div class="footer-addresses flex gap-8 md:gap-16 text-left justify-start flex-wrap">
                        <div class="address-block [&_h4]:m-[0_0_0.5rem_0] [&_h4]:text-text-main [&_h4]:text-[0.9rem] [&_h4]:font-normal">
                            <h3 class="m-[0_0_0.5rem_0] text-text-primary text-[0.9rem] font-normal">{{ $t('home.footer.sf_title') }}</h3>
                            <p class="m-0 text-[0.9rem] text-text-sub leading-normal" v-html="$t('home.footer.sf_address')"></p>
                        </div>
                        <div class="address-block">
                            <h3 class="m-[0_0_0.5rem_0] text-text-primary text-[0.9rem] font-normal">{{ $t('home.footer.london_title') }}</h3>
                            <p class="m-0 text-[0.9rem] text-text-sub leading-normal" v-html="$t('home.footer.london_address')"></p>
                        </div>
                    </div>
                </div>
            </div>
             <div class="footer-brand-row max-w-150 flex flex-col items-start text-left">
                 <img src="/images/logodark.png" alt="Logo" class="h-7 mb-5 w-auto block dark:hidden">
                 <img src="/images/logolight.png" alt="Logo" class="h-7 mb-5 w-auto hidden dark:block">
                 <p class="footer-mission-text text-text-sub text-[0.9rem] leading-[1.6] m-0">
                    {{ $t('home.footer.mission') }}
                 </p>
            </div>
            <div class="legal-links-row flex gap-6 flex-wrap mt-2 text-[0.85rem] text-text-sub">
                <router-link to="/terms" class="no-underline hover:text-text-primary">{{ $t('home.footer.links.terms') }}</router-link>
                <router-link to="/terms#privacy" class="no-underline hover:text-text-primary">{{ $t('home.footer.links.privacy') }}</router-link>
                <router-link to="/terms#cookies" class="no-underline hover:text-text-primary">{{ $t('home.footer.links.cookies') }}</router-link>
                <router-link to="/terms#registration" class="no-underline hover:text-text-primary">{{ $t('home.footer.links.legal') }}</router-link>
            </div>
        </div>
        <div class="footer-bottom max-w-200 mx-auto pt-5 border-t border-white/5 flex flex-col md:flex-row justify-between flex-wrap gap-5 text-[0.8rem] text-text-sub items-start">
            <p v-html="$t('home.footer.copyright')"></p>
            <div class="status-indicator flex items-center gap-2">
                <span class="status-dot w-2 h-2 bg-[#16a34a] rounded-full shadow-[0_0_5px_#16a34a]"></span> {{ $t('home.footer.status') }}
            </div>
        </div>
    </footer>
  </main>
</template>