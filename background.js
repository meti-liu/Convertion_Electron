const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // 必须为 true
      nodeIntegration: false, // 推荐为 false 以提高安全性
    },
  });

  win.loadURL('http://localhost:5173');
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

// ... (app lifecycle events)

ipcMain.handle('process-files', async () => {
  // 1. Open file dialog to get file paths
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
        { name: 'Jig Files', extensions: ['rut', 'adr'] }
    ],
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  // 2. Find the python script
  // Assumes the script is in the parent directory under 'Convertion'
  const scriptPath = path.join(__dirname, 'json_script.py');
  
  // 3. Separate files and prepare arguments
  const rutFiles = filePaths.filter(p => p.toLowerCase().endsWith('.rut'));
  const adrFile = filePaths.find(p => p.toLowerCase().endsWith('.adr'));

  if (!adrFile || rutFiles.length === 0) {
    dialog.showErrorBox('File Selection Error', 'You must select at least one .RUT file and one .ADR file.');
    return null;
  }
  
  const scriptArgs = [...rutFiles, adrFile];

  // 4. Spawn Python process and return a promise
  return new Promise((resolve, reject) => {
    const pyProcess = spawn('python', [scriptPath, ...scriptArgs]);

    let stdout = '';
    let stderr = '';

    pyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python stderr: ${stderr}`);
        dialog.showErrorBox('Python Script Error', stderr);
        return reject(new Error(`Python script exited with code ${code}`));
      }
      try {
        // 5. Parse the JSON output from Python and resolve the promise
        resolve(JSON.parse(stdout));
      } catch (e) {
        dialog.showErrorBox('JSON Parse Error', 'Failed to parse JSON from Python script.');
        reject(new Error('Failed to parse JSON from Python script.'));
      }
    });
  });
});