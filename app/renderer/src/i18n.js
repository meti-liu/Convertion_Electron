import { createI18n } from 'vue-i18n';
import en from '../locales/en.json';
import zhCN from '../locales/zh-CN.json';
import zhTW from '../locales/zh-TW.json';
import ja from '../locales/ja.json';

const messages = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ja
};

const i18n = createI18n({
  legacy: false, // you must set `false`, to use Composition API
  locale: 'en', // set locale
  fallbackLocale: 'en', // set fallback locale
  messages, // set locale messages
});

export default i18n;