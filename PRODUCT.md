# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Primary users: developers, technical founders, and builders using official OpenCode V2 who want their AI coding agent to finish multi-step software goals reliably instead of drifting, losing context, or declaring victory prematurely.
- Situation & job: They install UltraCode in one command, open a project in OpenCode, describe what they want in plain natural language (audience, behavior, acceptance criteria), and expect UltraCode to research, clarify ambiguities upfront, plan, execute with specialized subagents, visually verify UI in a real browser, and hand off cleanly across long-running sessions.
- Crucial audience reality: First-time visitors and everyday users care about **what UltraCode does for them**, not internal source filenames, JSONC keys, environment variables, or implementation plumbing.

## Product Purpose

UltraCode is a non-invasive, provider- and model-neutral **Goal Engineering** enhancement layer for official OpenCode V2. Following Prompt Engineering and Context Engineering, Goal Engineering focuses on keeping AI coding agents aligned to durable, verifiable user goals across long-running work.

Success for the website means a first-time visitor understands what UltraCode does within seconds on the first viewport, copies the one-line install command, jumps straight into beginner-friendly visual documentation, runs one minimal example ("build and visually self-verify a real page from a single sentence"), and immediately feels that OpenCode just got dramatically stronger.

## Positioning

- **Goal Engineering over one-shot prompting**: Instead of guessing or stopping half-way, UltraCode researches first, asks batched clarifying questions upfront, orchestrates specialized roles (`UltraBuild`, `UltraPlan`, and 5 background subagents), verifies real browser UI visually, and persists milestones/handoffs so long tasks stay on track.
- **Zero lock-in, zero intrusion**: Does not modify the official OpenCode binary, never touches provider credentials or API keys, works with whatever model the user already uses in OpenCode, and merges cleanly without overwriting existing user configs.
- **Independent verification built in**: Separate skeptical code review and real headless-browser visual inspection prevent the agent from rubber-stamping its own work.

## Operating Context

- Installed via one command on Linux/macOS (`curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash`) on top of official OpenCode V2.3.2+.
- Operated inside the official OpenCode TUI through plain natural language; `Shift+Tab` switches between `UltraBuild` (default orchestrator) and `UltraPlan` (read-only planner).
- Command Palette ("UltraCode") provides two independent live switches: Command approvals (default auto) and Direction questions (default manual).
- Maintained with simple CLI commands (`uc up`, `uc sync`, `uc doctor`, `uc uninstall --yes`).
- Website & docs live in `website/` (Astro + Starlight), bilingual Chinese (default `/`) and English (`/en/`), deployed to Cloudflare Workers Static Assets at `https://ultracode.plutokeating.beer`.

## Capabilities and Constraints

- Confirmed v0.2.2 capabilities:
  - Primary roles: `UltraBuild` (default orchestrator & builder) and `UltraPlan` (read-only planner), switched via `Shift+Tab`.
  - Five specialized background subagents: Architect, Implementer, Librarian (research), Reviewer (independent code review), Visual Evaluator (real Chromium browser visual QA).
  - Conversation-driven Goal Engineering continuation (`ultracode_checkpoint` milestone arming, automatic continuation when idle, immediate steering/stop on new user input, repo-stored task/progress/handoff files for resumption after restarts).
  - TUI Command Palette controls for Command approvals (`auto`/`manual`) and Direction questions (`manual`/`auto`).
  - Superpowers engineering discipline, Ralph fresh-context loop for isolated long runs, Playwright visual QA, non-invasive config merging, and clean uninstall.
- Constraints:
  - Provider/model neutral; never claims specific model partnerships or benchmarks.
  - Website copy must avoid exposing internal source paths, JSONC keys, variable names, or developer plumbing to everyday users.
  - Visual-first communication hierarchy: crisp SVG diagrams/interactive illustrations > real screenshots > concise one-line text; never walls of text.
  - Custom Astro landing page (`/` and `/en/`) paired with streamlined beginner-focused Starlight documentation (6-7 sequential visual guides per language; maintainer/architecture/deployment docs stay in repository `docs/`).

## Brand Commitments

- Name: **UltraCode** (CLI shorthand: `uc`).
- Binding visual direction specified by user: **Restrained, cool, sharp-edged neo-vaporwave / neon-future aesthetic inspired by Cyberpunk 2077 (Neo-Militarism) and TRON Legacy** — dark obsidian/deep-space base, sharp geometric lines, restrained neon cyan primary signal, crisp hierarchy, zero garish clutter; dark-first landing page and docs with optional light mode in docs reading pages.
- Bilingual parity: Chinese (zh-CN, root `/`) and English (`/en/`).

## Evidence on Hand

- Live install URL: `https://ultracode.plutokeating.beer/install.sh` (served from `website/public/install.sh`).
- Latest public release: `v0.2.2` (`https://github.com/PlutoKeating/Project.UltraCode`).
- Minimal onboarding proof scenario: Building and visually self-verifying a real interactive page from one plain-language sentence (research + batched questions → plan + subagent build → real browser visual check & fix → clean Git commit).
- Absences (must not fabricate): No customer logos, paid tiers, third-party testimonials, or synthetic speed/accuracy benchmark numbers.

## Product Principles

1. **Goal Engineering, not prompt gymnastics**: Frame every feature around durable user outcomes, not internal agent plumbing.
2. **One diagram beats a thousand words**: Explain workflows, before/after differences, and concepts through clear SVG diagrams first and single-sentence captions second.
3. **Zero jargon for everyday users**: Never show internal filenames, JSONC keys, or config internals on user-facing pages when a plain outcome or visual works better.
4. **Immediate time-to-magic**: Put the one-line install and the path to the first "wow, OpenCode just got way stronger" moment front and center.
5. **Non-invasive trust**: Make clear that UltraCode respects the user's existing OpenCode setup, models, keys, and configs.
