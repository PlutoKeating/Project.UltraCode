import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://ultracode.plutokeating.beer",
  integrations: [
    starlight({
      title: "UltraCode",
      description: "Reliable end-to-end delivery for official OpenCode V2 across macOS, Linux, and Windows.",
      logo: {
        src: "./src/assets/logo-dark.svg",
      },
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        zh: { label: "简体中文", lang: "zh-CN" },
        ar: { label: "العربية", lang: "ar", dir: "rtl" },
        fr: { label: "Français", lang: "fr" },
        ru: { label: "Русский", lang: "ru" },
        es: { label: "Español", lang: "es" },
      },
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/PlutoKeating/Project.UltraCode" },
      ],
      components: {
        Head: "./src/components/DocsHead.astro",
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
          label: "Start Here",
          translations: {
            "zh-CN": "上手指南",
            ar: "ابدأ هنا",
            fr: "Pour commencer",
            ru: "Начало работы",
            es: "Primeros pasos",
          },
          items: [
            { slug: "docs/getting-started" },
            { slug: "docs/install-desktop" },
            { slug: "docs/install-terminal" },
            { slug: "docs/install-mobile" },
          ],
        },
        {
          label: "Core Capabilities",
          translations: {
            "zh-CN": "核心能力",
            ar: "القدرات الأساسية",
            fr: "Capacités clés",
            ru: "Возможности",
            es: "Capacidades clave",
          },
          items: [
            { slug: "docs/goal-engineering" },
            { slug: "docs/roles-and-workflow" },
            { slug: "docs/long-running" },
            { slug: "docs/visual-qa" },
          ],
        },
        {
          label: "Hands-On Tutorials",
          translations: {
            "zh-CN": "使用教程",
            ar: "دروس تطبيقية",
            fr: "Tutoriels pratiques",
            ru: "Практические уроки",
            es: "Tutoriales prácticos",
          },
          items: [
            { slug: "docs/tutorial-desktop" },
            { slug: "docs/tutorial-terminal" },
            { slug: "docs/tutorial-mobile" },
            { slug: "docs/tutorial-plan-and-verify" },
            { slug: "docs/tutorial-goals-and-models" },
          ],
        },
        {
          label: "Controls & FAQ",
          translations: {
            "zh-CN": "控制与维护",
            ar: "التحكم والأسئلة",
            fr: "Contrôle & FAQ",
            ru: "Управление и FAQ",
            es: "Control y FAQ",
          },
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
