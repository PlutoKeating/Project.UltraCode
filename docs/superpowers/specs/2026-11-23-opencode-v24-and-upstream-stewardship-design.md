# OpenCode v2.4+ Alignment, Checkpoint Hardening, and Upstream Stewardship Design

- **Date**: 2026-11-23
- **Status**: Draft (Pending Builder Check & Maintainer Approval)
- **Target Version**: UltraCode `v1.1.0` (local feature branch `feature/opencode-v24-upstream-stewardship`)

---

## 1. Intent and the Why

UltraCode exists to give OpenCode V2 users—across any provider or model, including high-throughput non-Claude models—the long-running reliability, upfront requirement clarity, subagent isolation, and skeptical real-browser QA associated with top-tier Claude Code + Anthropic GAN harness workflows (`docs/ORIGIN_GOAL.md`, `docs/RESEARCH.md`).

Following the release of UltraCode `v1.0.0`, official OpenCode shipped `v2.4.0` (2026-11-23), introducing a built-in Desktop Browser (`@opencode/plugin-browser`), native `/automation` jobs (`tools.automation.*`), redesigned `/goal` (`opencode.goal`), `generate_image`/`generate_video`, OpenTUI `0.9.4`, and background-again plugin loading (PR `#63814`). Auditing UltraCode `v1.0.0` against OpenCode `v2.4.0` revealed two coupled needs:

1. **Immediate `v2.4.0+` Alignment & "Keep Core, Upgrade Rough Edges, Borrow Official Strengths"**:
   - UltraCode `v1.0.0` prints a misleading hardcoded warning (`minor > 3`: *"newer than the tested 2.3.x matrix; running structural checks only"*), pins `@opencode/plugin@2.3.2` in `packages/plugin-gui`, performs a single non-retried `/api/plugin` read in `components.ts` that can race `v2.4.0` async plugin startup, and stores `ultracode_checkpoint` in a volatile in-memory `Map` without stall limits, Desktop pill visibility, or mutual-exclusion awareness of OpenCode's `/goal`.
   - At the same time, source-level comparison against `anomalyco/opencode@v2.4.0` proved that UltraCode's isolated headless `@playwright/mcp` (`visual-evaluator`), `ultracode ralph run` (cross-session Context Reset in linked worktrees), and natural-chat `ultracode_checkpoint` (clarify upfront via `question`, then continue across milestones with tool-wielding `reviewer`/`visual-evaluator`) are **more complete** for our target engineering bar than replacing them wholesale with Desktop-only `opencode.browser` or `/goal`'s zero-tool `judge.txt` + `"do not stop to ask"` `kickoff.txt`.
   - Meanwhile, local installation on the maintainer's machine is still on `v0.3.0` and needs to be upgraded to the newly built binary and verified clean against live `opencode v2.4.0`.

2. **Permanent, Zero-Path-Hardcoding Upstream Stewardship**:
   - Because UltraCode is a non-invasive layer coupled to OpenCode's CLI, Server/TUI/GUI/RPC plugin contracts, permissions, and three vendored/pinned runtime dependencies (`obra/superpowers`, `@playwright/mcp`, `Th0rgal/open-ralph-wiggum`), traditional Dependabot bumps and hardcoded line-number scripts both rot quickly.
   - We need a **dual-mode, methodology-first Upstream Stewardship system**: a portable repository Skill (`.opencode/skills/upstream-stewardship/SKILL.md`) with zero hardcoded source file paths, paired with a zero-token deterministic upstream probe & real-binary canary CI workflow that opens/updates an evidence-rich tracking Issue (without pushing branches or committing with bot/agent identities), plus native OpenCode `v2.4.0` `/automation` support for local scheduled monitoring and local Coding Agent execution.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
1. **Seamless OpenCode `v2.4.0+` Support**:
   - Upgrade `packages/plugin-gui` to `@opencode/plugin@2.4.0` and rebuild the embedded `gui-experimental.cjs`.
   - Replace the static `minor > 3` warning in `opencode.ts` with a V2 contract floor (`major === 2` and version `>= 2.3.2`), delegating compatibility validation to live runtime contract checks (`apply` and `doctor`).
   - Add bounded retry/polling in `components.ts` when querying `/api/plugin` so `v2.4.0` async plugin initialization never causes transient deduplication misses.
