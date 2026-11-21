import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "UltraCode",
      description: "Provider-neutral long-running engineering workflows for OpenCode",
      defaultLocale: "root",
      locales: {
        root: { label: "简体中文", lang: "zh-CN" },
        en: { label: "English", lang: "en" },
      },
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/PlutoKeating/Project.UltraCode" },
      ],
      editLink: {
        baseUrl: "https://github.com/PlutoKeating/Project.UltraCode/edit/main/website/",
      },
      lastUpdated: true,
      sidebar: [
        { label: "Stable", items: [{ autogenerate: { directory: "stable" } }] },
        { label: "Next", items: [{ autogenerate: { directory: "next" } }] },
      ],
      customCss: ["./src/styles/custom.css"],
    }),
  ],
});
