import { createApp } from 'vue';
import NetworkMonitor from './components/NetworkMonitor.vue';
import i18n from './i18n'; // Import the i18n instance

const app = createApp(NetworkMonitor);
app.use(i18n); // Use the i18n plugin
app.mount('#app');