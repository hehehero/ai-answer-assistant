# 智能图片粘贴发送助手

一个 Chrome 扩展，用于自动化图片粘贴和发送操作。

## 功能特点

- 🖼️ 自动粘贴剪贴板中的图片
- 🚀 自动等待图片上传完成
- 📤 自动触发发送操作
- 📝 支持多种粘贴方式
- 🔄 智能状态检测
- 💡 操作状态实时反馈

## 安装方法

1. 下载源代码

```bash
git clone https://gitee.com/hehehero/ai-answer-assistant.git
```

2. 打开 Chrome 浏览器，进入扩展管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 使用说明

1. 复制需要发送的图片到剪贴板
2. 点击扩展图标激活插件
3. 点击目标输入框
4. 插件会自动：
   - 粘贴图片
   - 等待上传完成
   - 触发发送操作

## 技术实现

- 使用原生 JavaScript 开发
- 支持多种粘贴方法：
  - ClipboardEvent 模拟
  - DataTransfer API
  - 自定义事件触发
- 智能按钮状态检测
- 可靠的事件触发机制

## 项目结构

```
├── manifest.json          # 扩展配置文件
├── src/
│   ├── scripts/
│   │   ├── content.js    # 主要功能实现
│   │   └── background.js # 后台脚本
│   └── styles/
│       └── content.css   # 样式文件
└── icons/                # 扩展图标
```

## 开发说明

### 环境要求

- Chrome 浏览器
- 开发者模式已启用

### 本地开发

1. 克隆仓库：

```bash
git clone https://gitee.com/hehehero/ai-answer-assistant.git
```

2. 在 Chrome 扩展管理页面加载项目文件夹
3. 修改代码后刷新扩展即可看到效果

### 调试方法

1. 打开 Chrome 开发者工具
2. 查看 Console 面板获取详细日志输出
3. 可通过日志追踪功能执行流程

## 更新日志

### v1.0.0 (2024-03-14)

- ✨ 实现基础图片粘贴功能
- 🚀 实现自动发送功能
- 💡 添加操作状态提示
- 🐛 修复多个兼容性问题

## 贡献指南

1. Fork 本仓库
2. 创建新的功能分支
3. 提交更改
4. 发起 Pull Request

## 许可证

[MIT License](LICENSE)

## 项目地址

- Gitee：[https://gitee.com/hehehero/ai-answer-assistant](https://gitee.com/hehehero/ai-answer-assistant)

## 致谢

感谢所有为本项目提供帮助和建议的朋友们！