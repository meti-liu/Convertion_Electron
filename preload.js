const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  processFiles: () => ipcRenderer.invoke('process-files'),
  onChartData: (callback) => ipcRenderer.on('chart-data', callback),
});