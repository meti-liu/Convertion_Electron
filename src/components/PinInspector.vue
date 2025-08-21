<template>
  <div class="pin-inspector">
    <div class="csv-viewer">
      <div class="csv-header">
        <button @click="prevPage" :disabled="currentPage === 0">Prev</button>
        <span>{{ currentFileName }} ({{ currentPage + 1 }} / {{ csvFiles.length }})</span>
        <button @click="nextPage" :disabled="currentPage === csvFiles.length - 1">Next</button>
      </div>
      <textarea readonly :value="currentCsvContent"></textarea>
    </div>
    <div class="highlight-controls">
      <input type="text" v-model="pinIdToHighlight" placeholder="Enter Pin ID to highlight">
      <button @click="highlightPin">Highlight</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const emit = defineEmits(['highlight-pin']);

const csvFiles = ref([]);
const currentPage = ref(0);
const pinIdToHighlight = ref('');

const currentFileName = computed(() => {
  return csvFiles.value[currentPage.value]?.name || 'No CSV files found';
});

const currentCsvContent = computed(() => {
  return csvFiles.value[currentPage.value]?.content || '';
});

const loadCsvFiles = async () => {
  const files = await window.electron.invoke('read-csv-files');
  csvFiles.value = files;
};

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < csvFiles.value.length - 1) {
    currentPage.value++;
  }
};

const highlightPin = () => {
  emit('highlight-pin', pinIdToHighlight.value);
};

onMounted(() => {
  loadCsvFiles();
});
</script>

<style scoped>
.pin-inspector {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.csv-viewer {
  display: flex;
  flex-direction: column;
}

.csv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

textarea {
  width: 100%;
  height: 200px;
  resize: vertical;
}

.highlight-controls {
  display: flex;
  gap: 5px;
}

input {
  flex-grow: 1;
}
</style>