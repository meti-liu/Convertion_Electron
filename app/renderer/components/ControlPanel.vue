<!-- src/components/ControlPanel.vue -->
<template>
  <el-card class="control-panel" shadow="hover">
    <template #header>
      <div class="card-header">
        <h3>{{ t('controls') }}</h3>
      </div>
    </template>
    <slot></slot>
  </el-card>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.control-panel {
  margin-bottom: 16px;
  width: 100%;
  height: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>