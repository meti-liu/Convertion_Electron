const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

async function verifyResources() {
  console.log('Verifying resources...');
  console.log(`App is packaged: ${app.isPackaged}`);
  console.log(`Resources path: ${process.resourcesPath}`);
  
  try {
    // 检查test/fixtures/rut目录
    const rutDir = path.join(process.resourcesPath, 'test', 'fixtures', 'rut');
    console.log(`Checking RUT directory: ${rutDir}`);
    
    const rutDirExists = await fs.stat(rutDir).catch(() => false);
    console.log(`RUT directory exists: ${!!rutDirExists}`);
    
    if (rutDirExists) {
      const files = await fs.readdir(rutDir);
      console.log(`Files in RUT directory: ${files.join(', ')}`);
      
      // 检查是否有.rut和.adr文件
      const rutFiles = files.filter(file => file.toLowerCase().endsWith('.rut'));
      const adrFiles = files.filter(file => file.toLowerCase().endsWith('.adr'));
      
      console.log(`Found ${rutFiles.length} .rut files: ${rutFiles.join(', ')}`);
      console.log(`Found ${adrFiles.length} .adr files: ${adrFiles.join(', ')}`);
    }
    
    // 检查test/fixtures/logs目录
    const logsDir = path.join(process.resourcesPath, 'test', 'fixtures', 'logs');
    console.log(`Checking logs directory: ${logsDir}`);
    
    const logsDirExists = await fs.stat(logsDir).catch(() => false);
    console.log(`Logs directory exists: ${!!logsDirExists}`);
    
    if (logsDirExists) {
      const files = await fs.readdir(logsDir);
      console.log(`Files in logs directory: ${files.join(', ')}`);
    }
    
    // 检查python目录
    const pythonDir = path.join(process.resourcesPath, 'python');
    console.log(`Checking Python directory: ${pythonDir}`);
    
    const pythonDirExists = await fs.stat(pythonDir).catch(() => false);
    console.log(`Python directory exists: ${!!pythonDirExists}`);
    
    if (pythonDirExists) {
      const files = await fs.readdir(pythonDir);
      console.log(`Files in Python directory: ${files.join(', ')}`);
    }
  } catch (error) {
    console.error(`Error verifying resources: ${error.message}`);
  }
}

module.exports = { verifyResources };