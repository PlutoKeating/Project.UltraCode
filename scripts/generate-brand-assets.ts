import { execFileSync } from "node:child_process";
import { cp, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DIAGRAMS_COPY, LOCALES, LOCALE_META, type Locale } from "../website/src/i18n/ui";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const assetsRoot = join(repoRoot, "docs/assets");
const publicRoot = join(repoRoot, "website/public");

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bidi(lang: Locale, s: string): string {
  const escaped = esc(s);
  return lang === "ar" ? `\u202B${escaped}\u202C` : escaped;
}

async function resolveChromeBinary(): Promise<string> {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  for (const cmd of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try {
      const found = execFileSync("which", [cmd], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (found) return found;
    } catch {
      // Try next candidate
    }
  }
  const cacheDirs = [
    join(homedir(), ".cache/ms-playwright"),
    join(homedir(), "Library/Caches/ms-playwright"),
  ];
  for (const base of cacheDirs) {
    try {
      const entries = (await readdir(base)).filter((d) => d.startsWith("chromium-")).sort().reverse();
      for (const entry of entries) {
        for (const rel of [
          "chrome-linux64/chrome",
          "chrome-linux/chrome",
          "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
        ]) {
          const candidate = join(base, entry, rel);
          try {
            const st = await stat(candidate);
            if (st.isFile()) return candidate;
          } catch {
            // Continue searching
          }
        }
      }
    } catch {
      // Cache dir absent
    }
  }
  throw new Error("Could not locate a headless Chromium binary. Set CHROME_BIN=/path/to/chrome.");
}

const SANS_STACK =
  "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', 'Ubuntu Sans', 'Noto Sans Arabic', 'Geeza Pro', 'SF Arabic', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC', 'Noto Sans CJK TC', 'Microsoft YaHei', sans-serif";
const MONO_STACK =
  "'JetBrains Mono', SFMono-Regular, Menlo, Consolas, 'Noto Sans Arabic', 'Geeza Pro', 'SF Arabic', 'PingFang SC', 'Noto Sans CJK SC', 'Noto Sans CJK TC', 'DejaVu Sans Mono', ui-monospace, monospace";

const BANNER_COPY: Record<
  Locale,
  {
    title: string;
    titleSize: number;
    ogTitleLines: [string, string];
    sub: string;
    surfaces: string;
    neutral: string;
    built: string;
    domain: string;
  }
> = {
  en: {
    title: "State the Goal. Ship Verified Work.",
    titleSize: 40,
    ogTitleLines: ["State the Goal.", "Ship Verified Work."],
    sub: "End-to-end Goal Engineering for official OpenCode V2 across macOS, Linux & Windows",
    surfaces: "Terminal · Desktop · Web · Mobile",
    neutral: "Provider & Model Neutral · Zero Binary Patching",
    built: "Built with UltraCode v1.0.0",
    domain: "ultracode.plutokeating.beer",
  },
  zh: {
    title: "说清目标，稳妥交付",
    titleSize: 42,
    ogTitleLines: ["说清目标", "稳妥完成工程交付"],
    sub: "基于官方 OpenCode V2 构建 · 原生支持 macOS、Linux 与 Windows",
    surfaces: "终端 · 桌面端 · 网页 · 手机端",
    neutral: "模型与服务商中立 · 零二进制修改",
    built: "使用 UltraCode v1.0.0 辅助开发与构建",
    domain: "ultracode.plutokeating.beer/zh",
  },
  ar: {
    title: "حدّد الهدف. واستلم عملاً مُتحقَّقاً منه.",
    titleSize: 38,
    ogTitleLines: ["حدّد الهدف.", "واستلم عملاً مُتحقَّقاً منه."],
    sub: "هندسة أهداف متكاملة لمنصة OpenCode V2 الرسمية على macOS وLinux وWindows",
    surfaces: "الطرفية · سطح المكتب · الويب · الهاتف",
    neutral: "محايد للنماذج والمزوّدين · دون تعديل الثنائيات",
    built: "طُوِّر وبُنِيَ بمساعدة UltraCode v1.0.0",
    domain: "ultracode.plutokeating.beer/ar",
  },
  fr: {
    title: "Exprimez l’objectif. Livrez du concret vérifié.",
    titleSize: 33,
    ogTitleLines: ["Exprimez l’objectif.", "Livrez du concret vérifié."],
    sub: "Ingénierie d’objectifs de bout en bout pour OpenCode V2 sur macOS, Linux et Windows",
    surfaces: "Terminal · Bureau · Web · Mobile",
    neutral: "Neutre modèles & fournisseurs · Zéro patch binaire",
    built: "Conçu et construit avec UltraCode v1.0.0",
    domain: "ultracode.plutokeating.beer/fr",
  },
  ru: {
    title: "Опишите цель. Получите проверенный результат.",
    titleSize: 32,
    ogTitleLines: ["Опишите цель.", "Получите проверенный результат."],
    sub: "Сквозная инженерия целей на базе официального OpenCode V2 для macOS, Linux и Windows",
    surfaces: "Терминал · Десктоп · Веб · Телефон",
    neutral: "Независимость от моделей · Без патчей бинарников",
    built: "Разработано и собрано на UltraCode v1.0.0",
    domain: "ultracode.plutokeating.beer/ru",
  },
  es: {
    title: "Define el objetivo. Entrega trabajo verificado.",
    titleSize: 33,
    ogTitleLines: ["Define el objetivo.", "Entrega trabajo verificado."],
    sub: "Ingeniería de objetivos de principio a fin para OpenCode V2 en macOS, Linux y Windows",
    surfaces: "Terminal · Escritorio · Web · Móvil",
    neutral: "Neutral en modelos y proveedores · Sin tocar binarios",
    built: "Desarrollado y construido con UltraCode v1.0.0",
    domain: "ultracode.plutokeating.beer/es",
  },
};

function renderHeroBannerSvg(lang: Locale): string {
  const b = BANNER_COPY[lang];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 340" fill="none" direction="ltr" role="img" aria-label="UltraCode v1.1.0 — ${esc(b.title)}">
  <defs>
    <radialGradient id="iceHorizon" cx="32%" cy="62%" r="46%">
      <stop offset="0%" stop-color="#BAE6FD" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="amberHorizon" cx="72%" cy="62%" r="42%">
      <stop offset="0%" stop-color="#E5A03D" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="topRim" x1="8%" y1="0%" x2="92%" y2="0%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="28%" stop-color="#BAE6FD" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.82"/>
      <stop offset="72%" stop-color="#E5A03D" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="340" rx="14" fill="#000000"/>
  <rect width="1200" height="340" rx="14" fill="url(#iceHorizon)"/>
  <rect width="1200" height="340" rx="14" fill="url(#amberHorizon)"/>
  <rect x="0.5" y="0.5" width="1199" height="339" rx="13.5" stroke="#FFFFFF" stroke-opacity="0.12"/>
  <line x1="96" y1="1" x2="1104" y2="1" stroke="url(#topRim)" stroke-width="1"/>

  <line x1="0" y1="74.5" x2="1200" y2="74.5" stroke="#FFFFFF" stroke-opacity="0.08"/>
  <line x1="0" y1="266.5" x2="1200" y2="266.5" stroke="#FFFFFF" stroke-opacity="0.08"/>
  <path d="M76 70.5V78.5 M72 74.5H80 M1124 70.5V78.5 M1120 74.5H1128 M76 262.5V270.5 M72 266.5H80 M1124 262.5V270.5 M1120 266.5H1128" stroke="#FFFFFF" stroke-opacity="0.28"/>

  <g transform="translate(80, 24)">
    <g transform="scale(0.09)">
      <path d="M60 120H180V240H60V120Z" fill="#4B4B4B"/>
      <path d="M60 60H180V120H60V60Z" fill="#2A2A2A"/>
      <path d="M0 0H60V240H180V60H240V300H0V0Z" fill="#EEEEEE"/>
      <path d="M180 0H240V42H180V0Z" fill="#E5A03D"/>
    </g>
    <text x="34" y="20" fill="#FFFFFF" font-family="${SANS_STACK}" font-size="19" font-weight="600">UltraCode</text>
    <rect x="144" y="4" width="56" height="21" rx="4" fill="#111111" stroke="#FFFFFF" stroke-opacity="0.18"/>
    <text x="172" y="18.5" text-anchor="middle" fill="#BAE6FD" font-family="${MONO_STACK}" font-size="11.5" font-weight="500">v1.1.0</text>
  </g>
  <text x="1120" y="44" text-anchor="end" fill="#9A9A9A" font-family="${MONO_STACK}" font-size="13">${esc(b.domain)}</text>

  <text x="600" y="148" text-anchor="middle" fill="#FFFFFF" font-family="${SANS_STACK}" font-size="${b.titleSize}" font-weight="600">${bidi(lang, b.title)}</text>
  <text x="600" y="192" text-anchor="middle" fill="#B5B5B5" font-family="${SANS_STACK}" font-size="16.5">${bidi(lang, b.sub)}</text>
  <text x="600" y="228" text-anchor="middle" fill="#8A8A8A" font-family="${MONO_STACK}" font-size="13">ultracode   ·   ultracode desktop   ·   ultracode pair</text>

  <circle cx="84" cy="303" r="3.5" fill="#BAE6FD"/>
  <text x="98" y="307.5" fill="#D4D4D4" font-family="${SANS_STACK}" font-size="12.5">${bidi(lang, b.surfaces)}</text>
  <text x="600" y="307.5" text-anchor="middle" fill="#8A8A8A" font-family="${SANS_STACK}" font-size="12.5">${bidi(lang, b.neutral)}</text>
  <text x="1120" y="307.5" text-anchor="end" fill="#E5A03D" font-family="${SANS_STACK}" font-size="12.5">${bidi(lang, b.built)}</text>
</svg>
`;
}

function renderWorkflowSvg(lang: Locale): string {
  const t = DIAGRAMS_COPY[lang].comparison;
  const metaFont = lang === "ar" ? SANS_STACK : MONO_STACK;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 328" fill="none" direction="ltr" role="img" aria-label="${esc(t.aria)}">
  <rect width="840" height="328" rx="12" fill="#050505"/>
  <rect x="0.5" y="0.5" width="839" height="327" rx="11.5" stroke="#FFFFFF" stroke-opacity="0.12"/>

  <g transform="translate(40, 20)">
    <line x1="0" y1="0.5" x2="760" y2="0.5" stroke="#FFFFFF" stroke-opacity="0.09"/>
    <line x1="0" y1="142.5" x2="760" y2="142.5" stroke="#FFFFFF" stroke-opacity="0.09"/>
    <line x1="0" y1="287.5" x2="760" y2="287.5" stroke="#FFFFFF" stroke-opacity="0.09"/>
    <line x1="190.5" y1="0" x2="190.5" y2="288" stroke="#FFFFFF" stroke-opacity="0.05"/>
    <line x1="380.5" y1="0" x2="380.5" y2="288" stroke="#FFFFFF" stroke-opacity="0.05"/>
    <line x1="570.5" y1="0" x2="570.5" y2="288" stroke="#FFFFFF" stroke-opacity="0.05"/>
    <path d="M186.5 142.5H194.5 M190.5 138.5V146.5 M376.5 142.5H384.5 M380.5 138.5V146.5 M566.5 142.5H574.5 M570.5 138.5V146.5" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="1"/>

    <text x="16" y="34" fill="#B5B5B5" font-family="${SANS_STACK}" font-size="15.5" font-weight="600">${bidi(lang, t.topTitle)}</text>
    <text x="744" y="34" text-anchor="end" fill="#9A9A9A" font-family="${metaFont}" font-size="12.5">${bidi(lang, t.topMeta)}</text>

    <polyline points="24,92 140,66 256,68 362,84 468,96 602,106 736,100" stroke="#787878" stroke-width="1.8" stroke-dasharray="5,5" fill="none"/>
    <circle cx="24" cy="92" r="4.5" fill="#8A8A8A"/>
    <circle cx="256" cy="68" r="4.5" fill="#8A8A8A"/>
    <circle cx="468" cy="96" r="5" fill="#E5A03D"/>
    <line x1="730" y1="94" x2="742" y2="106" stroke="#E5A03D" stroke-width="2"/>
    <line x1="742" y1="94" x2="730" y2="106" stroke="#E5A03D" stroke-width="2"/>

    <text x="20" y="126" fill="#A3A3A3" font-family="${SANS_STACK}" font-size="13.5">${bidi(lang, t.t1)}</text>
    <text x="256" y="126" text-anchor="middle" fill="#A3A3A3" font-family="${SANS_STACK}" font-size="13.5">${bidi(lang, t.t2)}</text>
    <text x="468" y="126" text-anchor="middle" fill="#E5A03D" font-family="${SANS_STACK}" font-size="13.5">${bidi(lang, t.t3)}</text>
    <text x="744" y="126" text-anchor="end" fill="#B5B5B5" font-family="${SANS_STACK}" font-size="13.5">${bidi(lang, t.t4)}</text>

    <text x="16" y="178" fill="#FFFFFF" font-family="${SANS_STACK}" font-size="16" font-weight="600">${bidi(lang, t.botTitle)}</text>
    <text x="744" y="178" text-anchor="end" fill="#E5E5E5" font-family="${metaFont}" font-size="12.5">${bidi(lang, t.botMeta)}</text>

    <line x1="24" y1="234" x2="736" y2="202" stroke="#BAE6FD" stroke-opacity="0.32" stroke-width="5"/>
    <line x1="24" y1="234" x2="736" y2="202" stroke="#FFFFFF" stroke-width="2"/>

    <circle cx="24" cy="234" r="5" fill="#FFFFFF"/>
    <circle cx="256" cy="224" r="5" fill="#FFFFFF"/>
    <circle cx="468" cy="214" r="5" fill="#FFFFFF"/>
    <circle cx="736" cy="202" r="6.5" fill="#BAE6FD"/>
    <circle cx="736" cy="202" r="11.5" stroke="#BAE6FD" stroke-opacity="0.5" stroke-width="1.2"/>

    <text x="20" y="270" fill="#E5E5E5" font-family="${SANS_STACK}" font-size="13.5">${bidi(lang, t.b1)}</text>
    <text x="256" y="270" text-anchor="middle" fill="#E5E5E5" font-family="${SANS_STACK}" font-size="13.5">${bidi(lang, t.b2)}</text>
    <text x="468" y="270" text-anchor="middle" fill="#E5E5E5" font-family="${SANS_STACK}" font-size="13.5">${bidi(lang, t.b3)}</text>
    <text x="744" y="270" text-anchor="end" fill="#FFFFFF" font-family="${SANS_STACK}" font-size="13.5" font-weight="600">${bidi(lang, t.b4)}</text>
  </g>
</svg>
`;
}

function renderRolesSvg(lang: Locale): string {
  const t = DIAGRAMS_COPY[lang].roles;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 320" fill="none" direction="ltr" role="img" aria-label="${esc(t.aria)}">
  <rect width="840" height="320" rx="12" fill="#050505"/>
  <rect x="0.5" y="0.5" width="839" height="319" rx="11.5" stroke="#FFFFFF" stroke-opacity="0.12"/>

  <g transform="translate(40, 20)">
    <line x1="0" y1="0.5" x2="760" y2="0.5" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <line x1="0" y1="279.5" x2="760" y2="279.5" stroke="#FFFFFF" stroke-opacity="0.08"/>

    <line x1="24" y1="24" x2="318" y2="24" stroke="#BAE6FD" stroke-width="1.8"/>
    <rect x="24" y="24" width="294" height="78" fill="#FFFFFF" fill-opacity="0.03" stroke="#FFFFFF" stroke-opacity="0.14"/>
    <text x="44" y="55" fill="#FFFFFF" font-family="${MONO_STACK}" font-size="16.5" font-weight="600">UltraBuild</text>
    <text x="44" y="83" fill="#C4C4C4" font-family="${SANS_STACK}" font-size="13.5">${bidi(lang, t.buildSub)}</text>

    <line x1="318" y1="63" x2="442" y2="63" stroke="#FFFFFF" stroke-opacity="0.24" stroke-dasharray="4 4"/>
    <rect x="334" y="47" width="92" height="32" fill="#050505" stroke="#FFFFFF" stroke-opacity="0.22"/>
    <text x="380" y="68" text-anchor="middle" fill="#FFFFFF" font-family="${MONO_STACK}" font-size="13">Shift+Tab</text>

    <rect x="442" y="24" width="294" height="78" fill="transparent" stroke="#FFFFFF" stroke-opacity="0.12"/>
    <text x="462" y="55" fill="#E5E5E5" font-family="${MONO_STACK}" font-size="16.5" font-weight="600">UltraPlan</text>
    <text x="462" y="83" fill="#B0B0B0" font-family="${SANS_STACK}" font-size="13.5">${bidi(lang, t.planSub)}</text>

    <line x1="171" y1="102" x2="171" y2="146" stroke="#FFFFFF" stroke-opacity="0.36" stroke-width="1.4"/>
    <line x1="76" y1="146" x2="684" y2="146" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="1.4"/>
    <line x1="76" y1="146" x2="76" y2="178" stroke="#FFFFFF" stroke-opacity="0.22"/>
    <line x1="228" y1="146" x2="228" y2="178" stroke="#FFFFFF" stroke-opacity="0.22"/>
    <line x1="380" y1="146" x2="380" y2="178" stroke="#FFFFFF" stroke-opacity="0.22"/>
    <line x1="532" y1="146" x2="532" y2="178" stroke="#FFFFFF" stroke-opacity="0.22"/>
    <line x1="684" y1="146" x2="684" y2="178" stroke="#BAE6FD" stroke-width="1.4"/>

    <circle cx="76" cy="178" r="4" fill="#B5B5B5"/>
    <circle cx="228" cy="178" r="4" fill="#B5B5B5"/>
    <circle cx="380" cy="178" r="4" fill="#FFFFFF"/>
    <circle cx="532" cy="178" r="4" fill="#E5A03D"/>
    <circle cx="684" cy="178" r="4.5" fill="#BAE6FD"/>

    <g font-family="${SANS_STACK}" text-anchor="middle">
      <text x="76" y="216" fill="#FFFFFF" font-size="15.5" font-weight="600">${bidi(lang, t.r1Title)}</text>
      <text x="76" y="244" fill="#B5B5B5" font-size="13">${bidi(lang, t.r1Sub)}</text>

      <text x="228" y="216" fill="#FFFFFF" font-size="15.5" font-weight="600">${bidi(lang, t.r2Title)}</text>
      <text x="228" y="244" fill="#B5B5B5" font-size="13">${bidi(lang, t.r2Sub)}</text>

      <text x="380" y="216" fill="#FFFFFF" font-size="15.5" font-weight="600">${bidi(lang, t.r3Title)}</text>
      <text x="380" y="244" fill="#C4C4C4" font-size="13">${bidi(lang, t.r3Sub)}</text>

      <text x="532" y="216" fill="#FFFFFF" font-size="15.5" font-weight="600">${bidi(lang, t.r4Title)}</text>
      <text x="532" y="244" fill="#E5A03D" font-size="13">${bidi(lang, t.r4Sub)}</text>

      <text x="684" y="216" fill="#BAE6FD" font-size="15.5" font-weight="600">${bidi(lang, t.r5Title)}</text>
      <text x="684" y="244" fill="#E0E0E0" font-size="13">${bidi(lang, t.r5Sub)}</text>
    </g>
  </g>
</svg>
`;
}

function renderOgHtml(lang: Locale, width = 1200, height = 630): string {
  const b = BANNER_COPY[lang];
  const meta = LOCALE_META[lang];
  const headlineSize = lang === "ru" || lang === "fr" || lang === "es" ? "48px" : "54px";
  return `<!doctype html>
<html lang="${meta.htmlLang}" dir="${meta.dir}">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: #000000;
    color: #ffffff;
    font-family: ${SANS_STACK};
    -webkit-font-smoothing: antialiased;
  }
  .canvas {
    position: relative;
    width: ${width}px;
    height: ${height}px;
    background:
      radial-gradient(46% 28% at 32% 62%, rgba(186, 230, 253, 0.16), transparent 72%),
      radial-gradient(42% 26% at 72% 62%, rgba(229, 160, 61, 0.14), transparent 74%),
      #000000;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0 96px;
  }
  .vline-l, .vline-r {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(255, 255, 255, 0.06);
  }
  .vline-l { left: 96px; }
  .vline-r { right: 96px; }
  .topbar, .botbar {
    height: 110px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 2;
  }
  .topbar { border-bottom: 1px solid rgba(255, 255, 255, 0.09); direction: ltr; }
  .botbar { border-top: 1px solid rgba(255, 255, 255, 0.09); direction: ltr; }
  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .brand svg { height: 32px; width: auto; }
  .brand-name { font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
  .ver {
    font-family: ${MONO_STACK};
    font-size: 14px;
    color: #bae6fd;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: #0d0d0d;
  }
  .domain {
    font-family: ${MONO_STACK};
    font-size: 15px;
    color: #9a9a9a;
  }
  .center {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 18px;
    padding: 0 28px;
    z-index: 2;
  }
  h1 {
    font-size: ${headlineSize};
    font-weight: 600;
    line-height: 1.22;
    color: #ffffff;
  }
  .sub {
    font-size: 20px;
    line-height: 1.5;
    color: #b5b5b5;
    max-width: 920px;
  }
  .surfaces {
    margin-top: 6px;
    font-size: 17px;
    color: #bae6fd;
  }
  .cmd {
    font-family: ${MONO_STACK};
    font-size: 15px;
    color: #8a8a8a;
  }
  .built {
    font-size: 15px;
    color: #e5a03d;
    unicode-bidi: isolate;
  }
</style>
</head>
<body>
  <div class="canvas">
    <div class="vline-l"></div>
    <div class="vline-r"></div>
    <div class="topbar">
      <div class="brand">
        <svg viewBox="0 0 240 300" fill="none">
          <path d="M60 120H180V240H60V120Z" fill="#4B4B4B"/>
          <path d="M60 60H180V120H60V60Z" fill="#2A2A2A"/>
          <path d="M0 0H60V240H180V60H240V300H0V0Z" fill="#EEEEEE"/>
          <path d="M180 0H240V42H180V0Z" fill="#E5A03D"/>
        </svg>
        <span class="brand-name">UltraCode</span>
        <span class="ver">v1.1.0</span>
      </div>
      <span class="domain">${esc(b.domain)}</span>
    </div>
    <div class="center">
      <h1>${esc(b.ogTitleLines[0])}<br/>${esc(b.ogTitleLines[1])}</h1>
      <p class="sub">${esc(b.sub)}</p>
      <p class="surfaces" dir="ltr">macOS · Linux · Windows &nbsp;|&nbsp; <span dir="${meta.dir}">${esc(b.surfaces)}</span></p>
    </div>
    <div class="botbar">
      <span class="cmd">curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash</span>
      <span class="built" dir="${meta.dir}">${esc(b.built)}</span>
    </div>
  </div>
</body>
</html>`;
}

await mkdir(publicRoot, { recursive: true });

for (const lang of LOCALES) {
  const dir = join(assetsRoot, lang);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "hero-banner.svg"), renderHeroBannerSvg(lang), "utf8");
  await writeFile(join(dir, "workflow-comparison.svg"), renderWorkflowSvg(lang), "utf8");
  await writeFile(join(dir, "roles-topology.svg"), renderRolesSvg(lang), "utf8");
}

for (const name of ["hero-banner.svg", "workflow-comparison.svg", "roles-topology.svg"]) {
  await cp(join(assetsRoot, "en", name), join(assetsRoot, name));
}

const chromeBin = await resolveChromeBinary();
const tempOgDir = join(tmpdir(), "ultracode-og-gen");
await mkdir(tempOgDir, { recursive: true });

for (const lang of LOCALES) {
  const htmlFile = join(tempOgDir, `og-${lang}.html`);
  await writeFile(htmlFile, renderOgHtml(lang), "utf8");
  const outName = lang === "en" ? "og-card.png" : `og-card-${lang}.png`;
  const outPath = join(publicRoot, outName);
  execFileSync(
    chromeBin,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1200,630",
      `--screenshot=${outPath}`,
      `file://${htmlFile}`,
    ],
    { stdio: "pipe" },
  );
}

const socialHtmlFile = join(tempOgDir, "social-preview.html");
await writeFile(socialHtmlFile, renderOgHtml("en", 1280, 640), "utf8");
execFileSync(
  chromeBin,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1280,640",
    `--screenshot=${join(assetsRoot, "social-preview.png")}`,
    `file://${socialHtmlFile}`,
  ],
  { stdio: "pipe" },
);

console.log("Generated 18 localized SVGs, 6 localized OpenGraph PNG cards, and social-preview.png.");
