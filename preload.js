const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  processFiles: () => ipcRenderer.invoke('run-processing'),
});