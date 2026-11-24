# UltraCode Goal Engine 2.0, Native Overlap Takeover & Onboarding Design

- **Date**: 2026-11-24
- **Status**: Approved & In Implementation
- **Target Version**: UltraCode `v1.2.0` (feature branch `feature/goal-engine-v2`)
- **Audit Inputs**: `docs/reviews/1.md`, `docs/reviews/2.md`, `docs/reviews/3.md`, `docs/reviews/4.md`, `docs/reviews/5.png`

---

## 1. Intent and Architectural Motivation

External architectural audits (`docs/reviews/1.md`–`4.md`) of UltraCode `v1.1.1` against OpenCode V2 (`v2.4.1`) and Anthropic's long-running harness principles highlighted four high-leverage structural gaps:

1. **Fragmented Continuation & Host Overlap**: Previously, `ultracode-conversation` yielded to OpenCode's built-in `opencode.goal` (`/goal`) and left OpenCode's stock `Build`/`Plan` primary modes, stock Desktop `Goal` pill, and single-context `/review` exposed alongside `UltraBuild`/`UltraPlan` and `ultracode_checkpoint`. Users faced two competing continuation loops, duplicate primary roles, and stock `/goal`'s `"do not stop to ask"` kickoff that bypassed UltraCode's upfront structured `question` clarification.
2. **Self-Graded Completion vs Deterministic Evidence Gates**: Model-reported completion (`ultracode_checkpoint({ next: "" })` or idle stop) had no deterministic programmatic gate checking `.opencode/ultracode/FEATURE_LIST.json`, `.opencode/ultracode/QA_REPORT.md`, or `.ralph/ralph-tasks.md`, and post-compaction long sessions could drift from the original objective.
3. **`UltraPlan` ↔ `Ralph` Artifact & CLI Ergonomics Gap**: `UltraPlan` (`planner.md`) only permitted edits under `.opencode/plans/**`, blocking it from directly generating `.opencode/ultracode/FEATURE_LIST.json`, `.opencode/ultracode/SPRINT_CONTRACT.md`, `.opencode/ultracode/UI_RUBRIC.md`, and `.ralph/ralph-tasks.md`. Meanwhile, `ralph.ts` defaulted `maxIterations` to `20`, risked duplicate `--max-iterations` flags, and required manual worktree creation beforehand.
4. **Zero-Guidance Role Model Inheritance**: While `agents/*.md` intentionally omit hardcoded `model` fields for provider neutrality, users with multi-tier configured models (e.g., reasoning/deep, coding, fast retrieval, multimodal visual) had no guided zero-friction way to bind role model preferences in `opencode.jsonc` without mutating managed `agents/*.md` SHA-256 hashes.

---

## 2. Core Design Decisions

### 2.1 Reversible Host Overlap Takeover
- **Installer Config (`managed.ts`, `components.ts`, `install.ts`)**: Prepend `"-opencode.goal"` and `"-opencode.plan"` to `managedConfig(paths).plugins`, and set `agents: { build: { hidden: true }, plan: { hidden: true } }`. Deduplicate negation directives by exact string rather than array index so `ultracode sync` remains idempotent and `ultracode uninstall` cleanly restores stock OpenCode behavior.
- **Silent `OpencodeGoalRpc` Stub (`server.js`)**: Register `OpencodeGoalRpc` (`id: "opencode.goal"`) with `methods.get: async () => null` so OpenCode Desktop's built-in `builtins.goal` renderer receives a valid `null` state immediately rather than triggering `rpc.unavailable` background retry storms.
- **Primary Agent & Command Takeover (`server.js`)**:
  - `ctx.agent.transform` ensures `"build"` and `"plan"` remain `hidden: true` while `UltraBuild` and `UltraPlan` are the visible primary roles; switching from `UltraPlan` to `UltraBuild` injects a `<system-update>` clearing `UltraPlan`'s read-only constraint.
  - `ultracode-conversation` owns `/goal` (`status`, `pause`, `resume`, `clear`, `--auto`, `<objective>`), `/review` (dispatching independent `ultracode/reviewer` and `ultracode/visual-evaluator` subagents instead of inline self-review), `/setup-models`, `/approvals`, and `/direction`.

