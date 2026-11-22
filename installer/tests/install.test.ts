import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apply, uninstall } from "../src/install";
import { resolvePaths, type Paths } from "../src/paths";

let root = "";
let paths: Paths;
let previousSkip: string | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ultracode-installer-test-"));
  const bin = join(root, "bin");
  await mkdir(bin, { recursive: true });
  const fake = join(bin, "opencode");
  await writeFile(fake, "#!/bin/sh\nprintf 'opencode v2.3.2\\n'\n", { mode: 0o755 });
  paths = resolvePaths({ HOME: root, ULTRACODE_OPENCODE_BIN: fake, ULTRACODE_SKIP_RUNTIME: "1" });
  previousSkip = process.env.ULTRACODE_SKIP_RUNTIME;
  process.env.ULTRACODE_SKIP_RUNTIME = "1";
});

afterEach(async () => {
  if (previousSkip === undefined) delete process.env.ULTRACODE_SKIP_RUNTIME;
  else process.env.ULTRACODE_SKIP_RUNTIME = previousSkip;
  await rm(root, { recursive: true, force: true });
});

describe("isolated apply", () => {
  test("does not set a provider/model and is idempotent", async () => {
    await mkdir(paths.config, { recursive: true });
    await writeFile(paths.opencodeConfigFile, `{
  // keep me
  "provider": {"mine": {"options": {"baseURL": "https://example.com"}}},
  "model": "mine/current",
  "default_agent": "mine"
}`);
    const first = await apply(paths, { runtime: false });
    expect(first.conflicts).toContain("config:default_agent");
    const once = await readFile(paths.opencodeConfigFile, "utf8");
    expect(once).toContain('"model": "mine/current"');
    expect(once).toContain("// keep me");
    expect(once).not.toContain("google-vertex");
    expect(once).not.toContain("gemini-");
    expect(once).toContain("ultracode_playwright");
    await apply(paths, { runtime: false });
    expect(await readFile(paths.opencodeConfigFile, "utf8")).toBe(once);
    expect(await readFile(join(paths.config, "agents/ultracode/orchestrator.md"), "utf8")).not.toContain("model:");
  });

  test("preserves locally modified managed files and uninstalls only owned state", async () => {
    await apply(paths, { runtime: false });
    const agent = join(paths.config, "agents/ultracode/reviewer.md");
    await writeFile(agent, "# user customization\n");
    const preserved = await uninstall(paths);
    expect(preserved).toContain("agents/ultracode/reviewer.md");
    expect(await readFile(agent, "utf8")).toBe("# user customization\n");
    const config = await readFile(paths.opencodeConfigFile, "utf8");
    expect(config).not.toContain("ultracode_playwright");
  });
});

test("installs both conversation entry points and only natural-language workflows", async () => {
  await apply(paths, { runtime: false });
  const plugin = join(paths.config, "ultracode/conversation");
  expect(await readFile(join(plugin, "server.js"), "utf8")).toContain("experimental.idle");
  expect(await readFile(join(plugin, "tui.js"), "utf8")).toContain('mode: "global"');
  await expect(readFile(join(paths.config, "commands/ultracode/work.md"))).rejects.toThrow();
});

test("sync preserves equivalent user plugins, permission overrides and custom MCP commands through uninstall", async () => {
  await mkdir(paths.config, { recursive: true });
  const initial = {
    plugins: [{ package: "superpowers@git+https://github.com/obra/superpowers.git#v7.0.2", options: {} }],
    permissions: [{ effect: "deny", resource: "git push *", action: "shell" }],
    compaction: { auto: true },
    mcp: { servers: { ultracode_playwright: { type: "local", command: ["my-own-server"] } } },
  };
  const file = join(paths.config, "opencode.json");
  await writeFile(file, JSON.stringify(initial));
  await apply(paths);
  const installed = JSON.parse(await readFile(file, "utf8"));
  expect(installed.plugins.length).toBe(2);
  expect(installed.permissions.filter((rule: any) => rule.resource === "git push *")).toEqual(initial.permissions);
  expect(installed.mcp).toEqual(initial.mcp);
  await apply(paths);
  await uninstall(paths);
  expect(JSON.parse(await readFile(file, "utf8"))).toEqual(initial);
});

