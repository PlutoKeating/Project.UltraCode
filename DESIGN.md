# Design System — UltraCode

<!-- impeccable:design-schema 1 -->

## Visual World

**Vapor-Noir Smoked Glass** — restrained, architectural dark craft inspired by *TRON: Legacy* and *Cyberpunk 2077* (Neo-Militarism), grounded in smoked-glass surfaces, surgical 1px hairlines, pure high-contrast off-white typography, and a single disciplined ice-cyan signal color. Zero glowing text, zero neon outer boxes, zero clipart.

- **Landing page (`/` & `/en/`)**: Dark-first Persuade surface with subtle distant cyan-violet horizon mist behind a split smoked-glass TUI + Browser showcase.
- **Documentation (`/docs/*` & `/en/docs/*`)**: Starlight Read surface defaulting to the same obsidian dark palette, with an optional clean alabaster light theme for daylight reading.

## Color Tokens

All dark backgrounds, surfaces, sidebars, code blocks, and diagram plates strictly use **zero-saturation (`S = 0%`, `R = G = B`) pure neutral black and charcoal grays**. Chromatic color is reserved strictly for ambient horizon glow and functional signal accents.

| Role | Dark Token | Hex / Value | Usage |
| --- | --- | --- | --- |
| Void ground | `--uc-void` | `#050505` | Page canvas |
| Surface | `--uc-surface` | `#0a0a0a` | Sidebar, recessed panels |
| Elevated surface | `--uc-surface-elevated` | `#121212` | Cards, diagram plates |
| Smoked glass | `--uc-glass` | `rgba(14, 14, 14, 0.8)` | Command bars, hero showcase |
| Hairline border | `--uc-border` | `rgba(255, 255, 255, 0.085)` | Structural 1px dividers |
| Primary ink | `--uc-ink` | `#f5f5f5` | Headlines, active text |
| Secondary ink | `--uc-ink-secondary` | `#a3a3a3` | Subtitles, captions |
| Muted ink | `--uc-ink-muted` | `#737373` | Metadata, inactive labels |
| Primary signal | `--uc-cyan` | `#22d3ee` | Active path, CTA, Goal Engineering track |
| Drift contrast | `--uc-coral` | `#e05a7a` | Ordinary chat failure/drift track only |
| Verified state | `--uc-emerald` | `#34d399` | Visual QA pass & completed milestones |

Light mode (docs only): `#f7f8fa` ground, `#ffffff` sidebar, `#0f172a` primary ink, `#0284c7` primary accent, `#e2e8f0` hairlines.

## Typography

- **Display & UI**: `Sora` (self-hosted via `@fontsource/sora` weights 400–700) paired with system CJK sans (`PingFang SC`, `Hiragino Sans GB`, `Noto Sans SC`, `Microsoft YaHei`).
- **Code & Commands**: `JetBrains Mono` (self-hosted via `@fontsource/jetbrains-mono` weights 400–500).
- **Scale & Tracking**: Display headlines `clamp(2.4rem, 5vw, 3.85rem)` at `-0.035em`; section headings `clamp(1.55rem, 2.8vw, 2.15rem)` at `-0.025em`; `font-variant-numeric: tabular-nums`.

## Diagram & Visual-First Discipline

Every core concept is communicated through custom inline SVG schematics (`website/src/components/diagrams/*.astro`) wrapped in `.uc-doc-figure` plates inside docs, following a strict hierarchy: crisp SVG diagram > real UI preview > single concise sentence.
