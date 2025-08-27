const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises; // Use promises-based fs
const sqlite3 = require('sqlite3').verbose();
const tcp_handler = require('./tcp_handler');
const i18n = require('./i18n-backend.js');

let mainWindow;
let networkMonitorWindow = null;
let currentLocale;

// Initialize DB in the userData directory (在打包环境中更可靠)
const dbPath = path.join(app.getPath('userData'), 'jig_data.db');
console.log(`[Database] Using database path: ${dbPath}`);
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

const { spawn } = require('child_process');

const loadURLWithRetry = async (win, url, options = { maxRetries: 15, retryDelay: 200 }) => {
  const { maxRetries, retryDelay } = options;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await win.loadURL(url);
      console.log(`Successfully loaded ${url} after ${i + 1} attempts.`);
      return;
    } catch (error) {
      console.log(`Attempt ${i + 1} to load ${url} failed. Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  console.error(`Failed to load ${url} after ${maxRetries} attempts.`);
  dialog.showErrorBox('Load Error', `Failed to load URL: ${url}. Please ensure the dev server is running.`);
};

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      contextIsolation: true, // 必须为 true
      nodeIntegration: false, // 推荐为 false 以提高安全性
    },
  });

  const menu = Menu.buildFromTemplate([
    {
      label: i18n.t('view_menu'), // 'View'
      submenu: [
        {
          label: i18n.t('toggle_network_monitor'), // 'Toggle Network Monitor'
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

  await loadURLWithRetry(mainWindow, 'http://localhost:5177/app/renderer/index.html');
  mainWindow.webContents.openDevTools();

  tcp_handler.setWindows(mainWindow, networkMonitorWindow);
}

ipcMain.on('request-initial-locale', (event) => {
  if (networkMonitorWindow && !networkMonitorWindow.isDestroyed()) {
    networkMonitorWindow.webContents.send('update-locale', currentLocale);
  }
});

async function createNetworkMonitorWindow() {
  networkMonitorWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: i18n.t('network_monitor_title'), // 'Network Monitor'
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the network.html from the Vite dev server
  await loadURLWithRetry(networkMonitorWindow, 'http://localhost:5177/app/renderer/network.html');
  networkMonitorWindow.webContents.openDevTools();

  networkMonitorWindow.on('closed', () => {
    networkMonitorWindow = null;
    tcp_handler.setWindows(mainWindow, null);
  });

  tcp_handler.setWindows(mainWindow, networkMonitorWindow);
}

async function main() {
  // Load locales before creating any windows or menus
  await i18n.loadLocales();
  currentLocale = i18n.getLocale();

  await createWindow();

  // --- Auto-load and process .rut and .adr files ---
  // 使用app.getAppPath()获取应用根目录，这在开发和生产环境都有效
  const appRootPath = app.getAppPath();
  console.log(`[Auto-Load] App root path: ${appRootPath}`);
  
  // 首先尝试从test/fixtures/rut目录加载文件
  const testFixturesDir = path.join(appRootPath, 'test', 'fixtures', 'rut');
  const docDir = path.join(appRootPath, 'doc');
  let jigDataLoaded = false;
  
  // 先尝试从test/fixtures/rut目录加载
  try {
    console.log(`[Auto-Load] Checking for jig files in: ${testFixturesDir}`);
    const files = await fs.readdir(testFixturesDir);

    const rutFiles = files
      .filter(file => file.toLowerCase().endsWith('.rut'))
      .map(file => path.join(testFixturesDir, file));
    const adrFile = files
      .map(file => path.join(testFixturesDir, file))
      .find(file => file.toLowerCase().endsWith('.adr'));

    if (rutFiles.length > 0 && adrFile) {
      console.log(`[Auto-Load] Found ${rutFiles.length} .rut and 1 .adr file in test/fixtures/rut. Processing...`);
      const jigData = await processJigFiles(rutFiles, adrFile);
      console.log('[Auto-Load] Jig data processed from test/fixtures/rut. Sending to renderer...');
      mainWindow.webContents.send('jig-data-loaded', jigData);
      jigDataLoaded = true;
    } else {
      console.log('[Auto-Load] Not enough .rut or .adr files found in test/fixtures/rut to proceed.');
    }
  } catch (error) {
    console.log('[Auto-Load] Could not load from test/fixtures/rut:', error.message);
  }
  
  // 如果从test/fixtures/rut加载失败，尝试从doc目录加载
  if (!jigDataLoaded) {
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
        console.log(`[Auto-Load] Found ${rutFiles.length} .rut and 1 .adr file in doc. Processing...`);
        const jigData = await processJigFiles(rutFiles, adrFile);
        console.log('[Auto-Load] Jig data processed from doc. Sending to renderer...');
        mainWindow.webContents.send('jig-data-loaded', jigData);
      } else {
        console.log('[Auto-Load] Not enough .rut or .adr files found in /doc to proceed.');
        dialog.showErrorBox(i18n.t('auto_load_error'), i18n.t('auto_load_error_message'));
      }
    } catch (error) {
      console.error('[Auto-Load] Error during jig file auto-load from doc:', error);
      dialog.showErrorBox(i18n.t('auto_load_error'), i18n.t('auto_load_error_message'));
    }
  }

  // --- Auto-load and process log files ---
  // 先尝试从test/fixtures/logs目录加载日志文件，如果失败再从doc目录加载
  const testFixturesLogsDir = path.join(appRootPath, 'test', 'fixtures', 'logs');
  const docTestDir = path.join(appRootPath, 'doc');
  let logsLoaded = false;
  
  // 先尝试从test/fixtures/logs目录加载
  try {
    console.log(`[Debug] 1. Starting auto-load for fail logs from: ${testFixturesLogsDir}`);
    const files = await fs.readdir(testFixturesLogsDir);
    console.log(`[Debug] 2. Found ${files.length} total files in test/fixtures/logs.`);
    const logFiles = files
      .filter(f => f.toLowerCase().endsWith('.csv') || f.toLowerCase().endsWith('.txt'))
      .map(f => path.join(testFixturesLogsDir, f));
    console.log(`[Debug] 3. Filtered ${logFiles.length} log files (.csv, .txt).`);

    if (logFiles.length > 0) {
      console.log(`[Debug] 4. Calling processFailLogs with ${logFiles.length} files from test/fixtures/logs.`);
      const failData = await processFailLogs(logFiles);
      console.log(`[Debug] 8. processFailLogs finished. Sending ${failData.length} items to renderer.`);
      mainWindow.webContents.send('fail-data-loaded', failData);
      console.log('[Debug] 9. Sent fail-data-loaded IPC message.');
      logsLoaded = true;
    } else {
      console.log('[Auto-Load] No log files found in test/fixtures/logs.');
    }
  } catch (error) {
    console.log('[Auto-Load] Could not load logs from test/fixtures/logs:', error.message);
  }
  
  // 如果从test/fixtures/logs加载失败，尝试从doc目录加载
  if (!logsLoaded) {
    try {
      console.log(`[Debug] 1. Starting auto-load for fail logs from: ${docTestDir}`);
      const files = await fs.readdir(docTestDir);
      console.log(`[Debug] 2. Found ${files.length} total files in doc.`);
      const logFiles = files
        .filter(f => f.toLowerCase().endsWith('.csv') || f.toLowerCase().endsWith('.txt'))
        .map(f => path.join(docTestDir, f));
      console.log(`[Debug] 3. Filtered ${logFiles.length} log files (.csv, .txt).`);

      if (logFiles.length > 0) {
        console.log(`[Debug] 4. Calling processFailLogs with ${logFiles.length} files from doc.`);
        const failData = await processFailLogs(logFiles);
        console.log(`[Debug] 8. processFailLogs finished. Sending ${failData.length} items to renderer.`);
        mainWindow.webContents.send('fail-data-loaded', failData);
        console.log('[Debug] 9. Sent fail-data-loaded IPC message.');
      } else {
        console.log('[Auto-Load] No log files found in doc directory.');
      }
    } catch (error) {
      console.error('[Auto-Load] FATAL CRASH during fail log auto-load from doc:', error);
    }
  }
}

app.whenReady().then(main);

ipcMain.on('set-locale', (event, locale) => {
  currentLocale = locale; // Update the stored locale
  i18n.setLocale(locale);

  // Re-create the menu to apply the new language
  const menu = Menu.buildFromTemplate([
    {
      label: i18n.t('view_menu'),
      submenu: [
        {
          label: i18n.t('toggle_network_monitor'),
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

  // Send the updated locale to all windows so they can update their UI
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('update-locale', locale);
  });
});

ipcMain.handle('process-files', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
        { name: i18n.t('jig_files'), extensions: ['rut', 'adr'] }
    ],
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  const rutFiles = filePaths.filter(p => p.toLowerCase().endsWith('.rut'));
  const adrFile = filePaths.find(p => p.toLowerCase().endsWith('.adr'));

  if (!adrFile || rutFiles.length === 0) {
    dialog.showErrorBox(i18n.t('file_selection_error'), i18n.t('file_selection_error_message'));
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
      { name: i18n.t('csv_files'), extensions: ['csv', 'txt'] } // Allow CSV and TXT files
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
    dialog.showErrorBox(i18n.t('file_read_error'), i18n.t('file_read_error_message'));
    return null;
  }
});

// IPC handler to process and pair failure logs
ipcMain.handle('process-fail-logs', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: i18n.t('select_fail_logs_title'),
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: i18n.t('log_files_label'), extensions: ['csv', 'txt'] }],
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
        dialog.showErrorBox(i18n.t('processing_error'), i18n.t('processing_error_message', { timestamp, message: error.message }));
      }
    }
  }
  console.log('[Debug-PFL] 7f. Finished processing all pairs.');
  return processedLogs;
}

// Function to process .rut and .adr files
async function processJigFiles(rutFiles, adrFile) {
  // 在开发环境和打包环境中都能正确找到Python脚本
  let scriptPath;
  let finalAdrFile = adrFile;
  
  if (app.isPackaged) {
    // 打包环境下，Python脚本位于resources/python目录
    scriptPath = path.join(process.resourcesPath, 'python', 'json_script.py');
    console.log(`[processJigFiles] Using packaged script path: ${scriptPath}`);
    
    // 确保ADR文件存在并可访问
    try {
      await fs.access(adrFile);
      console.log(`[processJigFiles] ADR file exists at: ${adrFile}`);
    } catch (error) {
      console.error(`[processJigFiles] Error accessing ADR file: ${error.message}`);
      
      // 尝试在resources目录中查找ADR文件
      const adrFileName = path.basename(adrFile);
      const resourcesAdrPath = path.join(process.resourcesPath, 'test', 'fixtures', 'rut', adrFileName);
      
      try {
        await fs.access(resourcesAdrPath);
        console.log(`[processJigFiles] Found ADR file in resources: ${resourcesAdrPath}`);
        finalAdrFile = resourcesAdrPath;
      } catch (resourceError) {
        console.error(`[processJigFiles] ADR file not found in resources: ${resourceError.message}`);
        
        // 尝试复制ADR文件到临时目录
        const tempDir = app.getPath('temp');
        const tempAdrFile = path.join(tempDir, adrFileName);
        
        try {
          // 如果原始ADR文件存在，复制到临时目录
          if (await fs.stat(adrFile).catch(() => false)) {
            await fs.copyFile(adrFile, tempAdrFile);
            console.log(`[processJigFiles] Copied ADR file to: ${tempAdrFile}`);
            finalAdrFile = tempAdrFile;
          } else {
            console.error(`[processJigFiles] Cannot find ADR file anywhere: ${adrFileName}`);
            // 创建一个空的ADR文件，以便Python脚本能够继续运行
            await fs.writeFile(tempAdrFile, '');
            console.log(`[processJigFiles] Created empty ADR file at: ${tempAdrFile}`);
            finalAdrFile = tempAdrFile;
          }
        } catch (copyError) {
          console.error(`[processJigFiles] Failed to handle ADR file: ${copyError.message}`);
        }
      }
    }
  } else {
    // 开发环境下，Python脚本位于app/python目录
    scriptPath = path.join(__dirname, '../../app/python/json_script.py');
    console.log(`[processJigFiles] Using development script path: ${scriptPath}`);
  }
  
  const scriptArgs = [...rutFiles, finalAdrFile];
  console.log(`[processJigFiles] Script path: ${scriptPath}`);
  console.log(`[processJigFiles] RUT files: ${rutFiles.join(', ')}`);
  console.log(`[processJigFiles] ADR file: ${finalAdrFile}`);
  console.log(`[processJigFiles] Current working directory: ${process.cwd()}`);

  return new Promise((resolve, reject) => {
    const pyProcess = spawn('python', [scriptPath, ...scriptArgs]);

    let stdout = '';
    let stderr = '';

    pyProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      console.log(`[Python stdout] ${dataStr.trim()}`);
      stdout += dataStr;
    });

    pyProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      console.error(`[Python stderr] ${dataStr.trim()}`);
      stderr += dataStr;
    });

    pyProcess.on('close', (code) => {
      console.log(`[processJigFiles] Python process exited with code ${code}`);
      if (code !== 0) {
        console.error(`[processJigFiles] Python stderr: ${stderr}`);
        console.error(`[processJigFiles] Python command: python ${scriptPath} ${scriptArgs.join(' ')}`);
        dialog.showErrorBox(i18n.t('python_script_error'), stderr);
        return reject(new Error(`Python script exited with code ${code}`));
      }
      try {
        console.log(`[processJigFiles] Raw JSON output length: ${stdout.length} characters`);
        const parsedData = JSON.parse(stdout);
        console.log(`[processJigFiles] Successfully parsed JSON data with ${parsedData.rut_data.length} RUT files and ADR data: ${!!parsedData.adr_data}`);
        resolve(parsedData);
      } catch (e) {
        console.error(`[processJigFiles] Failed to parse JSON: ${e.message}`);
        console.error(`[processJigFiles] Raw JSON output: ${stdout.substring(0, 200)}...`);
        dialog.showErrorBox(i18n.t('json_parse_error'), i18n.t('json_parse_error_message'));
        reject(new Error('Failed to parse JSON from Python script.'));
      }
    });
    
    pyProcess.on('error', (error) => {
      console.error(`[processJigFiles] Failed to start Python process: ${error.message}`);
      dialog.showErrorBox(i18n.t('python_script_error'), error.message);
      reject(error);
    });
  });
}

function runFailParser(filePath) {
  return new Promise((resolve, reject) => {
    // 在开发环境和打包环境中都能正确找到Python脚本
    let scriptPath;
    if (app.isPackaged) {
      // 打包环境下，Python脚本位于resources/python目录
      scriptPath = path.join(process.resourcesPath, 'python', 'parse_fails.py');
      console.log(`[runFailParser] Using packaged script path: ${scriptPath}`);
    } else {
      // 开发环境下，Python脚本位于app/python目录
      scriptPath = path.join(__dirname, '../../app/python/parse_fails.py');
      console.log(`[runFailParser] Using development script path: ${scriptPath}`);
    }
    
    console.log(`[runFailParser] Processing file: ${filePath}`);
    console.log(`[runFailParser] Current working directory: ${process.cwd()}`);
    
    const pythonProcess = spawn('python', [scriptPath, filePath]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      console.log(`[runFailParser] Python stdout: ${dataStr.trim()}`);
      stdout += dataStr;
    });

    pythonProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      console.error(`[runFailParser] Python stderr: ${dataStr.trim()}`);
      stderr += dataStr;
    });

    pythonProcess.on('close', (code) => {
      console.log(`[runFailParser] Python process exited with code ${code}`);
      if (code === 0) {
        try {
          console.log(`[runFailParser] Raw JSON output length: ${stdout.length} characters`);
          const parsedData = JSON.parse(stdout);
          console.log(`[runFailParser] Successfully parsed JSON data with ${parsedData.length} results`);
          resolve(parsedData);
        } catch (e) {
          console.error(`[runFailParser] Failed to parse JSON: ${e.message}`);
          console.error(`[runFailParser] Raw JSON output: ${stdout.substring(0, 200)}...`);
          reject(new Error(`Failed to parse Python script output: ${e.message}`));
        }
      } else {
        console.error(`[runFailParser] Python script failed with code ${code}`);
        console.error(`[runFailParser] Error output: ${stderr}`);
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error(`[runFailParser] Failed to start Python process: ${error.message}`);
      reject(error);
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

// IPC handler for exporting SVG
ipcMain.on('export-svg', async (event, svgData) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: i18n.t('export_svg') || 'Export SVG',
      defaultPath: 'jig_chart.svg',
      filters: [{ name: 'SVG Files', extensions: ['svg'] }]
    });

    if (canceled || !filePath) {
      return;
    }

    // Ensure SVG data has proper XML declaration and SVG namespace
    if (!svgData.includes('<?xml version="1.0"') || !svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
      console.warn('SVG data missing proper XML declaration or namespace');
      // Add them if missing
      if (!svgData.includes('<?xml version="1.0"')) {
        svgData = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgData;
      }
      if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
    }

    await fs.writeFile(filePath, svgData);
    console.log(`SVG exported successfully to ${filePath}`);
    mainWindow.webContents.send('export-svg-result', { success: true, message: i18n.t('export_success') || 'SVG exported successfully' });
  } catch (error) {
    console.error('Error exporting SVG:', error);
    mainWindow.webContents.send('export-svg-result', { success: false, message: i18n.t('export_error') || 'Failed to export SVG' });
  }
});