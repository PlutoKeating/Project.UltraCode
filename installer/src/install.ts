import { isDeepStrictEqual } from "node:util";
import { mkdir, readdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { assets } from "./assets";
import { additions, renameDefault, mergeJsonc, parseJsonc, retire, type Addition } from "./config";
import { atomicWrite, backup, exists, makeExecutable, readText, sha256 } from "./fs";
import { managedConfig } from "./managed";
import { readManifest, writeManifest, type InstallManifest } from "./manifest";
import { assertSupportedOpenCode, opencodeVersion, run } from "./opencode";
import type { Paths } from "./paths";
import { components } from "./components";
import { browserReady, runtimeEntries, installRuntime } from "./runtime";

export const VERSION = process.env.ULTRACODE_RELEASE_VERSION || "0.2.2";

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

async function ownership(paths: Paths, manifest: InstallManifest | null, file: string, source: string): Promise<Addition[]> {
  if (!manifest) return [];
  if (manifest.schema === 2) return manifest.configFile === file ? manifest.owned ?? [] : [];
  const directory = join(paths.home, "backups");
  const names = (await readdir(directory).catch(() => [] as string[]))
    .filter(name => /^\d+-opencode\.jsonc?$/.test(name) && name.endsWith("-" + basename(file))).sort();
  if (!names[0]) return [];
  const before = await readText(join(directory, names[0]));
  const spec = managedConfig(paths);
  spec.default_agent = "ultracode/orchestrator"; // Schema 1 used the original primary role ID.
  if (/^v?0\.1\./.test(manifest.version)) spec.plugins = [join(paths.runtime, "superpowers")];
  const baseline = parseJsonc(before);
  const expected = parseJsonc(mergeJsonc(before, spec, true).text);
  // Only trust a historical backup when replaying that release reproduces
  // the current document (including any manually removed managed additions).
  const current = parseJsonc(mergeJsonc(source, spec, true).text);
  if (!isDeepStrictEqual(expected, current)) return [];
  return additions(baseline, expected);
}

export async function apply(paths: Paths, options: { runtime?: boolean } = {}): Promise<ApplyReport> {
  assertSupportedOpenCode(await opencodeVersion(paths.opencodeBinary));
  await mkdir(paths.config, { recursive: true });
  await mkdir(join(paths.home, "backups"), { recursive: true });
  const previous = await readManifest(paths);
  const hashes: Record<string, string> = {};
  const conflicts: string[] = [];

  const file = await configFile(paths);
  const source = (await exists(file)) ? await readText(file) : "{}";
  const owned = await ownership(paths, previous, file, source);
  const base = previous?.schema === 1 ? retire(source, owned, {}).text : source;
  const { managed, browser } = await components(paths, parseJsonc(base));
  const cleaned = retire(base, previous?.schema === 1 ? [] : owned, managed);
  const merged = mergeJsonc(cleaned.text, managed);
  const records = [...cleaned.retained, ...additions(parseJsonc(cleaned.text), parseJsonc(merged.text))];
  if (options.runtime !== false && process.env.ULTRACODE_SKIP_RUNTIME !== "1") await installRuntime(paths);

  const retired = ["plan", "work", "review"].map(name => `commands/ultracode/${name}.md`);
  for (const [oldID, newID] of Object.entries({
    "ultracode/orchestrator": "UltraBuild", "uc-apex": "UltraBuild",
    "ultracode/planner": "UltraPlan", "uc-atlas": "UltraPlan",
  })) {
    const legacy = `agents/${oldID}.md`;
    const hash = previous?.files[legacy];
    const path = join(paths.config, legacy);
    if (hash && await exists(path) && sha256(await readText(path)) === hash) {
      retired.push(legacy);
      // A user may have explicitly selected the retiring role.
      if ((parseJsonc(merged.text) as Record<string, unknown>).default_agent === oldID)
        merged.text = renameDefault(merged.text, newID);
    }
  }
  for (const legacy of retired) {
    const hash = previous?.files[legacy];
    const target = join(paths.config, legacy);
    if (hash && await exists(target) && sha256(await readText(target)) === hash) await rm(target);
  }

  for (const asset of assets) {
    const target = join(paths.config, asset.target);
    const template = asset.content.replaceAll("ultracode_playwright_*", browser + "_*");
    const content = asset.target.endsWith("visual-evaluator.md")
      ? template.replace("~/.config/opencode/ultracode/templates/UI_RUBRIC.md", join(paths.config, "ultracode/templates/UI_RUBRIC.md"))
      : template;
    const nextHash = sha256(content);
    const current = (await exists(target)) ? await readText(target) : null;
    const currentHash = current === null ? null : sha256(current);
    const previousHash = previous?.files[asset.target];
    const userModified = current !== null && currentHash !== previousHash && currentHash !== nextHash;
    if (userModified && previousHash !== undefined) {
      conflicts.push(`${asset.target} (locally modified)`);
      continue;
    }
    if (current !== null && previousHash === undefined) {
      if (currentHash !== nextHash) conflicts.push(`${asset.target} (pre-existing)`);
      continue;
    }
    if (currentHash !== nextHash) {
      await backup(target, join(paths.home, "backups"));
      await atomicWrite(target, content, asset.executable ? 0o755 : 0o644);
    }
    if (asset.executable) await makeExecutable(target);
    hashes[asset.target] = nextHash;
  }

  conflicts.push(...merged.conflicts.map((item) => `config:${item}`));
  if (merged.text !== source) {
    await backup(file, join(paths.home, "backups"));
    await atomicWrite(file, merged.text.endsWith("\n") ? merged.text : `${merged.text}\n`);
  }

  await writeManifest(paths, VERSION, hashes, file, records);
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
    const cleaned = retire(source, await ownership(paths, manifest, file, source), {}).text;
    await atomicWrite(file, cleaned.endsWith("\n") ? cleaned : `${cleaned}\n`);
  }
  await rm(paths.manifest, { force: true });
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
  const file = await configFile(paths);
  if (!(await exists(file))) issues.push("Missing OpenCode configuration");
  else try { parseJsonc(await readText(file)); } catch { issues.push("Invalid OpenCode configuration"); }
  if (process.env.ULTRACODE_SKIP_RUNTIME !== "1") {
    if (process.env.ULTRACODE_SKIP_BROWSER !== "1" && !(await browserReady(paths))) issues.push("Missing managed browser installation");
    for (const path of runtimeEntries) {
      if (!(await exists(join(paths.runtime, path)))) issues.push("Missing runtime " + path);
    }
    try {
      const roleIDs = assets.filter(a => a.target.startsWith("agents/")).map(a => a.target.slice(7, -3));
      const source = await readText(file);
      const { browser, managed } = await components(paths, parseJsonc(source));
      if (mergeJsonc(source, managed).conflicts.includes("mcp.servers.ultracode_playwright"))
        issues.push("Existing ultracode_playwright registration has a different launch configuration");
      let pending: string[] = [];
      for (let attempt = 0; attempt < 12; attempt++) {
        const plugins = await run(paths.opencodeBinary, ["api", "get", "/api/plugin"]);
        const servers = await run(paths.opencodeBinary, ["api", "get", "/api/mcp"]);
        const registry = JSON.parse(plugins.stdout).data as { id: string; state: { status: string; error?: string } }[];
        const mcp = JSON.parse(servers.stdout).data as { name: string; status: { status: string } }[];
        const agents = await run(paths.opencodeBinary, ["debug", "agents"]);
        const ids = new Set((JSON.parse(agents.stdout) as { id: string }[]).map(agent => agent.id));
        pending = roleIDs.filter(id => !ids.has(id)).map(id => "Missing registered agent " + id);
        for (const id of ["superpowers", "ultracode-conversation"]) {
          const matches = registry.filter(p => p.id === id);
          if (matches.length !== 1 || matches[0]?.state.status !== "active")
            pending.push(id + ": " + (matches.map(p => p.state.error || p.state.status).join(", ") || "missing"));
        }
        const status = mcp.find(m => m.name === browser)?.status.status;
        if (status !== "connected") pending.push(browser + ": " + (status || "missing"));
        if (!pending.length || registry.some(p => p.state.status === "failed" && ["superpowers", "ultracode-conversation"].includes(p.id))) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      issues.push(...pending);
    } catch { issues.push("Could not verify the OpenCode runtime registries"); }
  }
  return issues;
}
