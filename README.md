项目架构概览
你的项目由两部分组成，它们通过 Electron 作为桥梁进行通信：

Python 计算后端 (Convertion-py 文件夹)

核心文件: json_script.py
职责: 这是项目的“大脑”，负责所有的数据处理和复杂计算。它接收文件路径作为输入，执行所有必要的坐标变换（如翻转、交点计算、偏移量应用），然后将最终结果打包成 JSON 格式并打印出来。它不负责任何界面的显示。
Electron + Vue 前端 (convertion_electron 文件夹)

核心文件: background.js, src/App.vue, src/components/JigChart.vue
职责: 这是项目的“脸面”，负责用户交互和数据可视化。它完全不关心坐标是怎么计算的，只负责调用 Python 脚本，接收它返回的干净数据，然后用 Chart.js 把它画出来。
各个文件的具体工作
1. background.js (主进程 - “项目经理”)
角色: 它是连接用户界面和 Python 脚本的“项目经理”和“调度中心”。
工作流程:
createWindow(): 创建一个浏览器窗口，并加载你的 Vue 应用（由 Vite 服务器提供）。
ipcMain.handle('run-processing', ...): 监听来自 Vue 应用的“开始处理”请求。
当请求到达时，它会：
弹出文件选择框。
正确地找到并调用 json_script.py 脚本。
将用户选择的文件路径作为命令行参数传给 Python。
耐心等待 Python 脚本执行完成，并捕获它打印出来的 JSON 数据。
将捕获到的 JSON 字符串转换成 JavaScript 对象，然后返回给 Vue 应用。
2. preload.js (“安全联络员”)
角色: 它是主进程和 Vue 应用之间的“安全联络员”。
工作: 它在 window 对象上创建了一个名为 electronAPI 的接口，里面有一个 processFiles 函数。这使得 Vue 应用可以通过调用 window.electronAPI.processFiles() 来安全地与 background.js 通信，而无需暴露整个 Electron 的 API。
3. src/App.vue (应用主界面)
角色: 用户能看到和交互的主界面。
工作:
提供一个“Load & Process Files”按钮。
当按钮被点击时，它调用 window.electronAPI.processFiles()，然后等待 background.js 返回处理好的数据。
它不做任何计算。它拿到 Python 返回的、已经计算好的坐标数据后，直接将这些数据传递给 JigChart.vue 组件去显示。
4. src/components/JigChart.vue (图表组件)
角色: 一个纯粹的“绘图员”。
工作: 它的任务非常简单：接收 App.vue 传来的数据，然后使用 Chart.js 库将这些点和线画在画布上。
如何实现 convert2.py 的功能
你的这个新架构已经实现了 convert2.py 的核心功能，只是实现方式不同：

功能点	convert2.py (旧方式)	convertion_electron (新架构)
读取文件	自己在脚本里定义文件路径	background.js 弹出文件选择框
坐标计算	在 Python 脚本中完成	同样在 json_script.py 中完成
交点计算	在 Python 脚本中完成	同样在 json_script.py 中完成
坐标翻转	在 Python 脚本中完成	同样在 json_script.py 中完成
应用偏移	在 Python 脚本中完成	同样在 json_script.py 中完成
显示图像	使用 matplotlib 在 Python 中直接显示	Python 不显示，而是输出 JSON 数据，由 JigChart.vue 使用 Chart.js 显示
总结: 你已经成功地将计算逻辑和显示逻辑分离开来。json_script.py 继承了 convert2.py 的所有计算能力，而 Electron+Vue 提供了一个更现代化、更具扩展性的用户界面。这个架构是完全正确的，并且已经能够达成你的最终目标。


Jig Viewer - 治具数据可视化工具
本项目是一个基于 Electron 和 Vue.js 3 构建的桌面应用程序，旨在提供一个高性能、交互友好的界面，用于可视化和分析治具（JIG）和针点（ADR）数据。应用的核心是将复杂的坐标数据以图表的形式清晰地呈现出来，并提供类似专业CAD软件的交互体验。

