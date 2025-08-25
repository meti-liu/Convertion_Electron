<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  logs: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const emit = defineEmits(['highlight-pins', 'select-pin']);

const currentLogIndex = ref(0);

// When the logs prop changes, reset the index to the latest log
watch(() => props.logs, () => {
  currentLogIndex.value = 0;
  emitHighlight();
}, { deep: true, immediate: true });

const currentLog = computed(() => {
  if (!props.logs || props.logs.length === 0) {
    return null;
  }
  return props.logs[currentLogIndex.value];
});

const failedPinsInCurrentLog = computed(() => {
  return currentLog.value ? currentLog.value.failedPins : [];
});

function emitHighlight() {
  if (currentLog.value) {
    emit('highlight-pins', currentLog.value.failedPins || []);
  } else {
    // If there are no logs, ensure no pins are highlighted
    emit('highlight-pins', []);
  }
}

function selectPin(pinId) {
  emit('select-pin', pinId);
}

function nextLog() {
  if (currentLogIndex.value < props.logs.length - 1) {
    currentLogIndex.value++;
  }
}

function prevLog() {
  if (currentLogIndex.value > 0) {
    currentLogIndex.value--;
  }
}

// Emit highlights when the component is mounted or the index changes
watch(currentLogIndex, emitHighlight, { immediate: true });
</script>

<template>
  <div class="pin-inspector">
    <div v-if="!currentLog" class="no-logs-message">
      <p>No failed logs loaded.</p>
    </div>

    <div v-else>
      <!-- Log File Navigator -->
      <div class="log-file-section">
        <div class="section-header">
          <h3>Log File</h3>
          <div class="navigator-controls">
            <button @click="prevLog" :disabled="currentLogIndex === 0">Previous</button>
            <span>{{ currentLogIndex + 1 }} / {{ logs.length }}</span>
            <button @click="nextLog" :disabled="currentLogIndex >= logs.length - 1">Next</button>
          </div>
        </div>
        <div class="log-content-box">
          <pre>{{ currentLog.name }}</pre>
        </div>
      </div>

      <!-- Failed Pins List -->
      <div class="failed-pins-section">
        <div class="section-header">
          <h3>Failed Pins</h3>
        </div>
        <div class="pin-list-box">
          <ul>
            <li
              v-for="pinId in failedPinsInCurrentLog"
              :key="pinId"
              @click="selectPin(pinId)"
              class="pin-item"
            >
              Pin {{ pinId }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Import shared styles */
@import '../assets/styles.css';

.pin-inspector {
  padding: 15px;
  background-color: #f8f9fa; /* Light grey background */
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
  display: flex;
  flex-direction: column;
  gap: 15px; /* Space between elements */
}

.no-logs-message {
  text-align: center;
  color: #6c757d;
  padding: 20px;
}

.log-file-section, .failed-pins-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 8px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1em;
  color: #333;
}

.navigator-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.navigator-controls button {
  padding: 4px 8px;
}

.navigator-controls span {
  font-size: 0.9em;
  color: #6c757d;
}

.log-content-box, .pin-list-box {
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px;
  min-height: 50px;
  max-height: 200px;
  overflow-y: auto;
}

.log-content-box pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: monospace;
}

.pin-list-box ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.pin-item {
  padding: 8px 12px;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  transition: background-color 0.3s;
}

.pin-item:last-child {
  border-bottom: none;
}

.pin-item:hover {
  background-color: #e9ecef;
}
</style>