2. **Production-Grade `ultracode_checkpoint` & Official `/goal` Coexistence**:
   - Upgrade `ultracode_checkpoint` in `packages/config/opencode/conversation/` from an in-memory `Map` to OpenCode's durable `ctx.storage`, complete with server-boot fencing, max-continuation and stall circuit breakers, automatic deferral when official `opencode.goal` (`/goal`) is active on the same session, and Desktop `ComposerPill` visibility/clear control across all 6 UN languages.
3. **Role-Scoped Fusion with OpenCode `v2.4.0` Built-ins**:
   - Keep `visual-evaluator` bound to clean-room headless `ultracode_playwright_*` (`codemode: false`, `--headless --isolated --output-dir .opencode/ultracode/qa`) and keep `ultracode ralph run` intact.
   - Keep `UltraBuild` compatible with OpenCode `v2.4.0`'s built-in Desktop Browser (`opencode.browser` when Desktop is attached), `/automation` (`tools.automation.*`), `generate_image`, `generate_video`, and `tools.opencode.models`.
4. **Dual-Mode Upstream Stewardship (Cloud Canary + Local Harness/Automation)**:
   - Single declarative upstream baseline (`packages/config/upstream-baseline.json`) covering all 4 managed upstreams:
     1. `anomalyco/opencode` (CLI release + `@opencode/plugin` npm SDK)
     2. `obra/superpowers` (GitHub tag + tarball SHA-256)
     3. `@playwright/mcp` (npm package version)
     4. `Th0rgal/open-ralph-wiggum` (GitHub branch/commit + tarball SHA-256)
   - Zero-path-hardcoding methodology Skill (`.opencode/skills/upstream-stewardship/SKILL.md` + `references/completeness-rubric.md`) encoding how a Coding Agent dynamically discovers coupling surfaces, evaluates upstream features against the Claude Code / Anthropic GAN bar, applies surgical updates, and runs clean-room live-host verification.
   - Zero-token probe & live-host canary CLI script (`scripts/check-upstreams.ts`) + GitHub Actions workflow (`.github/workflows/upstream-canary.yml`) that runs without model API keys, tests against the real latest official `opencode` binary in an isolated sandbox, and creates/updates a single deduplicated GitHub Issue with full delta & diagnostic patch/evidence report (never pushing branches or commits).
   - Ready-to-use OpenCode `v2.4.0` `/automation` zero-token Code Mode recipe for local recurring upstream checks that steer a local session to invoke `upstream-stewardship` only when an upstream change is detected.
5. **Local Machine Sync & Full Verification**:
   - Build the updated `ultracode` standalone binary, update the local machine installation (`~/.local/bin/ultracode`) from `v0.3.0` to `v1.1.0`, run `ultracode sync` and `ultracode doctor` against live `opencode v2.4.0` with zero warnings or errors, and keep all documentation (root 6-language READMEs, `docs/`, and `website/` where applicable) synchronized.

### Non-Goals
- Running paid/keyed LLM inference inside GitHub Actions CI (explicitly rejected by maintainer in favor of zero-cost cloud canary + local LLM execution).
- Auto-pushing branches, auto-opening PRs from CI bots, or auto-publishing GitHub Releases without explicit human instruction.
- Replacing `ultracode ralph run` or `ultracode_playwright` with single-session `/goal` or Desktop-only `opencode.browser`.

### Anti-Goals (Failure Conditions Even If Tests Pass)
- **Engineering Regression**: Removing headless isolated Playwright QA or upfront clarification before continuation, thereby regressing TUI, SSH, or `ralph` workflows below the `docs/ORIGIN_GOAL.md` bar.
- **Brittle Path Hardcoding in the Skill**: Writing fixed source paths or line numbers inside `SKILL.md` that rot when `packages/` or modules are reorganized.
- **Git Attribution Violation**: Any commit, script, or workflow template that adds `Co-authored-by` or any AI/bot author identity (`AGENTS.md` §3.1 hard rule).
- **Website Jargon Leakage**: Exposing internal filenames, JSONC keys, or CI script internals on everyday user-facing `website/` landing/guide pages (`docs/design/PRODUCT.md` Principle 3).

