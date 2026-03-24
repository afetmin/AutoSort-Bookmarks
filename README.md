# AutoSort Bookmarks
一个基于 AI 的浏览器书签自动分类扩展。不要再纠结收藏到哪个文件夹了，先收藏再说。

## 痛点
 - 分类太多，有时候一个书签属于多个分类，不知道选什么，不想纠结，只想先收藏。

## 如何使用
- 下载 [Chrome 扩展](https://github.com/afetmin/AutoSort-Bookmarks/releases/download/v0.1.2/autosort-bookmarks-0.1.2-chrome.zip) 或者 [Firefox 扩展](https://github.com/afetmin/AutoSort-Bookmarks/releases/download/v0.1.2/autosort-bookmarks-0.1.2-firefox.zip)
- 解压压缩包
- 浏览器中打开开发者模式，加载已解压的压缩包
  
  ![demo](docs/image.png)  

## 技术栈

- `WXT`（浏览器扩展开发框架）
- `Svelte 5` 较小的运行时体积
- `readability` 用于提取网页内容
- `@wxt-dev/browser`（跨浏览器 API 适配）

## 环境要求

- `Node.js 22+`

## 快速开始

```bash
npm install
npm run dev
```

默认启动 Chrome 开发模式；
Firefox 开发模式：

```bash
npm run dev:firefox
```

## 常用命令

```bash
# 类型检查
npm run check

# 构建
npm run build
npm run build:firefox

# 打包 zip（用于发布）
npm run zip
npm run zip:firefox
```

## 扩展加载方式

1. 本地开发：执行 `npm run dev` 后 WXT 会自动打开浏览器

## 后续计划

- [ ] 自定义书签文件夹层级
- [ ] 整理现有书签

## 欢迎贡献

欢迎贡献代码，提 issue，提需求，提建议。

## 许可证

MIT