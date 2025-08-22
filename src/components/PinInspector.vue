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
    <div v-if="currentLogFile && currentLogFile.failures && currentLogFile.failures.length > 0" class="failed-pins">
      <h4>Failed Pins:</h4>
      <div class="failure-type-groups">
        <div v-for="type in failureTypes" :key="type" class="failure-type-group">
          <h5 :class="['failure-type', type.toLowerCase()]">{{ type }}</h5>
          <ul class="failed-pins-list">
            <li 
              v-for="failure in failuresByType[type]" 
              :key="failure.pins.join('-')" 
              @click="togglePinSelection(failure)"
              :class="{ 
                'selected': isSelected(failure),
                'single-pin': failure.pins.length === 1,
                'pin-pair': failure.pins.length === 2
              }"
            >
              {{ formatPins(failure.pins) }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  failures: {
    type: Array,
    default: () => []
  },
  selectedPins: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:selectedPins']);

const logFiles = ref([]);
const currentLogIndex = ref(0);
const selectedFailure = ref(null);

const failureTypes = computed(() => {
  if (!currentLogFile.value?.failures) return [];
  return [...new Set(currentLogFile.value.failures.map(f => f.type))].sort();
});

const failuresByType = computed(() => {
  if (!currentLogFile.value?.failures) return {};
  return currentLogFile.value.failures.reduce((acc, failure) => {
    if (!acc[failure.type]) {
      acc[failure.type] = [];
    }
    acc[failure.type].push(failure);
    return acc;
  }, {});
});

const togglePinSelection = (failure) => {
  const newSelection = failure.pins;
  // Check if the current selection is the same as the new selection
  if (JSON.stringify(props.selectedPins) === JSON.stringify(newSelection)) {
    emit('update:selectedPins', []); // Deselect if already selected
  } else {
    emit('update:selectedPins', newSelection);
  }
};

const isSelected = (failure) => {
  // Compare arrays by value
  return JSON.stringify(props.selectedPins) === JSON.stringify(failure.pins);
};

const formatPins = (pins) => {
  return pins.length === 1 ? `Pin ${pins[0]}` : `Pins ${pins.join(' - ')}`;
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
  if (currentLogFile.value && currentLogFile.value.failures) {
    // Extract all pins from all failures and emit them for highlighting
    const allPins = currentLogFile.value.failures.map(failure => failure.pins).flat();
    emit('highlight-pins', allPins);
  } else {
    emit('highlight-pins', []); // Clear highlights if no failures
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
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* Controls and navigation */
.controls, .log-navigation {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.action-button, .log-navigation button {
  padding: 8px 12px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.action-button:hover, .log-navigation button:not(:disabled):hover {
  background-color: #5a6268;
}

.log-navigation button:disabled {
  background-color: #adb5bd;
  cursor: not-allowed;
}

/* Log content area */
.csv-content-area {
  width: 100%;
  height: 200px;
  min-height: 100px;
  resize: vertical;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  box-sizing: border-box;
}

/* Failure type groups */
.failure-type-groups {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.failure-type-group {
  border: 1px solid #dee2e6;
  border-radius: 5px;
  overflow: hidden;
}

.failure-type {
  margin: 0;
  padding: 8px 12px;
  color: white;
  font-size: 0.9em;
  font-weight: 600;
}

/* Failure type colors */
.failure-type.open { background-color: #dc3545; }
.failure-type.wru-short { background-color: #fd7e14; }
.failure-type.silver { background-color: #6f42c1; }
.failure-type.leak { background-color: #0dcaf0; }
.failure-type.spark { background-color: #ffc107; }

/* Failed pins list */
.failed-pins-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 150px;
  overflow-y: auto;
}

.failed-pins-list li {
  padding: 8px 12px;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
}

.failed-pins-list li:last-child {
  border-bottom: none;
}

.failed-pins-list li:hover {
  background-color: #e9ecef;
}

.failed-pins-list li.selected {
  background-color: #cfe2ff;
  color: #0d6efd;
}

/* Pin type indicators */
.failed-pins-list li.single-pin::before {
  content: "•";
  margin-right: 8px;
}

.failed-pins-list li.pin-pair::before {
  content: "⇄";
  margin-right: 8px;
}
</style>