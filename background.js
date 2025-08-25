const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises; // Use promises-based fs
const sqlite3 = require('sqlite3').verbose();
const tcp_handler = require('./tcp_handler');

// Initialize DB in the project's root directory
const dbPath = path.join(__dirname, 'jig_data.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database opening error: ', err);
  } else {
    console.log(`Database opened successfully at ${dbPath}`);
    // Create table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS failures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pin_number INTEGER NOT NULL,
      error_type TEXT,
      log_file TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Table creation error: ', err);
      }
    });
  }
});

let mainWindow;
let networkMonitorWindow = null;
const { spawn } = require('child_process');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // 必须为 true
      nodeIntegration: false, // 推荐为 false 以提高安全性
    },
  });

  const menu = Menu.buildFromTemplate([
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Network Monitor',
          click: () => {
            if (networkMonitorWindow) {
              networkMonitorWindow.close();
            } else {
              createNetworkMonitorWindow();
            }
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggledevtools' }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL('http://localhost:5173');
  mainWindow.webContents.openDevTools();

  tcp_handler.setWindows(mainWindow, networkMonitorWindow);
}

function createNetworkMonitorWindow() {
  networkMonitorWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Network Monitor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the network.html from the Vite dev server
  networkMonitorWindow.loadURL('http://localhost:5173/network.html');

  networkMonitorWindow.on('closed', () => {
    networkMonitorWindow = null;
    tcp_handler.setWindows(mainWindow, null);
  });

  tcp_handler.setWindows(mainWindow, networkMonitorWindow);
}

app.whenReady().then(() => {
  createWindow();
  // Automatically load data once the window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    loadDataOnStartup();
  });
});

// Helper function to process JIG files (.rut, .adr)
async function processJigFiles(filePaths) {
  if (!filePaths || filePaths.length === 0) {
    return null;
  }

  const scriptPath = path.join(__dirname, 'json_script.py');
  const rutFiles = filePaths.filter(p => p.toLowerCase().endsWith('.rut'));
  const adrFile = filePaths.find(p => p.toLowerCase().endsWith('.adr'));

  if (!adrFile || rutFiles.length === 0) {
    // For automatic loading, we might not want a blocking error dialog
    console.error('Jig file selection error: At least one .RUT and one .ADR file are required.');
    return null;
  }

  const scriptArgs = [...rutFiles, adrFile];

  return new Promise((resolve, reject) => {
    const pyProcess = spawn('python', [scriptPath, ...scriptArgs]);
    let stdout = '';
    let stderr = '';
    pyProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    pyProcess.stderr.on('data', (data) => { stderr += data.toString(); });
    pyProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python stderr: ${stderr}`);
        // Avoid dialog for auto-load, just log it
        // dialog.showErrorBox('Python Script Error', stderr); 
        return reject(new Error(`Python script exited with code ${code}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        // dialog.showErrorBox('JSON Parse Error', 'Failed to parse JSON from Python script.');
        reject(new Error('Failed to parse JSON from Python script.'));
      }
    });
  });
}

// Helper function to process failure logs (.csv, .txt)
async function processFailLogs(filePaths) {
  if (!filePaths || filePaths.length === 0) {
    return [];
  }

  const logPairs = {};
  const timestampRegex = /(\d{8}-\d{6})/;

  for (const filePath of filePaths) {
    const match = filePath.match(timestampRegex);
    if (match) {
      const timestamp = match[1];
      if (!logPairs[timestamp]) {
        logPairs[timestamp] = {};
      }
      if (filePath.toLowerCase().endsWith('.csv')) {
        logPairs[timestamp].csv = filePath;
      } else if (filePath.toLowerCase().endsWith('.txt')) {
        logPairs[timestamp].txt = filePath;
      }
    }
  }

  const processedLogs = [];
  for (const timestamp in logPairs) {
    const pair = logPairs[timestamp];
    if (pair.csv && pair.txt) {
      try {
        const parsedResults = await runFailParser(pair.csv);
        const failedPins = parsedResults.map(r => r.pin);
        const txtContent = await fs.readFile(pair.txt, 'utf-8');

        const stmt = db.prepare("INSERT INTO failures (pin_number, error_type, log_file) VALUES (?, ?, ?)");
        for (const item of parsedResults) {
          stmt.run(item.pin, item.error_type, path.basename(pair.csv));
        }
        stmt.finalize();

        processedLogs.push({
          id: timestamp,
          name: path.basename(pair.txt),
          content: txtContent,
          failedPins: failedPins,
        });
      } catch (error) {
        console.error(`Failed to process log pair for ${timestamp}:`, error);
      }
    }
  }
  return processedLogs;
}

// Function to automatically load all data on startup
async function loadDataOnStartup() {
  try {
    // 1. Load and process JIG files from 'doc'
    const docDir = path.join(__dirname, 'doc');
    const docFiles = await fs.readdir(docDir);
    const jigFilePaths = docFiles
      .filter(file => file.toLowerCase().endsWith('.rut') || file.toLowerCase().endsWith('.adr'))
      .map(file => path.join(docDir, file));
      
    if (jigFilePaths.length > 0) {
      const jigData = await processJigFiles(jigFilePaths);
      if (jigData) {
        mainWindow.webContents.send('jig-data-loaded', jigData);
      }
    }

    // 2. Load and process fail logs from 'doc_test'
    const docTestDir = path.join(__dirname, 'doc_test');
    const docTestFiles = await fs.readdir(docTestDir);
    const logFilePaths = docTestFiles
      .filter(file => file.toLowerCase().endsWith('.csv') || file.toLowerCase().endsWith('.txt'))
      .map(file => path.join(docTestDir, file));

    if (logFilePaths.length > 0) {
      const failLogData = await processFailLogs(logFilePaths);
      if (failLogData && failLogData.length > 0) {
        mainWindow.webContents.send('fail-logs-loaded', failLogData);
      }
    }
  } catch (error) {
    console.error('Error during automatic data loading:', error);
    dialog.showErrorBox('Auto-Load Error', 'Could not automatically load initial data. Please load files manually.');
  }
}


// Manual IPC handler for JIG files (for updates)
ipcMain.handle('process-files', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Jig Files', extensions: ['rut', 'adr'] }],
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }
  // Use the refactored helper function
  return processJigFiles(filePaths);
});

// This handler is now deprecated and can be removed or kept for other purposes.
// We will leave it for now.
ipcMain.handle('process-fail-logs', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Log Files', extensions: ['csv', 'txt'] }],
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return [];
  }
  // Use the refactored helper function
  return processFailLogs(filePaths);
});

function runFailParser(filePath) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'parse_fails.py'), filePath]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`Python stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error('Failed to parse Python script output.'));
        }
      } else {
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.close(); // Close the database connection
    app.quit();
  }
});

// IPC handlers for TCP Server
ipcMain.on('tcp-start', (event, options) => {
  tcp_handler.startServer(options).catch(err => {
    console.error('Failed to start TCP server:', err.message);
  });
});

ipcMain.on('tcp-stop', () => {
  tcp_handler.stopServer();
});