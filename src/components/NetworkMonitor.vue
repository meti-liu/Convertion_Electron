<template>
  <div class="network-monitor">
    <h2>{{ t('network_monitor') }}</h2>
    <div class="controls">
      <input v-model="host" :placeholder="t('host_ip_placeholder')" />
      <input v-model="port" type="number" :placeholder="t('port_placeholder')" />
      <button @click="startServer" :disabled="isRunning">{{ t('start_server') }}</button>
      <button @click="stopServer" :disabled="!isRunning">{{ t('stop_server') }}</button>
    </div>
    <div class="status">
      <strong>{{ t('status_label') }}</strong> <span :class="statusClass">{{ statusMessage }}</span>
    </div>
    <div class="logs">
      <h3>{{ t('logs_label') }}</h3>
      <pre>{{ logs.join('\n') }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const host = ref('0.0.0.0');
const port = ref(8080);
const isRunning = ref(false);
const statusMessage = ref('Stopped');
const logs = ref([]);

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
  window.electronAPI.onSetLocale(handleLocaleChange);
  window.electronAPI.onFileCopyStatus(handleFileCopyStatus);
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
  padding: 20px;
  font-family: sans-serif;
}
.controls {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}
.status {
  margin-bottom: 20px;
}
.status .running {
  color: green;
  font-weight: bold;
}
.status .stopped {
  color: red;
  font-weight: bold;
}
.status .error {
    color: orange;
    font-weight: bold;
}
.logs {
  border: 1px solid #ccc;
  padding: 10px;
  height: 300px;
  overflow-y: auto;
  background-color: #f5f5f5;
}
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>