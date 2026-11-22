import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./opencode";
import { managedConfig } from "./managed";
import type { JsonValue } from "./config";
import type { Paths } from "./paths";

function object(value: JsonValue | undefined): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function pluginID(value: JsonValue, paths: Paths): Promise<string | undefined> {
  const spec = typeof value === "string" ? value : object(value).package;
  if (typeof spec !== "string") return;
  if (/^(?:superpowers(?:@|$)|(?:git\+)?https:\/\/github\.com\/obra\/superpowers(?:\.git)?(?:#.*)?$|github:obra\/superpowers(?:#.*)?$)/i.test(spec)) return "superpowers";
  if (!/^(?:file:|\/|\.\.?\/)/.test(spec)) return;
  const location = spec.startsWith("file:") ? fileURLToPath(spec) : resolve(paths.config, spec);
  if (location === join(paths.config, "ultracode/conversation")) return "ultracode-conversation";
  if (location === join(paths.runtime, "superpowers")) return "superpowers";
  try {
    const pkg = JSON.parse(await readFile(join(location, "package.json"), "utf8"));
    return pkg.name;
  } catch { return; }
}

export async function components(paths: Paths, config: JsonValue) {
  const managed = managedConfig(paths);
  const plugins = object(config).plugins;
  const ours = managed.plugins as string[];
  const choices = await Promise.all((Array.isArray(plugins) ? plugins : []).map(async entry => ({ entry, id: await pluginID(entry, paths) })));
  // A plugin may declare an ID unrelated to its npm name or directory.
  // Scope registry evidence to globally configured sources or global auto-discovery.
  const registered = new Map<string, string>();
  if (process.env.ULTRACODE_SKIP_RUNTIME !== "1") {
    const result = await run(paths.opencodeBinary, ["api", "get", "/api/plugin"]);
    if (result.code === 0) {
      try {
        for (const plugin of JSON.parse(result.stdout).data) {
          const spec = plugin.source?.target ?? plugin.source?.path;
          if (typeof spec === "string") registered.set(spec, plugin.id);
        }
      } catch { /* An initializing host can return no registry. Doctor verifies after sync. */ }
    }
  }
  for (const choice of choices) {
    const spec = typeof choice.entry === "string" ? choice.entry : object(choice.entry).package;
    if (typeof spec === "string") choice.id = registered.get(spec) ?? choice.id;
  }
  managed.plugins = ours.filter((path, i) => {
    const id = ["ultracode-conversation", "superpowers"][i];
    const discovered = [...registered].some(([spec, actual]) => actual === id && spec.startsWith(join(paths.config, "plugins") + "/"));
    return !discovered && !choices.some(choice => choice.entry !== path && choice.id === id);
  });

  const servers = object(object(object(config).mcp).servers);
  let browser = "ultracode_playwright";
  // Reuse only a launch contract with the same private headless browser and
  // evidence destination. Remote/persistent browsers are distinct resources.
  for (const [name, value] of Object.entries(servers)) {
    if (name === browser || !/^[a-zA-Z0-9_]+$/.test(name)) continue;
    const server = object(value);
    const cmd = server.command;
    if (server.type !== "local" || server.disabled || server.codemode || server.environment || server.env || !Array.isArray(cmd)) continue;
    if (typeof cmd[0] !== "string" || !["bunx", "npx"].includes(basename(cmd[0]))) continue;
    const args = cmd.slice(1);
    if (args[0] === "-y") args.shift();
    if (JSON.stringify(args) !== JSON.stringify(["@playwright/mcp@0.0.86", "--browser", "chromium", "--headless", "--isolated", "--output-dir", ".opencode/ultracode/qa"])) continue;
    browser = name;
    delete managed.mcp;
    managed.permissions = (managed.permissions as JsonValue[]).filter(rule => object(rule).action !== "ultracode_playwright_*");
    break;
  }
  return { managed, browser };
}
