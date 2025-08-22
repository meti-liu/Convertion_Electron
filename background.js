const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises; // Use promises-based fs
const sqlite3 = require('sqlite3').verbose();

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
  // 1. Open file dialog to get .rut and .adr files
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
        { name: 'Jig Files', extensions: ['rut', 'adr'] }
    ],
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  // 2. Find the python script for jig processing
  const scriptPath = path.join(__dirname, 'json_script.py');
  
  // 3. Separate files and prepare arguments
  const rutFiles = filePaths.filter(p => p.toLowerCase().endsWith('.rut'));
  const adrFile = filePaths.find(p => p.toLowerCase().endsWith('.adr'));

  if (!adrFile || rutFiles.length === 0) {
    dialog.showErrorBox('File Selection Error', 'You must select at least one .RUT file and one .ADR file.');
    return null;
  }
  
  const scriptArgs = [...rutFiles, adrFile];

  // 4. Spawn Python process to get jig data
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
        // 5. Parse and resolve with the jig data
        resolve(JSON.parse(stdout));
      } catch (e) {
        dialog.showErrorBox('JSON Parse Error', 'Failed to parse JSON from Python script.');
        reject(new Error('Failed to parse JSON from Python script.'));
      }
    });
  });
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

  // 2. Process each complete pair
  const processedLogs = [];
  for (const timestamp in logPairs) {
    const pair = logPairs[timestamp];
    if (pair.csv && pair.txt) {
      try {
        // a. Get structured failure data from CSV and update DB
        const parsedResults = await runFailParser(pair.csv);
        const failedPins = parsedResults.map(r => r.pin);

        // b. Read the content of the corresponding TXT file
        const txtContent = await fs.readFile(pair.txt, 'utf-8');

        // c. Add to database
        const stmt = db.prepare("INSERT INTO failures (pin_number, error_type, log_file) VALUES (?, ?, ?)");
        for (const item of parsedResults) {
          stmt.run(item.pin, item.error_type, path.basename(pair.csv));
        }
        stmt.finalize();

        // d. Aggregate results for the frontend
        processedLogs.push({
          id: timestamp,
          name: path.basename(pair.txt),
          content: txtContent,
          failedPins: failedPins,
        });

      } catch (error) {
        console.error(`Failed to process log pair for ${timestamp}:`, error);
        dialog.showErrorBox('Processing Error', `An error occurred while processing logs for ${timestamp}:\n\n${error.message}`);
      }
    }
  }

  return processedLogs;
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