---

## 3. Constraints

1. **Repository & Git Discipline (`AGENTS.md`)**:
   - All commits use the maintainer's configured Git identity (`PlutoKeating <PlutoKeating@outlook.com>`) as sole author, with zero AI/agent co-author trailers.
   - Zero untracked or uncommitted non-ignored files upon completion.
   - Do not merge into `staging`/`production`/`main` or push to remote without explicit human authorization.
2. **Zero-Credential, Zero-Live-Model Automated Tests**:
   - Unit and integration tests in `packages/installer`, `packages/plugin-gui`, and `scripts/check-upstreams.ts` must never read personal credentials or invoke live AI models.
3. **Cross-Platform Parity**:
   - Every runtime change in `packages/installer` and `packages/config` must remain 100% compatible with Linux, macOS, and Windows (`x64` and `arm64`).
4. **6-Language Parity**:
   - Any user-facing UI copy added to `packages/plugin-gui/src/gui.tsx` and any version/capability baseline updated in root `README*.md` or `website/` must stay consistent across all 6 UN official languages (`en`, `zh`, `ar`, `fr`, `ru`, `es`).

---

## 4. Approaches Considered

### Approach A: Radical Replacement (Drop `@playwright/mcp` & `ultracode_checkpoint` in favor of OpenCode `v2.4.0` Built-ins)
- **What it does**: Deletes managed `@playwright/mcp` (`ultracode _mcp` and Chromium install) to rely solely on `opencode.browser`, and deletes `ultracode_checkpoint` to rely solely on `/goal`.
- **Trade-off**: Shrinks install footprint, **but fails our core bar**: `opencode.browser` has zero tools when OpenCode Desktop is not attached (breaking TUI, SSH, and 8-hour `ultracode ralph run` QA) and shares the user's persistent profile/extensions rather than an isolated mobile/desktop viewport sandbox; `/goal` forces manual slash invocation, tells the model *"do not stop to ask what to do next"*, and uses a tool-less `judge.txt` that cannot run tests or browser checks. **Rejected after `docs/ORIGIN_GOAL.md` & `anomalyco/opencode` source audit.**

### Approach B: Conservative Compatibility Only (Keep Everything As-Is, Patch Version Gate Only)
- **What it does**: Bumps `@opencode/plugin` to `2.4.0`, removes `minor > 3` warning, and adds a CI version watcher without upgrading `ultracode_checkpoint` or adopting `/automation`.
- **Trade-off**: Lowest short-term diff, **but leaves real defects intact**: `ultracode_checkpoint` remains a volatile in-memory `Map` with no stall protection, no Desktop pill visibility, and double-continuation collision risk when a user runs `/goal`; misses native OpenCode `v2.4.0` `/automation` synergy. **Rejected.**

### Approach C: Calibrated Core Preservation + Hardened Checkpoint + Dual-Mode Methodology Stewardship (Selected)
- **What it does**:
  1. Preserves isolated headless `@playwright/mcp` for `visual-evaluator` and `ralph` for outer Context Resets, while embracing `opencode.browser` and `/automation` in `UltraBuild`.
  2. Upgrades `ultracode_checkpoint` to durable `ctx.storage` + boot fencing + circuit breaker + `/goal` mutual-exclusion + Desktop `ComposerPill` visibility/clear row.
  3. Replaces static `minor > 3` warnings with V2 floor check + async-safe runtime contract probing.
  4. Ships the declarative 4-upstream baseline (`upstream-baseline.json`), zero-path-hardcoding `upstream-stewardship` Skill (with the Claude Code completeness rubric), deterministic `scripts/check-upstreams.ts` + live-host canary, `.github/workflows/upstream-canary.yml` (Issue-only reporting, zero branch pushes), and local OpenCode `v2.4.0` `/automation` recipe.
