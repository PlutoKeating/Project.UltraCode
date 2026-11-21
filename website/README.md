# UltraCode Website

Astro Starlight 中英双语 Stable/Next 教程，部署到 Cloudflare Workers Static Assets。

## 开发

```bash
bun install
bun run dev
bun run check
bun run build
```

内容真源：`content/root`（中文）与 `content/en`（英文）。`scripts/sync-content.mjs` 生成 Stable/Next 路由并复制根安装脚本；生成的 `src/content/docs` 不提交。

## Cloudflare

Root `website`，Install `bun install --frozen-lockfile`，Build `bun run build`，Output `dist`，Deploy `bunx wrangler deploy`。详见根目录 `docs/CLOUDFLARE.md`。
