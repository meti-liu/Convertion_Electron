import { createApp } from 'vue';
import NetworkMonitor from '../components/NetworkMonitor.vue';
import i18n from './i18n'; // Import the i18n instance
import ElementPlus from 'element-plus';
import '../../../node_modules/element-plus/dist/index.css';

const app = createApp(NetworkMonitor);
app.use(i18n);
app.use(ElementPlus);
app.mount('#app');