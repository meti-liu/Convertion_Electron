# Jig Viewer 开发指南

## 项目概述

Jig Viewer是一个基于Electron的桌面应用程序，用于查看和分析JIG测试数据。本文档旨在帮助开发人员了解项目结构、开发流程和关键技术点。

## 项目结构

```
/
├── app/                    # 应用程序源代码
│   ├── main/               # Electron主进程代码
│   │   ├── background.js   # 主进程入口文件
│   │   ├── preload.js      # 预加载脚本
│   │   ├── tcp_handler.js  # TCP服务器处理模块
│   │   └── i18n-backend.js # 国际化后端模块
│   ├── renderer/           # 渲染进程代码
│   │   ├── src/            # 源代码
│   │   │   ├── main.js     # 渲染进程入口文件
│   │   │   ├── App.vue     # 主应用组件
│   │   │   ├── network.js  # 网络功能模块
│   │   │   └── i18n.js     # 国际化配置
│   │   ├── components/     # Vue组件
│   │   ├── assets/         # 静态资源
│   │   ├── locales/        # 语言文件
│   │   ├── index.html      # 主窗口HTML
│   │   └── network.html    # 网络设置窗口HTML
│   └── python/             # Python脚本
│       ├── parse_fails.py  # 错误日志解析脚本
│       ├── json_script.py  # JSON处理脚本
│       └── converters/     # 数据转换脚本
├── data/                   # 应用数据
│   ├── jig_data.db         # SQLite数据库
│   └── test.xml            # 测试数据
├── docs/                   # 文档
│   ├── api/                # API文档
│   ├── user-guide/         # 用户指南
│   └── dev-guide/          # 开发指南
├── test/                   # 测试
│   ├── fixtures/           # 测试数据
│   │   ├── rut/            # RUT测试文件
│   │   ├── logs/           # 日志文件
│   │   └── results/        # 测试结果
│   └── unit/               # 单元测试
└── resources/              # 资源文件
    └── img/                # 图片资源
```

## 技术栈

- **Electron**: 跨平台桌面应用框架
- **Vue.js**: 前端框架
- **Node.js**: JavaScript运行时
- **Python**: 数据处理脚本
- **SQLite**: 本地数据存储

## 开发环境设置

### 前提条件

- Node.js (v14+)
- npm (v6+)
- Python (v3.6+)
- Git

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/your-org/jig-viewer.git
   cd jig-viewer
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 安装Python依赖
   ```bash
   pip install -r requirements.txt
   ```

4. 启动开发服务器
   ```bash
   npm run dev
   ```

## 开发指南

### 主进程开发

主进程代码位于`app/main`目录下，负责处理操作系统交互、文件系统访问、TCP服务器等功能。

#### 添加新的IPC通信

1. 在`background.js`中注册新的IPC处理函数：

```javascript
ipcMain.handle('channel-name', async (event, ...args) => {
  // 处理逻辑
  return result;
});
```

2. 在`preload.js`中暴露API：

```javascript
contextBridge.exposeInMainWorld('api', {
  myFunction: (...args) => ipcRenderer.invoke('channel-name', ...args)
});
```

### 渲染进程开发

渲染进程代码位于`app/renderer`目录下，使用Vue.js框架开发用户界面。

#### 添加新组件

1. 在`app/renderer/components`目录下创建新的`.vue`文件
2. 在需要使用的地方导入并注册组件

```javascript
import MyComponent from './components/MyComponent.vue';

export default {
  components: {
    MyComponent
  }
}
```

### Python脚本开发

Python脚本位于`app/python`目录下，主要用于数据处理和分析。

#### 调用Python脚本

在主进程中使用`child_process`模块调用Python脚本：

```javascript
const { spawn } = require('child_process');
const pythonProcess = spawn('python', ['./app/python/script.py', arg1, arg2]);

pythonProcess.stdout.on('data', (data) => {
  console.log(`Python输出: ${data}`);
});
```

### 国际化

项目使用`i18next`进行国际化，语言文件位于`app/renderer/locales`目录下。

#### 添加新的翻译

1. 在各语言文件中添加新的翻译键值对
2. 在代码中使用`$t`函数引用翻译：

```html
<template>
  <div>{{ $t('key') }}</div>
</template>
```

## 构建与发布

### 构建应用

```bash
npm run build
```

构建后的应用将位于`dist`目录下。

### 打包应用

```bash
npm run package
```

打包后的安装程序将位于`release`目录下。

## 测试

### 运行单元测试

```bash
npm test
```

### 添加新测试

在`test/unit`目录下添加新的测试文件，使用Jest测试框架。

## 调试

### 主进程调试

启动应用时添加`--inspect`参数：

```bash
npm run dev -- --inspect
```

然后在Chrome浏览器中打开`chrome://inspect`进行调试。

### 渲染进程调试

使用Electron开发者工具（F12或Ctrl+Shift+I）进行调试。

## 常见问题

### 无法启动应用

- 检查Node.js和npm版本是否符合要求
- 删除`node_modules`目录，重新运行`npm install`
- 检查日志文件中的错误信息

### Python脚本调用失败

- 确保Python环境正确配置
- 检查脚本路径是否正确
- 验证所需的Python包是否已安装

## 贡献指南

### 提交代码

1. 创建新分支：`git checkout -b feature/your-feature`
2. 提交更改：`git commit -m "Add your feature"`
3. 推送到远程：`git push origin feature/your-feature`
4. 创建Pull Request

### 代码规范

- 使用ESLint进行JavaScript代码检查
- 遵循Vue.js风格指南
- 使用PEP 8规范编写Python代码

## 许可证

本项目采用MIT许可证。详情请参阅LICENSE文件。