---
title: Getting started
description: Install on Linux or macOS with the official OpenCode V2 already present
---

# Getting started

## Prerequisites

- Linux x64/arm64 or macOS x64/arm64.
- Official OpenCode V2.3.2 or newer.
- `curl`, `tar`, and network access.
- A writable home directory; no sudo is required.

```bash
opencode --version
```

## One-line installation

Replace the example host with the published deployment:

```bash
curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash
```

The installer downloads a standalone binary, verifies its Release SHA-256, installs the private runtime and browser, performs a maximum-union configuration merge, and runs structural checks without a model call.

## Verify

```bash
uc version
uc doctor
```

In a new OpenCode session:

```text
Plan a feature without implementing it
Execute the approved scope with real checks
Independently review the current changes
```

Describe your goal in the conversation.

## Model neutrality

The installer never writes `model`, `provider`, `apiKey`, or authentication fields. Roles inherit the active session model. Continue using the same OpenCode model selection flow you used before installation.
