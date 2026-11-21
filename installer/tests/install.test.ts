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
