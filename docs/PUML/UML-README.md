# JIG Viewer - UML Documentation

本目录包含了JIG Viewer Electron应用程序的完整UML架构文档。

## 文件说明

### 1. `architecture-class-diagram.puml`
**主要架构类图** (已更新)
- 展示整个JIG Viewer应用程序的高级架构
- 基于README实际功能更新，包含TCP服务器、多语言支持等
- 显示Electron主进程、Vue.js渲染进程、Python处理脚本和数据层的关系

### 2. `vue-components-detail.puml` (原版)
**Vue组件详细架构图** (基础版本)
- 展示Vue.js前端组件的基本结构

### 3. `vue-components-updated.puml` 
**Vue组件详细架构图** (更新版本)
- 基于README中的实际功能特性更新
- 包含SVG图表、错误分析、TCP监控等具体实现
- 展示组件间的属性传递和事件通信
- 包含交互模式、历史记录等高级功能

### 4. `python-processing-flow.puml`
**Python数据处理流程图**
- 详细描述Python脚本的处理逻辑
- 包含RUT文件处理、失败分析和格式转换
- 展示几何计算和文件I/O操作

### 5. `data-flow-sequence.puml`
**数据流序列图**
- 描述应用程序的完整数据流
- 展示进程间通信(IPC)的详细过程
- 包含用户交互和系统响应的时序

### 6. `deployment-architecture.puml` (新增)
**应用打包与部署架构图**
- 展示从源代码到最终部署包的完整流程
- 包含PyInstaller打包Python脚本的过程
- 展示electron-builder的打包配置和结果
- 说明打包后应用的文件结构和运行机制

## 如何查看UML图

### 在VS Code中查看
1. 确保已安装PlantUML扩展
2. 打开任意`.puml`文件
3. 按 `Alt + D` 或使用命令面板 `PlantUML: Preview Current Diagram`
4. 在侧边栏中查看生成的图表

### 导出图片
1. 在PlantUML预览中右键
2. 选择 "Export Current Diagram" 
3. 选择输出格式 (PNG, SVG, PDF等)

### 在线查看
1. 复制`.puml`文件内容
2. 访问 [PlantUML在线编辑器](http://www.plantuml.com/plantuml/uml/)
3. 粘贴代码并查看结果

## 架构概览 (基于README实际功能)

### 主要技术栈
- **前端**: Vue.js 3.4.0 (Composition API) + Element Plus 2.11.1
- **可视化**: 自定义SVG实现 (从Chart.js迁移)
- **后端**: Electron 28.0.0 Main Process + Node.js
- **数据处理**: Python scripts (PyInstaller打包为.exe)
- **数据存储**: SQLite3 5.1.7 database
- **网络通信**: TCP server for GATS系统集成
- **国际化**: vue-i18n 12.0.0 + Backend i18n sync (支持中/英/日/繁体中文)
- **构建工具**: Vite 7.1.2 + electron-builder

### 关键设计模式与特性
- **进程隔离**: Python脚本打包为独立.exe文件，确保稳定性和部署便利性
- **IPC通信**: 通过Electron的IPC机制和preload.js进行安全的进程间通信
- **组件化**: Vue组件采用单一职责原则，ControlPanel作为容器托管PinInspector
- **事件驱动**: 使用Vue的事件系统进行组件间通信(@highlight-pins, @select-pin等)
- **交互模式**: 独立的平移(Pan)、缩放(Zoom)、框选(Box Select)模式
- **历史记录**: 完整的撤销(Undo)和重做(Redo)操作支持
- **双图表分离**: 根据文件名(TOP/BOT)自动分离数据到两个独立图表
- **专业视觉**: 黑色背景主题，类似专业CAD软件的视觉体验

### 数据流向 (基于实际功能)
1. **文件输入** → Python.exe处理 → JSON输出 → Vue双图表渲染(TOP/BOT)
2. **TCP/GATS数据** → XML解析 → 文件自动复制 → 自动处理流程
3. **用户交互** → SVG事件 → Vue组件响应 → IPC通信 → 数据更新
4. **错误分析** → CSV日志解析 → 数据库存储 → 针点高亮显示 → 点击放大居中
5. **语言切换** → Vue i18n → IPC同步 → Electron菜单更新
6. **SVG导出** → 保持黑色主题 → 矢量格式输出

### 核心功能实现
1. **高级交互工具**: 模式切换、框选缩放、历史记录、多维度缩放控制
2. **错误分析系统**: 自动错误标注、交互式检查、多日志文件浏览、错误类型识别
3. **网络监控**: TCP通信、XML数据处理、文件自动复制、状态可视化
4. **国际化支持**: 多语言界面、动态切换、前后端同步
5. **应用打包**: PyInstaller + electron-builder，生成完全独立的部署包

## 开发指南

### 添加新功能时的参考
1. 查看`architecture-class-diagram.puml`了解整体架构
2. 参考`vue-components-detail.puml`设计前端组件
3. 使用`python-processing-flow.puml`指导后端处理逻辑
4. 遵循`data-flow-sequence.puml`中的通信模式

### 维护建议
- 每次重大架构变更后更新相应的UML图
- 新增组件或模块时在对应图表中添加
- 保持图表的简洁性，避免过度细节
- 定期审查图表与实际代码的一致性

## 注意事项

- UML图仅反映架构设计，具体实现细节可能有差异
- 某些辅助类和工具函数为了简洁可能未包含在图中
- 建议结合源代码一起阅读以获得完整理解
