# AutoSort Bookmarks

一个基于 AI 的浏览器书签自动分类扩展。不要再纠结收藏到哪个文件夹了，先收藏再说。

## 技术栈

- `WXT`（浏览器扩展开发框架）
- `Svelte 5`
- `TypeScript`
- `@wxt-dev/browser`（跨浏览器 API 适配）

## 环境要求

- `Node.js 20+`

## 快速开始

```bash
npm install
npm run dev
```

默认启动 Chrome 开发模式；Firefox 开发模式：

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
