const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => {
    // Whitelist channels to prevent exposing all of ipcRenderer
    const validChannels = ['process-files', 'get-pin-data'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    // Optionally, you could throw an error for invalid channels
    console.error(`Invalid IPC channel attempted: ${channel}`);
    return Promise.reject(new Error(`Invalid IPC channel: ${channel}`));
  },
});