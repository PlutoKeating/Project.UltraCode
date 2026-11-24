# UltraCode Website Hands-On Tutorials ("使用教程") Design

- **Date**: 2026-11-24
- **Status**: Approved & In Implementation (Stage 1: `zh` + `en` Exemplar; Stage 2: Full 6-Locale Rollout after User Preview)
- **Branch**: `feature/website-hands-on-tutorials`

---

## 1. Intent and the Why

UltraCode's existing 7 documentation pages cover Quick Start (`getting-started`), Explanation (`goal-engineering`, `roles-and-workflow`, `long-running`, `visual-qa`), and Reference (`controls-and-maintenance`, `faq`). While clean and reassuring, they read more like capability overviews than step-by-step **learning-by-doing tutorials** (Diátaxis *Tutorials* quadrant).

Everyday users — especially non-coders and people uncomfortable with terminal commands — need:
1. **Immediate Visual Anchoring**: Real screenshots of the actual UltraCode product screens (OpenCode Desktop/GUI window, Terminal TUI chat box, Mobile paired screen & QR flow) with crisp numbered highlight callouts showing *where to look and click*.
2. **Progressive Mastery**: A 5-part sequence inserted between **Core Capabilities (`核心能力`)** and **Controls & FAQ (`控制与维护`)**, progressing smoothly from the friendliest Desktop GUI entry point → friendly Terminal chat → Mobile remote steering → Blueprint-first & auto-browser QA → Long-running autopilot & fast/deep model pairing.
3. **Relatable Zero-Code Micro-Cases**: Short, concrete tasks (a weekend book-club sign-up page, tidying messy meeting notes in a folder, approving choices from a phone on the couch) with copyable plain-language sentences and explicit *"What you will see"* confirmation lines.
4. **Ruthless Brevity**: 3–4 steps per page (~90–120 seconds reading time), zero JSON config snippets, zero source file paths, zero programmer prerequisites.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
1. Preserve 100% of existing 7 documentation pages untouched.
2. Insert a new Starlight sidebar group **Hands-On Tutorials (`使用教程`)** between **Core Capabilities (`核心能力`)** and **Controls & FAQ (`控制与维护`)** with 5 progressive tutorials:
   - `docs/tutorial-desktop`: Desktop App Walkthrough — build a mini event sign-up page with zero commands.
   - `docs/tutorial-terminal`: Terminal Mode Without Fear — tidy a folder of messy notes just by chatting.
   - `docs/tutorial-mobile`: Phone & Browser Remote Control — scan QR and steer or approve from anywhere.
   - `docs/tutorial-plan-and-verify`: Power Trick 1 — lock a read-only blueprint (`Shift+Tab`), build, and let UltraCode click-test the real page + `/review`.
   - `docs/tutorial-goals-and-models`: Power Trick 2 — multi-step `/goal` autopilot, one-click pill pause/resume, next-day handoff continuation, and `/setup-models` smart model pairing.
3. Capture genuine 2× Retina (`WebP`) product screenshots from isolated clean-room OpenCode `v2.4.1` + UltraCode `v1.2.0` instances via a reproducible Playwright capture script (`website/scripts/capture-tutorial-shots.mjs`) without touching the host's live OpenCode session.
4. Build two reusable, accessible, Precision-Cinema-Monochrome Astro components:
   - `AnnotatedShot.astro`: Renders a real product screenshot with percentage-positioned `#E5A03D` (Tungsten Amber) / `#BAE6FD` (Optical Ice) hairline highlight frames, numbered tabular pins (`1`, `2`, `3`), and a localized legend strip below.
   - `TutorialStep.astro`: Enforces the 4-part step rhythm (*Step number + plain action title → AnnotatedShot → optional copyable plain-language prompt box → "What you'll see" outcome confirmation*).
5. Deliver Stage 1 in **Simplified Chinese (`/zh/docs/tutorial-*`)** and **English (`/docs/tutorial-*`)** with a live `astro dev` server on port `4321` for interactive user review before rolling out Stage 2 (`ar` RTL, `fr`, `ru`, `es`).

### Non-Goals (Stage 1)
- Translating the 5 new tutorials into `ar`, `fr`, `ru`, `es` before the user reviews and approves the Chinese/English exemplar in live preview (Starlight's `defaultLocale: "root"` serves clean fallback routes in the meantime).
- Modifying any existing landing page or existing 7 doc pages.

### Anti-Goals (Failure Conditions)
- **Programmer Gatekeeping or Jargon**: Mentioning JSONC keys, environment variables, `chmod`, `sudo`, Git internals, or source file paths inside tutorials.
- **Wall-of-Text Bloat**: Exceeding 4 steps per tutorial or writing multi-paragraph theoretical lectures inside steps.
- **Design-System Violations (`docs/design/DESIGN.md` & `craft-floor.md`)**: Crude `#FF0000` MS-Paint boxes, nested card-in-card containers, kickers/eyebrows above headings, `>1px` colored side borders, zero-offset neon glows, or Unicode emoji icons.

---

## 3. Selected Architecture

- **Screenshot Generation (`website/scripts/capture-tutorial-shots.mjs`)**: Boots an isolated OpenCode `v2.4.1` + UltraCode `v1.2.0` sandbox in `/tmp/opencode`, opens real OpenCode GUI/Web views (desktop `1280×800` @ `2x` and mobile `390×844` @ `2x`) plus crisp terminal TUI & QR pairing views in headless Playwright Chromium, and writes optimized assets to `website/public/tutorials/*.webp`.
- **Overlay & Step Components (`website/src/components/tutorials/AnnotatedShot.astro`, `TutorialStep.astro`)**: Pure Astro + scoped CSS using `--uc-*` tokens (`#000000`, `#0a0a0a`, `1px` hairlines, `#e5a03d`, `#bae6fd`, `Sora`, `JetBrains Mono`), RTL-safe logical properties, and client-side one-click prompt copy feedback.
- **Content Sync (`website/scripts/sync-content.mjs`, `website/astro.config.mjs`)**: Registers the 5 tutorial slugs in `DOC_ORDER` (updating `/llms.txt` & `/llms-full.txt` cleanly while stripping `<TutorialStep>`/`<AnnotatedShot>` JSX wrappers to readable Markdown) and adds the 6-locale translated group label in `astro.config.mjs`.
