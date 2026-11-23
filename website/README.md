# UltraCode Website

Astro + Starlight official website and 6-language documentation (`en` default at `/`, plus `zh`, `ar` RTL, `fr`, `ru`, `es`), deployed to Cloudflare Workers Static Assets at `https://ultracode.plutokeating.beer`.

## Development

```bash
bun install
bun run dev
bun run check
bun run build
```

Content source of truth lives in `content/{root,zh,ar,fr,ru,es}/docs/*.mdx`. `scripts/sync-content.mjs` syncs all 6 locales into `src/content/docs/`, copies `../scripts/install.sh` and `../scripts/install.ps1` into `public/`, and generates `/llms.txt` and `/llms-full.txt` automatically.

## Cloudflare Workers Static Assets

Root directory `website`, Install `bun install --frozen-lockfile`, Build `bun run build`, Output `dist`, Deploy `bunx wrangler deploy`. See `../docs/CLOUDFLARE.md`.
