import { cp, mkdir, readdir, rm } from "node:fs/promises";
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

for (const english of [false, true]) {
  const language = english ? "en" : "root";
  const source = join(root, "content", language);
  for (const file of await files(source)) {
    const suffix = relative(source, file);
    const target = english ? join(generated, "en", suffix) : join(generated, suffix);
    await mkdir(dirname(target), { recursive: true });
    await cp(file, target);
  }
}

await mkdir(join(root, "public"), { recursive: true });
await cp(join(root, "../install.sh"), join(root, "public/install.sh"));
await cp(join(root, "../install.ps1"), join(root, "public/install.ps1"));
