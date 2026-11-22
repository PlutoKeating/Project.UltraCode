import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://ultracode.plutokeating.beer",
  redirects: {
    "/stable": "/docs/getting-started/",
    "/stable/getting-started": "/docs/getting-started/",
    "/stable/installation": "/docs/getting-started/",
    "/stable/workflows": "/docs/roles-and-workflow/",
    "/stable/long-running": "/docs/long-running/",
    "/stable/visual-qa": "/docs/visual-qa/",
    "/stable/upgrades": "/docs/controls-and-maintenance/",
    "/stable/troubleshooting": "/docs/faq/",
    "/en/stable": "/en/docs/getting-started/",
    "/en/stable/getting-started": "/en/docs/getting-started/",
    "/en/stable/installation": "/en/docs/getting-started/",
    "/en/stable/workflows": "/en/docs/roles-and-workflow/",
    "/en/stable/long-running": "/en/docs/long-running/",
    "/en/stable/visual-qa": "/en/docs/visual-qa/",
    "/en/stable/upgrades": "/en/docs/controls-and-maintenance/",
    "/en/stable/troubleshooting": "/en/docs/faq/",
  },
  integrations: [
    starlight({
      title: "UltraCode",
      description: "让 OpenCode 迈入目标工程（Goal Engineering）时代",
      logo: {
        src: "./src/assets/logo-dark.svg",
      },
      defaultLocale: "root",
      locales: {
        root: { label: "简体中文", lang: "zh-CN" },
        en: { label: "English", lang: "en" },
      },
      expressiveCode: {
        locales: ["zh-CN", "en"],
      },
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/PlutoKeating/Project.UltraCode" },
      ],
      components: {
        ThemeSelect: "./src/components/EmptyThemeSelect.astro",
      },
      head: [
        {
          tag: "script",
          content:
            "try{localStorage.setItem('starlight-theme','dark');document.documentElement.dataset.theme='dark';}catch(e){}",
        },
      ],
      sidebar: [
        {
          label: "上手指南",
          translations: { en: "Start Here" },
          items: [
            { slug: "docs/getting-started" },
            { slug: "docs/goal-engineering" },
          ],
        },
        {
          label: "核心能力",
          translations: { en: "Core Capabilities" },
          items: [
            { slug: "docs/roles-and-workflow" },
            { slug: "docs/long-running" },
            { slug: "docs/visual-qa" },
          ],
        },
        {
          label: "控制与维护",
          translations: { en: "Controls" },
          items: [
            { slug: "docs/controls-and-maintenance" },
            { slug: "docs/faq" },
          ],
        },
      ],
      customCss: ["./src/styles/tokens.css", "./src/styles/custom.css"],
    }),
  ],
});
