---
name: upstream-stewardship
description: Use when checking, auditing, syncing, or upgrading OpenCode, Superpowers, Playwright MCP, or Ralph upstream releases, triaging upstream-sync canary issues, evaluating new OpenCode built-in features or plugin SDK changes for overlap with UltraCode, or diagnosing host compatibility after an upstream change.
---

# Upstream Stewardship

## Overview

UltraCode is a non-invasive Goal Engineering layer coupled to OpenCode V2's CLI, multi-surface `@opencode/plugin` SDK, agent permissions, and three pinned runtimes (`obra/superpowers`, `@playwright/mcp`, `Th0rgal/open-ralph-wiggum`).

**Core principle:** Discover coupling surfaces dynamically, judge overlapping upstream features against the full Claude Code + Anthropic GAN completeness bar before retiring anything, and verify against a real `opencode` binary in an isolated clean-room `HOME`.

**Violating the letter of the rules is violating the spirit of the rules.**

**REQUIRED SUB-SKILL:** Use `superpowers:test-driven-development` when modifying code or configuration logic, and `superpowers:verification-before-completion` before claiming alignment is complete.

---

## Mandatory 6-Step Stewardship Protocol

Execute these 6 steps in order. Do not skip ahead to bumping version strings or deleting capabilities.

### Step 1: Deterministic Delta Probe

1. Locate the declarative upstream baseline via `glob` (`**/upstream-baseline.json`) and run the deterministic probe through Bun:
   ```bash
   bun run scripts/check-upstreams.ts --json
   ```
2. For every upstream item reporting `update-available` or `error`:
   - Read the upstream GitHub Release Notes, tag/commit diffs, and relevant merged PRs.
   - When `anomalyco/opencode` or `@opencode/plugin` changed, inspect package `exports` keys, `.d.ts` signatures (`server`, `tui`, `gui`, `gui/vite`, `rpc`), CLI flags, and `/api/*` endpoint schemas.
   - Record computed tarball URLs and SHA-256 digests from the probe output rather than hand-crafting URLs.

### Step 2: Dynamic Coupling Surface Discovery

Never trust memorized file paths or line numbers—modules move and evolve. Dynamically map active coupling points using `glob` and `grep` across all **6 semantic categories**:

| # | Coupling Category | What to Search For (`grep` / `glob`) |
|---|---|---|
| 1 | **Host Version Gates** | Semver parsers, minimum/maximum major/minor checks, `upstream-baseline`, upgrade fallback logic |
| 2 | **CLI Subcommand Invocations** | Spawns of `opencode` subcommands (`api`, `debug`, `serve`, `upgrade`, `pair`, `--standalone`, `--server`) and official install URLs |
| 3 | **Plugin SDK Surfaces** | `@opencode/plugin` imports (`rpc`, `gui`, `gui/vite`, `tui`), `ctx.storage`, `session.hook`, `experimental.idle`, `permission.evaluate`, `ComposerPill`, `SettingsPage` |
| 4 | **Agent Permissions & Built-in Tools** | Agent Markdown frontmatter (`permission`, `codemode`), tool allow/deny patterns, and interactions with host built-ins (`opencode.goal`, `opencode.browser`, `tools.automation.*`, `generate_image`, `generate_video`) |
| 5 | **Pinned Archives, Hashes & Lockfiles** | `**/upstream-baseline.json`, tarball SHA-256 constants, runtime lock markers, and workspace `**/package.json` + `**/bun.lock` |
| 6 | **6-Locale Docs & Brand Assets** | Root `README*.md`, `docs/*.md`, 6-language UI dictionaries (`en`, `zh`, `ar`, `fr`, `ru`, `es`), brand asset scripts, and `website/` content |

### Step 3: Claude Code Bar Completeness Gate

Whenever an upstream release introduces or expands a feature that overlaps with an UltraCode capability (browser automation, goal continuation, subagents, compaction, scheduling):

1. Read [references/completeness-rubric.md](references/completeness-rubric.md) along with `docs/ORIGIN_GOAL.md` and `docs/RESEARCH.md`.
2. Score the upstream capability across all **5 mandatory dimensions**:
   - **Cross-Surface Parity** (`TUI`, `Desktop`, `Web`, `Mobile`, `SSH`, outer `ralph` worktrees)
   - **Clean-Room Isolation & Determinism** (isolated profile/worktree, git-ignored QA artifacts)
   - **Non-Claude Model Tool Ergonomics** (`codemode: false` direct schemas vs. fragile scripting)
   - **Tool-Backed Independent Verification** (real test/browser execution by skeptical evaluator vs. transcript-only judge)
   - **Upfront Clarification Compatibility** (preserves `brainstorming` and `question` cards before execution)
