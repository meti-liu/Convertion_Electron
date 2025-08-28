# JIG Viewer 应用打包工作文档

## 打包技术栈

### 1. Electron 打包
- **主要工具**：electron-builder
- **版本**：24.9.1
- **配置位置**：package.json 的 build 字段

### 2. Python 脚本打包
- **主要工具**：PyInstaller
- **版本**：6.3.0
- **目标文件**：
  - json_script.py → json_script.exe
  - parse_fails.py → parse_fails.exe

## 遇到的困难及解决方案

### 1. Python 环境依赖问题

#### 困难描述
应用依赖 Python 脚本进行数据处理，但不能要求最终用户安装 Python 环境。

#### 解决方案
使用 PyInstaller 将 Python 脚本打包为独立可执行文件：
```bash
pyinstaller --onefile json_script.py
pyinstaller --onefile parse_fails.py
```

这样打包后的应用可以在没有安装 Python 环境的计算机上运行，所有依赖都被打包到可执行文件中。

### 2. 资源文件路径问题

#### 困难描述
开发环境和打包环境下，应用资源文件的路径不同，导致应用无法正确找到 Python 脚本和测试数据。

#### 解决方案
在 background.js 中根据应用是否打包来动态确定资源路径：
```javascript
const isPacked = app.isPackaged;
const rootPath = isPacked ? process.resourcesPath : path.join(__dirname, '../..');
```

对于 Python 脚本，实现了双重调用机制：
```javascript
let pythonCommand = '';
if (isPacked) {
  // 尝试使用打包后的可执行文件
  pythonCommand = path.join(rootPath, 'resources', 'python', 'json_script.exe');
  if (!fs.existsSync(pythonCommand)) {
    // 回退到使用系统 Python
    pythonCommand = 'py';
  }
}
```

### 3. 可执行文件位置错误

#### 困难描述
PyInstaller 打包后的可执行文件被放置在 `resources/python/dist` 目录下，而应用期望它们在 `resources/python` 目录下。

#### 解决方案
手动将可执行文件移动到正确位置：
```javascript
// 检查并移动可执行文件到正确位置
const distDir = path.join(rootPath, 'resources', 'python', 'dist');
const targetDir = path.join(rootPath, 'resources', 'python');
if (fs.existsSync(distDir)) {
  const files = ['json_script.exe', 'parse_fails.exe'];
  files.forEach(file => {
    const srcPath = path.join(distDir, file);
    const destPath = path.join(targetDir, file);
    if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}
```

### 4. 打包后文件体积过大

#### 困难描述
初始打包后的应用体积超过 200MB，主要是因为包含了完整的 Python 运行时和不必要的依赖。

#### 解决方案
1. 使用 PyInstaller 的 `--onefile` 选项减少文件数量
2. 在 PyInstaller 规范文件中排除不必要的模块：
```python
a = Analysis(
    ['json_script.py'],
    excludes=['matplotlib', 'scipy', 'pandas', 'tkinter'],
)
```
3. 优化 electron-builder 配置，排除开发依赖和测试文件

### 5. 打包后应用启动速度慢

#### 困难描述
打包后的应用首次启动时间较长，特别是在执行 Python 脚本时。

#### 解决方案
1. 优化 Python 脚本，减少不必要的导入
2. 实现懒加载机制，只在需要时才加载 Python 处理模块
3. 添加启动画面，提升用户体验

## 打包后的应用结构

```
/dist/win-unpacked/
├── JIG Viewer.exe          # 主程序
├── resources/              # 资源目录
│   ├── app.asar            # 打包后的应用代码
│   ├── python/             # Python相关文件
│   │   ├── json_script.exe # 打包后的Python脚本
│   │   ├── parse_fails.exe # 打包后的Python脚本
│   │   └── converters/     # 转换器脚本
│   └── test/               # 测试数据
└── [其他Electron运行时文件]  # DLL、PAK等系统文件
```

## 注意事项

1. **不可删除文件**：
   - 根目录下的所有文件（.dll, .bin, .pak等）
   - resources/app.asar
   - resources/python 目录下的可执行文件和转换器

2. **可以删除的文件**：
   - Python 源代码（.py文件）
   - PyInstaller 构建规范文件（.spec文件）
   - 空的 python/dist 目录

3. **测试建议**：
   - 在没有安装 Python 的环境中测试应用
   - 验证所有功能，特别是数据处理和错误日志分析
   - 检查资源文件加载是否正确

## 未来优化方向

1. 进一步减小应用体积
2. 改进启动性能
3. 实现自动更新机制
4. 优化安装体验