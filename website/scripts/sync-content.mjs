import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const generated = join(root, "src/content/docs");
await rm(generated, { recursive: true, force: true });
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

for (const locale of LOCALES) {
  const source = join(root, "content", locale);
  for (const file of await files(source)) {
    const suffix = relative(source, file);
    const target = locale === "root" ? join(generated, suffix) : join(generated, locale, suffix);
    await mkdir(dirname(target), { recursive: true });
    await cp(file, target);
  }
}

await mkdir(join(root, "public"), { recursive: true });
await cp(join(root, "../scripts/install.sh"), join(root, "public/install.sh"));
await cp(join(root, "../scripts/install.ps1"), join(root, "public/install.ps1"));

// Auto-generate /llms.txt and /llms-full.txt from canonical English docs so AI crawlers never read stale info
const DOC_ORDER = [
  "getting-started",
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
    .replace(/<AnnotatedShot[\s\S]*?\/>/g, "")
    .replace(/<TutorialStep([\s\S]*?)>/g, (_m, attrs) => {
      const titleM = attrs.match(/title="([^"]+)"/);
      const promptM = attrs.match(/promptText="([^"]+)"/);
      const expectM = attrs.match(/expectText="([^"]+)"/);
      const lines = [];
      if (titleM) lines.push(`### ${titleM[1]}`);
      if (promptM) lines.push(`\n> ${promptM[1]}`);
      if (expectM) lines.push(`\nExpected result: ${expectM[1]}`);
      return lines.join("\n") + "\n";
    })
    .replace(/<\/TutorialStep>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, description, body: cleanedBody };
}

const siteUrl = "https://ultracode.plutokeating.beer";
const docEntries = [];

for (const slug of DOC_ORDER) {
  const mdxPath = join(root, "content/root/docs", `${slug}.mdx`);
  let raw;
  try {
    raw = await readFile(mdxPath, "utf8");
  } catch {
    continue;
  }
  const parsed = stripMdxToPlainMarkdown(raw);
  docEntries.push({
    slug,
    url: `${siteUrl}/docs/${slug}/`,
    ...parsed,
  });
}

const llmsIndex = `# UltraCode

> UltraCode (v1.2.0) is a provider- and model-neutral Goal Engineering layer built on official OpenCode V2 across macOS, Linux, and Windows (Terminal, Desktop App, Web, and Mobile). Built and shipped with UltraCode v1.0.0.

UltraCode installs in one command (setting up official OpenCode V2 automatically if missing), keeps your existing models and API keys untouched, clarifies requirements upfront with structured choice cards, orchestrates two primary roles (\`UltraBuild\` and \`UltraPlan\`) plus five background specialists (\`librarian\`, \`architect\`, \`implementer\`, \`reviewer\`, \`visual-evaluator\`), inspects real UI in Chromium across desktop and mobile viewports, and persists long-running milestone handoffs in the repository.

## Quick Install

- macOS / Linux: \`curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash\`
- Windows (PowerShell): \`irm https://ultracode.plutokeating.beer/install.ps1 | iex\`
- Primary commands: \`ultracode\`, \`ultracode desktop\`, \`ultracode pair\`, \`ultracode upgrade\`, \`ultracode sync\`, \`ultracode doctor\`, \`ultracode uninstall --yes\`

## Documentation

${docEntries.map((d) => `- [${d.title}](${d.url}): ${d.description}`).join("\n")}
- [Complete LLM Context (Single File)](${siteUrl}/llms-full.txt): Full English documentation and CLI reference in one plain-text Markdown document.

## Localized Editions (UN 6 Official Languages)

- [English (Default)](${siteUrl}/)
- [简体中文 (Simplified Chinese)](${siteUrl}/zh/)
- [العربية (Arabic)](${siteUrl}/ar/)
- [Français (French)](${siteUrl}/fr/)
- [Русский (Russian)](${siteUrl}/ru/)
- [Español (Spanish)](${siteUrl}/es/)

## Repository & Releases

- [GitHub Repository](https://github.com/PlutoKeating/Project.UltraCode): MIT-licensed source code (\`packages/installer\`, \`packages/plugin-gui\`, \`packages/config\`, \`website\`, \`scripts\`, \`docs\`).
- [Latest Release (v1.2.0)](https://github.com/PlutoKeating/Project.UltraCode/releases/latest): Standalone binaries for \`linux-x64\`, \`linux-arm64\`, \`darwin-x64\`, \`darwin-arm64\`, \`windows-x64.exe\`, and \`windows-arm64.exe\` with SHA-256 checksums.
`;

const llmsFull = `# UltraCode v1.2.0 — Full Documentation Reference

> Source: ${siteUrl}
> Repository: https://github.com/PlutoKeating/Project.UltraCode
> License: MIT
> Provenance: Built and shipped with UltraCode v1.0.0

UltraCode is a non-invasive, provider- and model-neutral enhancement layer for official OpenCode V2 (\`v2.3.2+\`, verified on \`v2.4+\`) across macOS, Linux, and Windows, spanning Terminal (TUI), OpenCode Desktop, Web, and Mobile.

---

${docEntries
  .map(
    (d) => `## ${d.title}\n\nCanonical URL: ${d.url}\nSummary: ${d.description}\n\n${d.body}`,
  )
  .join("\n\n---\n\n")}
`;

await writeFile(join(root, "public/llms.txt"), llmsIndex, "utf8");
await writeFile(join(root, "public/llms-full.txt"), llmsFull, "utf8");
