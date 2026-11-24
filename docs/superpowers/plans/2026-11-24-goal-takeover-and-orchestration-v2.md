# UltraCode Goal Engine 2.0, Native Overlap Takeover & Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify `/goal` and milestone continuation into UltraCode's own evidence-gated, compaction-anchored Goal Engine across all surfaces while hiding/overriding overlapping OpenCode built-ins (`opencode.goal`, `opencode.plan`, `Build`/`Plan` primary modes, `/review`), closing `UltraPlan` ↔ `Ralph` artifact gaps, preserving full engineering/web-search prompts, and adding first-use model-routing onboarding recommendations.

**Architecture:** `managed.ts` and `components.ts` reversibly disable built-in `opencode.goal` and `opencode.plan` while `ultracode-conversation` (`server.js`, `rpc.js`, `tui.tsx`, and `packages/plugin-gui/src/gui.tsx`) owns `/goal`, `/review`, `/setup-models`, hidden `build`/`plan` agent transforms, silent `OpencodeGoalRpc` null-stubbing (hiding stock Goal pills without retry loops), durable `goal:<sessionID>` state, zero-token deterministic completion gates on `.opencode/ultracode/FEATURE_LIST.json` & `QA_REPORT.md`, and cache-safe post-compaction goal anchoring. `planner.md`, `orchestrator.md`, and `ralph.ts` complete the `UltraPlan` → `/goal` / `ralph` artifact and worktree loop, while `setup-models` / `/setup-models` + one-time onboarding write user-approved `agents.<role>.model` preferences into `opencode.jsonc` without touching managed `agents/*.md` SHA-256 hashes.

**Tech Stack:** Bun (`1.3.x`), TypeScript (`5.9`), `@opencode/plugin` (`2.4.1` Server, TUI, RPC, SolidJS GUI + Vite), `jsonc-parser`, Astro Starlight (6 UN locales: `en`, `zh`, `ar`, `fr`, `ru`, `es`).

**Spec:** Embedded in Section 0 of this document (to be mirrored to `docs/superpowers/specs/2026-11-24-goal-takeover-and-orchestration-v2-design.md` and `docs/superpowers/plans/2026-11-24-goal-takeover-and-orchestration-v2.md` in Task 1 once switched from read-only `UltraPlan` to `UltraBuild`).

## Global Constraints

- **Branch & Git Attribution (`AGENTS.md` §3–§4):** All implementation work MUST run on a dedicated local feature branch (`feature/goal-engine-v2`), NEVER directly on `staging`/`production`, and NEVER pushed to remote without explicit human authorization. Every commit MUST use the human maintainer's configured Git identity (`git config user.name` / `user.email`) as sole author — **zero** `Co-authored-by` or agent trailers. `git status --short` MUST report zero untracked or uncommitted non-ignored files after each task.
- **Review Reports Archival:** Commit `docs/reviews/` (`1.md`, `2.md`, `3.md`, `4.md`, `5.png`) into the repository in Task 1 as historical architectural audit records.
- **Overlap & Conflict Principle:** Wherever OpenCode's non-core convenience features overlap or conflict with UltraCode's decisive Goal Engineering capabilities (`/goal` loop & stock Goal pill, raw `Build`/`Plan` primary modes, same-session `/review`), UltraCode's implementation MUST take over and hide/override OpenCode's version cleanly while restoring stock behavior on `ultracode uninstall`.
- **Prompt Preservation Hard Rule:** Keep 100% of existing `packages/config/opencode/agents/orchestrator.md` behavioral instructions intact — especially the Chinese paragraphs requiring thorough web search across GitHub/OSS communities/blogs/forums/tutorials to avoid reinventing the wheel in ALL scenarios, plus upfront brainstorming with multi-choice `question` cards. Only additive multi-agent ownership/artifact guidance may be appended.
- **No Runtime Model Router:** Do NOT build a dynamic runtime model-switching router. Implement first-install / first-use onboarding (`ultracode setup-models`, `/setup-models`, and a strictly once-only first-session hint) that inspects existing configured models and writes optional `agents.<role>.model` preferences into `opencode.jsonc` via comment-preserving JSONC merge without modifying `agents/*.md`.
- **Zero-Credential, Zero-Live-LLM Tests & 6-Locale Parity:** Automated tests (`bun test`) must never read personal credentials or invoke live AI models. All user-facing Desktop GUI strings (`gui.tsx`), root `README*.md`, and `website/` docs updates must maintain 6-language parity (`en`, `zh`, `ar`, `fr`, `ru`, `es`) without leaking internal filenames or JSONC keys onto everyday website guide pages.

## Review Focus

