---
title: Development and releases
description: Local checks, content generation, stable releases, and supply-chain workflow
---

# Development and releases

## Dependencies

```bash
bun install --cwd installer
bun install --cwd website
```

## Installer checks

```bash
cd installer
bun test
bun run check
bun run build
./dist/ultracode-current version
```

Tests use temporary homes and a fake OpenCode Adapter. Never add real model calls.

## Website checks

```bash
cd website
bun run check
bun run build
```

`sync-content.mjs` generates Stable/Next routes from `content/root` and `content/en`, then copies the root installer. Do not commit generated `src/content/docs`.

## Release flow

1. Merge verified changes to main.
2. Review the Release Please version PR.
3. Merge it and publish the stable release.
4. Native platform runners build, smoke, checksum, attest, and upload artifacts.
5. Test the pinned release in a clean environment and repeat sync.

## Dependency updates

Do not switch pins to latest. Update locks, run isolated tests and both builds, then publish through a stable tag.

## Documentation changes

Keep Chinese and English information structures aligned. Update the root installer, reference, and both languages together when command behavior changes.
