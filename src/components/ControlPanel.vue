<template>
  <div class="control-panel-container">
    <h4>控制面板</h4>
    <div class="control-group">
      <label for="zoom-slider">缩放</label>
      <input 
        type="range" 
        id="zoom-slider" 
        min="0.1" 
        max="10" 
        step="0.1" 
        v-model="zoomLevel" 
        @input="onSettingsChange"
      >
    </div>
    <div class="control-group">
      <label for="mode-select">模式</label>
      <select id="mode-select" v-model="renderMode" @change="onSettingsChange">
        <option value="pan">平移</option>
        <option value="zoom">缩放</option>
      </select>
    </div>
    <div class="control-group">
       <button @click="resetView">重置视图</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const zoomLevel = ref(1);
const renderMode = ref('pan');

const emit = defineEmits(['update-settings', 'reset-view']);

function onSettingsChange() {
  emit('update-settings', {
    zoom: parseFloat(zoomLevel.value),
    mode: renderMode.value
  });
}

function resetView() {
    emit('reset-view');
}

</script>

<style scoped>
.control-panel-container {
  padding: 15px;
  border: 1px solid #444;
  border-radius: 8px;
  background-color: #2a2a2a;
  color: #e0e0e0;
}

h4 {
  margin-top: 0;
  margin-bottom: 20px;
  text-align: center;
  color: #61dafb;
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
}

.control-group input[type="range"],
.control-group select {
  width: 100%;
  padding: 8px;
  background-color: #3c3c3c;
  border: 1px solid #555;
  border-radius: 4px;
  color: #e0e0e0;
  box-sizing: border-box;
}

.control-group button {
  width: 100%;
  padding: 8px 15px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.control-group button:hover {
  background-color: #45a049;
}
</style>
