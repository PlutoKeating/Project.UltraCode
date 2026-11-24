import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const generated = join(root, "src/content/docs");
await mkdir(generated, { recursive: true });

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await files(path)));
    else if (/\.mdx?$/.test(entry.name)) output.push(path);
  }
  return output;
}

const LOCALES = ["root", "zh", "ar", "fr", "ru", "es"];

const written = new Set();

for (const locale of LOCALES) {
  const source = join(root, "content", locale);
  for (const file of await files(source)) {
    const suffix = relative(source, file);
    const target = locale === "root" ? join(generated, suffix) : join(generated, locale, suffix);
    await mkdir(dirname(target), { recursive: true });
    await cp(file, target);
    written.add(target);
  }
}

// Remove only files whose source was deleted, leaving every other generated file in
// place so a running dev server never sees its content directory disappear.
for (const file of await files(generated)) {
  if (!written.has(file)) await rm(file, { force: true });
}

await mkdir(join(root, "public"), { recursive: true });
await cp(join(root, "../scripts/install.sh"), join(root, "public/install.sh"));
await cp(join(root, "../scripts/install.ps1"), join(root, "public/install.ps1"));


// Auto-generate llms.txt / llms-full.txt for every locale so AI crawlers read
// fresh, localized documentation instead of a stale English snapshot.
const DOC_ORDER = [
  "install-desktop",
  "install-terminal",
  "install-mobile",
  "goal-engineering",
  "roles-and-workflow",
  "long-running",
  "visual-qa",
  "tutorial-desktop",
  "tutorial-terminal",
  "tutorial-mobile",
  "tutorial-plan-and-verify",
  "tutorial-goals-and-models",
  "controls-and-maintenance",
  "faq",
];

const LLMS_LOCALES = [
  { key: "en", dir: "root", prefix: "" },
  { key: "zh", dir: "zh", prefix: "/zh" },
  { key: "ar", dir: "ar", prefix: "/ar" },
  { key: "fr", dir: "fr", prefix: "/fr" },
  { key: "ru", dir: "ru", prefix: "/ru" },
  { key: "es", dir: "es", prefix: "/es" },
];

