---
title: Upgrades and repair
description: Keep official OpenCode entry points and use short UltraCode commands
---

# Upgrades and repair

## One-step upgrade

```bash
uc up
```

This runs the official `opencode upgrade`, updates UltraCode to its stable release, and applies configuration idempotently. OpenCode is upgraded only when you explicitly choose this command.

## Official entry points remain valid

```bash
opencode upgrade
curl -fsSL https://opencode.ai/v2/install | bash
```

The official TUI `/update` also remains available. After using any of them:

```bash
uc sync
```

This restores missing files, merges new managed values, and repairs the private runtime.

## Update only UltraCode

```bash
uc update
```

## Inspect

```bash
uc doctor
opencode --version
```

Doctor performs structural checks only and makes no model call.

## Compatibility

OpenCode V2.3.x is the tested baseline. Newer V2 releases receive structural checks. New major versions or plugin contract changes require an explicit compatibility release; future compatibility is not assumed.

## Recovery order

Restore OpenCode through its official channel if needed, pin and sync UltraCode, then uninstall if necessary. Restore timestamped backups last so newer changes are not overwritten.
