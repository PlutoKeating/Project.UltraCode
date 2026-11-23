# OpenCode v2.4+ Alignment & Upstream Stewardship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align UltraCode cleanly with OpenCode `v2.4.0+` (upgrading `@opencode/plugin@2.4.0`, removing static minor-version false alarms, hardening `ultracode_checkpoint` with durable storage, circuit breakers, `/goal` mutual exclusion, and Desktop pill controls, and upgrading the local installation) while establishing a zero-path-hardcoding `upstream-stewardship` Skill, deterministic 4-upstream probe, and live-host canary CI workflow.

**Architecture:** Centralize all 4 pinned upstream versions/hashes in `packages/config/upstream-baseline.json` consumed by both the compiled installer runtime and the zero-token upstream probe (`scripts/check-upstreams.ts`). Upgrade `ultracode-conversation` (`rpc.js`, `server.js`, `gui.tsx`) to persist session checkpoints in OpenCode's `ctx.storage` with boot fencing, stall/round limits, `opencode.goal` RPC deferral, and a contextual 6-locale Desktop `ComposerPill` clear row. Encode the evergreen maintenance cognitive protocol in `.opencode/skills/upstream-stewardship/` paired with `.github/workflows/upstream-canary.yml` (Issue-only reporting, zero LLM keys, zero branch pushes).

**Tech Stack:** Bun `1.3.14`, TypeScript `5.9`, `@opencode/plugin@2.4.0`, SolidJS + Vite (`@opencode/plugin/gui/vite`), Astro + Starlight (`website/`), GitHub Actions (`gh` CLI).

**Spec:** `docs/superpowers/specs/2026-11-23-opencode-v24-and-upstream-stewardship-design.md`

## Global Constraints

- Git commits MUST use the maintainer's configured Git identity (`PlutoKeating <PlutoKeating@outlook.com>`) as sole author — NEVER add `Co-authored-by` or any AI/agent/bot attribution (`AGENTS.md` §3.1).
- Working tree MUST have zero untracked or uncommitted non-ignored files after every task (`AGENTS.md` §3.2); do NOT push to remote or merge to `main`/`staging`/`production` without explicit human authorization (`AGENTS.md` §3.3, §4).
- Automated tests MUST run against local mocks/stubs or isolated temp directories without reading personal credentials or invoking live AI models.
- Preserve isolated headless `@playwright/mcp` (`ultracode_playwright_*` for `visual-evaluator`) and `ultracode ralph run` across Linux, macOS, and Windows (`x64`/`arm64`).
- Maintain 6-language parity (`en`, `zh`, `ar`, `fr`, `ru`, `es`) across `packages/plugin-gui/src/gui.tsx`, root `README*.md`, brand SVGs, and `website/` without leaking internal source paths or JSONC keys onto user-facing website pages (`docs/design/PRODUCT.md`).

## Review Focus

1. **Cold-start partial `/api/plugin` response in OpenCode `v2.4.0` (PR `#63814`)**: When the background server has just started and `/api/plugin` temporarily returns only `builtin` plugins while user `config.plugins` is non-empty, `components()` must retry briefly instead of misclassifying custom-located plugins and duplicating entries — covered in Task 1.
2. **Stale checkpoint firing after OpenCode server crash/restart**: A checkpoint stored in `ctx.storage` by an earlier server process (`bootID` mismatch) must be purged rather than unexpectedly auto-continuing a session hours later — covered in Task 2.
3. **Dual-continuation collision when user runs official `/goal`**: When a user activates `/goal <objective>` (`opencode.goal` status `"active"`) in a session that also armed `ultracode_checkpoint`, `experimental.idle` must defer to `/goal` and clear the redundant checkpoint rather than injecting two synthetic turns — covered in Task 2.
4. **Infinite loop from repeated identical `ultracode_checkpoint` milestones**: When a model repeatedly schedules the exact same milestone text `3` times in a row (or exceeds `25` consecutive continuations without a user prompt), `ultracode_checkpoint` must trip its circuit breaker and clear continuation — covered in Task 2.
5. **GitHub/npm upstream probe resilience & zero hardcoded code paths in `SKILL.md`**: `scripts/check-upstreams.ts` must surface clear structured errors on HTTP 403/500 without crashing unhandled, and `.opencode/skills/upstream-stewardship/SKILL.md` must pass an automated lint test proving it contains zero hardcoded `packages/.../*.ts` line/file couplings — covered in Task 3.