1. **Plugin deduplication shift in `components.ts`:** Adding `"-opencode.goal"` and `"-opencode.plan"` to `managed.plugins` shifts array indices; `components.ts` must match negation strings by value rather than assuming index `0 -> ultracode-conversation` and `1 -> superpowers`, or `ultracode sync` will duplicate plugin paths.
2. **Stock Desktop `Goal` pill retry storm:** Disabling server `opencode.goal` alone causes OpenCode Desktop's built-in `builtins.goal` renderer (`packages/gui-plugins/src/goal/renderer.tsx`) to hit `rpc.unavailable` and schedule background retry timers; `ultracode-conversation` must register `OpencodeGoalRpc` (`id: "opencode.goal"`) returning `null` so stock TUI/Desktop Goal indicators stay hidden with zero retries.
3. **Clarification `question` lifecycle during active `/goal`:** OpenCode's `question` tool suspends inside `execute` while waiting for the user: if the user answers the card (`execute.after` `status === "completed"`), `awaitingUserQuestion` must immediately reset to `false` so subsequent idle continuation works; only if `question` fails/cancels (`status === "error"`) does `awaitingUserQuestion` remain `true` until the next user `prompt`, and a user `prompt` on an active `/goal` must NEVER delete `goal:<sessionID>`.
4. **Premature completion bypass vs infinite gate loop:** If `.opencode/ultracode/FEATURE_LIST.json` has `passes: false` items and the model repeatedly stops without calling tools or fixing the failing feature, the deterministic evidence gate must block `complete` initially AND trip the 3-stall circuit breaker into `status: "paused"` instead of looping 60 times with zero progress.
5. **Non-interactive `curl | bash` / `ralph` onboarding safety:** First-install CLI output and first-session model-routing onboarding must never block non-TTY `stdin` (`curl | bash`), automated `doctor` checks, child subagent sessions (`session.parentID`), or unattended `ultracode ralph run` iterations.

---

## 0. Architectural Specification & File Map

### File Responsibilities
- `packages/installer/src/managed.ts` — Adds `"-opencode.goal"` and `"-opencode.plan"` before `conversation` and `superpowers` in `managedConfig(paths).plugins`, and sets `agents: { build: { hidden: true }, plan: { hidden: true } }` so `ConfigAgentPlugin` (`post` phase) hides stock primary agents reversibly while leaving user `agents.<role>.model` preferences untouched on `sync` and `uninstall`.
- `packages/installer/src/components.ts` — Handles negation plugin directives (`-opencode.*`) cleanly alongside path-based plugins (`ultracode-conversation`, `superpowers`) during `/api/plugin` deduplication.
- `packages/installer/src/model-onboarding.ts` *(new)* — Pure, testable heuristic recommender (`recommendRoleModels(models)`) + JSONC writer (`applyRoleModelPreferences(configPath, mapping)`) + interactive TTY `runSetupModelsCli(paths)` for `ultracode setup-models`.
- `packages/installer/src/cli.ts` & `packages/installer/src/install.ts` — Routes `ultracode setup-models` and prints a non-blocking 1-line tip after fresh `apply` when no `agents.*.model` overrides exist.
- `packages/installer/src/ralph.ts` — Parses `--max-iterations <n>` / `-n <n>` without duplicating default `50`, supports `--worktree <name>` auto-creation/reuse of linked Git worktrees, and supports `--init` to scaffold `.ralph/ralph-tasks.md`, `.opencode/ultracode/FEATURE_LIST.json`, and `.opencode/ultracode/SPRINT_CONTRACT.md`.
- `packages/config/opencode/conversation/rpc.js` — Extends `UltraCodeRpc` (`stateSchema` adds `goals` map; adds `pauseGoal`, `resumeGoal`, `clearGoal` methods while keeping `checkpoints` + `clearCheckpoint` backwards-compatible).
- `packages/config/opencode/conversation/goal-gate.js` *(new)* — Focused module for inspecting `.opencode/ultracode/FEATURE_LIST.json`, `.opencode/ultracode/QA_REPORT.md`, and `.ralph/ralph-tasks.md` deterministically, validating `ultracode_task_graph` transitions, and building cache-safe `<ultracode_goal_anchor>` blocks.
- `packages/config/opencode/conversation/onboarding.js` *(new)* — Pure model-tier recommendation helper shared by `/setup-models` and one-time `$ULTRACODE_HOME/onboarding.json` state check.
- `packages/config/opencode/conversation/server.js` — Implements unified `goal:<sessionID>` engine, `/goal`, `/review`, `/setup-models`, `ultracode_task_graph`, `ctx.agent.transform` (`build`/`plan` `hidden: true` + `UltraBuild` default), `UltraPlan ↔ UltraBuild` `<system-update>` transition reconciliation, `OpencodeGoalRpc` null-stub, `question`-aware idle gating, interrupt/restart -> `paused` transitions, and post-compaction anchor injection.
- `packages/config/opencode/conversation/tui.tsx` — Renders live session Goal status in TUI footer slot and adds `Pause / Resume Goal` + `Clear Goal` Command Palette actions.
- `packages/plugin-gui/src/gui.tsx` — Upgrades Desktop `UltraCode` `ComposerPill` with 6-locale Goal status, objective/milestone preview, and one-click `Pause` / `Resume` / `Clear` controls (while stock OpenCode `Goal` pill remains hidden).
- `packages/config/opencode/agents/planner.md` & `orchestrator.md` — Grants `UltraPlan` edit access to `.opencode/ultracode/**` and `.ralph/**`; preserves 100% of `orchestrator.md` (including mandatory community web search & upfront multi-choice `question` cards) while appending `Owned Files` / optional `worktree` / `FEATURE_LIST.json` evidence coordination rules.
- `packages/config/opencode/ralph/templates/FEATURE_LIST.json` — Adds backwards-compatible optional `dependencies`, `ownedFiles`, `status`, and `evidence` fields.

---

### Task 1: Feature Branch Setup, Review Reports Archival & Spec/Plan Mirroring

**Files:**
- Commit existing: `docs/reviews/1.md`, `docs/reviews/2.md`, `docs/reviews/3.md`, `docs/reviews/4.md`, `docs/reviews/5.png`
- Create: `docs/superpowers/specs/2026-11-24-goal-takeover-and-orchestration-v2-design.md`
- Create: `docs/superpowers/plans/2026-11-24-goal-takeover-and-orchestration-v2.md`