- **Why selected**: Achieves 100% OpenCode `v2.4.0+` compatibility, eliminates genuine "rough-shack" flaws in `ultracode_checkpoint` by matching/exceeding `opencode.goal`'s engineering durability while keeping upfront clarification + real subagent verification, and establishes an evergreen, zero-cost-in-CI upstream evolution loop.

---

## 5. Architecture & Detailed Decisions

### 5.1Maintainer-Confirmed Decisions
1. **Delivery Scope**: Deliver both OpenCode `v2.4.0` adaptation (including local machine upgrade) and the automated upstream stewardship mechanism in one cohesive cycle.
2. **Monitored Upstreams**: Track all 4 upstreams: `anomalyco/opencode` (CLI + `@opencode/plugin`), `obra/superpowers`, `@playwright/mcp`, and `Th0rgal/open-ralph-wiggum`.
3. **Execution Harness**: Dual-mode architecture sharing one repository Skill (`.opencode/skills/upstream-stewardship/SKILL.md`), usable both from local Coding Agent / native OpenCode `v2.4.0` `/automation` and triggered by cloud canary alerts.
4. **Cloud CI Boundary**: Cloud GitHub Actions performs **zero-token deterministic upstream polling + real latest `opencode` live-host canary verification only**; when drift or a new release is detected, it opens/updates a tracking Issue with structured evidence/diagnostics and **never pushes branches or commits**. LLM analysis and code repair happen locally via UltraCode invoking the Skill.
5. **Version Gate**: Enforce `major === 2 && >= 2.3.2` floor without hardcoded `minor > 3` false alarms; rely on dynamic runtime contract verification in `apply` and `doctor`.
6. **Completeness Bar**: Keep isolated headless `@playwright/mcp` (`visual-evaluator`) and `ralph`; harden `ultracode_checkpoint` and make it coexist cleanly with `/goal`; leverage native `v2.4.0` Desktop Browser and `/automation` without reinventing schedulers.

### 5.2 Technical Specification by Subsystem

#### A. Single Source of Truth: `packages/config/upstream-baseline.json` (Builder Call)
Create `packages/config/upstream-baseline.json` consumed both by `packages/installer/src/runtime.ts` (bundled at compile time by Bun) and by `scripts/check-upstreams.ts`:
```json
{
  "schema": 1,
  "updatedAt": "2026-11-23",
  "opencode": {
    "repo": "anomalyco/opencode",
    "minSupported": "2.3.2",
    "verifiedRelease": "2.4.0",
    "pluginSdkPackage": "@opencode/plugin",
    "pluginSdkVersion": "2.4.0"
  },
  "superpowers": {
    "repo": "obra/superpowers",
    "tag": "v7.0.2",
    "tarballUrl": "https://codeload.github.com/obra/superpowers/tar.gz/refs/tags/v7.0.2",
    "sha256": "a0bd5d862537ae2caa9a7b5546b7e597eeabda1b9ca8aa67abbbc967c9f2005e"
  },
  "playwrightMcp": {
    "npmPackage": "@playwright/mcp",
    "version": "0.0.86"
  },
  "ralph": {
    "repo": "Th0rgal/open-ralph-wiggum",
    "branch": "main",
    "versionLabel": "1.3.1",
    "commit": "53c87ded9fc329b452298f361145d17bf52cac09",
    "tarballUrl": "https://codeload.github.com/Th0rgal/open-ralph-wiggum/tar.gz/53c87ded9fc329b452298f361145d17bf52cac09",
    "sha256": "c7c77bd1ff288f157ed79711a3ac0d1982cbb7c5bd70d017a8308c6c45a3cc20"
  }
}
```
- Unit tests in `packages/installer/tests/` assert that `packages/plugin-gui/package.json`'s `@opencode/plugin` version and `components.ts` / `runtime.ts` constants match `upstream-baseline.json`, making silent drift impossible.

