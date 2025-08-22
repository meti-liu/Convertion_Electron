<!-- src/components/PinInspector.vue -->
<template>
  <div class="pin-inspector">
    <!-- Fail Log Viewer -->
    <div class="csv-viewer">
      <h4>Fail Log Viewer</h4>
      <div class="csv-controls">
        <button @click="processFails" class="control-button">Process Fail Logs</button>
        <span v-if="logFiles.length > 0" class="file-info">
          {{ currentLogFile.name }} ({{ currentPage }} / {{ logFiles.length }})
        </span>
      </div>
      <div v-if="logFiles.length > 0" class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">Previous</button>
        <button @click="nextPage" :disabled="currentPage === logFiles.length">Next</button>
      </div>
      <textarea v-model="logContent" readonly class="csv-content-area"></textarea>
    </div>

    <!-- Pin Highlighting Controls -->
    <div class="highlight-controls">
      <h4>Highlight Pin</h4>
      <div class="input-group">
        <input type="text" v-model="pinIdToHighlight" placeholder="Enter Pin ID" />
        <button @click="highlightPin" class="control-button">Highlight</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const emit = defineEmits(['highlight-pin', 'highlight-pins']);

// --- Fail Log Viewer State ---
const logFiles = ref([]);
const currentPage = ref(1);
const logContent = ref('');

// --- Pin Highlighting State ---
const pinIdToHighlight = ref('');

// --- Computed Properties ---
const currentLogFile = computed(() => {
  return logFiles.value[currentPage.value - 1] || {};
});

// --- Watchers ---
watch(currentPage, () => {
  updateLogContentAndHighlight();
});

// --- Methods ---
const processFails = async () => {
  const files = await window.electronAPI.processFailLogs();
  if (files && files.length > 0) {
    logFiles.value = files;
    currentPage.value = 1;
    updateLogContentAndHighlight();
  }
};

const updateLogContentAndHighlight = () => {
  if (currentLogFile.value) {
    logContent.value = currentLogFile.value.content;
    emit('highlight-pins', currentLogFile.value.failedPins || []);
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < logFiles.value.length) {
    currentPage.value++;
  }
};

const highlightPin = () => {
  if (pinIdToHighlight.value.trim()) {
    emit('highlight-pin', pinIdToHighlight.value.trim());
  }
};
</script>

<style scoped>
.pin-inspector {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 15px;
  background-color: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

h4 {
  margin-bottom: 10px;
  color: #334155;
  font-weight: 600;
}

.csv-viewer, .highlight-controls {
  display: flex;
  flex-direction: column;
}

.csv-controls, .pagination, .input-group {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.file-info {
  font-size: 0.9em;
  color: #64748b;
}

.control-button, .pagination button {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background-color: #f8fafc;
  cursor: pointer;
  transition: background-color 0.2s;
}

.control-button:hover, .pagination button:hover {
  background-color: #f1f5f9;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.csv-content-area {
  width: 100%;
  height: 200px;
  font-family: monospace;
  font-size: 0.85em;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  resize: vertical;
}

.input-group input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}
</style>