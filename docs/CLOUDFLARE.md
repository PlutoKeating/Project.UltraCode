# Cloudflare Workers Connect to Git

你在 Cloudflare 控制台创建 Worker 并连接 Git；本项目不读取 Cloudflare 凭据。

## Git

- Repository：`PlutoKeating/Project.UltraCode`
- Production branch：`main`

## 构建字段

| 字段 | 值 |
| --- | --- |
| Root directory | `website` |
| Install command | `bun install --frozen-lockfile` |
| Build command | `bun run build` |
| Build output directory | `dist` |
| Deploy command | `bunx wrangler deploy` |
| Bun version | `1.3.14`（若界面提供该字段） |

若界面没有 Install command 或 Output directory，保留默认安装行为；`website/wrangler.jsonc` 已设置 `assets.directory: "./dist"`。

## 原理

Astro Starlight 生成静态 `dist`，Workers Static Assets 直接发布，无需 Worker 脚本。`website/scripts/sync-content.mjs` 还会把根 `install.sh` 复制为网站的 `/install.sh`。

## 域名

唯一生产地址：`https://ultracode.plutokeating.beer/`。`wrangler.jsonc` 仅声明该 Custom Domain，并关闭 workers.dev 生产入口。

## 本地检查

```bash
cd website
bun install
bun run check
bun run build
bunx wrangler deploy --dry-run
```

实际登录与部署由你执行。中英文教程见 `website/content/*/cloudflare.md`。
