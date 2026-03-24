# AutoSort Bookmarks

一个基于 AI 的浏览器书签自动分类扩展。新书签会先进入待整理目录，再由模型建议目标文件夹路径。

## 技术栈

- `WXT`（浏览器扩展开发框架）
- `Svelte 5`（UI）
- `TypeScript`
- `@wxt-dev/browser`（跨浏览器 API 适配）

## 环境要求

- `Node.js 22+`（与 CI 一致）

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

1. 本地开发：执行 `npm run dev` 后按 WXT 提示加载扩展。
2. 手动加载构建产物：先执行 `npm run build`，再在浏览器扩展管理页加载 `.output` 下对应浏览器目录。

## 发布流程（GitHub Actions）

- `Version bump`：手动触发版本号升级并打 tag
- `Release`：在 tag 推送或 `Version bump` 成功后自动构建并上传 zip 附件
