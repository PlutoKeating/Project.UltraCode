import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assets } from "./assets";
import { mergeJsonc, parseJsonc, removeJsoncValues } from "./config";
import { atomicWrite, backup, exists, makeExecutable, readText, sha256 } from "./fs";
import { managedConfig } from "./managed";
import { readManifest, writeManifest } from "./manifest";
import { assertSupportedOpenCode, opencodeVersion } from "./opencode";
import type { Paths } from "./paths";
import { installRuntime } from "./runtime";

export const VERSION = process.env.ULTRACODE_RELEASE_VERSION || "0.2.0";

export interface ApplyReport {
  added: string[];
  conflicts: string[];
  files: number;
}

async function configFile(paths: Paths): Promise<string> {
  if (await exists(paths.opencodeConfigFile)) return paths.opencodeConfigFile;
  const json = join(paths.config, "opencode.json");
  return (await exists(json)) ? json : paths.opencodeConfigFile;
}

export async function apply(paths: Paths, options: { runtime?: boolean } = {}): Promise<ApplyReport> {
  assertSupportedOpenCode(await opencodeVersion(paths.opencodeBinary));
  await mkdir(paths.config, { recursive: true });
  await mkdir(join(paths.home, "backups"), { recursive: true });
  const previous = await readManifest(paths);
  const hashes: Record<string, string> = {};
  const conflicts: string[] = [];

  for (const name of ["plan", "work", "review"]) {
    const legacy = `commands/ultracode/${name}.md`;
    const hash = previous?.files[legacy];
    const target = join(paths.config, legacy);
    if (hash && await exists(target) && sha256(await readText(target)) === hash) await rm(target);
  }

  for (const asset of assets) {
    const target = join(paths.config, asset.target);
    const content = asset.target.endsWith("visual-evaluator.md")
      ? asset.content.replace("~/.config/opencode/ultracode/templates/UI_RUBRIC.md", join(paths.config, "ultracode/templates/UI_RUBRIC.md"))
      : asset.content;
    const nextHash = sha256(content);
    const current = (await exists(target)) ? await readText(target) : null;
    const currentHash = current === null ? null : sha256(current);
    const previousHash = previous?.files[asset.target];
    const userModified = current !== null && currentHash !== previousHash && currentHash !== nextHash;
    if (userModified && previousHash !== undefined) {
      conflicts.push(`${asset.target} (locally modified)`);
      continue;
    }
    if (current !== null && previousHash === undefined && currentHash !== nextHash) {
      conflicts.push(`${asset.target} (pre-existing)`);
      continue;
    }
    if (currentHash !== nextHash) {
      await backup(target, join(paths.home, "backups"));
      await atomicWrite(target, content, asset.executable ? 0o755 : 0o644);
    }
    if (asset.executable) await makeExecutable(target);
    hashes[asset.target] = nextHash;
  }

  const file = await configFile(paths);
  const source = (await exists(file)) ? await readText(file) : "{}";
  const managed = managedConfig(paths);
  const merged = mergeJsonc(source, managed);
  conflicts.push(...merged.conflicts.map((item) => `config:${item}`));
  if (merged.text !== source) {
    await backup(file, join(paths.home, "backups"));
    await atomicWrite(file, merged.text.endsWith("\n") ? merged.text : `${merged.text}\n`);
  }

  if (options.runtime !== false && process.env.ULTRACODE_SKIP_RUNTIME !== "1") await installRuntime(paths);
  await writeManifest(paths, VERSION, hashes);
  return { added: merged.added, conflicts, files: Object.keys(hashes).length };
}

export async function uninstall(paths: Paths): Promise<string[]> {
  const preserved: string[] = [];
  const manifest = await readManifest(paths);
  if (manifest) {
    for (const asset of assets) {
      const target = join(paths.config, asset.target);
      if (!(await exists(target))) continue;
      const currentHash = sha256(await readText(target));
      if (currentHash !== manifest.files[asset.target]) {
        preserved.push(asset.target);
        continue;
      }
      await rm(target);
    }
  }
  const file = await configFile(paths);
  if (await exists(file)) {
    const source = await readText(file);
    await backup(file, join(paths.home, "backups"));
    const cleaned = removeJsoncValues(source, managedConfig(paths));
    await atomicWrite(file, cleaned.endsWith("\n") ? cleaned : `${cleaned}\n`);
  }
  return preserved;
}

export async function doctor(paths: Paths): Promise<string[]> {
  const issues: string[] = [];
  try {
    assertSupportedOpenCode(await opencodeVersion(paths.opencodeBinary));
  } catch (error) {
    issues.push((error as Error).message);
  }
  const manifest = await readManifest(paths);
  if (!manifest) issues.push("UltraCode has not been applied");
  for (const asset of assets) {
    if (!(await exists(join(paths.config, asset.target)))) issues.push(`Missing ${asset.target}`);
  }
  if (await exists(paths.opencodeConfigFile)) {
    try { parseJsonc(await readFile(paths.opencodeConfigFile, "utf8")); } catch { issues.push("Invalid opencode.jsonc"); }
  }
  if (process.env.ULTRACODE_SKIP_RUNTIME !== "1" && !(await exists(join(paths.runtime, "node_modules", "@playwright", "mcp")))) {
    issues.push("Managed Playwright runtime is missing");
  }
  return issues;
}
