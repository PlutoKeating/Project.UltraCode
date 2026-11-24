# Website Hands-On Tutorials (Stage 1: ZH + EN Exemplar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a concise, beginner-friendly 5-part "Hands-On Tutorials / 使用教程" section (with real isolated UltraCode product screenshots and brand-aligned numbered highlight callouts) between "Core Capabilities" and "Controls & FAQ" in Simplified Chinese and English while keeping a live `astro dev` server running on port `4321`.

**Architecture:** Reproducible clean-room Playwright screenshot generator (`website/scripts/capture-tutorial-shots.mjs`) saves real `2x` WebP captures of UltraCode's Desktop/Web GUI, Terminal TUI, and Mobile paired surfaces to `website/public/tutorials/`. Reusable `AnnotatedShot.astro` and `TutorialStep.astro` components render percentage-positioned `#E5A03D` / `#BAE6FD` callout boxes, numbered pins, copyable plain-language prompt bars, and expected-outcome confirmations across 5 new MDX pages in `website/content/{zh,root}/docs/tutorial-*.mdx`.

**Tech Stack:** Astro `7.4`, `@astrojs/starlight` `0.43`, Playwright Chromium (isolated `/tmp/opencode` sandbox), CSS custom properties (`tokens.css` / `custom.css`).

**Spec:** `docs/superpowers/specs/2026-11-24-website-tutorials-design.md`

## Global Constraints

- **Preserve Existing Content:** Do NOT alter the prose or layout of the existing 7 documentation pages or landing pages.
- **Zero-Jargon, Non-Coder Audience:** Assume zero coding or command-line background; max 3–4 steps per tutorial; zero JSON keys, env vars, or internal source paths.
- **Design Craft Floor (`DESIGN.md` & `craft-floor.md`):** Pitch-black `#000000` / `#0a0a0a` surfaces, `1px` hairlines (`rgba(255,255,255,0.08)`), `#E5A03D` / `#BAE6FD` callout accents, real SVG icons (zero emoji icons), zero nested cards, zero kickers above headings, zero `>1px` colored side borders.
- **Host Isolation & Git Attribution (`AGENTS.md`):** Capture all screenshots in isolated `/tmp/opencode` sandboxes without touching host `~/.config/opencode`; commit solely as `PlutoKeating <PlutoKeating@outlook.com>` with zero `Co-authored-by` trailers and zero untracked files.
- **Live Dev Server:** Keep `astro dev` running continuously on `http://127.0.0.1:4321` and run `npm --prefix website run sync` after content updates so changes hot-reload immediately.

## Review Focus

1. **Callout box alignment across Desktop & Mobile viewports:** `AnnotatedShot.astro` must position highlight rectangles inside an `aspect-ratio` / intrinsic image wrapper (`position: relative; display: block`) where the `<img>` fills `width: 100%; height: auto; display: block` with zero padding inside the coordinate frame, so percentage `x/y/w/h` boxes hug the exact UI targets identically at `1440px` and `390px`.
2. **Starlight `.sl-markdown-content` margin inheritance:** Starlight injects `margin-top` on nested `<p>`, `<div>`, and `<span>` inside MDX unless scoped or guarded with `not-content`; `AnnotatedShot` and `TutorialStep` must use `not-content` where appropriate so callout pins and legend items never shift vertically.
3. **`sync-content.mjs` `/llms-full.txt` MDX stripping:** Importing `TutorialStep` and `AnnotatedShot` in MDX must not leak raw JSX tags or empty blocks into `/llms-full.txt`.
4. **Starlight fallback routes for Stage 1:** Having the 5 new `tutorial-*.mdx` files in `content/root/docs/` and `content/zh/docs/` (prior to Stage 2 `ar/fr/ru/es` rollout) must pass `astro check` and `astro build` with zero broken sidebar links across all 6 locales.
5. **Impeccable mechanical design detector:** Running `impeccable detect --json` on the new tutorial components and styles must report zero design-floor violations.

---

### Task 1: Commit Design Spec & Implementation Plan

**Files:**
- Create: `docs/superpowers/specs/2026-11-24-website-tutorials-design.md`
- Create: `docs/superpowers/plans/2026-11-24-website-tutorials-v1.md`

- [ ] **Step 1: Commit spec and plan to `feature/website-hands-on-tutorials`**

Run: `git add docs/superpowers/specs/2026-11-24-website-tutorials-design.md docs/superpowers/plans/2026-11-24-website-tutorials-v1.md && git commit -m "docs(plans): add website Hands-On Tutorials design spec and Stage 1 plan"`
Expected: Clean commit on `feature/website-hands-on-tutorials`.

---

### Task 2: Reusable `<AnnotatedShot>` & `<TutorialStep>` Astro Components + Navigation Wiring

**Files:**
- Create: `website/src/components/tutorials/AnnotatedShot.astro`
- Create: `website/src/components/tutorials/TutorialStep.astro`
- Modify: `website/tsconfig.json` (add `@tutorials/*` path alias if aliases live there)
- Modify: `website/astro.config.mjs` (insert `Hands-On Tutorials` / `使用教程` sidebar group between `Core Capabilities` and `Controls & FAQ`)
- Modify: `website/scripts/sync-content.mjs` (include the 5 `tutorial-*` slugs in `DOC_ORDER` and clean JSX component tags cleanly for `llms-full.txt`)