const LLMS_COPY = {
  en: {
    summary:
      "UltraCode is a provider- and model-neutral Goal Engineering layer built on official OpenCode V2 across macOS, Linux, and Windows (Terminal, Desktop App, Web, and Mobile).",
    details:
      "UltraCode installs in one command (setting up official OpenCode V2 automatically if missing), keeps your existing models and API keys untouched, clarifies requirements upfront with structured choice cards, orchestrates two primary roles (\`UltraBuild\` and \`UltraPlan\`) plus five background specialists (\`librarian\`, \`architect\`, \`implementer\`, \`reviewer\`, \`visual-evaluator\`), inspects real UI in Chromium across desktop and mobile viewports, and persists long-running milestone handoffs in the repository.",
    quick: "Quick Install",
    commands: "Primary commands",
    docs: "Documentation",
    editions: "Localized Editions (UN 6 Official Languages)",
    repo: "Repository & Releases",
    full: "Complete LLM Context (Single File)",
    fullTitle: "UltraCode v1.2.0 — Full Documentation Reference",
    source: "Source",
    repository: "Repository",
    license: "License",
    provenance: "Provenance",
    canonical: "Canonical URL",
    summaryLabel: "Summary",
  },
  zh: {
    summary:
      "UltraCode 是构建在官方 OpenCode V2 之上的目标工程层，不绑定模型与服务商，覆盖 macOS、Linux 和 Windows 的终端、桌面、网页与手机。",
    details:
      "一条命令即可安装（缺少官方 OpenCode V2 时自动安装），保留你现有的模型与 API Key；先用选择题澄清需求，再由 UltraBuild / UltraPlan 与五位后台专家协作，自动打开真实浏览器验收，并把长任务交接写入项目。",
    quick: "快速安装",
    commands: "主要命令",
    docs: "文档",
    editions: "多语言版本（联合国六种正式语言）",
    repo: "代码仓库与发布",
    full: "完整 LLM 上下文（单文件）",
    fullTitle: "UltraCode v1.2.0 — 完整文档参考",
    source: "来源",
    repository: "代码仓库",
    license: "许可证",
    provenance: "构建来源",
    canonical: "规范链接",
    summaryLabel: "摘要",
  },
  ar: {
    summary:
      "UltraCode طبقة لهندسة الأهداف، محايدة تجاه المزوّدين والنماذج، مبنية على OpenCode V2 الرسمي وتعمل على macOS وLinux وWindows عبر الطرفية وسطح المكتب والويب والهاتف.",
    details:
      "التثبيت بأمر واحد (يثبّت OpenCode V2 الرسمي تلقائياً عند غيابه)، مع الحفاظ على نماذجك ومفاتيح API؛ توضّح بطاقات الاختيار المتطلبات أولاً، ثم يتعاون UltraBuild / UltraPlan مع خمسة خبراء خلفيين، ويفتح المتصفح الحقيقي للتحقق، ويحفظ تسليم المهام الطويلة في المشروع.",
    quick: "التثبيت السريع",
    commands: "الأوامر الأساسية",
    docs: "التوثيق",
    editions: "الإصدارات المترجمة (لغات الأمم المتحدة الست الرسمية)",
    repo: "المستودع والإصدارات",
    full: "سياق LLM الكامل (ملف واحد)",
    fullTitle: "UltraCode v1.2.0 — مرجع التوثيق الكامل",
    source: "المصدر",
    repository: "المستودع",
    license: "الترخيص",
    provenance: "مصدر البناء",
    canonical: "الرابط الأساسي",
    summaryLabel: "الملخص",
  },
  fr: {
    summary:
      "UltraCode est une couche de Goal Engineering neutre vis-à-vis des fournisseurs et des modèles, bâtie sur OpenCode V2 officiel pour macOS, Linux et Windows (terminal, bureau, web et mobile).",
    details:
      "Une commande suffit (OpenCode V2 officiel est installé automatiquement s'il manque), vos modèles et clés API restent intacts ; des cartes à choix clarifient la demande, puis UltraBuild / UltraPlan et cinq spécialistes collaborent, ouvrent un vrai navigateur pour vérifier et consignent les passations dans le projet.",
    quick: "Installation rapide",
    commands: "Commandes principales",
    docs: "Documentation",
    editions: "Éditions localisées (6 langues officielles de l'ONU)",
    repo: "Dépôt et versions",
    full: "Contexte LLM complet (fichier unique)",
    fullTitle: "UltraCode v1.2.0 — Référence complète de la documentation",
    source: "Source",
    repository: "Dépôt",
    license: "Licence",
    provenance: "Provenance",
    canonical: "URL canonique",
    summaryLabel: "Résumé",
  },
  ru: {
    summary:
      "UltraCode — слой Goal Engineering, не зависящий от провайдеров и моделей, поверх официального OpenCode V2 для macOS, Linux и Windows (терминал, десктоп, веб и телефон).",
    details:
      "Установка одной командой (официальный OpenCode V2 ставится автоматически при отсутствии), ваши модели и API-ключи не затрагиваются; карточки выбора уточняют задачу, затем UltraBuild / UltraPlan и пять фоновых специалистов работают вместе, открывают реальный браузер для проверки и сохраняют передачу длинных задач в проекте.",
    quick: "Быстрая установка",
    commands: "Основные команды",
    docs: "Документация",
    editions: "Локализованные версии (6 официальных языков ООН)",
    repo: "Репозиторий и релизы",
    full: "Полный контекст для LLM (один файл)",
    fullTitle: "UltraCode v1.2.0 — Полный справочник документации",
    source: "Источник",
    repository: "Репозиторий",
    license: "Лицензия",
    provenance: "Источник сборки",
    canonical: "Канонический URL",
    summaryLabel: "Краткое описание",
  },
  es: {
    summary:
      "UltraCode es una capa de Goal Engineering neutral respecto a proveedores y modelos, sobre OpenCode V2 oficial para macOS, Linux y Windows (terminal, escritorio, web y móvil).",
    details:
      "Se instala con un solo comando (OpenCode V2 oficial se instala solo si falta) y conserva tus modelos y claves API; las tarjetas de opciones aclaran el encargo, luego UltraBuild / UltraPlan y cinco especialistas colaboran, abren un navegador real para verificar y guardan el traspaso de tareas largas en el proyecto.",
    quick: "Instalación rápida",
    commands: "Comandos principales",
    docs: "Documentación",
    editions: "Ediciones localizadas (6 idiomas oficiales de la ONU)",
    repo: "Repositorio y versiones",
    full: "Contexto LLM completo (archivo único)",
    fullTitle: "UltraCode v1.2.0 — Referencia completa de la documentación",
    source: "Fuente",
    repository: "Repositorio",
    license: "Licencia",
    provenance: "Procedencia",
    canonical: "URL canónica",
    summaryLabel: "Resumen",
  },
};

const siteUrl = "https://ultracode.plutokeating.beer";
const fence = "```";