---

### Task 1: Declarative Upstream Baseline, OpenCode v2.4+ Version Gate & Async Registry Polling

**Files:**
- Create: `packages/config/upstream-baseline.json`
- Modify: `packages/installer/src/runtime.ts:7-56`
- Modify: `packages/installer/src/opencode.ts:55-63`
- Modify: `packages/installer/src/components.ts:53-68`
- Modify: `packages/installer/tests/platform.test.ts`
- Create: `packages/installer/tests/upstream-baseline.test.ts`

**Interfaces:**
- Produces:
  - `packages/config/upstream-baseline.json` (`UpstreamBaseline`: `{ schema: 1, updatedAt: string, opencode: { repo, minSupported, verifiedRelease, pluginSdkPackage, pluginSdkVersion }, superpowers: { repo, tag, tarballUrl, sha256 }, playwrightMcp: { npmPackage, version }, ralph: { repo, branch, versionLabel, commit, tarballUrl, sha256 } }`)
  - `assertSupportedOpenCode(version: string): void` in `packages/installer/src/opencode.ts` (silent for `2.3.2 <= v < 3.0.0`, throws on `< 2.3.2` or `>= 3.0.0`)
  - `components(paths: Paths, config: JsonValue)` in `packages/installer/src/components.ts` (with bounded 4-attempt retry when `/api/plugin` returns empty or builtin-only entries while `config.plugins` has entries)

- [ ] **Step 1: Write failing tests in `packages/installer/tests/upstream-baseline.test.ts` and `packages/installer/tests/platform.test.ts`**

