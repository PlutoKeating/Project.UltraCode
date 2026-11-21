---
title: Architecture
description: A small interface, deep implementation, and a clean seam around official OpenCode
---

# Architecture

## Public interface

```text
uc apply / sync
uc doctor
uc update
uc up
uc uninstall
```

Platform detection, version checks, backups, JSONC merging, private runtime management, release downloads, and structural verification remain behind this small interface.

## Modules

- **Install**: idempotent apply, ownership, and removal.
- **Config**: maximum-union JSONC edits and exact managed-value removal.
- **Runtime**: private Bun capability, Ralph, Playwright, and browsers.
- **Release**: stable release lookup, SHA-256 verification, and self-update.
- **OpenCode Adapter**: version and official upgrade commands only; no model calls.
- **Website**: bilingual Stable/Next routes generated from one content source.

## Private runtime

The standalone binary embeds Bun capability. It installs pinned Ralph and Playwright packages into UltraCode-owned directories without requiring global Node, Bun, or package installs.

## OpenCode seam

UltraCode uses public configuration, agent/command/skill files, plugin loading, and public CLI commands. The official installer or update command always owns the OpenCode binary.

## Provider neutrality

Roles contain no `model`, Ralph passes no `--model`, and the merge contains no `provider`. Installation tests therefore require no credentials and create no model charges.