**Interfaces:**
- Consumes: `.opencode/plans/2026-11-24-goal-takeover-and-orchestration-v2.md`
- Produces: Clean `feature/goal-engine-v2` Git branch baseline with archived expert audits and committed spec/plan artifacts.

- [ ] **Step 1: Create and switch to `feature/goal-engine-v2`**

Run: `git checkout -b feature/goal-engine-v2`
Expected: `Switched to a new branch 'feature/goal-engine-v2'`

- [ ] **Step 2: Commit `docs/reviews/` into the repository**

```bash
git add docs/reviews/1.md docs/reviews/2.md docs/reviews/3.md docs/reviews/4.md docs/reviews/5.png
git commit -m "docs(reviews): archive external architectural audit reports and boundary diagram"
```

- [ ] **Step 3: Mirror the approved design summary and implementation plan under `docs/superpowers/` and commit**

Copy `.opencode/plans/2026-11-24-goal-takeover-and-orchestration-v2.md` to `docs/superpowers/plans/2026-11-24-goal-takeover-and-orchestration-v2.md` and write the concise design spec to `docs/superpowers/specs/2026-11-24-goal-takeover-and-orchestration-v2-design.md`.

```bash
git add docs/superpowers/specs/2026-11-24-goal-takeover-and-orchestration-v2-design.md docs/superpowers/plans/2026-11-24-goal-takeover-and-orchestration-v2.md
git commit -m "docs(plans): add Goal Engine 2.0 overlap takeover and onboarding spec and plan"
```

- [ ] **Step 4: Verify clean working tree and sole human commit authorship**

Run: `git status --short && git log -n 2 --format='%an <%ae>%n%B'`
Expected: Empty `git status --short` output; sole human author with zero `Co-authored-by` trailers.

---

### Task 2: Reversible Host Overlap Suppression (`-opencode.goal`, `-opencode.plan`) in Installer Config

**Files:**
- Modify: `packages/installer/src/managed.ts:5-33`
- Modify: `packages/installer/src/components.ts:51-115`
- Modify: `packages/installer/src/install.ts` (doctor checks if plugin assertions inspect `managed.plugins`)
- Test: `packages/installer/tests/config.test.ts`, `packages/installer/tests/install.test.ts`

**Interfaces:**
- Consumes: `Paths` from `packages/installer/src/paths.ts`
- Produces: `managedConfig(paths).plugins` returning `["-opencode.goal", "-opencode.plan", "<config>/ultracode/conversation", "<runtime>/superpowers"]`; `components(paths, config)` deduplicating negation directives by exact string and local plugins by resolved ID without index shift bugs; `uninstall` cleanly removing `"-opencode.goal"` and `"-opencode.plan"` from `opencode.jsonc`.

- [ ] **Step 1: Write failing tests in `packages/installer/tests/config.test.ts` and `packages/installer/tests/install.test.ts`**

```ts
test("managedConfig disables overlapping built-in opencode.goal and opencode.plan plugins and deduplicates without index shift", async () => {
  const paths = resolvePaths({ home: root, configDir: join(root, "opencode"), dataDir: join(root, "ultracode"), binDir: join(root, "bin") });
  const existing = {
    plugins: ["-opencode.goal", join(paths.config, "ultracode", "conversation")],
  };
  const { managed } = await components(paths, existing);
  expect(managed.plugins).toEqual(["-opencode.plan", join(paths.runtime, "superpowers")]);
});

test("apply adds -opencode.goal and -opencode.plan while preserving user plugins, and uninstall removes them cleanly", async () => {
  // Verify opencode.jsonc has "-opencode.goal" and "-opencode.plan" after apply,
  // and neither remains after uninstall while user custom plugins stay intact.
});
```

- [ ] **Step 2: Run installer tests to verify failure**

Run: `bun test --cwd packages/installer tests/config.test.ts tests/install.test.ts`
Expected: FAIL (`managed.plugins` lacks `"-opencode.goal"` / `"-opencode.plan"`).

- [ ] **Step 3: Update `managedConfig` in `packages/installer/src/managed.ts` and plugin deduplication in `packages/installer/src/components.ts` / `install.ts`**

In `managed.ts`, prepend `"-opencode.goal"` and `"-opencode.plan"` to `plugins` and add `agents: { build: { hidden: true }, plan: { hidden: true } }`. In `components.ts`, map each entry in `ours` explicitly: if `entry.startsWith("-")`, keep it unless `choices` already contains the identical string; otherwise resolve its target ID (`"ultracode-conversation"` or `"superpowers"`) by path rather than array index `i`. Ensure `doctor` in `install.ts` checks active status only for positive plugins (`ultracode-conversation`, `superpowers`) and verifies `opencode.goal` is not active.

- [ ] **Step 4: Run installer test suite and typecheck**

Run: `bun test --cwd packages/installer && bun run --cwd packages/installer check`
Expected: PASS (0 errors).

- [ ] **Step 5: Commit**

```bash
git add packages/installer/src/managed.ts packages/installer/src/components.ts packages/installer/src/install.ts packages/installer/tests/config.test.ts packages/installer/tests/install.test.ts
git commit -m "feat(installer): reversibly disable built-in opencode.goal and opencode.plan overlaps"
```

---

### Task 3: Deterministic Evidence Gate & Structured Task Graph Module (`goal-gate.js`)

