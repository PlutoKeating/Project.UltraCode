import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { assets } from "./assets";
import { additions, mergeJsonc, parseJsonc, retire, type Addition } from "./config";
import { atomicWrite, backup, exists, makeExecutable, readText, sha256 } from "./fs";
import { readManifest, writeManifest, type InstallManifest } from "./manifest";
import { assertSupportedOpenCode, findOpenCode, opencodeVersion, run } from "./opencode";
import type { Paths } from "./paths";
import { components } from "./components";
import { browserReady, runtimeEntries, installRuntime } from "./runtime";

export const VERSION = process.env.ULTRACODE_RELEASE_VERSION || "1.1.1";

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

function ownership(manifest: InstallManifest | null, file: string): Addition[] {
  if (!manifest || manifest.schema !== 2) return [];
  return manifest.configFile === file ? manifest.owned ?? [] : [];
}

export async function apply(paths: Paths, options: { runtime?: boolean } = {}): Promise<ApplyReport> {
  const opencode = (await findOpenCode(paths)) ?? paths.opencodeBinary;
  assertSupportedOpenCode(await opencodeVersion(opencode));
  await mkdir(paths.config, { recursive: true });
  await mkdir(join(paths.home, "backups"), { recursive: true });
  const previous = await readManifest(paths);
  const hashes: Record<string, string> = {};
  const conflicts: string[] = [];

  const file = await configFile(paths);
  const source = (await exists(file)) ? await readText(file) : "{}";
  const owned = ownership(previous, file);
  const { managed, browser } = await components(paths, parseJsonc(source));
  const cleaned = retire(source, owned, managed);
  const merged = mergeJsonc(cleaned.text, managed);
  const records = [...cleaned.retained, ...additions(parseJsonc(cleaned.text), parseJsonc(merged.text))];
  if (options.runtime !== false && process.env.ULTRACODE_SKIP_RUNTIME !== "1") await installRuntime(paths);

  for (const asset of assets) {
    const target = join(paths.config, asset.target);
    const template = asset.content.replaceAll("ultracode_playwright_*", browser + "_*");
    const content = asset.target.endsWith("visual-evaluator.md")
      ? template.replace(
          "~/.config/opencode/ultracode/templates/UI_RUBRIC.md",
          join(paths.config, "ultracode", "templates", "UI_RUBRIC.md"),
        )
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
    const cleaned = retire(source, ownership(manifest, file), {}).text;
    await atomicWrite(file, cleaned.endsWith("\n") ? cleaned : `${cleaned}\n`);
  }
  await rm(paths.manifest, { force: true });
  return preserved;
}

