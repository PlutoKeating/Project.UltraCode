---
title: Cloudflare Workers 部署
description: 使用 Connect to Git 部署 Astro Starlight 静态站点和安装脚本
---

# Cloudflare Workers 部署

你负责在 Cloudflare 控制台创建 Worker 并连接 Git，以下字段与仓库配置对应。

## Connect to Git

1. 打开 Workers & Pages，选择创建 Worker。
2. 选择 **Connect to Git**。
3. 仓库：`PlutoKeating/Project.UltraCode`。
4. 生产分支：`main`。

## 构建设置

| 字段 | 填写 |
| --- | --- |
| Root directory | `website` |
| Build command | `bun run build` |
| Build output directory | `dist` |
| Deploy command | `bunx wrangler deploy` |
| Install command | `bun install --frozen-lockfile` |
| Bun version | 1.3.14（若界面提供该字段） |

如果控制台只有 Build command 和 Deploy command，保留默认安装行为即可。`wrangler.jsonc` 已声明静态资源目录为 `./dist`。

## 为什么不需要 Worker 脚本

本站是 Astro 静态输出。Cloudflare Workers Static Assets 直接发布 `dist`，`install.sh` 也会作为静态文本文件发布。

## 预览与生产

- Pull Request 可生成预览构建。
- `main` 发布 Stable 网站。
- Next 是文档频道，不需要第二个 Worker。

## 自定义域名

Worker 创建后，在 Custom Domains 中添加域名并按 Cloudflare 提示配置 DNS。随后把网站首页和 README 中的 `你的发布域名` 替换为实际域名。

## 本地验证

```bash
cd website
bun install
bun run build
bunx wrangler deploy --dry-run
```

部署登录由你本人完成；本项目不会读取 Cloudflare 凭据。