**Files:**
- Create: `packages/config/opencode/conversation/goal-gate.js`
- Modify: `packages/config/opencode/ralph/templates/FEATURE_LIST.json`
- Modify: `packages/installer/src/assets.ts` & `packages/installer/src/install.ts` (embed and install `goal-gate.js` into `<config>/ultracode/conversation/goal-gate.js`)
- Test: `packages/installer/tests/conversation.test.ts`

**Interfaces:**
- Produces in `packages/config/opencode/conversation/goal-gate.js`:
  - `evaluateWorkspaceGate(directory: string): Promise<{ ok: boolean; fingerprint: string; blockers: string[]; summary: { totalFeatures: number; passedFeatures: number; pendingFeatureIDs: string[]; qaVerdict?: string; uncheckedRalphTasks: number } }>`
  - `mutateTaskGraph(directory: string, input: { action: "status" | "init" | "claim" | "verify" | "block"; featureID?: string; description?: string; category?: string; dependencies?: string[]; ownedFiles?: string[]; steps?: string[]; verification?: string; executedCommand?: string; evidenceSummary?: string; reviewerVerdict?: "APPROVE" | "REJECT"; reason?: string }): Promise<{ ok: boolean; content: string }>`
  - `buildGoalAnchor(goal: { objective: string }): string` (strictly round- and timestamp-invariant so prompt-cache prefixes stay warm across steps)

- [ ] **Step 1: Write failing unit tests in `packages/installer/tests/conversation.test.ts` for `evaluateWorkspaceGate`, `mutateTaskGraph`, and `buildGoalAnchor`**

```ts
test("mutateTaskGraph rejects marking a feature verified without executedCommand and evidenceSummary, and detects overlapping ownedFiles across in_progress features", async () => {
  const resBad = await mutateTaskGraph(workDir, { action: "verify", featureID: "F-001", executedCommand: "", evidenceSummary: "" });
  expect(resBad.ok).toBe(false);
  expect(resBad.content).toContain("executedCommand");

  await mutateTaskGraph(workDir, { action: "claim", featureID: "F-001", ownedFiles: ["src/auth/**"] });
  const conflict = await mutateTaskGraph(workDir, { action: "claim", featureID: "F-002", ownedFiles: ["src/auth/login.ts"] });
  expect(conflict.ok).toBe(false);
  expect(conflict.content).toContain("F-001");
});

test("evaluateWorkspaceGate blocks completion when FEATURE_LIST.json has passes:false, QA_REPORT.md has REJECT/FAIL, or ralph-tasks.md has unchecked items", async () => {
  const gate = await evaluateWorkspaceGate(workDir);
  expect(gate.ok).toBe(false);
  expect(gate.blockers.join("\n")).toContain("F-001");
});
```

- [ ] **Step 2: Run `conversation.test.ts` to verify failure**

Run: `bun test --cwd packages/installer tests/conversation.test.ts`
Expected: FAIL (`Cannot find module './goal-gate.js'`).

- [ ] **Step 3: Implement `goal-gate.js`, update `FEATURE_LIST.json` template, and register `goal-gate.js` in `assets.ts` & `install.ts`**

- `evaluateWorkspaceGate(directory)` inspects:
  1. `.opencode/ultracode/FEATURE_LIST.json` (if present): flags features where `passes !== true` OR (`status === "verified"` / `passes === true` when `evidence` object exists with empty `executedCommand`).
  2. `.opencode/ultracode/QA_REPORT.md` (if present): flags overall verdict `REJECT` or table/list lines marking hard criteria as `FAIL` without a subsequent `APPROVE` verdict.
  3. `.ralph/ralph-tasks.md` (if present): counts top-level `- [ ]` lines.
  Returns deterministic `fingerprint` so `server.js` can detect 3 identical gate-failure stalls.
- `mutateTaskGraph(directory, input)` atomically reads/writes `.opencode/ultracode/FEATURE_LIST.json`, enforces dependency readiness and non-overlapping `ownedFiles` (glob/prefix overlap check) across `in_progress` items on `claim`, and requires non-empty `executedCommand` + `evidenceSummary` on `verify`.
- Register `goal-gate.js` in `packages/installer/src/assets.ts` and `install.ts` managed conversation file list so standalone builds embed and sync it cleanly.

- [ ] **Step 4: Run installer tests and typecheck**

Run: `bun test --cwd packages/installer tests/conversation.test.ts && bun run --cwd packages/installer check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/config/opencode/conversation/goal-gate.js packages/config/opencode/ralph/templates/FEATURE_LIST.json packages/installer/src/assets.ts packages/installer/src/install.ts packages/installer/tests/conversation.test.ts
git commit -m "feat(conversation): add deterministic workspace evidence gate and task graph validator"
```

---

### Task 4: Unified Goal Engine 2.0, `/goal` & `/review` Takeover, Primary Agent Hiding & Compaction Anchoring (`rpc.js` & `server.js`)

**Files:**
- Modify: `packages/config/opencode/conversation/rpc.js`
- Modify: `packages/config/opencode/conversation/server.js`
- Test: `packages/installer/tests/conversation.test.ts`

**Interfaces:**
- `UltraCodeRpc` (`rpc.js`):
  - `goalEntrySchema`: `{ id: string, objective: string, status: "active" | "paused" | "complete", nextMilestone?: string, reason?: string, rounds: number, maxRounds: number, updatedAt: number }`
  - `stateSchema`: `{ permissions, direction, version, checkpoints: Record<string, string>, goals: Record<string, GoalEntry> }`
  - Methods: `getState`, `setMode`, `toggleMode`, `clearCheckpoint`, `pauseGoal({ sessionID })`, `resumeGoal({ sessionID })`, `clearGoal({ sessionID })`
