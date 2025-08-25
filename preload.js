const { contextBridge, ipcRenderer } = require('electron');

// 安全地将 selectFiles 函数暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', 
{
  processFiles: () => ipcRenderer.invoke('process-files'),
  readCsvFiles: () => ipcRenderer.invoke('read-csv-files'), // Add this line
  processFailLogs: () => ipcRenderer.invoke('process-fail-logs'),
  getFailFomart: (path) => ipcRenderer.invoke('get-fail-fomart', path),
  startTcpServer: (options) => ipcRenderer.send('tcp-start', options),
  stopTcpServer: () => ipcRenderer.send('tcp-stop'),
  onTcpServerStatus: (callback) => ipcRenderer.on('tcp-server-status', callback),
  onTcpDataReceived: (callback) => ipcRenderer.on('tcp-data-received', callback),
  onFileCopyStatus: (callback) => ipcRenderer.on('file-copy-status', callback),
  onNewLogFile: (callback) => ipcRenderer.on('new-log-file', (event, ...args) => callback(...args)),
});