<template>
  <div class="network-monitor">
    <el-card class="monitor-card">
      <template #header>
        <div class="card-header">
          <h2>{{ t('network_monitor') }}</h2>
          <el-tag size="small">{{ locale }}</el-tag>
        </div>
      </template>
      
      <el-form :model="formData" label-position="top" class="server-form">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('host_ip_placeholder')">
              <el-input v-model="host" :placeholder="t('host_ip_placeholder')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('port_placeholder')">
              <el-input-number v-model="port" :min="1" :max="65535" :placeholder="t('port_placeholder')" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item>
          <el-button type="primary" @click="startServer" :disabled="isRunning">
            <el-icon><VideoPlay /></el-icon> {{ t('start_server') }}
          </el-button>
          <el-button type="danger" @click="stopServer" :disabled="!isRunning">
            <el-icon><VideoPause /></el-icon> {{ t('stop_server') }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <el-divider content-position="left">
        <el-icon><InfoFilled /></el-icon> {{ t('status_label') }}
      </el-divider>
      
      <el-alert
        :title="statusMessage"
        :type="statusType"
        :closable="false"
        show-icon
      />
      
      <el-divider content-position="left">
        <el-icon><Document /></el-icon> {{ t('logs_label') }}
      </el-divider>
      
      <el-scrollbar height="300px" class="logs-scrollbar">
        <div class="log-entry" v-for="(log, index) in logs" :key="index">
          <pre>{{ log }}</pre>
        </div>
      </el-scrollbar>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { VideoPlay, VideoPause, InfoFilled, Document } from '@element-plus/icons-vue';

const { t, locale } = useI18n();

const host = ref('0.0.0.0');
const port = ref(8080);
const isRunning = ref(false);
const statusMessage = ref('Stopped');
const logs = ref([]);
const formData = ref({}); // Empty form model for el-form

// Compute status type for el-alert component
const statusType = computed(() => {
  if (isRunning.value) return 'success';
  if (statusMessage.value.toLowerCase().includes('error')) return 'error';
  return 'info';
});

// Keep for backward compatibility
const statusClass = computed(() => {
  if (isRunning.value) return 'running';
  if (statusMessage.value.toLowerCase().includes('error')) return 'error';
  return 'stopped';
});

const startServer = () => {
  if (host.value && port.value) {
    window.electronAPI.startTcpServer({ host: host.value, port: parseInt(port.value, 10) });
  } else {
    logs.value.push('Error: Host and Port are required.');
  }
};

const stopServer = () => {
  window.electronAPI.stopTcpServer();
};

const handleServerStatus = (event, { status, host, port, message, client }) => {
  switch (status) {
    case 'running':
      isRunning.value = true;
      statusMessage.value = `Running on ${host}:${port}`;
      logs.value.push(`Server started on ${host}:${port}`);
      break;
    case 'stopped':
      isRunning.value = false;
      statusMessage.value = 'Stopped';
      logs.value.push('Server stopped.');
      break;
    case 'error':
      isRunning.value = false;
      statusMessage.value = `Error: ${message}`;
      logs.value.push(`Server Error: ${message}`);
      break;
    case 'client-connected':
      logs.value.push(`Client connected: ${client}`);
      break;
    case 'client-disconnected':
      logs.value.push(`Client disconnected: ${client}`);
      break;
    case 'socket-error':
       logs.value.push(`Socket error from ${client}: ${message}`);
      break;
  }
};

const handleDataReceived = (event, { client, data }) => {
  logs.value.push(`Received data from ${client}:\n${data}`);
};

const handleFileCopyStatus = (event, { status, message }) => {
    logs.value.push(`File Copy: [${status.toUpperCase()}] ${message}`);
};


onMounted(() => {
  window.electronAPI.onTcpServerStatus(handleServerStatus);
  window.electronAPI.onTcpDataReceived(handleDataReceived);
  window.electronAPI.onUpdateLocale(handleLocaleChange);
  window.electronAPI.onFileCopyStatus(handleFileCopyStatus);

  // Request the initial locale from the main process once the component is ready
  window.electronAPI.requestInitialLocale();
});

onUnmounted(() => {
  // It's good practice to clean up listeners, though with window-level listeners
  // in Electron it might not be strictly necessary if the window is closed.
});

const handleLocaleChange = (newLocale) => {
  locale.value = newLocale;
};

onUnmounted(() => {
  // It's good practice to remove listeners when the component is unmounted
  // but electronAPI doesn't expose a way to remove a specific listener.
  // If the API were `emitter.on(channel, listener)` and `emitter.removeListener(channel, listener)`,
  // we would call removeListener here. For now, we assume the main process handles this or it's a single-use window.
});

</script>

<style scoped>
.network-monitor {
  padding: 16px;
}

.monitor-card {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
}

.server-form {
  margin-bottom: 16px;
}

.logs-scrollbar {
  margin-top: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.log-entry {
  padding: 8px;
  border-bottom: 1px solid #ebeef5;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry pre {
  margin: 0;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Keep these for backward compatibility */
.running {
  color: #67c23a;
}

.stopped {
  color: #909399;
}

.error {
  color: #f56c6c;
}
</style>