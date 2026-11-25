import { createApp } from 'vue'
// Montserrat empacotada (sem CDN): funciona offline e não depende de terceiros
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import './style.css'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')
