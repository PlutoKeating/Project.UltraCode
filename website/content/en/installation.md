---
title: Installation and removal
description: Paths, private runtime, repeatable apply, and safe uninstall
---

# Installation and removal

## Default paths

| Path | Purpose |
| --- | --- |
| `~/.local/bin/ultracode` | Standalone CLI |
| `~/.local/bin/uc` | Short-command symlink |
| `~/.local/share/ultracode/` | Manifest, backups, runtime, and browsers |
| `~/.config/opencode/agents/ultracode/` | Namespaced roles |
| `~/.config/opencode/commands/ultracode/` | UltraCode commands |
| `~/.config/opencode/ultracode/` | Ralph protocol and templates |

The installer respects `XDG_DATA_HOME`, `XDG_CONFIG_HOME`, `OPENCODE_CONFIG_DIR`, and `ULTRACODE_HOME`.

## Repeat or repair

```bash
uc sync
```

Repeated sync does not duplicate file writes or array entries. It also restores missing UltraCode state after an official OpenCode update.

## Pin a release

```bash
export ULTRACODE_VERSION=v0.1.0
curl -fsSL https://project-ultracode.williamhvollita.workers.dev/install.sh | bash
```

Pin production installations and promote a newer release only after verification.

## Inspect before execution

```bash
curl -fsSL https://project-ultracode.williamhvollita.workers.dev/install.sh -o /tmp/ultracode-install.sh
less /tmp/ultracode-install.sh
bash /tmp/ultracode-install.sh
```

Every platform artifact has a `.sha256` sidecar and GitHub build provenance.

## Remove

```bash
uc uninstall --yes
```

Only exact, unmodified UltraCode-owned state is removed. User configuration, locally modified agents, unrelated MCP/providers, and backups are preserved.
