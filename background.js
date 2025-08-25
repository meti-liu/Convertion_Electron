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

  // Automatically load data on startup
  mainWindow.webContents.on('did-finish-load', async () => {
    console.log('[Auto-Load] did-finish-load event triggered.');

    // --- Auto-load and process .rut and .adr files from 'doc' directory ---
    const docDir = path.join(__dirname, 'doc');
    try {
      console.log(`[Auto-Load] Checking for jig files in: ${docDir}`);
      const files = await fs.readdir(docDir);

      const rutFiles = files
        .filter(file => file.toLowerCase().endsWith('.rut'))
        .map(file => path.join(docDir, file));
      const adrFile = files
        .map(file => path.join(docDir, file))
        .find(file => file.toLowerCase().endsWith('.adr'));

      if (rutFiles.length > 0 && adrFile) {
        console.log(`[Auto-Load] Found ${rutFiles.length} .rut and 1 .adr file. Processing...`);
        const jigData = await processJigFiles(rutFiles, adrFile);
        console.log('[Auto-Load] Jig data processed. Sending to renderer...');
        mainWindow.webContents.send('jig-data-loaded', jigData);
      } else {
        console.log('[Auto-Load] Not enough .rut or .adr files found in /doc to proceed.');
      }
    } catch (error) {
      console.error('[Auto-Load] Error during jig file auto-load:', error);
      dialog.showErrorBox('Auto-load Error', 'Failed to automatically load jig data from the "doc" directory.');
    }

    // --- Auto-load and process log files from 'doc_test' directory ---
    const docTestDir = path.join(__dirname, 'doc_test');
    try {
      console.log(`[Debug] 1. Starting auto-load for fail logs from: ${docTestDir}`);
      const files = await fs.readdir(docTestDir);
      console.log(`[Debug] 2. Found ${files.length} total files in doc_test.`);
      const logFiles = files
        .filter(f => f.toLowerCase().endsWith('.csv') || f.toLowerCase().endsWith('.txt'))
        .map(f => path.join(docTestDir, f));
      console.log(`[Debug] 3. Filtered ${logFiles.length} log files (.csv, .txt).`);

      if (logFiles.length > 0) {
        console.log(`[Debug] 4. Calling processFailLogs with ${logFiles.length} files.`);
        const failData = await processFailLogs(logFiles);
        console.log(`[Debug] 8. processFailLogs finished. Sending ${failData.length} items to renderer.`);
        mainWindow.webContents.send('fail-data-loaded', failData);
        console.log('[Debug] 9. Sent fail-data-loaded IPC message.');
      } else {
        console.log('[Auto-Load] No log files found in /doc_test.');
      }
    } catch (error) {
      console.error('[Auto-Load] FATAL CRASH during fail log auto-load:', error);
    }
  });
});

ipcMain.handle('process-files', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
        { name: 'Jig Files', extensions: ['rut', 'adr'] }
    ],
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  const rutFiles = filePaths.filter(p => p.toLowerCase().endsWith('.rut'));
  const adrFile = filePaths.find(p => p.toLowerCase().endsWith('.adr'));

  if (!adrFile || rutFiles.length === 0) {
    dialog.showErrorBox('File Selection Error', 'You must select at least one .RUT file and one .ADR file.');
    return null;
  }
  
  return processJigFiles(rutFiles, adrFile);
});

// This handler is now deprecated and can be removed or kept for other purposes.
// We will leave it for now.
ipcMain.handle('read-csv-files', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'CSV Files', extensions: ['csv', 'txt'] } // Allow CSV and TXT files
    ],
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  try {
    const files = await Promise.all(
      filePaths.map(async (filePath) => {
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          name: path.basename(filePath),
          content: content,
        };
      })
    );
    return files;
  } catch (error) {
    console.error('Error reading CSV files:', error);
    dialog.showErrorBox('File Read Error', 'An error occurred while reading the selected files.');
    return null;
  }
});

// IPC handler to process and pair failure logs
ipcMain.handle('process-fail-logs', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Fail Logs (NGLog and TestResult)',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Log Files', extensions: ['csv', 'txt'] }],
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return [];
  }

  return processFailLogs(filePaths);
});

// Function to process and pair failure log files from a given list of paths
async function processFailLogs(filePaths) {
  console.log('[Debug-PFL] 5. Entered processFailLogs.');
  // 1. Pair files by timestamp
  const logPairs = {};
  const timestampRegex = /(\d{8}-\d{6})/; // Extracts YYYYMMDD-HHMMSS

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
  console.log('[Debug-PFL] 5a. Finished pairing files. Found pairs:', Object.keys(logPairs));

  // 2. Process each complete pair
  const processedLogs = [];
  for (const timestamp in logPairs) {
    const pair = logPairs[timestamp];
    if (pair.csv && pair.txt) {
      try {
        console.log(`[Debug-PFL] 6. Processing pair for timestamp: ${timestamp}`);
        // a. Get structured failure data from CSV and update DB
        console.log(`[Debug-PFL] 6a. Running fail parser for ${pair.csv}`);
        const parsedResults = await runFailParser(pair.csv);
        console.log(`[Debug-PFL] 6b. Parser returned ${parsedResults.length} results.`);
        const failedPins = parsedResults.map(r => r.pin);

        // b. Read the content of the corresponding TXT file
        console.log(`[Debug-PFL] 6c. Reading TXT file: ${pair.txt}`);
        const txtContent = await fs.readFile(pair.txt, 'utf-8');
        console.log('[Debug-PFL] 6d. Finished reading TXT file.');

        // c. Add to database
        console.log('[Debug-PFL] 7. Preparing database statement...');
        const stmt = db.prepare("INSERT INTO failures (pin_number, error_type, log_file) VALUES (?, ?, ?)");
        console.log('[Debug-PFL] 7a. Statement prepared. Looping through results to insert...');
        for (const item of parsedResults) {
          // Log before inserting to see if the data is valid
          console.log(`[Debug-PFL] 7b. Inserting: pin=${item.pin}, type=${item.error_type}, file=${path.basename(pair.csv)}`);
          if (item.pin === undefined || item.error_type === undefined) {
             console.error("[Debug-PFL] CRITICAL: Attempting to insert undefined data into DB. Skipping.", item);
             continue; // Skip this record
          }
          stmt.run(item.pin, item.error_type, path.basename(pair.csv));
        }
        console.log('[Debug-PFL] 7c. Finalizing statement...');
        stmt.finalize();
        console.log('[Debug-PFL] 7d. Statement finalized.');

        // d. Aggregate results for the frontend
        processedLogs.push({
          id: timestamp,
          name: path.basename(pair.txt),
          content: txtContent,
          failedPins: failedPins,
        });
        console.log(`[Debug-PFL] 6e. Finished processing pair for ${timestamp}.`);

      } catch (error) {
        console.error(`[Debug-PFL] FATAL CRASH processing log pair for ${timestamp}:`, error);
        dialog.showErrorBox('Processing Error', `An error occurred while processing logs for ${timestamp}:\n\n${error.message}`);
      }
    }
  }
  console.log('[Debug-PFL] 7f. Finished processing all pairs.');
  return processedLogs;
}

// Function to process .rut and .adr files
async function processJigFiles(rutFiles, adrFile) {
  const scriptPath = path.join(__dirname, 'json_script.py');
  const scriptArgs = [...rutFiles, adrFile];

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
        resolve(JSON.parse(stdout));
      } catch (e) {
        dialog.showErrorBox('JSON Parse Error', 'Failed to parse JSON from Python script.');
        reject(new Error('Failed to parse JSON from Python script.'));
      }
    });
  });
}

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