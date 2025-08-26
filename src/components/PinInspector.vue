<!-- src/components/PinInspector.vue -->
<template>
  <div class="pin-inspector">
    <div class="controls">
      <el-button type="primary" @click="processFailLogs" class="action-button">{{ t('load_fail_logs') }}</el-button>
    </div>
    <div v-if="logFiles.length > 0" class="log-navigation">
      <el-button @click="prevLog" :disabled="currentLogIndex === 0">{{ t('previous_log') }}</el-button>
      <el-button @click="nextLog" :disabled="currentLogIndex >= logFiles.length - 1">{{ t('next_log') }}</el-button>
    </div>
    <div class="log-display">
      <div v-if="currentLogFile" class="log-content-wrapper">
        <div class="log-header">
          <h3>{{ t('log_file_label', { name: currentLogFile.name }) }}</h3>
        </div>
        <el-input
          :model-value="currentLogFile.content"
          type="textarea"
          :rows="10"
          readonly
          class="csv-content-area"
        ></el-input>
        <div v-if="currentLogFile.failedPins.length > 0" class="failed-pins">
          <h4>{{ t('failed_pins') }}</h4>
          <div class="pins-grid">
            <el-tag
              v-for="pinId in currentLogFile.failedPins"
              :key="pinId"
              class="pin-item"
              :effect="selectedPinId === pinId ? 'dark' : 'plain'"
              @click="togglePinSelection(pinId)"
              size="large"
            >
              {{ pinId }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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
.pin-inspector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.controls, .log-navigation {
  display: flex;
  gap: 0.5rem;
}

.log-navigation {
  justify-content: space-between;
}

.log-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.failed-pins h4 {
  margin-bottom: 0.5rem;
}

.pins-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pin-item {
  cursor: pointer;
}
</style>