function parseAttrs(raw) {
  const attrs = {};
  for (const match of raw.matchAll(/(\w[\w-]*)=(?:"([^"]*)"|\{([^}]*)\})/g)) {
    attrs[match[1]] = match[2] !== undefined ? match[2] : match[3];
  }
  return attrs;
}

function commandToMarkdown(raw) {
  const attrs = parseAttrs(raw);
  const label = attrs.label ? `**${attrs.label}**\n\n` : "";
  return `${label}${fence}\n${attrs.command ?? ""}\n${fence}\n`;
}

function stripMdxToPlainMarkdown(raw) {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  let title = "";
  let description = "";
  let body = raw;
  if (fmMatch) {
    const fm = fmMatch[1];
    body = fmMatch[2];
    const tMatch = fm.match(/^title:\s*(.+)$/m);
    const dMatch = fm.match(/^description:\s*(.+)$/m);
    if (tMatch) title = tMatch[1].trim().replace(/^["']|["']$/g, "");
    if (dMatch) description = dMatch[1].trim().replace(/^["']|["']$/g, "");
  }
  const cleanedBody = body
    .replace(/^import\s+[^\r\n]+[\r\n]*/gm, "")
    .replace(/<figure[\s\S]*?<\/figure>/g, "")
    .replace(/<AnnotatedShot\b[\s\S]*?\/>/g, "")
    .replace(/<CommandBlock\b([\s\S]*?)\/>/g, (_match, attrs) => commandToMarkdown(attrs))
    .replace(/<span class="uc-step-no">([^<]*)<\/span>/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, description, body: cleanedBody };
}

for (const locale of LLMS_LOCALES) {
  const copy = LLMS_COPY[locale.key];
  const docEntries = [];

  for (const slug of DOC_ORDER) {
    const mdxPath = join(root, "content", locale.dir, "docs", `${slug}.mdx`);
    let raw;
    try {
      raw = await readFile(mdxPath, "utf8");
    } catch {
      continue;
    }
    const parsed = stripMdxToPlainMarkdown(raw);
    docEntries.push({
      slug,
      url: `${siteUrl}${locale.prefix}/docs/${slug}/`,
      ...parsed,
    });
  }

  if (docEntries.length === 0) continue;

  const llmsIndex = `# UltraCode

> ${copy.summary}

${copy.details}

## ${copy.quick}

- macOS / Linux: \`curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash\`
- Windows (PowerShell): \`irm https://ultracode.plutokeating.beer/install.ps1 | iex\`
- ${copy.commands}: \`ultracode\`, \`ultracode desktop\`, \`ultracode pair\`, \`ultracode upgrade\`, \`ultracode sync\`, \`ultracode doctor\`, \`ultracode uninstall --yes\`

## ${copy.docs}

${docEntries.map((entry) => `- [${entry.title}](${entry.url}): ${entry.description}`).join("\n")}
- [${copy.full}](${siteUrl}${locale.prefix}/llms-full.txt)

## ${copy.editions}

- [English (Default)](${siteUrl}/)
- [简体中文 (Simplified Chinese)](${siteUrl}/zh/)
- [العربية (Arabic)](${siteUrl}/ar/)
- [Français (French)](${siteUrl}/fr/)
- [Русский (Russian)](${siteUrl}/ru/)
- [Español (Spanish)](${siteUrl}/es/)

## ${copy.repo}

- [GitHub Repository](https://github.com/PlutoKeating/Project.UltraCode): MIT-licensed source code.
- [Latest Release (v1.2.0)](https://github.com/PlutoKeating/Project.UltraCode/releases/latest): Standalone binaries with SHA-256 checksums.
`;

  const llmsFull = `# ${copy.fullTitle}

> ${copy.source}: ${siteUrl}${locale.prefix}/
> ${copy.repository}: https://github.com/PlutoKeating/Project.UltraCode
> ${copy.license}: MIT
> ${copy.provenance}: Built and shipped with UltraCode v1.0.0

${copy.summary}

---

${docEntries
  .map(
    (entry) =>
      `## ${entry.title}\n\n${copy.canonical}: ${entry.url}\n${copy.summaryLabel}: ${entry.description}\n\n${entry.body}`,
  )
  .join("\n\n---\n\n")}
`;

  if (locale.prefix) {
    await mkdir(join(root, "public", locale.prefix.slice(1)), { recursive: true });
  }
  await writeFile(join(root, "public", locale.prefix || "", "llms.txt"), llmsIndex, "utf8");
  await writeFile(join(root, "public", locale.prefix || "", "llms-full.txt"), llmsFull, "utf8");
}