test("reuses matching browser launch settings and adapts the evaluator permissions", async () => {
  const server = { type: "local", command: ["npx", "-y", "@playwright/mcp@0.0.86", "--browser", "chromium", "--headless", "--isolated", "--output-dir", ".opencode/ultracode/qa"] };
  await mkdir(paths.config, { recursive: true });
  await writeFile(paths.opencodeConfigFile, JSON.stringify({ mcp: { servers: { browser: server } } }));
  await apply(paths);
  expect(JSON.parse(await readFile(paths.opencodeConfigFile, "utf8")).mcp.servers).toEqual({ browser: server });
  expect(await readFile(join(paths.config, "agents/ultracode/visual-evaluator.md"), "utf8")).toContain("action: browser_*");
});

test("migrates a legacy duplicate, preserves the original registration and survives a second sync", async () => {
  const { managedConfig } = await import("../src/managed");
  const { mergeJsonc } = await import("../src/config");
  const original = { plugins: ["superpowers@git+https://github.com/obra/superpowers.git#v7.0.2"], compaction: {} };
  const source = JSON.stringify(original);
  await mkdir(paths.config, { recursive: true });
  await mkdir(join(paths.home, "backups"), { recursive: true });
  await writeFile(join(paths.home, "backups/100-opencode.jsonc"), source);
  await writeFile(paths.opencodeConfigFile, mergeJsonc(source, managedConfig(paths)).text);
  await writeFile(paths.manifest, JSON.stringify({ schema: 1, version: "v0.2.0", files: {} }));
  await apply(paths);
  const after = await readFile(paths.opencodeConfigFile, "utf8");
  expect(JSON.parse(after).plugins).toEqual([...original.plugins, join(paths.config, "ultracode/conversation")]);
  await apply(paths);
  expect(await readFile(paths.opencodeConfigFile, "utf8")).toBe(after);
  await uninstall(paths);
  expect(JSON.parse(await readFile(paths.opencodeConfigFile, "utf8"))).toEqual(original);
});

test("preserves pre-existing byte-identical assets across repeated sync and uninstall", async () => {
  const { assets } = await import("../src/assets");
  const agent = assets.find(asset => asset.target.endsWith("/reviewer.md"))!;
  await mkdir(join(paths.config, "agents/ultracode"), { recursive: true });
  const path = join(paths.config, agent.target);
  await writeFile(path, agent.content);
  await apply(paths);
  await apply(paths);
  await uninstall(paths);
  expect(await readFile(path, "utf8")).toBe(agent.content);
});

test("repairs legacy concatenated MCP commands without deleting the user's server", async () => {
  const { managedConfig } = await import("../src/managed");
  const { mergeJsonc } = await import("../src/config");
  const original = { mcp: { servers: { ultracode_playwright: { type: "local", command: ["mine"] } } } };
  const source = JSON.stringify(original);
  await mkdir(paths.config, { recursive: true });
  await mkdir(join(paths.home, "backups"), { recursive: true });
  await writeFile(join(paths.home, "backups/100-opencode.jsonc"), source);
  await writeFile(paths.opencodeConfigFile, mergeJsonc(source, managedConfig(paths), true).text);
  await writeFile(paths.manifest, JSON.stringify({ schema: 1, files: {}, version: "v0.2.0" }));
  await apply(paths);
  await uninstall(paths);
  expect(JSON.parse(await readFile(paths.opencodeConfigFile, "utf8"))).toEqual(original);
});

test("doctor reports duplicate runtime identities even when managed files exist", async () => {
  const { doctor } = await import("../src/install");
  await apply(paths);
  delete process.env.ULTRACODE_SKIP_RUNTIME;
  await writeFile(paths.opencodeBinary, `#!/bin/sh
case "$*" in
  --version) echo 'opencode v2.3.2';;
  'debug agents') echo '[]';;
  'api get /api/plugin') echo '{"data":[{"id":"superpowers","state":{"status":"active"}},{"id":"superpowers","state":{"status":"failed","error":"Duplicate plugin ID: superpowers"}}]}';;
  'api get /api/mcp') echo '{"data":[]}';;
esac
`);
  const issues = await doctor(paths);
  expect(issues.some(issue => issue.includes("Duplicate plugin ID: superpowers"))).toBe(true);
  expect(issues).toContain("ultracode_playwright: missing");
});
