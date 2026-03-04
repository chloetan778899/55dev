import { createApp, type DirectiveBinding } from 'vue'
import { createHead } from '@vueuse/head'
import './style.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

interface ClickOutsideElement extends HTMLElement {
  clickOutsideEvent?: (event: Event) => void
}

const clickOutside = {
  mounted: (el: ClickOutsideElement, binding: DirectiveBinding) => {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event)
      }
    }
    document.addEventListener("click", el.clickOutsideEvent)
    document.addEventListener("touchstart", el.clickOutsideEvent)
  },
  unmounted: (el: ClickOutsideElement) => {
    if (el.clickOutsideEvent) {
      document.removeEventListener("click", el.clickOutsideEvent)
      document.removeEventListener("touchstart", el.clickOutsideEvent)
    }
  },
}

const app = createApp(App)
const head = createHead()

app.use(head)
app.use(router)
app.use(i18n)
app.directive('click-outside', clickOutside)

app.mount('#app')