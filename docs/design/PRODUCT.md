# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Primary users: builders, engineers, designers, creators, and knowledge workers across macOS, Linux, and Windows who want an AI agent across Terminal, Desktop App, Web, and Mobile that finishes multi-step goals reliably instead of drifting, losing context, or declaring victory prematurely.
- Situation & job: They install UltraCode in one command (which automatically sets up official OpenCode V2 if needed), open `ultracode`, `ultracode desktop`, or `ultracode pair`, describe what they want in plain natural language (audience, behavior, acceptance criteria), and expect UltraCode to clarify ambiguities upfront, execute with specialized subagents, verify UI visually in a real browser, and hand off cleanly across long-running sessions.
- Crucial audience reality: First-time visitors and everyday users care about **what UltraCode does for them**, not internal source filenames, JSONC keys, environment variables, or implementation plumbing.

## Product Purpose

UltraCode is a non-invasive, provider- and model-neutral **Goal Engineering** product built on official OpenCode V2. Following Prompt Engineering and Context Engineering, Goal Engineering keeps AI agents aligned to durable, verifiable user goals across long-running work.

Success for the website means a first-time visitor on macOS, Linux, or Windows understands what UltraCode does within seconds on the first viewport, copies the one-line install command for their OS, sees the three unified entry points (`ultracode`, `ultracode desktop`, `ultracode pair`), jumps straight into beginner-friendly visual documentation, and immediately feels that OpenCode just got dramatically stronger.

## Positioning

- **Goal Engineering over one-shot prompting**: Clarifies upfront, orchestrates specialized roles (`UltraBuild`, `UltraPlan`, and 5 background subagents), verifies real browser UI visually, and persists milestones/handoffs so long tasks stay on track.
- **One command, every platform & surface**: Single `ultracode` command with full `opencode` CLI parity, native Windows/macOS/Linux support, zero-prerequisite setup, and live-synced controls across Terminal, Desktop, Web, and Mobile.
- **Zero lock-in, zero intrusion**: Never modifies official OpenCode binaries, never touches provider credentials or API keys, works with whatever model the user already uses, and merges cleanly without overwriting existing user configs.

## Operating Context

- Installed via one command on macOS/Linux (`curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash`) or Windows PowerShell (`irm https://ultracode.plutokeating.beer/install.ps1 | iex`).
- Launched via `ultracode` (Terminal), `ultracode desktop` (Desktop app), or `ultracode pair` (Browser & Mobile).
- Live switches for Command approvals (default auto) and Direction questions (default manual) synced via RPC across OpenCode Desktop (`UltraCode` composer pill + `Settings > UltraCode`), TUI Command Palette, and Web/Mobile (`/approvals` and `/direction`).
- Maintained with `ultracode upgrade`, `ultracode sync`, `ultracode doctor`, `ultracode uninstall --yes`.
- Website & docs live in `website/` (Astro + Starlight), covering all 6 UN official languages with English default (`/`) plus `/zh/`, `/ar/` (RTL), `/fr/`, `/ru/`, and `/es/`, deployed to Cloudflare Workers Static Assets at `https://ultracode.plutokeating.beer`.

## Capabilities and Constraints

- Confirmed v1.2.0 capabilities:
  - Unified `ultracode` CLI with full `opencode` passthrough, zero-prerequisite OpenCode V2 (`v2.3.2+`, verified on `v2.4+`) auto-install/upgrade, `ultracode desktop` launcher, and cross-platform TS-native `ultracode ralph run`.
  - Native 6-target standalone builds (`linux`/`darwin`/`windows` × `x64`/`arm64`) plus minimalist `install.sh` and `install.ps1`.
  - Multi-surface `ultracode-conversation` plugin package: durable session milestone continuation with circuit breakers and official `/goal` coexistence, Server RPC (`UltraCodeRpc` including `clearCheckpoint`) + `/approvals` & `/direction` commands for Web/Mobile, TUI Command Palette + quiet footer status, and 6-language OpenCode Desktop GUI (`ComposerPill` with contextual next-milestone clear action, `SettingsPage`, `Command`).
  - Primary roles `UltraBuild` and `UltraPlan` (`Shift+Tab`), plus 5 specialized background subagents (Architect, Implementer, Librarian, Reviewer, Visual Evaluator).
- Constraints:
  - Provider/model neutral; never claims specific model partnerships or benchmarks.
  - Website copy must avoid exposing internal source paths, JSONC keys, variable names, or developer plumbing to everyday users.
  - Visual-first communication hierarchy: crisp SVG diagrams/interactive illustrations > real screenshots > concise one-line text; never walls of text.

## Brand Commitments

- Name: **UltraCode** (command: `ultracode`).
- Visual direction: **Precision Cinema Monochrome** (`docs/design/DESIGN.md`) — pitch-black `#000000` canvas, 1px architectural hairlines, Sora + JetBrains Mono, pure white primary actions, and restrained Ice-White (`#BAE6FD`) + Tungsten Amber (`#E5A03D`) optical accents.
- Multilingual parity: 6 UN official languages — English (root `/`), Simplified Chinese (`/zh/`), Arabic (`/ar/`, RTL), French (`/fr/`), Russian (`/ru/`), and Spanish (`/es/`).

## Evidence on Hand

- Live install URLs: `https://ultracode.plutokeating.beer/install.sh` and `https://ultracode.plutokeating.beer/install.ps1`.
- Latest public release: `v1.2.0` (`https://github.com/PlutoKeating/Project.UltraCode`), built with UltraCode `v1.0.0`.
- Absences (must not fabricate): No customer logos, paid tiers, third-party testimonials, or synthetic speed/accuracy benchmark numbers.

## Product Principles

1. **Goal Engineering, not prompt gymnastics**: Frame every feature around durable user outcomes, not internal agent plumbing.
2. **One diagram beats a thousand words**: Explain workflows, before/after differences, and concepts through clear SVG diagrams first and single-sentence captions second.
3. **Zero jargon for everyday users**: Never show internal filenames, JSONC keys, or config internals on user-facing pages when a plain outcome or visual works better.
4. **Immediate time-to-magic**: Put the one-line install and unified entry points front and center.
5. **Non-invasive trust**: Respect the user's existing OpenCode setup, models, keys, and configs.