#### B. OpenCode Version Gate & Async Plugin Discovery (`packages/installer/src/opencode.ts`, `components.ts`)
1. **`assertSupportedOpenCode(version)`**:
   - Accept any `2.x.y` where `minor > 3 || (minor === 3 && patch >= 2)` with **zero `console.warn`**.
   - Throw a clear error for `major < 2` or `2.0.0`–`2.3.1` (`"OpenCode <version> is unsupported; install OpenCode V2 (2.3.2 or newer)."`).
   - Throw a clear major-boundary error for `major >= 3` (`"OpenCode <version> targets a new major contract (V<major>); run 'ultracode upgrade' for a compatible UltraCode release."`).
2. **Async Plugin Registry Polling in `components.ts` (PR `#63814` mitigation)**:
   - Because OpenCode `v2.4.0` loads plugins asynchronously in the background after startup, `/api/plugin` can return an empty `data: []` or omit local plugins for a brief window right after cold start.
   - Update `components.ts` to poll `opencode api get /api/plugin` up to 4 short attempts (e.g., 150ms backoff) only when `data` is empty or contains exclusively `source.type === "builtin"` while `config.plugins` is non-empty, remaining fast (single call) whenever the server is already warm or in test stubs.

#### C. Hardened `ultracode_checkpoint` + Official `/goal` Coexistence + Desktop Pill Control
1. **Durable Storage & Safety Invariants (`packages/config/opencode/conversation/server.js`)**:
   - Generate a per-process `bootID = crypto.randomUUID()` on plugin setup.
   - Store session checkpoint records in `ctx.storage` under key `checkpoint:<sessionID>`:
     `{ next: string, bootID: string, rounds: number, stalls: number, lastMilestone: string, updatedAt: number }`.
   - On `setup`, scan `ctx.storage.scan({ prefix: "checkpoint:" })` in background and clear any stale active checkpoints from a previous `bootID` (or if seen first in `experimental.idle` with mismatched `bootID`, delete and do not fire unexpectedly after a crash/restart).
   - **Prompt Hook (`ctx.session.hook("prompt")`)**: Any fresh user prompt immediately deletes `checkpoint:<sessionID>` (resets `rounds = 0`, `stalls = 0`) and emits `UltraCodeRpc` `changed` so UI stays live.
   - **Circuit Breakers (`MAX_CHECKPOINT_ROUNDS = 25`, `MAX_CHECKPOINT_STALLS = 3`)**:
     - When `ultracode_checkpoint` is called with non-empty `next`: if `next === existing.lastMilestone`, increment `stalls` (else reset `stalls = 0`). If `rounds >= 25` or `stalls >= 3`, clear the checkpoint and return a tool message instructing the agent to stop and report status/blockers to the user rather than looping indefinitely.
   - **Mutual Exclusion with Official `opencode.goal` (`/goal`)**:
     - Define the lightweight portable RPC descriptor `OpencodeGoalRpc = Rpc.define({ id: "opencode.goal", methods: { get: { input: ..., output: ... } } })`.
     - In `experimental.idle`: before admitting a synthetic continuation, check:
       1. No background job (`subagent`, `image`, `video`, `codemode`, `shell`) owned by `event.sessionID` is still running (`event.background.some(job => job.sessionID === event.sessionID)`).
       2. Query `await ctx.rpc(OpencodeGoalRpc).get({ sessionID: event.sessionID }).catch(() => null)`: if `goal?.status === "active"`, delete the redundant checkpoint and return immediately so official `/goal` owns the continuation cleanly without double-prompting.
2. **RPC & Desktop `ComposerPill` Visibility (`rpc.js`, `server.js`, `packages/plugin-gui/src/gui.tsx`)**:
   - Extend `UltraCodeRpc` backwards-compatibly:
     - `stateSchema` keeps `permissions`, `direction`, `version`, and adds optional `checkpoints?: Record<string, string>` (map of active `sessionID -> next milestone summary` for the current server process).
     - Add `clearCheckpoint` method (`input: { sessionID: string }`, `output: stateSchema`) so Desktop GUI can cancel a pending session milestone in one click.
   - In `packages/plugin-gui/src/gui.tsx` (upgraded to `@opencode/plugin@2.4.0`):
     - `ComposerPill`'s `show(input)` already receives `input.session` (`MountedSession`, where `input.session.id` is the session ID)!
     - When `state().checkpoints[input.session.id]` exists, append a 3rd contextual row in the `UltraCode` pill menu showing the active milestone (truncated cleanly) with a one-click clear action (localized across `en`, `zh`, `ar`, `fr`, `ru`, `es`)! When no checkpoint is queued on that session, the pill remains the exact crisp 2-row control (`Auto-approve` & `Ask on direction`).

