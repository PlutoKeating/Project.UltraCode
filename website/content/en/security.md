---
title: Security and privacy
description: No credential access, scoped writes, verified artifacts, and reversible changes
---

# Security and privacy

UltraCode never reads, copies, prints, or tests provider credentials. Documentation and CI do not ask for API keys, ADC files, or login information.

## Scope

- User-level XDG paths; no sudo.
- No modification of the official OpenCode binary.
- No shell for visual evaluation.
- Conversational command approvals default to auto and can be switched to manual.
- No automatic pushes or protected-branch merges.

## Release integrity

Each platform artifact includes a SHA-256 sidecar and GitHub Artifact Attestations. Checksums verify file integrity; attestations establish build provenance. Review the installer and release before production use.

## Writes and removal

Configuration writes are atomic and backed up. Manifest hashes identify UltraCode-owned files. Uninstall removes only exact unmodified managed state and preserves local changes.

## Third-party pins

Superpowers and Ralph use fixed source archives with SHA-256 verification. Playwright uses an exact npm version. Lock updates require a tested UltraCode release rather than following upstream main during apply.

## Reporting issues

Remove private paths, project identifiers, tokens, and credentials from logs. Never attach authentication files or real model transcripts to public reports.
