import { readFile } from "node:fs/promises";
import { basename, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import baseline from "../../config/upstream-baseline.json";
import { findOpenCode, run } from "./opencode";
import { managedConfig } from "./managed";
import type { JsonValue } from "./config";
import type { Paths } from "./paths";

export const PLAYWRIGHT_MCP_SPEC = `${baseline.playwrightMcp.npmPackage}@${baseline.playwrightMcp.version}`;

function object(value: JsonValue | undefined): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isLocalSpec(spec: string): boolean {
  return spec.startsWith("file://") || spec.startsWith("file:") || isAbsolute(spec) || /^[a-zA-Z]:[\\/]/.test(spec) || /^\.\.?[\\/]/.test(spec);
}

function resolveLocalSpec(baseDir: string, spec: string): string | null {
  try {
    if (spec.startsWith("file://")) return fileURLToPath(spec);
    if (spec.startsWith("file:")) return resolve(baseDir, spec.slice(5));
    return resolve(baseDir, spec);
  } catch {
    return null;
  }
}

function samePath(a: string, b: string): boolean {
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

async function pluginID(value: JsonValue, paths: Paths): Promise<string | undefined> {
  const spec = typeof value === "string" ? value : object(value).package;
  if (typeof spec !== "string") return;
  if (/^(?:superpowers(?:@|$)|(?:git\+)?https:\/\/github\.com\/obra\/superpowers(?:\.git)?(?:#.*)?$|github:obra\/superpowers(?:#.*)?$)/i.test(spec)) return "superpowers";
  if (!isLocalSpec(spec)) return;
  const location = resolveLocalSpec(paths.config, spec);
  if (!location) return;
  if (samePath(location, resolve(join(paths.config, "ultracode", "conversation")))) return "ultracode-conversation";
  if (samePath(location, resolve(join(paths.runtime, "superpowers")))) return "superpowers";
  try {
    const pkg = JSON.parse(await readFile(join(location, "package.json"), "utf8"));
    return pkg.name;
  } catch {
    return;
  }
}

export async function components(paths: Paths, config: JsonValue) {
  const managed = managedConfig(paths);
  const plugins = object(config).plugins;
  const ours = managed.plugins as string[];
  const choices = await Promise.all((Array.isArray(plugins) ? plugins : []).map(async (entry) => ({ entry, id: await pluginID(entry, paths) })));
  const registered = new Map<string, string>();
  if (process.env.ULTRACODE_SKIP_RUNTIME !== "1") {
    const opencode = (await findOpenCode(paths)) ?? paths.opencodeBinary;
    const hasConfiguredPlugins =
      Array.isArray(plugins) && plugins.some((entry) => typeof entry !== "string" || !entry.startsWith("-"));
    const maxAttempts = hasConfiguredPlugins ? 4 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await run(opencode, ["api", "get", "/api/plugin"]).catch(() => ({ code: 1, stdout: "", stderr: "" }));
      let parsed = false;
      let hasNonBuiltin = false;
      if (result.code === 0) {
        try {
          const data = JSON.parse(result.stdout).data;
          if (Array.isArray(data)) {
            parsed = true;
            registered.clear();
            for (const plugin of data) {
              const spec = plugin?.source?.target ?? plugin?.source?.path;
              if (typeof spec === "string") registered.set(spec, plugin.id);
            }
            hasNonBuiltin = data.some((p) => p?.source?.type && p.source.type !== "builtin");
          }
        } catch {
          /* An initializing host can return no registry. Doctor verifies after sync. */
        }
      }
      if (!hasConfiguredPlugins || !parsed || hasNonBuiltin || attempt === maxAttempts) break;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 120));
    }
  }
  for (const choice of choices) {
    const spec = typeof choice.entry === "string" ? choice.entry : object(choice.entry).package;
    if (typeof spec !== "string") continue;
    let matched = registered.get(spec);
    if (!matched && isLocalSpec(spec)) {
      const resolvedChoice = resolveLocalSpec(paths.config, spec);
      if (resolvedChoice) {
        for (const [regSpec, regId] of registered) {
          const resolvedReg = isLocalSpec(regSpec) ? resolveLocalSpec(paths.config, regSpec) : null;
          if (resolvedReg && samePath(resolvedChoice, resolvedReg)) {
            matched = regId;
            break;
          }
        }
      }
    }
    choice.id = matched ?? choice.id;
  }
  const pluginsPrefix = resolve(join(paths.config, "plugins")) + sep;
  const normalizedPrefix = process.platform === "win32" ? pluginsPrefix.toLowerCase() : pluginsPrefix;
  managed.plugins = ours.filter((entry) => {
    if (entry.startsWith("-")) return true;
    const id = entry.replace(/\\/g, "/").endsWith("/ultracode/conversation") ? "ultracode-conversation" : "superpowers";
    const discovered = [...registered].some(([spec, actual]) => {
      if (actual !== id || !isLocalSpec(spec)) return false;
      const resolved = resolveLocalSpec(paths.config, spec);
      if (!resolved) return false;
      return (process.platform === "win32" ? resolved.toLowerCase() : resolved).startsWith(normalizedPrefix);
    });
    return !discovered && !choices.some((choice) => choice.entry !== entry && choice.id === id);
  });

  const servers = object(object(object(config).mcp).servers);
  let browser = "ultracode_playwright";
  for (const [name, value] of Object.entries(servers)) {
    if (name === browser || !/^[a-zA-Z0-9_]+$/.test(name)) continue;
    const server = object(value);
    const cmd = server.command;
    if (server.type !== "local" || server.disabled || server.codemode || server.environment || server.env || !Array.isArray(cmd)) continue;
    if (typeof cmd[0] !== "string") continue;
    const exe = basename(cmd[0]).replace(/\.(cmd|exe|bat)$/i, "").toLowerCase();
    if (!["bunx", "npx"].includes(exe)) continue;
    const args = cmd.slice(1);
    if (args[0] === "-y") args.shift();
    if (JSON.stringify(args) !== JSON.stringify([PLAYWRIGHT_MCP_SPEC, "--browser", "chromium", "--headless", "--isolated", "--output-dir", ".opencode/ultracode/qa"])) continue;
    browser = name;
    delete managed.mcp;
    managed.permissions = (managed.permissions as JsonValue[]).filter((rule) => object(rule).action !== "ultracode_playwright_*");
    break;
  }
  return { managed, browser };
}
