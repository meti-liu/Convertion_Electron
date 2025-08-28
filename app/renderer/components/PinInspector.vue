<!-- src/components/PinInspector.vue -->
<template>
  <div class="pin-inspector">
    <div class="controls">
      <el-button type="primary" @click="processFailLogs" class="action-button">
        <el-icon><Upload /></el-icon>
        {{ t('load_fail_logs') }}
      </el-button>
    </div>
    
    <el-empty v-if="logFiles.length === 0" :description="t('no_logs_loaded')" />
    
    <div v-else class="logs-container">
      <el-tabs v-model="currentLogIndex" type="card" class="log-tabs" @tab-change="handleTabChange">
        <el-tab-pane 
          v-for="(log, index) in logFiles" 
          :key="log.id" 
          :label="log.name"
          :name="index.toString()"
        >
          <template #label>
            <el-badge :value="log.failedPins.length" :max="99" type="danger" v-if="log.failedPins.length > 0">
              {{ log.name }}
            </el-badge>
            <span v-else>{{ log.name }}</span>
          </template>
          
          <el-input
            :model-value="log.content"
            type="textarea"
            :rows="8"
            readonly
            class="csv-content-area"
          ></el-input>
          
          <div v-if="log.failedPins.length > 0" class="failed-pins">
            <el-divider content-position="left">
              <el-tag type="danger">{{ t('failed_pins') }}</el-tag>
            </el-divider>
            
            <el-scrollbar height="150px">
              <div class="pins-grid">
                <el-tag
                  v-for="pinId in log.failedPins"
                  :key="pinId"
                  class="pin-item"
                  :type="selectedPinId === pinId ? 'danger' : 'info'"
                  :effect="selectedPinId === pinId ? 'dark' : 'light'"
                  @click="togglePinSelection(pinId)"
                  size="large"
                >
                  {{ pinId }}
                </el-tag>
              </div>
            </el-scrollbar>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Upload } from '@element-plus/icons-vue';

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

// Handle tab change - convert string index back to number
const handleTabChange = (tabIndex) => {
  currentLogIndex.value = parseInt(tabIndex);
  updateLogContentAndHighlight();
};

const currentLogFile = computed(() => {
  return logFiles.value[currentLogIndex.value] || null;
});

// --- Watchers ---
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
  margin-bottom: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.controls {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.action-button {
  width: 100%;
}

.logs-container {
  margin-top: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.log-tabs {
  width: 100%;
}

:deep(.el-tabs__content) {
  width: 100%;
}

:deep(.el-tab-pane) {
  width: 100%;
}

.csv-content-area {
  font-family: monospace;
  margin-bottom: 16px;
  width: 100%;
}

:deep(.el-textarea__inner) {
  width: 100%;
  background-color: #1e1e1e;
  color: #ffffff;
  border-color: #333;
}

.failed-pins {
  margin-top: 16px;
  width: 100%;
}

.pins-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
  width: 100%;
}

.pin-item {
  cursor: pointer;
}

:deep(.el-button) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.el-icon) {
  margin-right: 5px;
}

:deep(.el-empty) {
  padding: 20px 0;
}
</style>