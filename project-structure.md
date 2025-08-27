# 项目结构优化方案

## 当前问题

目前项目文件组织较为混乱，主要存在以下问题：

1. Python脚本分散在不同位置
2. Electron主进程文件与前端文件混合
3. 测试数据与文档混合在一起
4. 缺乏清晰的项目结构文档

## 优化后的目录结构

```
/
├── app/                      # 应用程序主目录
│   ├── main/                 # Electron主进程
│   │   ├── background.js     # 主进程入口
│   │   ├── preload.js        # 预加载脚本
│   │   ├── tcp_handler.js    # TCP处理模块
│   │   └── i18n-backend.js   # 后端国际化
│   │
│   ├── renderer/            # 前端渲染进程
│   │   ├── src/             # 源代码
│   │   │   ├── components/  # Vue组件
│   │   │   ├── assets/      # 静态资源
│   │   │   ├── locales/     # 前端国际化文件
│   │   │   ├── i18n.js      # 国际化配置
│   │   │   ├── main.js      # 前端入口
│   │   │   └── network.js   # 网络相关JS
│   │   │
│   │   ├── index.html       # 主页面HTML
│   │   └── network.html     # 网络监控页面HTML
│   │
│   └── python/              # Python脚本
│       ├── parse_fails.py   # 错误日志解析
│       ├── json_script.py   # JSON处理脚本
│       └── converters/      # 转换脚本
│           ├── convert2.py
│           ├── convert3.py
│           └── convert4.py
│
├── data/                    # 数据文件
│   ├── jig_data.db          # SQLite数据库
│   └── test.xml             # 测试XML
│
├── docs/                    # 项目文档
│   ├── api/                 # API文档
│   ├── user-guide/          # 用户指南
│   └── dev-guide/           # 开发指南
│
├── test/                    # 测试相关
│   ├── fixtures/            # 测试数据
│   │   ├── rut/             # RUT文件
│   │   ├── logs/            # 日志文件
│   │   └── results/         # 测试结果
│   └── unit/                # 单元测试
│
├── resources/               # 资源文件
│   └── img/                 # 图片资源
│
├── .gitignore
├── .npmrc
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

## 迁移计划

1. 创建新的目录结构
2. 将Python脚本移动到 `app/python/` 目录
3. 将Electron主进程文件移动到 `app/main/` 目录
4. 将前端文件移动到 `app/renderer/` 目录
5. 将测试数据移动到 `test/fixtures/` 目录
6. 更新文件中的相对路径引用
7. 更新 `package.json` 中的入口点和脚本
8. 创建必要的文档文件

## 优势

1. 清晰的职责分离
2. 更容易维护和扩展
3. 符合现代Electron应用的最佳实践
4. 更好的开发体验
5. 更容易理解项目结构