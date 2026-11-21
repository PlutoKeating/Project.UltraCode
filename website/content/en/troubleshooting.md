---
title: Troubleshooting
description: Evidence-based recovery for installation, permissions, runtime, and upgrades
---

# Troubleshooting

## Unsupported OpenCode

Check `opencode --version`, upgrade through the official channel to a recent V2, then run `uc sync`. OpenCode is upgraded automatically only when you explicitly run `uc up`.

## `uc` is not on PATH

Use `~/.local/bin/uc doctor` and add `~/.local/bin` to your shell PATH. The installer does not rewrite every shell profile without consent.

## Provider or model errors

UltraCode does not manage providers. Use your existing OpenCode model and authentication diagnostics. Never send credentials to the installer or documentation site.

## Missing Playwright browser

Run `uc sync` to repair the managed browser cache. Do not mask the issue with an unrelated global Playwright installation.

## Preserved configuration conflicts

This is intentional. Inspect the reported path and decide whether to adopt the UltraCode value manually. Existing defaults, MCP servers, and local edits are not overwritten silently.

## Ralph exit 2

The current directory is usually not a linked worktree, or the goal/task file is missing. Create the required worktree and `.ralph/ralph-tasks.md`.

## Ralph exit 3 or 5

- `3`: incomplete work or iteration cap; inspect PROGRESS and HANDOFF.
- `5`: uncommitted final changes; review and commit before deciding whether to continue.

For reports, run `uc doctor` and `opencode --version`, then redact private paths, tokens, and project identifiers.
