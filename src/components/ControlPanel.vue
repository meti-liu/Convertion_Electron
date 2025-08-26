<!-- src/components/ControlPanel.vue -->
<template>
  <div class="control-panel">
    <h3>{{ t('controls') }}</h3>
    <slot></slot>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background-color: #f1f5f9; /* A light gray background */
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>