export async function doctor(paths: Paths): Promise<string[]> {
  const issues: string[] = [];
  const opencode = (await findOpenCode(paths)) ?? paths.opencodeBinary;
  try {
    assertSupportedOpenCode(await opencodeVersion(opencode));
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
  else {
    try {
      parseJsonc(await readText(file));
    } catch {
      issues.push("Invalid OpenCode configuration");
    }
  }
  if (process.env.ULTRACODE_SKIP_RUNTIME !== "1") {
    if (process.env.ULTRACODE_SKIP_BROWSER !== "1" && !(await browserReady(paths))) {
      issues.push("Missing managed browser installation");
    }
    for (const path of runtimeEntries) {
      if (!(await exists(join(paths.runtime, path)))) issues.push("Missing runtime " + path);
    }
    try {
      const roleIDs = assets.filter((a) => a.target.startsWith("agents/")).map((a) => a.target.slice(7, -3));
      const source = await readText(file);
      const { browser, managed } = await components(paths, parseJsonc(source));
      if (mergeJsonc(source, managed).conflicts.includes("mcp.servers.ultracode_playwright")) {
        issues.push("Existing ultracode_playwright registration has a different launch configuration");
      }
      let pending: string[] = [];
      let serverUrl: string | null = null;
      let serverPassword = "";
      let tempServer: ReturnType<typeof spawn> | null = null;
      let useStandaloneFlag = false;
      let fatalDetail = "";
      try {
        for (let attempt = 0; attempt < 12; attempt++) {
          const env = serverUrl ? { ...process.env, OPENCODE_PASSWORD: serverPassword } : process.env;
          const apiArgs = (path: string) =>
            serverUrl
              ? ["api", "--server", serverUrl, "get", path]
              : useStandaloneFlag
                ? ["api", "--standalone", "get", path]
                : ["api", "get", path];
          const debugArgs = serverUrl
            ? ["debug", "agents", "--server", serverUrl]
            : useStandaloneFlag
              ? ["debug", "agents", "--standalone"]
              : ["debug", "agents"];

          const plugins = await run(opencode, apiArgs("/api/plugin"), { env });
          const servers = await run(opencode, apiArgs("/api/mcp"), { env });
          const agents = await run(opencode, debugArgs, { env });
          const failedCmd = [plugins, servers, agents].find((r) => r.code !== 0);
          if (failedCmd) {
            const combined = `${failedCmd.stderr}\n${failedCmd.stdout}`;
            if (!serverUrl && !useStandaloneFlag && /already in use|Failed to start server|EADDRINUSE/i.test(combined)) {
              serverPassword = randomUUID();
              const child = spawn(opencode, ["serve", "--hostname", "127.0.0.1", "--port", "0"], {
                env: { ...process.env, OPENCODE_PASSWORD: serverPassword },
                stdio: ["ignore", "pipe", "pipe"],
                windowsHide: true,
              });
              child.on("error", () => {});
              tempServer = child;
              const discovered = await new Promise<string | null>((resolveUrl) => {
                let buf = "";
                const timer = setTimeout(() => resolveUrl(null), 3000);
                const onChunk = (chunk: Buffer) => {
                  buf += chunk.toString();
                  const m = buf.match(/https?:\/\/127\.0\.0\.1:\d+/);
                  if (m) {
                    clearTimeout(timer);
                    resolveUrl(m[0]);
                  }
                };
                child.stdout?.on("data", onChunk);
                child.stderr?.on("data", onChunk);
                child.on("close", () => {
                  clearTimeout(timer);
                  resolveUrl(null);
                });
              });
              if (discovered) {
                serverUrl = discovered;
              } else {
                child.kill();
                tempServer = null;
                useStandaloneFlag = true;
              }
              continue;
            }
            fatalDetail =
              combined
                .split(/\r?\n/)
                .map((l) => l.trim())
                .find((l) => l.length > 0 && !l.startsWith("at ")) || "";
            if (useStandaloneFlag || serverUrl) break;
            await new Promise((resolve) => setTimeout(resolve, 250));
            continue;
          }
          fatalDetail = "";
          let registry: { id: string; state: { status: string; error?: string } }[];
          let mcp: { name: string; status: { status: string } }[];
          let parsedAgents: { id: string }[];
          try {
            registry = JSON.parse(plugins.stdout).data;
            mcp = JSON.parse(servers.stdout).data;
            parsedAgents = JSON.parse(agents.stdout);
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 400));
            continue;
          }
          const ids = new Set(parsedAgents.map((agent) => agent.id));
          pending = roleIDs.filter((id) => !ids.has(id)).map((id) => "Missing registered agent " + id);
          for (const id of ["superpowers", "ultracode-conversation"]) {
            const matches = registry.filter((p) => p.id === id);
            if (matches.length !== 1 || matches[0]?.state.status !== "active") {
              pending.push(id + ": " + (matches.map((p) => p.state.error || p.state.status).join(", ") || "missing"));
            }
          }
          const status = mcp.find((m) => m.name === browser)?.status.status;
          if (status !== "connected") pending.push(browser + ": " + (status || "missing"));
          if (
            !pending.length ||
            registry.some((p) => p.state.status === "failed" && ["superpowers", "ultracode-conversation"].includes(p.id))
          ) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } finally {
        tempServer?.kill();
      }
      if (fatalDetail) {
        issues.push(`Could not verify the OpenCode runtime registries (${fatalDetail})`);
      } else {
        issues.push(...pending);
      }
    } catch (err) {
      const msg = err instanceof Error && err.message.startsWith("Could not verify") ? err.message : "Could not verify the OpenCode runtime registries";
      issues.push(msg);
    }
  }
  return issues;
}