Add tests asserting:
1. `packages/config/upstream-baseline.json` parses cleanly with `schema === 1`, `opencode.minSupported === "2.3.2"`, `opencode.verifiedRelease === "2.4.0"`, `opencode.pluginSdkVersion === "2.4.0"`, and matches `runtime.ts` & `components.ts` Playwright version `0.0.86`.
2. `assertSupportedOpenCode("2.4.0")` and `assertSupportedOpenCode("2.9.1")` do not throw and call `console.warn` **0 times** (spy on `console.warn`).
3. `assertSupportedOpenCode("2.3.1")` throws `/2\.3\.2 or newer/i`, and `assertSupportedOpenCode("3.0.0")` throws `/major contract.*V3/i`.
4. `components()` retries `opencode api get /api/plugin` when attempt 1 returns `{"data":[{"id":"opencode.agent","source":{"type":"builtin"},"state":{"status":"active"}}]}` and attempt 2 includes `{"id":"superpowers","source":{"type":"local","path":"..."},"state":{"status":"active"}}`, deduplicating `superpowers` cleanly.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/installer/tests/upstream-baseline.test.ts packages/installer/tests/platform.test.ts`
Expected: FAIL (`upstream-baseline.json` missing, `console.warn` called on `2.4.0`, `3.0.0` message mismatch, single-shot `/api/plugin` misses retry).

- [ ] **Step 3: Create `packages/config/upstream-baseline.json` and update `runtime.ts`, `opencode.ts`, and `components.ts`**

1. Write `packages/config/upstream-baseline.json` with the exact Spec §5.2.A JSON values (`pluginSdkVersion: "2.4.0"`, `superpowers.tag: "v7.0.2"`, `playwrightMcp.version: "0.0.86"`, `ralph.commit: "53c87ded9fc329b452298f361145d17bf52cac09"`).
2. In `packages/installer/src/runtime.ts` and `components.ts`, import `baseline from "../../config/upstream-baseline.json"` so `PLAYWRIGHT_VERSION`, `RALPH_COMMIT`, `superpowers` tag/url/sha256, and `opencode.minSupported` read from `baseline` with zero duplicated literals.
3. In `packages/installer/src/opencode.ts`, update `assertSupportedOpenCode(version)` to reject `major < 2 || (major === 2 && (minor < 3 || (minor === 3 && patch < 2)))` with `"OpenCode ${version} is unsupported; install OpenCode V2 (2.3.2 or newer)."` and reject `major >= 3` with `"OpenCode ${version} targets a new major contract (V${major}); run 'ultracode upgrade' for a compatible UltraCode release."`, removing the `minor > 3` `console.warn`.
4. In `packages/installer/src/components.ts`, poll `/api/plugin` up to 4 attempts (120ms delay between attempts) only when `Array.isArray(plugins) && plugins.length > 0` and the parsed registry has zero non-builtin plugins (`!data.some(p => p.source?.type && p.source.type !== "builtin")`).

- [ ] **Step 4: Run tests and typecheck to verify they pass**

Run: `bun test --cwd packages/installer && bun run --cwd packages/installer check`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit Task 1**

```bash
git add packages/config/upstream-baseline.json packages/installer/src/runtime.ts packages/installer/src/opencode.ts packages/installer/src/components.ts packages/installer/tests/platform.test.ts packages/installer/tests/upstream-baseline.test.ts
git commit -m "feat(installer): centralize upstream baseline, silence v2.4+ false warnings, and retry async plugin discovery"
```

---

### Task 2: Durable `ultracode_checkpoint`, `/goal` Coexistence & `@opencode/plugin@2.4.0` GUI Upgrade

**Files:**
- Modify: `packages/config/opencode/conversation/rpc.js`
- Modify: `packages/config/opencode/conversation/server.js`
- Modify: `packages/plugin-gui/package.json`
- Modify: `packages/plugin-gui/bun.lock`
- Modify: `packages/plugin-gui/src/gui.tsx`
- Modify: `packages/config/opencode/conversation/gui-experimental.cjs` (via `bun run --cwd packages/plugin-gui build`)
- Create: `packages/installer/tests/conversation.test.ts`
- Modify: `packages/installer/tests/upstream-baseline.test.ts`

**Interfaces:**
- Consumes: `packages/config/upstream-baseline.json` (`opencode.pluginSdkVersion: "2.4.0"`)
- Produces:
  - `UltraCodeRpc` (`packages/config/opencode/conversation/rpc.js`):
    - `stateSchema` properties: `{ permissions: "auto"|"manual", direction: "auto"|"manual", version: string, checkpoints?: Record<string, string> }` (`required: ["permissions", "direction", "version"]`)
    - methods: `getState({}) -> stateSchema`, `setMode({ key, value }) -> stateSchema`, `toggleMode({ key }) -> stateSchema`, `clearCheckpoint({ sessionID: string }) -> stateSchema`
    - events: `changed` (`schema: stateSchema`)
  - `server.js` constants & behavior: `MAX_CHECKPOINT_ROUNDS = 25`, `MAX_CHECKPOINT_STALLS = 3`, durable storage prefix `"checkpoint:"`, `OpencodeGoalRpc` (`id: "opencode.goal"`, `get({ sessionID })`) deferral when `goal?.status === "active"`.

- [ ] **Step 1: Write failing tests in `packages/installer/tests/conversation.test.ts` and `upstream-baseline.test.ts`**

Create `packages/installer/tests/conversation.test.ts` with mock `ctx` (`storage` in-memory `Map` supporting `get`/`set`/`remove`/`scan`, `rpc` callable + `rpc.register`, `command.transform`/`reload`, `permission.hook`, `tool.transform`, `session.hook`/`get`/`synthetic`/`switchModel`, `model.list`) testing:
1. Scheduling a checkpoint persists under `ctx.storage` (`checkpoint:<sessionID>`), exposes `checkpoints[sessionID]` in `getState()`, and fires `ctx.session.synthetic` on `experimental.idle` when no background job or active `/goal` exists.
2. Stale checkpoints persisted in `ctx.storage` with a previous `bootID` are purged during `setup` / `experimental.idle` and never fire `ctx.session.synthetic`.
3. Circuit breaker: scheduling the identical milestone string `3` consecutive times (or reaching `25` rounds without a `prompt` hook reset) clears the checkpoint and returns a circuit-breaker message without firing further idle continuations; a fresh `prompt` hook resets counters and clears active checkpoint.
4. Official `/goal` coexistence: when `ctx.rpc(OpencodeGoalRpc).get({ sessionID })` resolves `{ status: "active", ... }`, `experimental.idle` deletes the redundant checkpoint and does NOT call `ctx.session.synthetic`.
5. `clearCheckpoint({ sessionID })` removes `checkpoint:<sessionID>` from `ctx.storage` and emits `changed` with empty `checkpoints`.
6. In `upstream-baseline.test.ts`, assert `packages/plugin-gui/package.json` `devDependencies["@opencode/plugin"] === baseline.opencode.pluginSdkVersion` (`"2.4.0"`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/installer/tests/conversation.test.ts packages/installer/tests/upstream-baseline.test.ts`
Expected: FAIL (`clearCheckpoint` undefined, `ctx.storage` unused, `@opencode/plugin` still `"2.3.2"`).

