# Design System — UltraCode

<!-- impeccable:design-schema 1 -->

## Visual World

**Precision Cinema Monochrome (GMUNK × Linear Industrial Craft)** — 96% strictly zero-saturation (`S = 0%`) pitch-black `#000000` architecture, hairline 1px grids, weight-500 tight-tracked display typography, pure white `#FFFFFF` primary actions, and fine monochrome film grain, paired with 4% restrained **Ice-White (`#BAE6FD`) + Warm Tungsten Amber (`#E5A03D`)** optical light blades and industrial signal ticks. Zero outer gray card boxes, zero Tailwind neon paint, zero plastic glows.

## Color Tokens

| Role | Token | Hex / Value | Usage |
| --- | --- | --- | --- |
| Void ground | `--uc-void` | `#000000` | Primary page canvas (strictly S = 0%) |
| Sidebar ground | `--uc-surface` | `#060606` | Docs sidebar (strictly S = 0%) |
| Elevated surface | `--uc-surface-elevated` | `#0e0e0e` | Code blocks & smoked glass (strictly S = 0%) |
| Hairline border | `--uc-hairline` | `rgba(255, 255, 255, 0.075)` | Structural 1px architectural divisions |
| Primary ink / CTA | `--uc-ink` | `#ffffff` | Headlines, active text, primary solid button |
| Secondary ink | `--uc-ink-secondary` | `#8a8a8a` | Subtitles, prose support |
| Muted ink | `--uc-ink-muted` | `#525252` | Coordinates, inactive ticks |
| Optical ice | `--uc-ice` | `#bae6fd` | Optical light rim, verified QA dot, active track |
| Tungsten amber | `--uc-amber` | `#e5a03d` | Industrial prompt caret, drift warning, manual mode |

## Typography & Layout Discipline

- **Display & UI**: `Sora` (self-hosted `@fontsource/sora`, weights 400–600 — deliberately avoiding heavy 700 bold) paired with system CJK sans.
- **Mono**: `JetBrains Mono` (self-hosted `@fontsource/jetbrains-mono`, weights 400–500).
- **Hairlines, not boxes**: All SVG diagrams sit directly on transparent `#000000` canvas anchored by 1px architectural hairlines and `+` crosshairs. Hero showcase fades seamlessly into `#000000` via bottom `mask-image` and catches directional top-edge specular light.
