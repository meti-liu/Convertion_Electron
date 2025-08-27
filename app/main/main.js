const { app } = require('electron');
const path = require('path');

// 设置环境变量
process.env.NODE_ENV = process.env.NODE_ENV || (app.isPackaged ? 'production' : 'development');

// 在生产环境中，设置资源路径
if (process.env.NODE_ENV === 'production') {
  process.resourcesPath = process.resourcesPath || path.join(process.execPath, '../resources');
  console.log(`Resources path: ${process.resourcesPath}`);
}

// 加载主应用程序
require('./background.js');