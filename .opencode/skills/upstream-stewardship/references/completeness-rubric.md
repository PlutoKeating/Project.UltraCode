# Claude Code + Anthropic GAN Completeness Rubric & Upstream Precedents

## Table of Contents

1. [Purpose & Architectural North Star](#1-purpose--architectural-north-star)
2. [The 5 Mandatory Evaluation Dimensions](#2-the-5-mandatory-evaluation-dimensions)
3. [Decision Matrix: Adopt, Fuse, or Keep](#3-decision-matrix-adopt-fuse-or-keep)
4. [Worked Architectural Precedents](#4-worked-architectural-precedents)
   - [Precedent A: `opencode.browser` vs. Isolated `ultracode_playwright`](#precedent-a-opencodebrowser-vs-isolated-ultracode_playwright)
   - [Precedent B: `opencode.goal` (`/goal`) vs. `ultracode_checkpoint` & `ultracode ralph run`](#precedent-b-opencodegoal-goal-vs-ultracode_checkpoint--ultracode-ralph-run)
   - [Precedent C: `tools.automation.*` (`/automation`) vs. Custom Polling Daemons](#precedent-c-toolsautomation-automation-vs-custom-polling-daemons)
5. [Local OpenCode v2.4+ `/automation` Zero-Token Watcher Recipe](#5-local-opencode-v24-automation-zero-token-watcher-recipe)
6. [Dynamic Coupling Discovery Cheat Sheet](#6-dynamic-coupling-discovery-cheat-sheet)

---

## 1. Purpose & Architectural North Star

UltraCode exists so OpenCode V2 users—across **any provider and model** (including high-throughput non-Claude models such as Gemini, DeepSeek, GPT, and Kimi)—achieve the multi-hour reliability, upfront requirement clarity, context isolation, and skeptical real-browser QA of top-tier Claude Code + Anthropic GAN workflows (`docs/ORIGIN_GOAL.md`, `docs/RESEARCH.md`).

Host releases frequently add convenient built-in features. Convenience on a single surface is **not** engineering completeness. Before retiring or replacing any UltraCode capability, evaluate the upstream candidate against all 5 dimensions below.

---

## 2. The 5 Mandatory Evaluation Dimensions

| # | Dimension | Passing Bar (`PASS`) | Disqualifying Signal (`FAIL`) |
|---|---|---|---|
| 1 | **Cross-Surface Parity** | Works identically across Terminal (`TUI`), Desktop App, Browser (`Web`), `Mobile`, headless `SSH` servers, and unattended `ultracode ralph run` worktrees. | Requires an attached Electron/Desktop window, disappears over SSH/headless sessions, or breaks outer fresh-session loops. |
| 2 | **Clean-Room Isolation & Determinism** | Runs inside an isolated profile, viewport, or linked Git worktree free of personal cookies, extensions, or ambient tabs; writes QA evidence only into git-ignored directories. | Reuses the user's daily browser profile/session state or pollutes the Git working tree with untracked screenshots/state files. |
| 3 | **Non-Claude Model Tool Ergonomics** | Exposes direct, strongly-typed tool schemas (`codemode: false` where multi-step stateful interaction is sensitive) that non-Claude models call reliably without stalling. | Relies exclusively on implicit RL-trained habits or requires fragile multi-call JS scripting where non-Claude models frequently drop state. |
| 4 | **Tool-Backed Independent Verification** | Enforces GAN-style separation: an independent skeptical agent (`reviewer`, `visual-evaluator`) executes real test suites, CLI checks, and interactive browser clicks against an explicit rubric. | Uses self-evaluation by the implementer or a zero-tool LLM transcript judge that reads assistant prose without running commands or clicking UI. |
| 5 | **Upfront Clarification Compatibility** | Preserves structured upfront requirement discovery (`brainstorming` + `question` choice cards) when user direction is ambiguous, before committing to long autonomous runs. | Injects `"do not stop to ask"` kickoff prompts that force the model to guess through ambiguous product specs. |

---

## 3. Decision Matrix: Adopt, Fuse, or Keep

| Rubric Result | Action | Engineering Pattern |
|---|---|---|
| **5 / 5 `PASS`** | **Candidate to Adopt / Retire Custom Plumbing** | Classify as `ARCHITECTURAL_DECISION`; present rubric evidence to maintainer via `question` card before removing UltraCode code. |
| **1–4 `PASS`**, but upstream has stronger internal durability or UI polish | **Fuse & Harden (Keep Core + Borrow Strengths + Coexist)** | Keep UltraCode's complete mechanism; upgrade its internals using upstream's best primitives (e.g., durable plugin storage, crash fencing, Desktop UI visibility) and add mutual-exclusion guards so both never collide. |
| **Orthogonal host capability** (e.g., media generation, model listing) | **Enable Role-Scoped Access** | Keep available to primary `UltraBuild` while keeping read-only/specialist subagents (`UltraPlan`, `reviewer`, `visual-evaluator`) strictly scoped. |

---

## 4. Worked Architectural Precedents

### Precedent A: `opencode.browser` vs. Isolated `ultracode_playwright`

- **Upstream candidate:** OpenCode `v2.4.0` built-in Desktop Browser (`@opencode/plugin-browser` / `opencode.browser`).
- **5-Dimension Score (`1 / 5 PASS`):**
  1. *Cross-Surface Parity:* **FAIL** — exposes zero tools when OpenCode Desktop is not attached (unavailable in pure TUI, SSH, CI, and headless `ultracode ralph run`).
  2. *Clean-Room Isolation:* **FAIL** — shares the user's persistent Desktop browser pane rather than an isolated `--headless --isolated` mobile/desktop viewport sandbox writing to `.opencode/ultracode/qa`.
  3. *Non-Claude Ergonomics:* **FAIL** — mediated through Code Mode rather than direct `codemode: false` MCP tools dedicated to a visual QA specialist.
  4. *Independent Verification:* **PARTIAL/FAIL** — designed for interactive browsing rather than isolated GAN-rubric grading by `visual-evaluator`.
  5. *Clarification Compatibility:* **PASS** — orthogonal to clarification.
- **Ruling (`Fuse / Role-Scoped Coexistence`):** Keep managed headless isolated `ultracode_playwright_*` (`@playwright/mcp`, `codemode: false`) exclusively bound to `visual-evaluator` for clean-room QA across all surfaces. Allow `UltraBuild` to use `opencode.browser` when the user asks to inspect or interact with their attached Desktop browser pane.

### Precedent B: `opencode.goal` (`/goal`) vs. `ultracode_checkpoint` & `ultracode ralph run`

- **Upstream candidate:** OpenCode `v2.4.0` redesigned `/goal` (`opencode.goal`).
- **5-Dimension Score (`2 / 5 PASS`):**
  1. *Cross-Surface Parity:* **PASS** — server-backed state works across TUI, Desktop, and Web; however, single-session continuation still suffers Context Rot on 8-hour specs compared to cross-session Context Resets in `ultracode ralph run`.
  2. *Clean-Room Isolation:* **PASS** — uses durable plugin KV storage scoped per session and server `bootID`.
  3. *Non-Claude Ergonomics:* **FAIL** — requires manual `/goal` slash entry rather than natural conversation continuation in `UltraBuild`.
  4. *Independent Verification:* **FAIL** — `judge.txt` evaluates completion with **zero tools**, judging transcript text instead of running real tests or browser QA via `reviewer` / `visual-evaluator`.
  5. *Clarification Compatibility:* **FAIL** — `kickoff.txt` instructs the model *"do not stop to ask what to do next"*, suppressing upfront `question` cards on ambiguous requirements.
- **Ruling (`Fuse & Harden + Mutual Exclusion`):**
  - Keep `ultracode ralph run` for outer fresh-session Context Resets in linked Git worktrees.
  - Keep `ultracode_checkpoint` for natural-chat milestone continuation after upfront clarification and real subagent verification.
  - **Borrow `/goal`'s best engineering traits:** store checkpoints in durable `ctx.storage` (`checkpoint:<sessionID>`), fence stale checkpoints by `bootID`, enforce `MAX_CHECKPOINT_ROUNDS` (25) and `MAX_CHECKPOINT_STALLS` (3) circuit breakers, surface active milestones with one-click cancel in the Desktop `ComposerPill` across all 6 UN locales, and query `OpencodeGoalRpc` (`opencode.goal`) in `experimental.idle` so `ultracode_checkpoint` automatically defers whenever the user explicitly activates `/goal` on that session.

### Precedent C: `tools.automation.*` (`/automation`) vs. Custom Polling Daemons

- **Upstream candidate:** OpenCode `v2.4.0` native `/automation` (`tools.automation.create` / `delete` / `list`).
- **5-Dimension Score (`5 / 5 PASS` for local scheduled triggers):**
  - Supports durable cron/interval triggers, zero-token `action: { type: "code" }` execution with persistent JSON `state`, silent completion when idle, and on-demand session steering via `send: { prompt }` only when an actionable delta appears.
- **Ruling (`Adopt Natively`):** Never build custom background cron daemons or polling loops inside UltraCode. Use GitHub Actions (`upstream-canary.yml`) for zero-token cloud Issue tracking and native OpenCode `/automation` for local scheduled monitoring.

---

## 5. Local OpenCode v2.4+ `/automation` Zero-Token Watcher Recipe

To schedule a recurring local upstream watcher inside OpenCode `v2.4.0+` that consumes **zero LLM tokens** when upstreams are unchanged and steers your session to run `upstream-stewardship` only when a new release lands, run this inside the `execute` (Code Mode) tool:

```javascript
return await tools.automation.create({
  name: "UltraCode Upstream Release Watcher",
  trigger: {
    type: "every",
    every: "12 hours",
  },
  action: {
    type: "code",
    args: {
      baseline: {
        opencode: "2.4.0",
        opencodePlugin: "2.4.0",
        superpowers: "v7.0.2",
        playwrightMcp: "0.0.86",
        ralph: "53c87ded9fc329b452298f361145d17bf52cac09",
      },
    },
    code: `
      const headers = { "Accept": "application/json", "User-Agent": "ultracode-upstream-watcher" };
      const [ocRelRes, ocSdkRes, spRes, pwRes, ralphRes] = await Promise.all([
        fetch("https://api.github.com/repos/anomalyco/opencode/releases?per_page=20", { headers }),
        fetch("https://registry.npmjs.org/@opencode/plugin/latest", { headers }),
        fetch("https://api.github.com/repos/obra/superpowers/releases/latest", { headers }),
        fetch("https://registry.npmjs.org/@playwright/mcp/latest", { headers }),
        fetch("https://api.github.com/repos/Th0rgal/open-ralph-wiggum/commits?per_page=1", { headers }),
      ]);
      if (!ocRelRes.ok || !ocSdkRes.ok || !spRes.ok || !pwRes.ok || !ralphRes.ok) {
        return { state };
      }
      const ocReleases = await ocRelRes.json();
      const ocV2 = Array.isArray(ocReleases)
        ? ocReleases.find((r) => !r.draft && !r.prerelease && /^v?[2-9]\\./.test(String(r.tag_name || "")))
        : null;
      const ocSdk = await ocSdkRes.json();
      const sp = await spRes.json();
      const pw = await pwRes.json();
      const ralphList = await ralphRes.json();
      const current = {
        opencode: String(ocV2?.tag_name || "").replace(/^v/, ""),
        opencodePlugin: String(ocSdk?.version || ""),
        superpowers: String(sp?.tag_name || ""),
        playwrightMcp: String(pw?.version || ""),
        ralph: String(Array.isArray(ralphList) ? ralphList[0]?.sha || "" : ""),
      };
      const reference = state || args.baseline;
      const diffs = Object.keys(current).filter((k) => current[k] && current[k] !== reference[k]);
      if (diffs.length === 0) {
        return { state: current };
      }
      const summary = diffs.map((k) => k + ": " + reference[k] + " -> " + current[k]).join(", ");
      return {
        state: current,
        send: {
          prompt: "Upstream updates detected (" + summary + "). Load the upstream-stewardship skill and execute the 6-step upstream stewardship protocol.",
        },
      };
    `,
  },
});
```

---

## 6. Dynamic Coupling Discovery Cheat Sheet

Use `glob` and `grep` with these semantic patterns during Step 2 (never hardcode file paths into skills):

- **Baseline & Lock Coordinates:** `glob` `**/upstream-baseline.json`, `**/package.json`, `**/bun.lock`
- **Host Version & CLI Contract:** `grep` `assertSupportedOpenCode`, `opencodeVersion`, `/api/plugin`, `/api/mcp`, `debug.*agents`
- **Plugin SDK Surfaces:** `grep` `@opencode/plugin`, `Rpc\.define`, `experimental\.idle`, `ComposerPill`, `SettingsPage`
- **Agent Frontmatter & Built-in Coexistence:** `glob` `**/agents/**/*.md`; `grep` `codemode`, `opencode\.goal`, `opencode\.browser`, `ultracode_playwright`
- **6-Locale Copy & Docs:** `glob` `README*.md`, `docs/**/*.md`, `website/content/**/*`, `scripts/generate-brand-assets.ts`
