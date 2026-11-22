import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apply, uninstall } from "../src/install";
import { resolvePaths, type Paths } from "../src/paths";

let root = "";
let paths: Paths;
let previousSkip: string | undefined;

async function writeFakeOpenCode(binDir: string, mode: "version" | "duplicate-doctor" = "version"): Promise<string> {
  await mkdir(binDir, { recursive: true });
  if (process.platform === "win32") {
    const file = join(binDir, "opencode.cmd");
    if (mode === "version") {
      await writeFile(file, "@echo off\r\necho opencode v2.3.2\r\n");
    } else {
      await writeFile(
        file,
        `@echo off\r\nif "%*"=="--version" (\r\n  echo opencode v2.3.2\r\n) else if "%*"=="debug agents" (\r\n  echo []\r\n) else if "%*"=="api get /api/plugin" (\r\n  echo {"data":[{"id":"superpowers","state":{"status":"active"}},{"id":"superpowers","state":{"status":"failed","error":"Duplicate plugin ID: superpowers"}}]}\r\n) else if "%*"=="api get /api/mcp" (\r\n  echo {"data":[]}\r\n)\r\n`,
      );
    }
    return file;
  }
  const file = join(binDir, "opencode");
  if (mode === "version") {
    await writeFile(file, "#!/bin/sh\nprintf 'opencode v2.3.2\\n'\n", { mode: 0o755 });
  } else {
    await writeFile(
      file,
      `#!/bin/sh
case "$*" in
  --version) echo 'opencode v2.3.2';;
  'debug agents') echo '[]';;
  'api get /api/plugin') echo '{"data":[{"id":"superpowers","state":{"status":"active"}},{"id":"superpowers","state":{"status":"failed","error":"Duplicate plugin ID: superpowers"}}]}';;
  'api get /api/mcp') echo '{"data":[]}';;
esac
`,
      { mode: 0o755 },
    );
  }
  return file;
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ultracode-installer-test-"));
  const fake = await writeFakeOpenCode(join(root, "bin"));
  paths = resolvePaths({
    HOME: root,
    USERPROFILE: root,
    LOCALAPPDATA: join(root, "AppData", "Local"),
    ULTRACODE_OPENCODE_BIN: fake,
    ULTRACODE_SKIP_RUNTIME: "1",
  });
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
    await writeFile(
      paths.opencodeConfigFile,
      `{
  // keep me
  "provider": {"mine": {"options": {"baseURL": "https://example.com"}}},
  "model": "mine/current",
  "default_agent": "mine"
}`,
    );
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
    expect(await readFile(join(paths.config, "agents/UltraBuild.md"), "utf8")).not.toContain("model:");
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

test("installs conversation package, rpc, settings, server, and tui entry points", async () => {
  await apply(paths, { runtime: false });
  const plugin = join(paths.config, "ultracode/conversation");
  const pkg = JSON.parse(await readFile(join(plugin, "package.json"), "utf8"));
  expect(pkg.name).toBe("ultracode-conversation");
  expect(pkg.exports["."]).toBe("./server.js");
  expect(pkg.exports["./gui-experimental"]).toBe("./gui-experimental.cjs");
  expect(pkg.exports["./tui"]).toMatch(/^\.\/tui\.(tsx|js)$/);
  expect(await readFile(join(plugin, "rpc.js"), "utf8")).toContain("UltraCodeRpc");
  expect(await readFile(join(plugin, "server.js"), "utf8")).toContain("experimental.idle");
  expect(await readFile(join(plugin, "server.js"), "utf8")).toContain("rpc.register");
  const tuiFile = pkg.exports["./tui"].slice(2);
  expect(await readFile(join(plugin, tuiFile), "utf8")).toContain('mode: "global"');
  expect((await readFile(join(plugin, "gui-experimental.cjs"), "utf8")).length).toBeGreaterThan(100);
  await expect(readFile(join(paths.config, "commands/ultracode/work.md"))).rejects.toThrow();
  await uninstall(paths);
  await expect(readFile(join(plugin, "gui-experimental.cjs"))).rejects.toThrow();
});

test("conversation settings resolves ULTRACODE_HOME dynamically and persists getAll/set/toggle", async () => {
  const settingsUrl = new URL("../../config/opencode/conversation/settings.js", import.meta.url).href;
  const settings = await import(settingsUrl);
  const prevHome = process.env.ULTRACODE_HOME;
  const isolatedHome = join(root, "isolated-ultracode-home");
  process.env.ULTRACODE_HOME = isolatedHome;
  try {
    expect(await settings.getAll()).toEqual({ permissions: "auto", direction: "manual" });
    expect(await settings.set("permissions", "manual")).toBe("manual");
    expect(await settings.getAll()).toEqual({ permissions: "manual", direction: "manual" });
    expect(await settings.toggle("direction")).toBe("auto");
    expect(await settings.getAll()).toEqual({ permissions: "manual", direction: "auto" });
  } finally {
    if (prevHome === undefined) delete process.env.ULTRACODE_HOME;
    else process.env.ULTRACODE_HOME = prevHome;
  }
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
  const server = {
    type: "local",
    command: ["npx", "-y", "@playwright/mcp@0.0.86", "--browser", "chromium", "--headless", "--isolated", "--output-dir", ".opencode/ultracode/qa"],
  };
  await mkdir(paths.config, { recursive: true });
  await writeFile(paths.opencodeConfigFile, JSON.stringify({ mcp: { servers: { browser: server } } }));
  await apply(paths);
  expect(JSON.parse(await readFile(paths.opencodeConfigFile, "utf8")).mcp.servers).toEqual({ browser: server });
  expect(await readFile(join(paths.config, "agents/ultracode/visual-evaluator.md"), "utf8")).toContain("action: browser_*");
});

test("preserves pre-existing byte-identical assets across repeated sync and uninstall", async () => {
  const { assets } = await import("../src/assets");
  const agent = assets.find((asset) => asset.target.endsWith("/reviewer.md"))!;
  await mkdir(join(paths.config, "agents/ultracode"), { recursive: true });
  const path = join(paths.config, agent.target);
  await writeFile(path, agent.content);
  await apply(paths);
  await apply(paths);
  await uninstall(paths);
  expect(await readFile(path, "utf8")).toBe(agent.content);
});

test("doctor reports duplicate runtime identities even when managed files exist", async () => {
  const { doctor } = await import("../src/install");
  await apply(paths);
  delete process.env.ULTRACODE_SKIP_RUNTIME;
  await writeFakeOpenCode(join(root, "bin"), "duplicate-doctor");
  const issues = await doctor(paths);
  expect(issues.some((issue) => issue.includes("Duplicate plugin ID: superpowers"))).toBe(true);
  expect(issues).toContain("ultracode_playwright: missing");
});

test("doctor surfaces OpenCode service error detail when runtime registry command fails", async () => {
  const { doctor } = await import("../src/install");
  await apply(paths);
  delete process.env.ULTRACODE_SKIP_RUNTIME;
  if (process.platform === "win32") {
    await writeFile(
      paths.opencodeBinary,
      `@echo off\r\nif "%*"=="--version" (\r\n  echo opencode v2.3.2\r\n  exit /b 0\r\n)\r\necho Error: Managed service port 49374 is already in use 1>&2\r\nexit /b 1\r\n`,
    );
  } else {
    await writeFile(
      paths.opencodeBinary,
      `#!/bin/sh\nif [ "$*" = "--version" ]; then echo 'opencode v2.3.2'; exit 0; fi\necho 'Error: Managed service port 49374 is already in use' >&2\nexit 1\n`,
      { mode: 0o755 },
    );
  }
  const issues = await doctor(paths);
  expect(issues.some((issue) => issue.includes("Managed service port 49374"))).toBe(true);
});
