# AutoSort Bookmarks

[English README](./README.md)

先收藏，后归类。

AutoSort Bookmarks 是一个基于 AI 的浏览器书签整理扩展，适合那些收藏很快、但不想每次都停下来想“这个链接该放哪个文件夹”的人。点击一次图标，扩展会抓取页面内容、调用你配置的模型完成分类，并自动移动到目标目录。

- 一键收藏并自动分类当前页面
- 支持自定义兼容 OpenAI 的接口地址和模型
- 优先复用已有目录，缺少时自动创建
- 分类失败自动进入待整理目录

![AutoSort Bookmarks 演示](https://github.com/user-attachments/assets/d08ea99f-ab36-4b70-8d29-1b2f318fad29)

## 适合谁用

如果你有下面这些习惯，这个项目会比较适合：

- 看到有价值的页面就想先收下，但不想停下来想分类。
- 书签文件夹很多，越分越细，最后收藏动作本身变得很重。
- 收藏时判断不出来应该按主题、项目、工具还是用途归档。
- 想保留整洁的书签结构，但不想每次都手动拖拽整理。

## 核心功能

- 点击扩展图标即可完成收藏与自动分类。
- 基于页面标题、摘要、正文可读内容进行分类判断。
- 支持自定义 `API Endpoint`、`API Key` 和 `Model`。
- 会参考你现有的书签目录，优先复用语义匹配的文件夹。
- 目标目录不存在时会自动创建。
- 当前支持最多两级书签目录。
- 分类失败时自动回退到待整理目录，避免链接丢失。
- 设置页内可查看最近处理记录，并可重试失败任务。
- 支持 Chrome 和 Firefox 构建。

## 工作流程

1. 在当前网页点击扩展图标。
2. 扩展先在浏览器里创建书签。
3. 内容脚本提取页面标题、描述、摘要和可读正文。
4. 扩展将页面信息和当前书签目录一起发送给兼容 OpenAI Chat Completions 的接口。
5. 模型返回目标目录、置信度和简短说明。
6. 扩展将书签移动到对应目录；如果失败，则放入待整理目录。

## 功能亮点

### 1. 先收藏，后整理

这个项目的重点不是“更复杂的分类系统”，而是降低收藏动作本身的阻力。看到有用内容时先点一下，不中断当前思路，分类交给模型处理。

### 2. 尽量利用你已有的书签结构

扩展不会完全忽略你现在的目录体系。分类时会把现有文件夹路径一起提供给模型，让结果更贴近你已经形成的组织方式。

### 3. 失败也不会丢

如果模型请求失败、返回结果无效、置信度过低，或者移动书签时发生异常，书签会进入待整理目录，方便你后续统一处理。

### 4. 配置简单

设置页只需要填写 API 地址、密钥和模型名称即可开始使用，也支持把失败书签统一放进你自定义命名的目录。

## 安装方式

### 方式一：下载发布包安装

- Chrome: [autosort-bookmarks-0.1.2-chrome.zip](https://github.com/afetmin/AutoSort-Bookmarks/releases/download/v0.1.2/autosort-bookmarks-0.1.2-chrome.zip)
- Firefox: [autosort-bookmarks-0.1.2-firefox.zip](https://github.com/afetmin/AutoSort-Bookmarks/releases/download/v0.1.2/autosort-bookmarks-0.1.2-firefox.zip)
- 下载后解压。
- 打开浏览器扩展管理页。
- 启用开发者模式。
- 选择“加载已解压的扩展程序”并指向解压后的目录。

### 方式二：本地开发运行

```bash
npm install
npm run dev
```

Firefox 开发模式：

```bash
npm run dev:firefox
```

## 配置说明

右键扩展图标，选择 `Bookmark Settings` 打开设置页。

必填项：

- `API Endpoint`：兼容 Chat Completions 的接口地址，例如 `https://api.openai.com/v1`
- `API Key`
- `Model`

可选项：

- `Pending Folder Name`：分类失败后自动进入的目录名称

项目当前默认值：

- 接口地址：`https://api.openai.com/v1/chat/completions`
- 模型：`gpt-4o-mini`
- 温度：`0.2`
- 最大输入长度：`6000` 字符
- 待整理目录：`Bookmark Inbox`

## 使用方式

### 收藏当前页面

- 打开一个普通的 `http` 或 `https` 页面。
- 点击浏览器工具栏中的 AutoSort Bookmarks 图标。
- 等待图标状态完成处理。
- 书签会自动保存并移动到预测目录。

### 查看处理记录

- 打开设置页。
- 在“处理流水线”区域查看最近任务。
- 如果某条记录失败，可以直接点击重试。

## 开发

### 环境要求

- Node.js 22+

### 常用命令

```bash
# Chrome 开发模式
npm run dev

# Firefox 开发模式
npm run dev:firefox

# 类型检查
npm run check

# 构建
npm run build
npm run build:firefox

# 生成发布压缩包
npm run zip
npm run zip:firefox
```

## 技术栈

- `WXT`：跨浏览器扩展开发框架
- `Svelte 5`：设置页 UI
- `@mozilla/readability`：提取网页正文
- `@wxt-dev/browser`：统一浏览器 API 适配
- `TypeScript`：业务逻辑与共享类型

## 项目结构

```text
src/
  entrypoints/
    background.ts      # 扩展生命周期与事件入口
    content.ts         # 页面内容提取与页面内提示
    options/           # 设置页和最近任务界面
  features/
    action/            # 图标状态与右键菜单
    bookmarks/         # 书签查询、目录创建与移动
    capture/           # 页面采集流程
    classification/    # Prompt 生成与模型结果校验
    jobs/              # 最近任务记录存储
    orchestrator/      # 整体编排流程
    settings/          # 配置持久化
```

## 当前能力边界

- 只处理普通 `http` / `https` 页面。
- 目录层级目前最多支持两级。
- 最近任务记录最多保留 20 条。
- 如果原始页面标签页不可用，会退化为基于标题的内容采集。

## 后续计划

- 自定义书签目录层级策略
- 批量整理已有书签

## 贡献

欢迎提 issue、功能建议和 pull request。

## 许可证

MIT
