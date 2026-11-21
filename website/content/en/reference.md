---
title: Command and compatibility reference
description: CLI commands, roles, Ralph exit codes, and version baselines
---

# Command and compatibility reference

## CLI

| Command | Behavior | Real model call |
| --- | --- | --- |
| `uc apply` | Full idempotent install | No |
| `uc sync` | Apply/repair after an official update | No |
| `uc doctor` | Structural checks | No |
| `uc update` | Update stable UltraCode and sync | No |
| `uc up` | Official OpenCode upgrade + UltraCode update + sync | No |
| `uc uninstall --yes` | Remove exact unmodified managed state | No |
| `uc version` | Print version | No |
| `uc ralph ...` | Run managed Ralph | Determined by the task |
| `uc mcp` | Start managed Playwright MCP | No |

## Baselines

| Component | Baseline |
| --- | --- |
| UltraCode | 0.1.0 / Stable |
| OpenCode | V2.3.x; newer V2 receives structural checks |
| Superpowers | v7.0.2 |
| Open Ralph Wiggum | v1.3.1 / pinned commit |
| Playwright MCP | 0.0.86 |

## Ralph exit codes

`0`: complete and clean; `1`: blocked/failed; `2`: invalid invocation; `3`: cap/incomplete; `5`: dirty final worktree.

## Environment

`ULTRACODE_HOME`, `ULTRACODE_BIN_DIR`, `ULTRACODE_OPENCODE_BIN`, `ULTRACODE_VERSION`, `XDG_*`, and `OPENCODE_CONFIG_DIR` customize paths or release selection.

`ULTRACODE_SKIP_RUNTIME` and `ULTRACODE_SKIP_BROWSER` are test-only switches and must not be used for a normal full installation.
