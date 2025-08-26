<template>
  <div class="language-switcher">
    <select v-model="locale">
      <option value="en">English</option>
      <option value="zh-CN">简体中文</option>
      <option value="zh-TW">繁體中文</option>
      <option value="ja">日本語</option>
    </select>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { watch } from 'vue';

const { locale } = useI18n();

watch(locale, (newLocale) => {
  console.log(`Locale changed to: ${newLocale}`);
  // Here you can add logic to inform the backend if needed
});
</script>

<style scoped>
.language-switcher {
  margin: 10px;
}
select {
  padding: 5px;
}
</style>