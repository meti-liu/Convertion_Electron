<!-- src/components/PinInspector.vue -->
<template>
  <div class="pin-inspector">
    <div class="controls">
      <button @click="processFailLogs" class="action-button">Process Fail Logs</button>
    </div>
    <div v-if="logFiles.length > 0" class="log-navigation">
      <button @click="prevLog" :disabled="currentLogIndex === 0">Previous</button>
      <button @click="nextLog" :disabled="currentLogIndex >= logFiles.length - 1">Next</button>
    </div>
    <div v-if="currentLogFile" class="log-details">
      <h3>Log File: {{ currentLogFile.name }}</h3>
      <textarea :value="currentLogFile.content" readonly class="csv-content-area"></textarea>
    </div>
    <div v-if="currentLogFile && currentLogFile.failedPins.length > 0" class="failed-pins">
      <h4>Failed Pins:</h4>
      <ul class="failed-pins-list">
        <li 
          v-for="pinId in currentLogFile.failedPins" 
          :key="pinId" 
          @click="togglePinSelection(pinId)"
          :class="{ 'selected': pinId === selectedPinId }"
        >
          {{ pinId }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const emit = defineEmits(['highlight-pins', 'select-pin']);

const logFiles = ref([]);
const currentLogIndex = ref(0);
const logContent = ref('');
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

// --- Methods ---
const processFailLogs = async () => {
  const files = await window.electronAPI.processFailLogs();
  if (files && files.length > 0) {
    logFiles.value = files;
    currentLogIndex.value = 0;
    updateLogContentAndHighlight();
  }
};

const updateLogContentAndHighlight = () => {
  if (currentLogFile.value) {
    logContent.value = currentLogFile.value.content;
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
/* General component styling */
.pin-inspector {
  padding: 15px;
  background-color: #f8f9fa; /* Light grey background */
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
  display: flex;
  flex-direction: column;
  gap: 15px; /* Space between elements */
}

/* Styling for the controls area */
.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Log navigation buttons */
.log-navigation {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.log-navigation button {
  flex-grow: 1;
  padding: 8px 12px;
  background-color: #6c757d; /* Grey color for navigation */
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.log-navigation button:disabled {
  background-color: #adb5bd; /* Lighter grey when disabled */
  cursor: not-allowed;
}

.log-navigation button:not(:disabled):hover {
  background-color: #5a6268;
}

/* Log details section */
.log-details {
  margin-top: 10px;
}

.log-details h3 {
  margin-top: 0;
  font-size: 1.1em;
  color: #333;
}

/* Failed pins section */
.failed-pins {
  margin-top: 15px;
}

.failed-pins h4 {
  margin-top: 0;
  font-size: 1em;
  color: #333;
  border-bottom: 1px solid #dee2e6; /* Separator line */
  padding-bottom: 5px;
}

/* Styles for the list of failed pins */
.failed-pins-list {
  list-style-type: none;
  padding: 0;
  margin-top: 10px;
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #dee2e6; /* Border around the list */
  border-radius: 5px;
}

.failed-pins-list li {
  padding: 8px 12px;
  border-bottom: 1px solid #e9ecef; /* Lighter separator */
  cursor: pointer;
  transition: background-color 0.3s;
}

.failed-pins-list li:last-child {
  border-bottom: none;
}

.failed-pins-list li:hover {
  background-color: #e9ecef; /* Hover effect */
}

/* Main action button */
.action-button {
  width: 100%;
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.action-button:hover {
  background-color: #0056b3;
}
</style>