- [ ] **Step 3: Upgrade `@opencode/plugin@2.4.0` and implement `rpc.js`, `server.js`, and `gui.tsx`**

1. Update `packages/plugin-gui/package.json` `"@opencode/plugin": "2.4.0"` and run `bun install --cwd packages/plugin-gui`.
2. Update `packages/config/opencode/conversation/rpc.js` to add optional `checkpoints: { type: "object", additionalProperties: { type: "string" } }` to `stateSchema` and add `clearCheckpoint` method (`input: { type: "object", properties: { sessionID: { type: "string", minLength: 1 } }, required: ["sessionID"], additionalProperties: false }`, `output: stateSchema`).
3. Update `packages/config/opencode/conversation/server.js`:
   - Define `OpencodeGoalRpc = Rpc.define({ id: "opencode.goal", methods: { get: { input: { type: "object", properties: { sessionID: { type: "string" } }, required: ["sessionID"] }, output: { anyOf: [{ type: "null" }, { type: "object", properties: { status: { type: "string" } }, additionalProperties: true }] } } } })`.
   - Use module/process-scoped `const BOOT_ID = (globalThis.__ultracodeBootID ??= crypto.randomUUID())` so hot location reloads within the same server process keep valid checkpoints while full process restarts get a fresh `BOOT_ID` and purge old `checkpoint:*` entries via `ctx.storage.scan({ prefix: "checkpoint:" })`.
   - Implement `MAX_CHECKPOINT_ROUNDS = 25` and `MAX_CHECKPOINT_STALLS = 3` in `ultracode_checkpoint` tool & `experimental.idle`, emit `registration.events.emit("changed", await syncState())` whenever checkpoints change, and defer cleanly when `ctx.rpc(OpencodeGoalRpc).get({ sessionID })` returns `status === "active"`.
4. Update `packages/plugin-gui/src/gui.tsx`:
   - Add 6-locale keys `"pill.checkpoint"` (`"Next milestone"` / `"下一里程碑"` / `"المرحلة التالية"` / `"Prochaine étape"` / `"Следующий этап"` / `"Siguiente hito"`) and `"pill.clear"` (`"Clear"` / `"清除"` / `"مسح"` / `"Effacer"` / `"Очистить"` / `"Limpiar"`).
   - In `ComposerPill`'s `show: (input) => ...`, read `const milestone = current.checkpoints[input?.session?.id ?? ""]`; when non-empty, append a 3rd row `{ id: "checkpoint", label: `${ctx.t("pill.checkpoint")}: ${milestone}`, detail: ctx.t("pill.clear"), run: () => void clearSessionCheckpoint(input.session.id).catch(handleError) }`.
