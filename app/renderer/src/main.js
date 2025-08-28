import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'
import ElementPlus from 'element-plus'
import '../../../node_modules/element-plus/dist/index.css'

createApp(App).use(i18n).use(ElementPlus).mount('#app')