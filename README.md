# AI Answer Assistant (AI助手)

一个帮助用户快速获取AI回答的Chrome浏览器扩展。

## 功能特点

- 🖼️ 快速截图：支持网页区域智能截图
- 🤖 AI识别：自动将截图发送至AI助手
- ⚡ 实时响应：快速获取AI的专业回答
- 🎯 便捷操作：支持快捷键和右键菜单
- 🎨 优雅展示：清晰美观的对话界面

## 版本信息

当前版本：v1.1.0

### 更新日志

v1.1.0 (2024-03)
- ✨ 优化截图功能稳定性
- 🎨 改进AI回答展示效果
- 🚀 提升整体用户体验
- 🐛 修复已知问题

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

## 项目结构

```
ai-answer-assistant/
├── manifest.json          # 扩展配置文件
├── package.json          # 项目配置文件
├── README.md            # 项目说明文档
└── src/
    ├── assets/
    │   └── icons/       # 扩展图标资源
    │       ├── icon-16.png
    │       ├── icon-32.png
    │       ├── icon-48.png
    │       └── icon-128.png
    ├── scripts/
    │   ├── background.js # 后台脚本
    │   └── content.js    # 内容脚本
    └── styles/
        └── content.css   # 样式文件
```

## 技术栈

- JavaScript ES6+
- Chrome Extension API
- HTML5/CSS3

## 开发说明

### 本地开发

1. 克隆仓库：

```bash
git clone https://gitee.com/hehehero/ai-answer-assistant.git
```

2. 在Chrome扩展管理页面加载项目文件夹
3. 修改代码后刷新扩展即可看到效果

## 注意事项

- 使用前请确保已授予插件必要的权限
- 建议使用最新版本的Chrome浏览器
- 如遇问题请检查网络连接是否正常

## 许可证

MIT License

## 项目地址

- Gitee：[https://gitee.com/hehehero/ai-answer-assistant](https://gitee.com/hehehero/ai-answer-assistant)

## 联系方式

如有问题或建议，请通过以下方式联系：
- Gitee: [@hehehero](https://gitee.com/hehehero)

## 致谢

感谢所有为本项目提供帮助和建议的朋友们！