#### D. Portable Upstream Stewardship Skill (`.opencode/skills/upstream-stewardship/`)
Following AgentSkills.io progressive disclosure (< 300 lines in `SKILL.md`, 1-level-deep `references/`):
- `.opencode/skills/upstream-stewardship/SKILL.md`:
  - **Trigger description**: Activates whenever the maintainer asks to check, audit, sync, upgrade, or adapt UltraCode to new releases of OpenCode, Superpowers, Playwright MCP, or Ralph, or to triage an `upstream-canary` Issue.
  - **Zero Hardcoded Code Paths**: Never names fragile internal line numbers; instead defines **6 mandatory steps**:
    1. **Run Deterministic Delta Probe**: Execute `bun run scripts/check-upstreams.ts --json` (or inspect the declarative `*baseline*.json`) to gather exact version/commit/tarball/SDK export deltas, then read upstream GitHub Release Notes / PRs / Changelogs / OpenAPI diffs for every changed upstream.
    2. **Dynamic Coupling Surface Discovery**: Search the repository dynamically (`grep`/`glob`) across 6 semantic coupling categories: (a) host version parsers & gates, (b) host CLI subcommand invocations (`api`, `debug`, `serve`, `upgrade`, install URLs), (c) `@opencode/plugin` Server/TUI/GUI/RPC SDK surfaces, (d) agent frontmatter permissions & built-in tool interactions, (e) pinned runtime archives/hashes/lockfiles, and (f) multilingual docs & version badges.
    3. **Claude Code Bar Completeness Gate**: Read `references/completeness-rubric.md` (and `docs/ORIGIN_GOAL.md` + `docs/RESEARCH.md`) whenever upstream introduces an overlapping feature. Evaluate across 5 mandatory dimensions (**Cross-Surface Coverage**, **Clean-Room Isolation**, **Non-Claude Model Tool Ergonomics**, **Tool-Backed Independent Verification**, **Upfront Clarification Compatibility**). Never delete an UltraCode mechanism unless the upstream feature matches or exceeds all 5 dimensions; otherwise fuse or harden.
    4. **Impact Classification**: Classify each upstream delta into `COMPATIBLE_BUMP` (lock/baseline + SDK rebuild + verification), `ADAPTATION_REQUIRED` (bounded code/hook/type adaptation), or `ARCHITECTURAL_DECISION` (material product-direction trade-off -> stop and ask maintainer via `question` card or RFC).
    5. **Surgical Implementation & Clean-Room Live Verification**: Update baseline, lockfiles, code, tests, and 6-locale docs; run `bun run scripts/check-upstreams.ts --verify-live` against the **real** latest `opencode` binary in an isolated `HOME` plus full `plugin-gui`, `installer`, and `website` test/check/build suites.
    6. **Methodology Self-Check & Git Hygiene**: If a new coupling category appeared, propose updating `references/completeness-rubric.md`; commit cleanly using only the maintainer's Git identity (`AGENTS.md`).
- `.opencode/skills/upstream-stewardship/references/completeness-rubric.md`:
  - Concise engineering rubric + concrete worked precedents (`opencode.browser` vs `ultracode_playwright`, `opencode.goal` vs `ultracode_checkpoint`, `tools.automation.*` vs custom daemons) + local OpenCode `v2.4.0` `/automation` setup snippet (`tools.automation.create` with `type: "code"` zero-token polling).

