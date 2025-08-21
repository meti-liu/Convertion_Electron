<template>
  <div class="control-panel">
    <slot></slot>
  </div>
</template>

<script setup>
// This component is a simple container for now.
</script>

<style scoped>
.control-panel {
  padding: 15px;
  background-color: #f8f9fa;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>