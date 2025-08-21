<!-- src/components/PinInspector.vue -->
<template>
  <div class="pin-inspector">
    <!-- CSV Viewer -->
    <div class="csv-viewer">
      <h4>CSV Data Viewer</h4>
      <div class="csv-controls">
        <button @click="loadCsv" class="control-button">Load CSV</button>
        <span v-if="csvFiles.length > 0" class="file-info">
          {{ currentCsvFile.name }} ({{ currentPage }} / {{ csvFiles.length }})
        </span>
      </div>
      <div v-if="csvFiles.length > 0" class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">Previous</button>
        <button @click="nextPage" :disabled="currentPage === csvFiles.length">Next</button>
      </div>
      <textarea v-model="csvContent" readonly class="csv-content-area"></textarea>
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
import { ref, computed, onMounted } from 'vue';

const emit = defineEmits(['highlight-pin']);

// --- CSV Viewer State ---
const csvFiles = ref([]);
const currentPage = ref(1);
const csvContent = ref('');

// --- Pin Highlighting State ---
const pinIdToHighlight = ref('');

// --- Computed Properties ---
const currentCsvFile = computed(() => {
  return csvFiles.value[currentPage.value - 1] || {};
});

// --- Methods ---
const loadCsv = async () => {
  const files = await window.electronAPI.readCsvFiles();
  if (files && files.length > 0) {
    csvFiles.value = files;
    currentPage.value = 1;
    updateCsvContent();
  }
};

const updateCsvContent = () => {
  if (currentCsvFile.value) {
    csvContent.value = currentCsvFile.value.content;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    updateCsvContent();
  }
};

const nextPage = () => {
  if (currentPage.value < csvFiles.value.length) {
    currentPage.value++;
    updateCsvContent();
  }
};

const highlightPin = () => {
  if (pinIdToHighlight.value.trim()) {
    emit('highlight-pin', pinIdToHighlight.value.trim());
  }
};

// Load CSV on component mount for demonstration if needed
onMounted(() => {
  // You could auto-load CSVs here if desired
});
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