- `server.js` exports `MAX_GOAL_ROUNDS = 60`, `MAX_CHECKPOINT_ROUNDS = 60`, `MAX_CHECKPOINT_STALLS = 3`, `OpencodeGoalRpc`, and default plugin `{ id: "ultracode-conversation", setup(ctx) }`.

- [ ] **Step 1: Write failing tests in `packages/installer/tests/conversation.test.ts` covering all Goal Engine 2.0 & Review Focus invariants**

Add tests verifying:
1. `/goal <objective>` creates `goal:<sessionID>` (`status: "active"`), sets untitled session title, respects `direction: "manual"` (clarify consequential ambiguity first via `question` card + research community prior art) vs `direction: "auto"` / `--auto`.
2. `OpencodeGoalRpc` is registered on `ctx.rpc.register` with `id: "opencode.goal"` and `get({ sessionID })` always returns `null` so stock OpenCode Goal pills stay hidden without `rpc.unavailable` retries.
3. `ctx.agent.transform` marks `"build"` and `"plan"` `hidden = true` when present (complementing `managed.ts` `agents.{build,plan}.hidden = true` applied in `ConfigAgentPlugin` `post` phase without calling `editor.default("UltraBuild")` before `post` loads `UltraBuild.md`); switching from `UltraPlan` to `UltraBuild` injects a `<system-update>` clearing `UltraPlan`'s read-only restriction.
4. `question` tool lifecycle: `execute.before` sets `awaitingUserQuestion = true`; if the user answers the `question` card (`execute.after` `status === "completed"`), `awaitingUserQuestion` immediately resets to `false` so subsequent idle continuation proceeds; if dismissed/errored (`status === "error"`), `awaitingUserQuestion` stays `true` so `experimental.idle` does NOT loop while waiting, and the user's subsequent `prompt` reply keeps `goal.status === "active"` (resetting `stalls = 0` and `awaitingUserQuestion = false`)!
5. Server restart (`newServerProcess: true`) converts previously `active` explicit `/goal` entries into `status: "paused"` (not deleted!), and `/goal resume` / `UltraCodeRpc.resumeGoal` resumes them under the new `BOOT_ID`.
6. User interrupt event (`session.execution.interrupted` with `reason: "user"`) transitions `active` goal to `status: "paused"`.
7. Premature completion blocked by `evaluateWorkspaceGate`: when `nextMilestone` is empty on idle while `.opencode/ultracode/FEATURE_LIST.json` has `passes: false`, `server.js` injects a synthetic continuation naming the pending feature IDs; after 3 identical gate-blocker rounds without progress, it pauses the goal with a circuit-breaker reason instead of looping forever.
8. Post-compaction `context` hook: when `goal.status === "active"` and `event.messages` lacks `<ultracode_goal_anchor>` / `<objective>`, splices the anchor at index `Math.min(1, event.messages.length)` without mutating the last message.
9. `/review` command dispatches an independent `ultracode/reviewer` (and `ultracode/visual-evaluator` when UI applies) verification prompt rather than self-reviewing inline.

- [ ] **Step 2: Run `conversation.test.ts` to verify failure**

Run: `bun test --cwd packages/installer tests/conversation.test.ts`
Expected: FAIL on newly added Goal Engine 2.0 assertions.

- [ ] **Step 3: Implement `rpc.js` and `server.js` upgrades**

