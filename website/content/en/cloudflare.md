---
title: Cloudflare Workers deployment
description: Deploy the static Starlight site and installer through Connect to Git
---

# Cloudflare Workers deployment

You create the Worker and connect Git in the Cloudflare dashboard. These fields match the repository configuration.

## Connect to Git

1. Open Workers & Pages and create a Worker.
2. Choose **Connect to Git**.
3. Select `PlutoKeating/Project.UltraCode`.
4. Use `main` as the production branch.

## Build fields

| Field | Value |
| --- | --- |
| Root directory | `website` |
| Build command | `bun run build` |
| Build output directory | `dist` |
| Deploy command | `bunx wrangler deploy` |
| Install command | `bun install --frozen-lockfile` |
| Bun version | 1.3.14 (if the UI exposes this field) |

If the UI only exposes build and deploy commands, keep its default install behavior. `wrangler.jsonc` already points Static Assets at `./dist`.

## No Worker script required

Astro emits a static site. Cloudflare serves `dist` directly, including `install.sh` as a static text file.

## Previews and channels

Pull requests can create preview builds. `main` deploys the production site. Next is a documentation channel and does not require another Worker.

## Custom domain

The production site is `https://project-ultracode.williamhvollita.workers.dev`. For a custom domain, configure Worker Custom Domains and DNS, then update the Astro `site` value and installation examples together.

## Local verification

```bash
cd website
bun install
bun run build
bunx wrangler deploy --dry-run
```

You perform Cloudflare authentication yourself; this project never reads those credentials.