### 2.2 Unified Durable Goal Engine 2.0 & Deterministic Evidence Gate (`goal-gate.js`, `rpc.js`, `server.js`)
- **Single Durable Record (`goal:<sessionID>`)**: Unifies explicit `/goal` and autonomous `ultracode_checkpoint` into `goal:<sessionID>` in `ctx.storage` (`id`, `objective`, `status: "active" | "paused" | "complete"`, `nextMilestone`, `reason`, `rounds`, `maxRounds: 60`, `stalls`, `lastGateFingerprint`, `bootID`, `explicit`, `updatedAt`), exposed over `UltraCodeRpc` (`goals`, `pauseGoal`, `resumeGoal`, `clearGoal`) while preserving backwards-compatible `checkpoints` and `clearCheckpoint`.
- **Clarification `question` Lifecycle**: Respects `direction: "manual"` upfront clarification. When `question` executes (`execute.before`), `awaitingUserQuestion` is armed; when answered (`execute.after` `status === "completed"`), it resets immediately so idle continuation proceeds; when cancelled/errored (`status === "error"`), idle continuation pauses until the next user `prompt`, which keeps explicit `/goal` `active` and resets `stalls = 0`.
- **Restart & Interrupt Safety**: Server restart (`bootID` mismatch) transitions previously `active` explicit `/goal` entries to `status: "paused"` (resumable via `/goal resume` or UI pill) while clearing ephemeral implicit checkpoints. User interrupts (`session.execution.interrupted` with `reason: "user"`) or execution failures pause active goals cleanly.
- **Zero-Token Workspace Evidence Gate & Task Graph (`goal-gate.js`)**:
  - `evaluateWorkspaceGate(directory)` deterministically checks `.opencode/ultracode/FEATURE_LIST.json` (`passes !== true` or missing `evidence.executedCommand` when `evidence` is present), `.opencode/ultracode/QA_REPORT.md` (`REJECT` or unresolved `FAIL`), and `.ralph/ralph-tasks.md` (unchecked top-level `- [ ]`). Premature completion is blocked with concrete pending IDs; 3 identical gate-blocker stalls trip the circuit breaker into `status: "paused"`.
  - `ultracode_task_graph` (`mutateTaskGraph`) enforces dependency readiness, non-overlapping `ownedFiles` across `in_progress` features, and non-empty `executedCommand` + `evidenceSummary` before marking a feature verified.
- **Cache-Safe Post-Compaction Goal Anchor**: When `goal.status === "active"` and `event.messages` lacks `<ultracode_goal_anchor>` / `<objective>`, `context` hook splices a round- and timestamp-invariant `<ultracode_goal_anchor>` message at `Math.min(1, event.messages.length)` to preserve LLM prompt-cache prefixes.

### 2.3 Multi-Surface Goal Controls (6 UN Locales)
- **OpenCode Desktop (`packages/plugin-gui/src/gui.tsx`)**: Upgrades `UltraCode` `ComposerPill` with 6-locale (`en`, `zh`, `ar`, `fr`, `ru`, `es`) Goal status (`active` / `paused` / `complete`), pill tone & round counter (`UltraCode · <rounds>/<maxRounds>`), objective/milestone summary, and one-click **Pause / Resume** and **Clear** controls.
- **TUI (`packages/config/opencode/conversation/tui.tsx`)**: Displays concise live Goal state in footer status slots and registers `Pause / Resume Goal` and `Clear Goal` in the `UltraCode` Command Palette group.

### 2.4 `UltraPlan` ↔ `Ralph` Closure & Preserved `orchestrator.md`
- **`planner.md`**: Permits editing `.opencode/plans/**`, `.opencode/ultracode/**`, and `.ralph/**` while keeping all product source, tests, and configs strictly `deny`.
- **`orchestrator.md`**: Preserves 100% of existing lines 1–22 verbatim (including mandatory community/GitHub/blog/forum web search against reinventing the wheel and upfront multi-choice `question` cards), appending concise rules for non-overlapping `Owned Files` / isolated Git worktrees and `ultracode_task_graph` evidence recording.
- **`ralph.ts`**: Raises default `maxIterations` to `50`, deduplicates `--max-iterations <n>` / `-n <n>`, adds `--worktree <name>` auto-creation/reuse of linked Git worktrees, and adds `--init` artifact scaffolding.

### 2.5 First-Install & First-Use Model Routing Onboarding (`onboarding.js`, `model-onboarding.ts`)
- No dynamic runtime model router. Instead, `recommendRoleModels(models)` scores configured models across `deep` (`UltraPlan`, `ultracode/architect`, `ultracode/reviewer`), `coding` (`UltraBuild`, `ultracode/implementer`), `fast` (`ultracode/librarian`), and `visual` (`ultracode/visual-evaluator`) tiers when `>= 2` models exist, normalizing `ctx.model.list()` return shapes safely.
- `ultracode setup-models [--recommended | --inherit | --status]` and `/setup-models [recommended | inherit | status]` write optional `agents.<role>.model` overrides into `opencode.jsonc` via comment-preserving `jsonc-parser` edits without touching `agents/*.md` files.
- Strictly once-only non-blocking onboarding hint (`$ULTRACODE_HOME/onboarding.json`) on first interactive root session when `>= 2` models exist and no role model overrides are configured; never blocks `curl | bash`, `doctor`, child subagents (`parentID`), or `ultracode ralph run`.

---

## 3. Global Constraints & Non-Negotiables

1. **Git Attribution (`AGENTS.md` §3.1)**: Sole human maintainer authorship (`PlutoKeating <PlutoKeating@outlook.com>`); zero `Co-authored-by` or AI/bot trailers; zero untracked or uncommitted files.
2. **Host Isolation**: All verification and clean-room newcomer acceptance runs in isolated sandboxes and dedicated VMs (`~/vms` with at most one VM running at any time), never mutating the maintainer's active host OpenCode installation.
3. **Zero-Credential, Zero-Live-LLM Automated Suite & 6-Locale Parity**: `bun test` uses isolated temp directories and local stubs only; all GUI, README, and website surfaces maintain full 6-locale parity (`en`, `zh`, `ar`, `fr`, `ru`, `es`) without leaking internal config jargon onto everyday website guides.
