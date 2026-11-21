import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const generated = join(root, "src/content/docs");
await rm(generated, { recursive: true, force: true });
await mkdir(generated, { recursive: true });
await cp(join(root, "home/index.mdx"), join(generated, "index.mdx"));
await cp(join(root, "home/en/index.mdx"), join(generated, "en/index.mdx"));

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await files(path));
    else if (/\.mdx?$/.test(entry.name)) output.push(path);
  }
  return output;
}

function banner(source, english) {
  const text = english
    ? "\n:::caution[Next documentation]\nThis page tracks the upcoming release. Use Stable for the published installer.\n:::\n"
    : "\n:::caution[Next 文档]\n本页跟踪下一版本；已发布安装器请使用 Stable 文档。\n:::\n";
  if (!source.startsWith("---")) return `${text}\n${source}`;
  const end = source.indexOf("\n---", 3);
  return end === -1 ? source : `${source.slice(0, end + 4)}\n${text}${source.slice(end + 4)}`;
}

for (const english of [false, true]) {
  const language = english ? "en" : "root";
  const source = join(root, "content", language);
  for (const file of await files(source)) {
    const suffix = relative(source, file);
    for (const channel of ["stable", "next"]) {
      const prefix = english ? join("en", channel) : channel;
      const target = join(generated, prefix, suffix);
      await mkdir(dirname(target), { recursive: true });
      const content = await readFile(file, "utf8");
      await writeFile(target, channel === "next" ? banner(content, english) : content);
    }
  }
}

await mkdir(join(root, "public"), { recursive: true });
await cp(join(root, "../install.sh"), join(root, "public/install.sh"));
