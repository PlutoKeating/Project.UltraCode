import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const release = process.argv.includes("--release");
const root = fileURLToPath(new URL("..", import.meta.url));
const guiDir = join(root, "..", "plugin-gui");
execFileSync(process.execPath, ["run", "build"], { cwd: guiDir, stdio: "inherit" });

const outdir = join(root, "dist");
await mkdir(outdir, { recursive: true });
const targets = release
  ? [
      "bun-linux-x64",
      "bun-linux-arm64",
      "bun-darwin-x64",
      "bun-darwin-arm64",
      "bun-windows-x64",
      "bun-windows-arm64",
    ]
  : [undefined];
const manifest: Record<string, { file: string; sha256: string }> = {};

for (const target of targets) {
  const suffix = target?.replace("bun-", "") || "current";
  const ext = (target ? target.includes("windows") : process.platform === "win32") ? ".exe" : "";
  const name = `ultracode-${suffix}${ext}`;
  const file = join(outdir, name);
  const result = await Bun.build({
    entrypoints: [join(root, "src", "bin.ts")],
    compile: target ? { target, outfile: file } : { outfile: file },
    minify: true,
    define: {
      "process.env.ULTRACODE_RELEASE_VERSION": JSON.stringify(process.env.ULTRACODE_RELEASE_VERSION || "1.0.0"),
    },
  });
  if (!result.success) throw new Error(result.logs.join("\n"));
  const data = await Bun.file(file).arrayBuffer();
  const hash = createHash("sha256").update(Buffer.from(data)).digest("hex");
  await writeFile(`${file}.sha256`, `${hash}  ${name}\n`);
  manifest[suffix] = { file: name, sha256: hash };
  console.log(`Built ${file}`);
}

if (release) await writeFile(join(outdir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