技术栈
桌面应用框架: Electron
前端框架: Vue.js 3 (使用 Composition API)
构建工具: Vite
图表库: Chart.js 4
图表交互插件: chartjs-plugin-zoom
后端数据处理: Python 3
开发环境: Node.js, concurrently
核心特性
文件处理:

通过文件对话框选择并加载多个 .rut (治具) 和 .adr (针点) 文件。
后端 Python 脚本实时处理文件，计算坐标偏移、交点，并分离数据。
双图表分离显示:

自动根据文件名 (TOP/BOT) 将数据分离，分别在两个独立的图表中进行渲染。
ADR 针点数据 (Side A/Side B) 会被精确地绘制在对应的图表上。
高级图表交互工具栏 (Matplotlib-Style):

模式切换: 提供 "Pan" (平移) 和 "Zoom" (缩放) 两种独立模式，用户可以明确切换，避免误操作。
框选缩放: 在 "Zoom" 模式下，用户可以通过拖拽鼠标形成一个矩形选框，实现对特定区域的精确放大，性能极高。
历史记录: 实现了 "Undo" (后退) 和 "Redo" (前进) 功能，允许用户在所有平移和缩放操作的历史记录中自由穿梭。
多维度缩放控制:
按钮缩放: "In" 和 "Out" 按钮用于步进式缩放。
滑块缩放: 提供一个范围滑块（Zoom Slider），用于直观地调整缩放级别。
一键重置: "Reset" 按钮可以立即将视图恢复到初始状态。
性能与体验优化:

滑块防抖 (Debouncing): 彻底解决了快速拖动缩放滑块时因事件拥堵导致的卡顿和状态错乱问题。
实时状态同步: 无论通过何种方式（框选、按钮、滑块）进行缩放，缩放滑块的状态都能实时、精确地同步。
无动画更新: 在需要高频更新的场景（如缩放、平移）中禁用渲染动画，提供更即时、更流畅的响应。
项目结构
安装与运行
环境要求:

Node.js (v16+)
Python 3
克隆仓库

安装依赖

运行开发环境 此命令会同时启动 Vite 开发服务器和 Electron 应用。

使用方法

点击 "Load & Process Files" 按钮。
在弹出的对话框中，选择所有相关的 .rut 和 .adr 文件。
使用图表下方的工具栏进行平移、缩放和查看。
开发历程与关键决策
本项目从一个简单的需求（复现 Python Matplotlib 的绘图功能）演变成一个功能完善的应用，期间经历了多次重要的技术选型和优化：

问题：性能瓶颈

现象: 在数据点较多时，使用默认的滚轮缩放会导致严重的卡顿。
探索:
尝试 chartjs-plugin-downsample，但因与 Chart.js v4 不兼容而放弃。
转向研究 Matplotlib 为何流畅，发现其核心在于“一次性”的框选重绘机制。
最终方案: 采用 chartjs-plugin-zoom 的框选缩放 (drag-to-zoom) 功能，并设计了独立的 "Pan" 和 "Zoom" 模式，完美解决了性能问题。
问题：交互体验不佳

现象: 仅有缩放功能，操作不直观；缩放滑块与实际视图不同步；快速操作时状态错乱。
迭代:
工具栏: 从无到有，设计了包含模式切换、历史记录、缩放控制的完整工具栏。
状态同步: 通过精确使用 chartjs-plugin-zoom 的 onZoom 和 onZoomComplete 回调，实现了滑块与图表视图的精确同步。
稳定性: 为解决快速拖动滑块导致的事件拥堵，引入了函数防抖 (Debouncing) 技术，确保了应用的最终稳定性和流畅性。
通过这一系列的迭代和优化，本应用最终达到了接近原生桌面软件的交互体验和性能水平。