- Update `rpc.js` with `goals`, `pauseGoal`, `resumeGoal`, and `clearGoal` while maintaining `checkpoints` (mapped from active `nextMilestone || objective`) and `clearCheckpoint` for full backwards compatibility.
- In `server.js`:
  - Register `OpencodeGoalRpc` (`id: "opencode.goal"`, `methods.get: async () => null`, `events: { changed: ... }`) alongside `UltraCodeRpc`.
  - Register `ctx.agent.transform` hiding `"build"` and `"plan"` and setting default `"UltraBuild"`, plus `UltraPlan` exit `<system-update>` reconciliation in `context` / `event.subscribe`.
  - Register `/goal`, `/review`, `/approvals`, `/direction` in `ctx.command.transform`.
  - Register `ultracode_model`, `ultracode_checkpoint` (updating unified `goal:<sessionID>`), and `ultracode_task_graph` (delegating to `mutateTaskGraph` using the session's directory) in `ctx.tool.transform`.
  - Track `question` tool lifecycle via `ctx.tool.hook("execute.before")` (`awaitingUserQuestion = true`) and `ctx.tool.hook("execute.after")` (reset `awaitingUserQuestion = false` when `event.status === "completed"`, keep `true` when `event.status === "error"` until next user `prompt`).
  - Subscribe to `session.execution.interrupted`, `session.execution.failed`, and `session.deleted` via `ctx.event.subscribe` (guarded with optional chaining for lightweight test mocks) to pause interrupted/failed active goals and delete removed sessions' storage.
  - Implement two-layer `experimental.idle` continuation + `evaluateWorkspaceGate` completion check + 3-stall circuit breaker + cache-safe round-invariant `<ultracode_goal_anchor>` splicing at `event.messages[Math.min(1, event.messages.length)]` in `context` hook (plus objective context in `compaction` hook).

- [ ] **Step 4: Run all conversation and installer tests**

Run: `bun test --cwd packages/installer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/config/opencode/conversation/rpc.js packages/config/opencode/conversation/server.js packages/installer/tests/conversation.test.ts
git commit -m "feat(conversation): unify /goal engine, hide host overlaps, and enforce deterministic evidence gates"
```

---

### Task 5: UltraCode Desktop `ComposerPill` & TUI Goal Controls (6 UN Locales)

**Files:**
- Modify: `packages/plugin-gui/src/gui.tsx`
- Modify: `packages/config/opencode/conversation/tui.tsx`
- Modify: `packages/config/opencode/conversation/gui-experimental.cjs` (rebuilt via `packages/plugin-gui`)
- Test: `packages/installer/tests/conversation.test.ts` (RPC + state normalization assertions) & `bun run --cwd packages/plugin-gui check && build`

**Interfaces:**
- Consumes: `UltraCodeRpc` (`goals`, `pauseGoal`, `resumeGoal`, `clearGoal`) from `packages/config/opencode/conversation/rpc.js`
- Produces: Rebuilt `gui-experimental.cjs` and updated `tui.tsx` showing UltraCode Goal status (`active` / `paused` / `complete`), truncated objective/milestone, and one-click `Pause` / `Resume` / `Clear` across `en`, `zh`, `ar`, `fr`, `ru`, `es`.

- [ ] **Step 1: Add localized i18n keys and Goal pill/palette controls in `packages/plugin-gui/src/gui.tsx` and `packages/config/opencode/conversation/tui.tsx`**

- In `gui.tsx`:
  - Normalize `goals` from `UltraCodeRpc` state (`id`, `objective`, `status`, `nextMilestone`, `reason`, `rounds`, `maxRounds`).
  - Add concise 6-locale keys (`en`, `zh`, `ar`, `fr`, `ru`, `es`) for `pill.goal.active`, `pill.goal.paused`, `pill.goal.complete`, `pill.pause`, `pill.resume`, `pill.clear`, `command.goal.pause`, `command.goal.resume`, `command.goal.clear`.
  - When `current.goals[sessionID]` exists on `ComposerPill`: set pill `tone` (`"success"` when `complete`, `"warning"` when `paused`, `undefined` when `active`), update pill `label` (`UltraCode · <rounds>/<maxRounds>` when `active`), and show contextual rows for the Goal objective/milestone plus **Pause / Resume** and **Clear** actions calling `pauseGoal` / `resumeGoal` / `clearGoal`! (Fallback to `checkpoints[sessionID]` row if only a bare checkpoint string is present.)
- In `tui.tsx`:
  - Subscribe to `UltraCodeRpc` `getState` + `changed` events so `home.footer.status` / `prompt.footer.status` reflects active/paused Goal status concisely, and add `UltraCode · Pause/Resume Goal` and `UltraCode · Clear Goal` commands in the `UltraCode` palette group.

- [ ] **Step 2: Typecheck and build `packages/plugin-gui` and sync `gui-experimental.cjs`**

Run: `bun run --cwd packages/plugin-gui check && bun run --cwd packages/plugin-gui build`
Expected: PASS; `packages/config/opencode/conversation/gui-experimental.cjs` updated cleanly.

- [ ] **Step 3: Run installer tests and typecheck**

Run: `bun test --cwd packages/installer && bun run --cwd packages/installer check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/plugin-gui/src/gui.tsx packages/config/opencode/conversation/tui.tsx
git commit -m "feat(ui): surface unified Goal controls in UltraCode Desktop pill and TUI across 6 locales"
```

---

### Task 6: `UltraPlan` Artifact Permissions, Preserved `orchestrator.md` Enhancement & `ralph.ts` Worktree/Flag Upgrade

**Files:**
- Modify: `packages/config/opencode/agents/planner.md`
- Modify: `packages/config/opencode/agents/orchestrator.md`
- Modify: `packages/installer/src/ralph.ts`
- Modify: `packages/config/opencode/ralph/prompt.md`
- Test: `packages/installer/tests/cli.test.ts`, `packages/installer/tests/install.test.ts`

**Interfaces:**
- `runRalphWorkflow(paths, args, options)` in `packages/installer/src/ralph.ts`:
  - Default `maxIterations = "50"`.
  - Supports positional `<goal-file> [max-iterations]` AND flags `--max-iterations <n>` / `-n <n>` (extracting the value and stripping duplicate flags from `extraFlags`).
  - Supports `--worktree <name>` (when run in main checkout `gitDir === commonDir`, creates or reuses sibling/managed linked worktree `<repo-parent>/.ultracode-worktrees/<repo-name>-<name>` via `git worktree add` and runs inside it).
  - Supports `--init` (copies missing `FEATURE_LIST.json`, `SPRINT_CONTRACT.md`, `UI_RUBRIC.md` into `.opencode/ultracode/` and initializes `.ralph/ralph-tasks.md` starter checklist if absent).

- [ ] **Step 1: Write failing tests in `packages/installer/tests/cli.test.ts` and `packages/installer/tests/install.test.ts`**

```ts
test("ralph run deduplicates --max-iterations flag, defaults to 50, and supports --init template scaffolding", async () => {
  // 1. Call runRalphWorkflow with ["run", "SPEC.md", "--max-iterations", "80"] -> runner receives exactly one "--max-iterations", "80" (no duplicate "50" or "20").
  // 2. Call runRalphWorkflow with ["run", "SPEC.md", "--init"] in a linked worktree without ralph-tasks.md -> scaffolds .ralph/ralph-tasks.md and .opencode/ultracode/FEATURE_LIST.json + SPRINT_CONTRACT.md.
});

test("planner.md allows writing .opencode/plans/**, .opencode/ultracode/**, and .ralph/** while denying product code edits, and orchestrator.md preserves web-search and question-card paragraphs verbatim", async () => {
  // Assert exact permission rules in planner.md and exact substring preservation of lines 20-22 in orchestrator.md.
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test --cwd packages/installer tests/cli.test.ts tests/install.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `planner.md`, `orchestrator.md`, `ralph.ts`, and `ralph/prompt.md`**

- `planner.md`: Add `allow` rules for `.opencode/ultracode/**` and `.ralph/**` after `edit: "*" -> deny` (alongside `.opencode/plans/**`), and update the final sentence so `UltraPlan` knows it may write `.opencode/plans/`, `.opencode/ultracode/` (`SPRINT_CONTRACT.md`, `FEATURE_LIST.json`, `UI_RUBRIC.md`), and `.ralph/` (`ralph-tasks.md`, `HANDOFF.md`) when requested while never touching product source/tests/configs.
- `orchestrator.md`: **Keep lines 1–22 100% intact verbatim** (preserving every word of the web-search anti-reinventing-the-wheel requirement and multi-choice `question` card brainstorming requirement), appending only 2 concise bullets on declaring non-overlapping `Owned Files` (or using isolated Git worktrees via `tools.opencode.worktree_create` for coupled parallel modules) and recording verified command/review evidence via `ultracode_task_graph` when `.opencode/ultracode/FEATURE_LIST.json` is active.
- `ralph.ts` & `ralph/prompt.md`: Implement `--max-iterations` / `-n` deduplication (default `"50"`), `--worktree <name>`, and `--init`, plus `ultracode_task_graph` verification note in `ralph/prompt.md`.

- [ ] **Step 4: Run installer test suite and typecheck**

Run: `bun test --cwd packages/installer && bun run --cwd packages/installer check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/config/opencode/agents/planner.md packages/config/opencode/agents/orchestrator.md packages/installer/src/ralph.ts packages/config/opencode/ralph/prompt.md packages/installer/tests/cli.test.ts packages/installer/tests/install.test.ts
git commit -m "feat(workflow): unlock UltraPlan artifacts, preserve orchestrator prompts, and upgrade ralph CLI ergonomics"
```

---

### Task 7: First-Install & First-Use Model Routing Preference Onboarding (`setup-models` & `/setup-models`)

**Files:**
- Create: `packages/config/opencode/conversation/onboarding.js`
- Create: `packages/installer/src/model-onboarding.ts`
- Modify: `packages/config/opencode/conversation/server.js`
- Modify: `packages/installer/src/cli.ts`, `packages/installer/src/install.ts`, `packages/installer/src/assets.ts`
- Test: `packages/installer/tests/conversation.test.ts`, `packages/installer/tests/cli.test.ts`

**Interfaces:**
- `recommendRoleModels(models: ReadonlyArray<{ providerID: string; id: string; name?: string; capabilities?: Record<string, unknown> }>)`: returns `{ deep: string; coding: string; fast: string; visual: string; roles: Record<string, string> } | null` (returns `null` when `< 2` models are available).
- `applyRoleModelPreferences(existingConfigText: string, roleModels: Record<string, string> | "inherit"): string` (uses `jsonc-parser` `modify`/`applyEdits` to set or clear `agents.<role>.model` in `opencode.jsonc` while preserving all comments and unrelated agent settings).
- `/setup-models [recommended | inherit | status]` command in `server.js` + one-time non-blocking onboarding hint in `$ULTRACODE_HOME/onboarding.json` (`modelRoutingGuidedVersion: 1`) on first interactive root session when `models.length >= 2` and no `agents.*.model` is configured.
- `ultracode setup-models [--recommended | --inherit | --status]` in `cli.ts` + 1-line post-install onboarding tip on fresh install when TTY/non-TTY finishes `apply` without existing role model preferences.

- [ ] **Step 1: Write failing unit tests in `packages/installer/tests/conversation.test.ts` and `packages/installer/tests/cli.test.ts`**

Test cases:
1. `recommendRoleModels` accurately pairs multi-tier model pools (e.g. `google-vertex` Carbon/Neon/Hydrogen/Argon, `anthropic` Opus/Sonnet/Haiku, `openai` GPT-6/Codex/Mini, or mixed providers) across `UltraPlan`/`ultracode/architect`/`ultracode/reviewer` (`deep`), `UltraBuild`/`ultracode/implementer` (`coding`), `ultracode/librarian` (`fast`), and `ultracode/visual-evaluator` (`visual`), and returns `null` when 0 or 1 model exists.
2. First-session onboarding hint fires **at most once** (`onboarding.json` persisted), NEVER fires on child subagents (`parentID` set), NEVER fires when `agents.UltraBuild.model` already exists in `opencode.jsonc`, and NEVER blocks non-TTY `install.sh` execution.
3. `/setup-models recommended` and `ultracode setup-models --recommended` write `agents.<role>.model` into `opencode.jsonc` preserving JSONC comments without touching `agents/*.md` files on disk; `--inherit` removes only the model overrides cleanly.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test --cwd packages/installer tests/conversation.test.ts tests/cli.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `onboarding.js`, `model-onboarding.ts`, `/setup-models` in `server.js`, and `setup-models` in `cli.ts` / `install.ts`**

- Implement pure tier scoring in `onboarding.js` (embedded via `assets.ts` for `server.js` and imported by `model-onboarding.ts`).
- Implement `jsonc-parser` comment-preserving `agents.<role>.model` writer (`OPENCODE_CONFIG_DIR` / `paths.config`).
- Wire `/setup-models` in `server.js` (`status` / default sends an interactive recommendation prompt so the assistant presents a `question` card with the user's real configured models and applies their choice, while `/setup-models recommended` or `/setup-models inherit` applies deterministically in zero tokens!).
- Wire one-time `$ULTRACODE_HOME/onboarding.json` check in `server.js` `context` hook (skipping `session.parentID` and `ULTRACODE_RALPH_ACTIVE` / non-interactive sessions).
- Wire `ultracode setup-models` in `cli.ts` and 1-line fresh-install tip in `install.ts`.

- [ ] **Step 4: Run full installer & GUI checks**

Run: `bun test --cwd packages/installer && bun run --cwd packages/installer check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/config/opencode/conversation/onboarding.js packages/installer/src/model-onboarding.ts packages/config/opencode/conversation/server.js packages/installer/src/cli.ts packages/installer/src/install.ts packages/installer/src/assets.ts packages/installer/tests/conversation.test.ts packages/installer/tests/cli.test.ts
git commit -m "feat(onboarding): add first-use role model preference recommendations via opencode.jsonc"
```

---

### Task 8: 6-Locale Documentation, Upstream Rubric Update, Standalone Build & Clean-Room Live Verification

**Files:**
- Modify: `.opencode/skills/upstream-stewardship/references/completeness-rubric.md`
- Modify: `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/QUICK_START.md`, `docs/CHANGELOG.md`, `packages/installer/docs/ARCHITECTURE.md`, `packages/installer/README.md`
- Modify: `README.md`, `README_ZH.md`, `README_AR.md`, `README_FR.md`, `README_RU.md`, `README_ES.md`
- Modify: `website/` synced docs & locale guides (keeping everyday website pages free of internal JSONC/file jargon per `docs/design/PRODUCT.md`)
- Modify: `scripts/check-upstreams.ts` & `packages/installer/tests/upstream-canary.test.ts` (verify `/goal` takeover & hidden `build`/`plan` in `--verify-live` canary!)

**Interfaces:**
- Consumes: All deliverables from Tasks 2–7.
- Produces: Synchronized 6-locale docs, rebuilt standalone binary & website, passing `--verify-live` clean-room canary against real `opencode v2.4.1`, and independent `ultracode/reviewer` + `ultracode/visual-evaluator` sign-off.

- [ ] **Step 1: Update `scripts/check-upstreams.ts` `--verify-live` canary assertion and test**

Extend `--verify-live` in `scripts/check-upstreams.ts` to verify on the live `opencode` server that `/api/command` lists UltraCode's `goal`, `review`, and `setup-models` commands and `/api/agent` marks built-in `build` and `plan` as `hidden: true` while `UltraBuild` and `UltraPlan` are `hidden: false`.

- [ ] **Step 2: Update `completeness-rubric.md`, root `docs/`, 6-locale `README*.md`, and `website/` content**

- Update Precedent B in `.opencode/skills/upstream-stewardship/references/completeness-rubric.md` from "mutual-exclusion deferral" to "full `/goal` takeover + `opencode.goal` null-RPC hiding + deterministic evidence gate" and add the global overlap-override rule.
- Update `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/QUICK_START.md`, `packages/installer/docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`, and all 6 `README*.md` + `website/` locale guides.

- [ ] **Step 3: Execute full workspace build, test, website build, and live clean-room host verification**

```bash
bun run --cwd packages/plugin-gui check
bun run --cwd packages/plugin-gui build
bun test --cwd packages/installer
bun run --cwd packages/installer check
bun run --cwd packages/installer build
bun run --cwd website check
bun run --cwd website build
bun run scripts/check-upstreams.ts --verify-live --json
```
Expected: Every command exits `0`; `--verify-live --json` reports `"ok": true` with zero warnings.

- [ ] **Step 4: Run independent `ultracode/reviewer` and `ultracode/visual-evaluator` QA and resolve any findings**

Dispatch `ultracode/reviewer` on `git diff main...HEAD` and `ultracode/visual-evaluator` on local `website` preview (`bun run --cwd website preview`), resolving all cited blockers until both return `APPROVE`.

- [ ] **Step 5: Final Git hygiene verification and commit**

```bash
git add -A
git status --short
git commit -m "docs(all): document Goal Engine 2.0 /goal takeover, model onboarding, and 6-locale guides"
git status --short
```
Expected: `git status --short` is completely empty (zero untracked or uncommitted files) and `git log main..HEAD` contains only the human maintainer's identity.

---

## Recovery & Fresh-Agent Handoff Guidance

If execution is interrupted or resumed in a fresh session:
1. Run `git branch --show-current`, `git status --short`, and `git log -n 8 --oneline` to identify the last completed Task commit on `feature/goal-engine-v2`.
2. Read `docs/superpowers/plans/2026-11-24-goal-takeover-and-orchestration-v2.md` (or `.opencode/plans/2026-11-24-goal-takeover-and-orchestration-v2.md` prior to Task 1).
3. Reproduce the baseline test suite (`bun test --cwd packages/installer && bun run --cwd packages/plugin-gui check`) before starting the next unchecked `- [ ]` step.
