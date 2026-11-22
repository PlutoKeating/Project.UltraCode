---
title: Maximum-union configuration
description: Preserve comments, unknown fields, existing MCP servers, and user choices
---

# Maximum-union configuration

UltraCode treats `opencode.json(c)` as a user-owned document rather than a replaceable template.

## Merge rules

- Add missing object keys recursively.
- Append missing array entries with deduplication.
- Preserve conflicting scalar values and report them.
- Keep comments, providers, credential references, and unknown fields.
- Never replace an existing `default_agent` silently.
- Leave unrelated MCP servers, skills, and agents outside the ownership manifest.

## Namespaces

Roles live under `agents/ultracode/`, commands under `commands/ultracode/`, and the managed MCP server is named `ultracode_playwright`. This reduces collisions with existing definitions.

## Conflict example

```jsonc
{
  // My preferred primary agent
  "default_agent": "my-agent"
}
```

The installer keeps `my-agent`, reports the conflict, and still makes UltraCode roles available for explicit use.

## Local modifications

Hashes in the install manifest distinguish an older managed version from a user-edited file. Locally edited agents survive later apply and uninstall operations.

## Backups

Original files are backed up before actual writes. For recovery, uninstall first, then inspect timestamped backups. Do not blindly overwrite changes made after that backup.

The installer compares plugin identities, permission action/resource pairs, and MCP launch settings. A matching Playwright server supplies the tools for visual review. The manifest records configuration additions for uninstall. Legacy installations use a verifiable pre-install backup when available. Values of uncertain ownership are preserved.

`uc doctor` checks the registered agents, active plugins and browser MCP connection in the current project.
