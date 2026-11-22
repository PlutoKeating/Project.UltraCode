import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const release = process.argv.includes("--release");
const root = new URL("..", import.meta.url).pathname;
const outdir = join(root, "dist");
await mkdir(outdir, { recursive: true });
const targets = release
  ? ["bun-linux-x64", "bun-linux-arm64", "bun-darwin-x64", "bun-darwin-arm64"]
  : [undefined];
const manifest: Record<string, { file: string; sha256: string }> = {};

for (const target of targets) {
  const suffix = target?.replace("bun-", "") || "current";
  const file = join(outdir, `ultracode-${suffix}`);
  const result = await Bun.build({
    entrypoints: [join(root, "src", "cli.ts")],
    compile: target ? { target, outfile: file } : { outfile: file },
    minify: true,
    define: {
      "process.env.ULTRACODE_RELEASE_VERSION": JSON.stringify(process.env.ULTRACODE_RELEASE_VERSION || "0.2.0"),
    },
  });
  if (!result.success) throw new Error(result.logs.join("\n"));
  const data = await Bun.file(file).arrayBuffer();
  const hash = createHash("sha256").update(Buffer.from(data)).digest("hex");
  await writeFile(`${file}.sha256`, `${hash}  ultracode-${suffix}\n`);
  manifest[suffix] = { file: `ultracode-${suffix}`, sha256: hash };
  console.log(`Built ${file}`);
}

if (release) await writeFile(join(outdir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
