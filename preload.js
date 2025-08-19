const { contextBridge, ipcRenderer } = require('electron');

// 安全地将 selectFiles 函数暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  processFiles: () => ipcRenderer.invoke('process-files')
});