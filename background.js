const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises; // Use promises-based fs
const sqlite3 = require('sqlite3').verbose();

// Initialize DB
const dbPath = path.join(app.getPath('userData'), 'failures.db');
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

// Handle request to read CSV files
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

// IPC handler to process failure logs
ipcMain.handle('process-fail-logs', async () => {
  console.log('IPC event "process-fail-logs" received.');

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Fail Logs',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Log Files', extensions: ['csv', 'txt'] }],
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    console.log('No files selected or dialog was canceled.');
    return []; // Return empty array if no files selected
  }

  console.log(`Files selected: ${filePaths.join(', ')}`);

  const processedFiles = [];
  for (const filePath of filePaths) {
    try {
      console.log(`Processing file: ${filePath}`);
      const content = await fs.readFile(filePath, 'utf-8');
      const results = await runFailParser(filePath);
      console.log(`Parsed results from Python:`, results);

      const failedPins = results.map(r => r.pin);

      // Add to database
      const stmt = db.prepare("INSERT INTO failures (pin_number, error_type, log_file) VALUES (?, ?, ?)");
      for (const item of results) {
        stmt.run(item.pin, item.error_type, path.basename(filePath));
      }
      stmt.finalize();
      console.log(`Finished processing and DB insertion for ${filePath}`);

      processedFiles.push({
        name: path.basename(filePath),
        content: content,
        failedPins: failedPins
      });

    } catch (error) {
      console.error(`Failed to process ${filePath}:`, error);
      dialog.showErrorBox('Processing Error', `An error occurred while processing ${filePath}:\n\n${error.message}`);
      return []; // Return empty array on error
    }
  }

  console.log('Returning all processed files:', processedFiles);
  return processedFiles; // Return the array of processed file objects
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