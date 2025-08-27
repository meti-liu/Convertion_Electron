# API 文档

## 概述

本文档描述了Jig Viewer应用程序的主要API接口，包括Electron主进程与渲染进程之间的通信接口，以及Python脚本与JavaScript之间的交互。

## Electron API

### 文件处理

#### `processFiles(filePaths)`

处理用户选择的文件，解析JIG数据。

- **参数**: `filePaths` - 文件路径数组
- **返回**: 无，通过事件通知处理结果

#### `readCsvFiles(filePaths)`

读取并解析CSV格式的错误日志文件。

- **参数**: `filePaths` - CSV文件路径数组
- **返回**: 无，通过事件通知处理结果

#### `processFailLogs(filePath)`

处理失败日志文件，提取错误信息。

- **参数**: `filePath` - 日志文件路径
- **返回**: 无，通过事件通知处理结果

### 事件监听

#### `onJigDataLoaded(callback)`

当JIG数据加载完成时触发。

- **参数**: `callback` - 回调函数，接收加载的数据

#### `onFailDataLoaded(callback)`

当错误数据加载完成时触发。

- **参数**: `callback` - 回调函数，接收错误数据

### TCP服务器

#### `startTcpServer(port)`

启动TCP服务器，监听指定端口。

- **参数**: `port` - 端口号
- **返回**: 无，通过事件通知服务器状态

#### `stopTcpServer()`

停止TCP服务器。

- **参数**: 无
- **返回**: 无，通过事件通知服务器状态

#### `onTcpServerStatus(callback)`

监听TCP服务器状态变化。

- **参数**: `callback` - 回调函数，接收服务器状态信息

#### `onTcpDataReceived(callback)`

当TCP服务器接收到数据时触发。

- **参数**: `callback` - 回调函数，接收接收到的数据

#### `onFileCopyStatus(callback)`

监听文件复制状态。

- **参数**: `callback` - 回调函数，接收文件复制状态信息

#### `onNewLogFile(callback)`

当检测到新的日志文件时触发。

- **参数**: `callback` - 回调函数，接收新日志文件信息

### 国际化

#### `setLocale(locale)`

设置应用程序语言。

- **参数**: `locale` - 语言代码（如'en', 'zh-CN', 'ja'）
- **返回**: 无

#### `onUpdateLocale(callback)`

当语言设置更新时触发。

- **参数**: `callback` - 回调函数，接收新的语言设置

#### `requestInitialLocale()`

请求初始语言设置。

- **参数**: 无
- **返回**: 无，通过事件通知语言设置

### SVG导出

#### `exportSvg(svgContent, fileName)`

导出SVG内容到文件。

- **参数**: 
  - `svgContent` - SVG内容字符串
  - `fileName` - 导出文件名
- **返回**: 无，通过事件通知导出结果

#### `onExportSvgResult(callback)`

当SVG导出完成时触发。

- **参数**: `callback` - 回调函数，接收导出结果

## Python API

### 错误日志解析

#### `parse_fail_log(file_path)`

解析错误日志文件，提取失败的引脚编号及其错误类型。

- **参数**: `file_path` - 日志文件路径
- **返回**: 包含失败引脚信息的JSON对象

## TCP通信协议

### XML数据格式

```xml
<data>
  <command>COPY_FILE</command>
  <source>source_file_path</source>
  <destination>destination_file_path</destination>
</data>
```

- **command**: 命令类型，如`COPY_FILE`
- **source**: 源文件路径
- **destination**: 目标文件路径