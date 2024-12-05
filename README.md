# AI Answer Assistant (AI回答助手)

一个帮助用户快速获取AI回答的Chrome浏览器扩展。

## 功能特点

- 快速截图：支持网页区域截图功能
- 智能识别：自动将截图发送至AI助手
- 实时响应：快速获取AI的专业回答
- 便捷操作：支持快捷键和右键菜单操作
- 优雅展示：清晰的对话界面展示

## 版本信息

当前版本：v1.1

### 更新日志

v1.1
- 优化了截图功能的稳定性
- 改进了AI回答的展示效果
- 提升了整体用户体验
- 修复了已知bug

## 安装使用

1. 下载插件压缩包
2. 打开Chrome浏览器，进入扩展程序页面（chrome://extensions/）
3. 开启开发者模式
4. 点击"加载已解压的扩展程序"
5. 选择解压后的插件文件夹

## 使用说明

1. 点击浏览器工具栏中的插件图标
2. 选择需要询问的网页区域进行截图
3. 等待AI助手分析并给出回答
4. 查看AI回答结果

## 快捷键

- 开始截图：Alt + Shift + A
- 打开菜单：右键点击插件图标

## 目录结构

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