5. Run `bun run --cwd packages/plugin-gui check && bun run --cwd packages/plugin-gui build` to regenerate `packages/config/opencode/conversation/gui-experimental.cjs`.

- [ ] **Step 4: Run all GUI and installer tests/checks**

Run: `bun run --cwd packages/plugin-gui check && bun test --cwd packages/installer && bun run --cwd packages/installer check`
Expected: PASS across all test files and strict `tsc --noEmit`.

- [ ] **Step 5: Commit Task 2**

```bash
git add packages/plugin-gui/package.json packages/plugin-gui/bun.lock packages/plugin-gui/src/gui.tsx packages/config/opencode/conversation/rpc.js packages/config/opencode/conversation/server.js packages/config/opencode/conversation/gui-experimental.cjs packages/installer/tests/conversation.test.ts packages/installer/tests/upstream-baseline.test.ts
git commit -m "feat(conversation,gui): upgrade to @opencode/plugin 2.4.0 and harden durable checkpoints"
```

---

### Task 3: Zero-Path-Hardcoding `upstream-stewardship` Skill, Probe Script & Canary Workflow

**Files:**
- Create: `.opencode/skills/upstream-stewardship/SKILL.md`
- Create: `.opencode/skills/upstream-stewardship/references/completeness-rubric.md`
- Create: `scripts/check-upstreams.ts`
- Create: `.github/workflows/upstream-canary.yml`
- Create: `packages/installer/tests/upstream-canary.test.ts`

**Interfaces:**
- Consumes: `packages/config/upstream-baseline.json`
- Produces:
  - `probeUpstreams(baseline: UpstreamBaseline, options?: { apiBaseUrls?: { githubApi?: string; npmRegistry?: string; codeload?: string }; token?: string }): Promise<ProbeReport>` exported from `scripts/check-upstreams.ts`
  - `runLiveHostCanary(options?: { opencodeBin?: string; skipGuiNpmInstall?: boolean }): Promise<{ ok: boolean; opencodeVersion: string; checks: Array<{ name: string; ok: boolean; detail?: string }> }>` exported from `scripts/check-upstreams.ts`
  - CLI flags on `scripts/check-upstreams.ts`: `--json`, `--markdown`, `--verify-live`, `--fail-on-outdated`
  - `.opencode/skills/upstream-stewardship/SKILL.md` + `references/completeness-rubric.md`
  - `.github/workflows/upstream-canary.yml`

- [ ] **Step 1: Write failing tests in `packages/installer/tests/upstream-canary.test.ts`**