3. **Hard Gate:**
   - **5/5 Pass:** Candidate to adopt natively and retire custom plumbing (treat as `ARCHITECTURAL_DECISION` in Step 4).
   - **< 5/5 Pass:** **Keep UltraCode's core mechanism.** Borrow superior internal engineering patterns from upstream (e.g., durable storage, crash fencing, circuit breakers) and guarantee clean coexistence/mutual exclusion with the host built-in.

### Step 4: Impact Classification & Maintainer Check-In

Classify every upstream delta into one of three tiers before editing:

| Tier | Criteria | Required Action |
|---|---|---|
| `COMPATIBLE_BUMP` | Patch/minor release, pinned commit, or SDK bump with zero contract or behavior drift | Update baseline + lockfiles, rebuild bundles, run full verification |
| `ADAPTATION_REQUIRED` | Bounded SDK type change, async startup race, CLI flag change, or coexistence guard with an unambiguous engineering fix | Write failing regression test first, apply surgical fix, verify live |
| `ARCHITECTURAL_DECISION` | New host major contract, retiring/replacing an UltraCode capability, changing user-facing defaults, or genuine product trade-offs | **STOP.** Present structured options and rubric scores to the maintainer via `question` card (or Issue report if unattended) before modifying behavior |

### Step 5: Surgical Implementation & Clean-Room Live Host Verification

1. **Test-First Discipline:** Write or update offline unit/integration tests using local HTTP/CLI mocks and temporary directories—never reading personal credentials or invoking paid LLM calls in `bun test`.
2. **Synchronize Artifacts:** Update `**/upstream-baseline.json`, workspace `package.json`/lockfiles, embedded GUI bundle, standalone binary build, and all 6 UN locales (`en`, `zh`, `ar`, `fr`, `ru`, `es`) if user-visible versions or UI copy changed (never leak internal filenames or JSONC keys onto everyday `website/` pages).
3. **Mandatory Verification Matrix:**
   - Run `check`, `test`, and `build` across all workspace packages (`plugin-gui`, `installer`, `website`).
   - Run the clean-room live host canary against the real `opencode` binary:
     ```bash
     bun run scripts/check-upstreams.ts --verify-live --json
     ```
   - Confirm `"ok": true`: real `@opencode/plugin` GUI compilation succeeds, `ultracode apply` and `ultracode doctor` pass inside an isolated temp `HOME`, both `ultracode-conversation` and `superpowers` report `active`, Playwright MCP reports `connected`, and all 7 roles register with zero stderr warnings.

### Step 6: Friction Reflection & Git Hygiene

1. **Rubric Maintenance:** If an upstream release exposed a new coupling pattern or completeness edge case, append the precedent to [references/completeness-rubric.md](references/completeness-rubric.md) while keeping zero hardcoded source file paths.
2. **Strict Git Hygiene (`AGENTS.md`):**
   - Run `git status --short` and ensure **zero untracked or stray generated files** remain.
   - Commit locally using **only** the human maintainer's configured Git identity (`git config user.name` / `user.email`)—**zero** `Co-authored-by` or agent trailers. Never push or merge to `staging`/`production`/`main` without explicit maintainer authorization.

---

## Rationalization Table

| Excuse | Reality |
|---|---|
| "OpenCode shipped a built-in equivalent, so we can delete UltraCode's version right away." | Host built-ins often target single-surface Desktop or transcript-only judging. Deleting before scoring 5/5 on [references/completeness-rubric.md](references/completeness-rubric.md) breaks TUI, SSH, non-Claude models, or skeptical QA. |
| "All unit tests with shell stubs passed; `--verify-live` is redundant." | Shell stubs echo static JSON. Only `bun run scripts/check-upstreams.ts --verify-live` catches real `opencode` async plugin races, GUI Vite plugin breakage, and MCP handshake failures. |
| "I'll paste exact `packages/...` source paths into the skill so next time is faster." | Hardcoded source paths rot when modules split or move, causing future agents to patch stale locations and miss newly added surfaces. Dynamic `grep`/`glob` across the 6 categories takes seconds and never rots. |
| "It's just a version bump; updating English README is enough." | UltraCode ships 6-language parity (`en`, `zh`, `ar`, `fr`, `ru`, `es`). Partial locale updates leave stale version claims and broken RTL/localized UI strings. |
| "I'll add a `Co-authored-by` trailer or have CI push an auto-bump PR." | Direct violation of `AGENTS.md`. Cloud canary opens/updates `upstream-sync` Issues only; every commit must carry sole human maintainer authorship. |

## Red Flags — STOP Immediately

- Proposing to remove isolated headless Playwright MCP, `ultracode_checkpoint`, or `ultracode ralph run` without a 5/5 score against [references/completeness-rubric.md](references/completeness-rubric.md)
- Skipping `bun run scripts/check-upstreams.ts --verify-live` when `opencode` is available
- Invoking bundled scripts by bare path instead of `bun run scripts/check-upstreams.ts`
- Writing hardcoded TypeScript or JavaScript source paths into skill files
- Leaving untracked artifacts in the working tree or adding any agent/bot commit attribution
