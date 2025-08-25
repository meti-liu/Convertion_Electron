<!-- src/components/PinInspector.vue -->
<template>
  <div class="pin-inspector">
    <div class="controls">
      <button @click="processFailLogs" class="action-button">Load Fail Logs Manually</button>
    </div>
    <div v-if="logFiles.length > 0" class="log-navigation">
      <button @click="prevLog" :disabled="currentLogIndex === 0">Previous</button>
      <button @click="nextLog" :disabled="currentLogIndex >= logFiles.length - 1">Next</button>
    </div>
    <div class="log-display">
      <div v-if="currentLogFile" class="log-content-wrapper">
        <div class="log-header">
          <h3>Log File: {{ currentLogFile.name }}</h3>
        </div>
        <textarea :value="currentLogFile.content" readonly class="csv-content-area"></textarea>
        <!-- This is the new, refactored section for displaying failed pins -->
        <div v-if="currentLogFile.failedPins.length > 0" class="failed-pins">
          <h4>Failed Pins:</h4>
          <div class="pins-grid">
            <div
              v-for="pinId in currentLogFile.failedPins"
              :key="pinId"
              class="pin-item"
              :class="{ 'selected': pinId === selectedPinId }"
              @click="togglePinSelection(pinId)"
            >
              {{ pinId }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  failData: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['highlight-pins', 'select-pin']);

const logFiles = ref([]);
const currentLogIndex = ref(0);
const selectedPinId = ref(null);

const togglePinSelection = (pinId) => {
  if (selectedPinId.value === pinId) {
    selectedPinId.value = null; // Deselect if already selected
  } else {
    selectedPinId.value = pinId; // Select the new pin
  }
  emit('select-pin', selectedPinId.value);
};

const currentLogFile = computed(() => {
  return logFiles.value[currentLogIndex.value] || null;
});

// --- Watchers ---
watch(currentLogIndex, () => {
  updateLogContentAndHighlight();
});

// Watch for auto-loaded data from the parent component
watch(() => props.failData, (newData) => {
  if (newData && newData.length > 0) {
    // When auto-loaded data arrives, set it as the initial list
    logFiles.value = newData;
    currentLogIndex.value = 0;
    updateLogContentAndHighlight();
  }
}, { immediate: true }); // `immediate` ensures this runs on component mount

// --- Methods ---
const processFailLogs = async () => {
  const files = await window.electronAPI.processFailLogs();
  if (files && files.length > 0) {
    // When loading manually, append new files, avoiding duplicates
    const existingIds = new Set(logFiles.value.map(log => log.id));
    const newFiles = files.filter(file => !existingIds.has(file.id));

    if (newFiles.length > 0) {
      logFiles.value.push(...newFiles);
      // Set the index to the first of the newly loaded files
      currentLogIndex.value = logFiles.value.length - newFiles.length;
    } else {
      // If all selected files are duplicates, maybe just focus the first one
      if (files.length > 0) {
        const targetIndex = logFiles.value.findIndex(log => log.id === files[0].id);
        if (targetIndex !== -1) {
          currentLogIndex.value = targetIndex;
        }
      }
    }
  }
};

const updateLogContentAndHighlight = () => {
  if (currentLogFile.value) {
    emit('highlight-pins', currentLogFile.value.failedPins || []);
  }
};

const prevLog = () => {
  if (currentLogIndex.value > 0) {
    currentLogIndex.value--;
  }
};

const nextLog = () => {
  if (currentLogIndex.value < logFiles.value.length - 1) {
    currentLogIndex.value++;
  }
};
</script>

<style scoped>
.log-navigation {
  display: flex;
  justify-content: space-between;
}
</style>