#### E. Deterministic Probe, Live-Host Canary & GitHub Workflow (`scripts/check-upstreams.ts` + `.github/workflows/upstream-canary.yml`)
1. **`scripts/check-upstreams.ts`** (pure Bun/TypeScript, zero external dependencies, fully unit-tested against local HTTP/CLI mocks):
   - Reads `packages/config/upstream-baseline.json`.
   - Fetches latest metadata (respecting optional `GITHUB_TOKEN` to avoid rate limits, working unauthenticated locally as well):
     - `anomalyco/opencode` latest GitHub Release tag + npm `@opencode/plugin` `latest` dist-tag & `exports` keys diff.
     - `obra/superpowers` latest GitHub Release tag + codeload tarball SHA-256 (computed only when tag differs).
     - `@playwright/mcp` npm `latest` dist-tag.
     - `Th0rgal/open-ralph-wiggum` default branch HEAD commit + commit summary.
   - Modes:
     - `--json` / `--markdown`: Emits structured delta report (exit `0` when up-to-date, or `--fail-on-outdated` exit `10` when updates exist).
     - `--verify-live`: Runs a clean-room live-host contract test against an installed `opencode` binary in a temporary directory (`mkdtemp`):
       1. Copies `packages/plugin-gui` to temp sandbox, installs `@opencode/plugin@<latest-or-target>`, runs `tsc --noEmit` & `vite build` to catch experimental GUI SDK breaking changes immediately!
       2. Builds `packages/installer` (`ultracode-current`), runs `ultracode apply` & `ultracode doctor` in an isolated `HOME`/`OPENCODE_CONFIG_DIR`/`ULTRACODE_HOME` (with `ULTRACODE_SKIP_BROWSER=1` option for fast CI or full browser when requested), verifying `ultracode-conversation` (`server`, `tui`, `rpc`, `gui` features), `superpowers`, and all 7 agents register cleanly on the real latest `opencode` server!
2. **`.github/workflows/upstream-canary.yml`**:
   - Triggers: `schedule` (daily `0 6 * * *`) + `workflow_dispatch`.
   - Permissions: `contents: read`, `issues: write` (**zero write access to code/branches/PRs, zero LLM API keys**).
   - Steps:
     1. Checkout repo (`persist-credentials: false`).
     2. Install Bun `1.3.14` + install latest official OpenCode V2 (`curl -fsSL https://opencode.ai/v2/install | bash`).
     3. Run `bun run scripts/check-upstreams.ts --verify-live --markdown > canary-report.md` (capturing upstream version deltas + live `opencode` contract canary + `@opencode/plugin@latest` GUI build compatibility).
     4. Upload `canary-report.md` + JSON diagnostics as workflow artifact.
     5. Issue lifecycle step (via `gh issue` using `GITHUB_TOKEN`):
        - If updates exist OR `--verify-live` failed: find open issue with label `upstream-sync` (creating label idempotently if absent); create a new Issue or update the existing Issue body/comment when the delta fingerprint changed, including exact upstream release URLs, GUI/runtime canary results, and the one-line local command (`ultracode` prompt invoking `upstream-stewardship`).
        - If all 4 upstreams match `upstream-baseline.json` AND `--verify-live` passed: if an open `upstream-sync` Issue exists, comment that baseline is now aligned & verified and close it automatically!

---

## 6. What's Left to the Builder

- Exact storage key naming and cleanup helper layout inside `packages/config/opencode/conversation/` (provided `settings.js` file-based modes remain 100% backwards-compatible and `checkpoint:<sessionID>` uses `ctx.storage`).
- Exact concise copy of the 6-language `ComposerPill` checkpoint row labels in `packages/plugin-gui/src/gui.tsx` (must stay 2–4 words matching existing industrial monochrome tone).
- Test fixture organization for `scripts/check-upstreams.ts` (e.g., `packages/installer/tests/upstream.test.ts` using local `node:http` mock servers and temporary directories, never hitting live network in `bun test`).
- Version bump across `packages/installer/src/install.ts`, `packages/installer/package.json`, `packages/plugin-gui/package.json`, `packages/config/opencode/conversation/package.json` & `server.js`, `docs/CHANGELOG.md`, `docs/API.md`, and root `README*.md` (`1.1.0` recommended as a cohesive minor feature + `v2.4.0` compatibility update, while keeping provenance notes accurate).
