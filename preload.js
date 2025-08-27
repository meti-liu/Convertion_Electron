const { contextBridge, ipcRenderer } = require('electron');

// 安全地将 selectFiles 函数暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', 
{
  processFiles: () => ipcRenderer.invoke('process-files'),
  readCsvFiles: () => ipcRenderer.invoke('read-csv-files'),
  processFailLogs: () => ipcRenderer.invoke('process-fail-logs'),
  onJigDataLoaded: (callback) => ipcRenderer.on('jig-data-loaded', (event, ...args) => callback(...args)),
  onFailDataLoaded: (callback) => ipcRenderer.on('fail-data-loaded', (event, ...args) => callback(...args)),
  // TCP Server related
  startTcpServer: (options) => ipcRenderer.send('tcp-start', options),
  stopTcpServer: () => ipcRenderer.send('tcp-stop'),
  onTcpServerStatus: (callback) => ipcRenderer.on('tcp-server-status', callback),
  onTcpDataReceived: (callback) => ipcRenderer.on('tcp-data-received', callback),
  onFileCopyStatus: (callback) => ipcRenderer.on('file-copy-status', callback),
  onNewLogFile: (callback) => ipcRenderer.on('new-log-file', (event, ...args) => callback(...args)),
  // Locale related
  setLocale: (locale) => ipcRenderer.send('set-locale', locale),
  onUpdateLocale: (callback) => ipcRenderer.on('update-locale', (_event, value) => callback(value)),
  requestInitialLocale: () => ipcRenderer.send('request-initial-locale'), // For initial language handshake
  send: (channel, data) => {
    // Whitelist channels
    let validChannels = ['export-svg'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  }
});