Write tests covering:
1. `probeUpstreams()` against a local `node:http` mock server returning matching versions (`v2.4.0`, `@opencode/plugin@2.4.0`, `v7.0.2`, `0.0.86`, commit `53c87de...`) reports `hasUpdates === false` and all 4 items `status: "up-to-date"`.
2. `probeUpstreams()` when mock GitHub/npm returns `opencode v2.5.0` and `@playwright/mcp 0.0.87` reports `hasUpdates === true`, includes release URLs, and formats valid Markdown via `formatMarkdownReport()`.
3. `probeUpstreams()` when mock server returns HTTP 403/500 captures structured `status: "error"` with HTTP status detail instead of throwing unhandled rejections.
4. Skill hygiene assertions: `.opencode/skills/upstream-stewardship/SKILL.md` has valid YAML frontmatter (`name: upstream-stewardship`, non-empty `description`), stays under 300 lines, links `references/completeness-rubric.md` one level deep, and contains **zero** hardcoded TypeScript source file paths (`!/packages\/[a-z-]+\/src\/[a-z-]+\.tsx?/i`).
5. `runLiveHostCanary({ skipGuiNpmInstall: true })` (when real `opencode` is installed on PATH) passes `apply` + `doctor` in an isolated temp `HOME` (`ULTRACODE_SKIP_BROWSER=1`).

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/installer/tests/upstream-canary.test.ts`
Expected: FAIL (`scripts/check-upstreams.ts` and `.opencode/skills/upstream-stewardship/SKILL.md` do not exist).

- [ ] **Step 3: Implement `.opencode/skills/upstream-stewardship/`, `scripts/check-upstreams.ts`, and `.github/workflows/upstream-canary.yml`**

1. Create `.opencode/skills/upstream-stewardship/SKILL.md` (encoding the 6-step zero-path-hardcoding protocol from Spec §5.2.D) and `.opencode/skills/upstream-stewardship/references/completeness-rubric.md` (5-dimension Claude Code / Anthropic GAN completeness bar + worked precedents + ready-to-run OpenCode `v2.4.0` `tools.automation.create` zero-token Code Mode recipe).
2. Implement `scripts/check-upstreams.ts` exporting `probeUpstreams`, `runLiveHostCanary`, and `formatMarkdownReport`, plus CLI execution when `import.meta.main` is true:
   - Live canary builds `ultracode-current` if needed, optionally tests `packages/plugin-gui` in a temp sandbox against `@opencode/plugin@latest`, and executes `ultracode apply` + `ultracode doctor` inside a fresh temp `HOME`/`OPENCODE_CONFIG_DIR`/`ULTRACODE_HOME` (`ULTRACODE_SKIP_BROWSER=1`), cleaning up temp dirs on exit.
3. Create `.github/workflows/upstream-canary.yml` (daily `cron: "0 6 * * *"` + `workflow_dispatch`, `permissions: { contents: read, issues: write }`, `persist-credentials: false`, installs Bun `1.3.14` + official OpenCode V2, runs `bun run scripts/check-upstreams.ts --verify-live`, uploads report artifact, and idempotently creates/updates/closes a single `upstream-sync` GitHub Issue via `gh issue` without ever pushing branches or commits).

- [ ] **Step 4: Run tests and live canary CLI check**

Run: `bun test --cwd packages/installer && bun run scripts/check-upstreams.ts --verify-live --json`
Expected: All unit/integration tests PASS; live canary against local `opencode v2.4.0` outputs `"ok": true` and `"hasUpdates": false`.

- [ ] **Step 5: Commit Task 3**

```bash
git add .opencode/skills/upstream-stewardship/SKILL.md .opencode/skills/upstream-stewardship/references/completeness-rubric.md scripts/check-upstreams.ts .github/workflows/upstream-canary.yml packages/installer/tests/upstream-canary.test.ts
git commit -m "feat(stewardship): add methodology skill, upstream probe, and live-host canary workflow"
```

---

### Task 4: `v1.1.0` Version Sync, 6-Locale Documentation/Brand Assets & Local Host Upgrade

**Files:**
- Modify: `package.json`, `packages/installer/package.json`, `packages/plugin-gui/package.json`, `packages/config/opencode/conversation/package.json`, `website/package.json`
- Modify: `packages/config/opencode/conversation/server.js:5`, `packages/installer/src/install.ts:14`, `packages/installer/scripts/build.ts:36`
- Modify: `packages/installer/tests/cli.test.ts`, `packages/installer/tests/install-script.test.ts`
- Modify: `scripts/generate-brand-assets.ts` (and regenerate `docs/assets/**` & `website/public/og-card*.png`)
- Modify: `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/QUICK_START.md`, `docs/CHANGELOG.md`, `packages/installer/docs/ARCHITECTURE.md`
- Modify: `README.md`, `README_ZH.md`, `README_AR.md`, `README_FR.md`, `README_RU.md`, `README_ES.md`
- Modify: `website/scripts/sync-content.mjs`, `website/src/i18n/ui.ts`, `website/src/components/LandingPage.astro`, `website/content/{root,zh,ar,fr,ru,es}/docs/getting-started.mdx`, `website/content/{root,zh,ar,fr,ru,es}/docs/controls-and-maintenance.mdx`
- Modify: `docs/superpowers/specs/2026-11-23-opencode-v24-and-upstream-stewardship-design.md` (status -> `Approved & Implemented`)

**Interfaces:**
- Consumes: Tasks 1–3 deliverables (`upstream-baseline.json`, hardened `ultracode-conversation`, `scripts/check-upstreams.ts`)
- Produces: Synchronized `1.1.0` standalone binary, updated 6-language docs/SVGs/website build, and verified local `~/.local/bin/ultracode` `1.1.0` running cleanly on `opencode v2.4.0`.

- [ ] **Step 1: Update version constants to `1.1.0` across packages, tests, and brand asset generator**

1. Bump version `"1.0.0"` -> `"1.1.0"` in `package.json`, `packages/installer/package.json`, `packages/plugin-gui/package.json`, `packages/config/opencode/conversation/package.json`, `website/package.json`, `packages/config/opencode/conversation/server.js`, `packages/installer/src/install.ts`, `packages/installer/scripts/build.ts`, and update version assertions in `packages/installer/tests/cli.test.ts` and `packages/installer/tests/install-script.test.ts`.
2. Update `scripts/generate-brand-assets.ts` (`v1.0.0` -> `v1.1.0`, provenance `v1.0.0` where appropriate) and run `bun run scripts/generate-brand-assets.ts` to regenerate localized SVGs and OG PNGs.

- [ ] **Step 2: Synchronize `docs/`, 6-locale `README*.md`, and `website/`**

1. Update `docs/CHANGELOG.md` (add `## v1.1.0 - 2026-11-23`), `docs/ARCHITECTURE.md`, `docs/API.md` (document `clearCheckpoint`, durable `ctx.storage` checkpoints + `/goal` coexistence, `v2.3.2+` floor / `v2.4.0` verified baseline, and Upstream Stewardship), `docs/QUICK_START.md`, and `packages/installer/docs/ARCHITECTURE.md`.
2. Update root `README.md`, `README_ZH.md`, `README_AR.md`, `README_FR.md`, `README_RU.md`, `README_ES.md` (`v1.1.0`, self-hosted provenance `Built with UltraCode v1.0.0`, OpenCode `v2.4.0` compatibility).
3. Update `website/scripts/sync-content.mjs`, `website/src/i18n/ui.ts`, `website/src/components/LandingPage.astro`, and the 6-locale `getting-started.mdx` / `controls-and-maintenance.mdx` version strings (keeping user-facing pages free of internal filenames/JSONC plumbing).

- [ ] **Step 3: Build standalone binary, upgrade local machine installation (`~/.local/bin/ultracode`), and verify end-to-end**

Run:
```bash
bun run --cwd packages/plugin-gui check
bun run --cwd packages/plugin-gui build
bun test --cwd packages/installer
bun run --cwd packages/installer check
bun run --cwd packages/installer build
bun run --cwd website check
bun run --cwd website build
bun run scripts/check-upstreams.ts --verify-live
install -m 0755 packages/installer/dist/ultracode-current ~/.local/bin/ultracode
~/.local/bin/ultracode version
~/.local/bin/ultracode sync
~/.local/bin/ultracode doctor
```
Expected: All tests/checks/builds PASS, `ultracode version` prints `1.1.0`, and `ultracode sync` + `ultracode doctor` complete against live `opencode v2.4.0` with **`✓ Ready`** and **zero stderr warnings**.

- [ ] **Step 4: Commit all Task 4 changes and verify clean `git status`**

```bash
git add -A
git status --short
git commit -m "chore(release,docs): bump UltraCode to v1.1.0 and sync 6-locale docs and assets"
git status
```
Expected: `nothing to commit, working tree clean` on `feature/opencode-v24-upstream-stewardship`, with sole author `PlutoKeating <PlutoKeating@outlook.com>` across `git log origin/main..HEAD`.