**Interfaces:**
- `AnnotatedShot.astro` props:
  ```ts
  export interface CalloutBox {
    id: number;
    x: number; // percentage 0..100 from left
    y: number; // percentage 0..100 from top
    w: number; // percentage width
    h: number; // percentage height
    tone?: "amber" | "ice";
    label: string;
  }
  export interface Props {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    mobileFrame?: boolean;
    callouts?: CalloutBox[];
  }
  ```
- `TutorialStep.astro` props:
  ```ts
  export interface Props {
    step: number;
    title: string;
    promptLabel?: string;
    promptText?: string;
    copyLabel?: string;
    copiedLabel?: string;
    expectLabel?: string;
    expectText?: string;
  }
  ```

- [ ] **Step 1: Implement `AnnotatedShot.astro` and `TutorialStep.astro` obeying `DESIGN.md` and `craft-floor.md`**
- [ ] **Step 2: Update `website/tsconfig.json`, `website/astro.config.mjs`, and `website/scripts/sync-content.mjs`**
- [ ] **Step 3: Commit component & config foundation**

---

### Task 3: Clean-Room Real Product Screenshot Capture (`capture-tutorial-shots.mjs`)

**Files:**
- Create: `website/scripts/capture-tutorial-shots.mjs`
- Create: `website/public/tutorials/*.webp` (high-DPI genuine product screenshots)

**Interfaces:**
- Produces crisp `2x` WebP captures in `website/public/tutorials/` covering all 5 tutorials:
  1. Desktop GUI home & workspace composer + **UltraCode** pill (`desktop-home.webp`, `desktop-choice-card.webp`, `desktop-pill-menu.webp`, `desktop-result-preview.webp`)
  2. Terminal TUI clean chat, folder summary result, and `/` quick command menu (`tui-welcome.webp`, `tui-folder-tidy.webp`, `tui-slash-menu.webp`)
  3. Mobile pairing QR + real mobile `390×844` responsive interface with choice card & `/approvals` (`/direction`) control (`mobile-pair-qr.webp`, `mobile-remote-control.webp`)
  4. `UltraPlan` (`Shift+Tab`) blueprint view + real Chromium Desktop/Mobile visual inspection + `/review` (`plan-mode-switch.webp`, `visual-browser-check.webp`)
  5. `/goal` active progress pill (`Pause` / `Resume` / `Clear`), next-day handoff resume, and `/setup-models` model pairing (`goal-autopilot-pill.webp`, `setup-models-card.webp`)

- [ ] **Step 1: Write and run `website/scripts/capture-tutorial-shots.mjs` inside an isolated `/tmp/opencode` sandbox**
- [ ] **Step 2: Visually inspect every generated `.webp` screenshot with `read` to verify exact UI element coordinates for callout boxes**
- [ ] **Step 3: Commit capture script and optimized `website/public/tutorials/*.webp` assets**

---

### Task 4: Author All 5 Progressive Tutorials in Simplified Chinese (`zh`) and English (`root`)

**Files:**
- Create: `website/content/zh/docs/tutorial-desktop.mdx` & `website/content/root/docs/tutorial-desktop.mdx`
- Create: `website/content/zh/docs/tutorial-terminal.mdx` & `website/content/root/docs/tutorial-terminal.mdx`
- Create: `website/content/zh/docs/tutorial-mobile.mdx` & `website/content/root/docs/tutorial-mobile.mdx`
- Create: `website/content/zh/docs/tutorial-plan-and-verify.mdx` & `website/content/root/docs/tutorial-plan-and-verify.mdx`
- Create: `website/content/zh/docs/tutorial-goals-and-models.mdx` & `website/content/root/docs/tutorial-goals-and-models.mdx`

- [ ] **Step 1: Write all 5 Chinese (`zh`) and 5 English (`root`) tutorials with verified `AnnotatedShot` coordinates, copyable plain-language prompts, and zero technical jargon**
- [ ] **Step 2: Run `npm --prefix website run sync`, `npm --prefix website run check`, and `npm --prefix website run build`**
- [ ] **Step 3: Commit Stage 1 tutorial content**

---

### Task 5: Mechanical Design Audit, Independent `visual-evaluator` Browser QA & Live Preview Verification

**Files:**
- Verify: `website/src/components/tutorials/*.astro`, `website/content/{zh,root}/docs/tutorial-*.mdx`

- [ ] **Step 1: Run `/home/pluto/.config/opencode/skills/impeccable/scripts/impeccable detect --json` on new components**
- [ ] **Step 2: Dispatch independent `ultracode/visual-evaluator` against live `http://127.0.0.1:4321` across desktop (`1440×900`) and mobile (`390×844`) viewports on all 5 `/zh/docs/tutorial-*` and `/docs/tutorial-*` routes**
- [ ] **Step 3: Resolve any visual or callout-alignment findings, re-sync live `dev` server on port `4321`, commit cleanly, and report preview URLs to user**
