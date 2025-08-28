const fs = require('fs');
const path = require('path');

// 定义路径
const pythonDir = path.join(__dirname, 'app', 'python');
const distDir = path.join(pythonDir, 'dist');

// 检查dist目录是否存在
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist at', distDir);
  process.exit(1);
}

// 要移动的可执行文件
const exeFiles = ['json_script.exe', 'parse_fails.exe'];

// 移动文件
exeFiles.forEach(file => {
  const srcPath = path.join(distDir, file);
  const destPath = path.join(pythonDir, file);
  
  if (fs.existsSync(srcPath)) {
    try {
      // 如果目标文件已存在，先删除
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
        console.log(`Deleted existing file: ${destPath}`);
      }
      
      // 复制文件
      fs.copyFileSync(srcPath, destPath);
      console.log(`Successfully copied ${file} to ${pythonDir}`);
    } catch (err) {
      console.error(`Error copying ${file}:`, err);
    }
  } else {
    console.error(`Source file not found: ${srcPath}`);
  }
});

console.log('Python executable files have been moved to the python directory.');