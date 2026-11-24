import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePaths } from "../src/paths";
import { dispatch, type CliDeps } from "../src/cli";
import { launchOrInstallDesktop } from "../src/desktop";
import { runRalphWorkflow } from "../src/ralph";
import { apply } from "../src/install";

function makeDeps(calls: string[], out: string[]) {
  const deps: CliDeps = {
    passthroughOpenCode: async (_paths, args) => {
      calls.push(`opencode:${args.join(" ")}`);
      return 0;
    },
    ensureOpenCode: async () => {
      calls.push("ensureOpenCode");
      return { binary: "opencode", version: "2.3.2", action: "kept" };
    },
    updateSelf: async () => {
      calls.push("updateSelf");
      return "v1.2.0";
    },
    sync: async () => {
      calls.push("sync");
      return 0;
    },
    doctor: async () => [],
    uninstall: async () => [],
    runPlaywright: async (_paths, args) => {
      calls.push(`playwright:${args.join(" ")}`);
      return 0;
    },
    runRalphWorkflow: async (_paths, args) => {
      calls.push(`ralph:${args.join(" ")}`);
      return 0;
    },
    launchOrInstallDesktop: async () => {
      calls.push("desktop");
      return 0;
    },
    log: (msg: string) => out.push(msg),
    error: (msg: string) => out.push(`ERR:${msg}`),
  };
  return deps;
}

describe("unified ultracode CLI router", () => {
  const paths = resolvePaths({ HOME: "/tmp/uc-cli-test" }, "linux");

  test("forwards empty args to opencode", async () => {
    const calls: string[] = [];
    const code = await dispatch([], paths, makeDeps(calls, []));
    expect(code).toBe(0);
    expect(calls).toEqual(["opencode:"]);
  });

  test("forwards directory path to opencode", async () => {
    const calls: string[] = [];
    await dispatch(["./my-app"], paths, makeDeps(calls, []));
    expect(calls).toEqual(["opencode:./my-app"]);
  });

  test("forwards pair --remote to opencode", async () => {
    const calls: string[] = [];
    await dispatch(["pair", "--remote"], paths, makeDeps(calls, []));
    expect(calls).toEqual(["opencode:pair --remote"]);
  });

  test("forwards mcp list to opencode while _mcp runs managed Playwright MCP", async () => {
    const calls: string[] = [];
    await dispatch(["mcp", "list"], paths, makeDeps(calls, []));
    await dispatch(["_mcp"], paths, makeDeps(calls, []));
    expect(calls).toEqual(["opencode:mcp list", "playwright:"]);
  });

  test("upgrade, update, and up run ensureOpenCode -> updateSelf -> sync", async () => {
    for (const cmd of ["upgrade", "update", "up"]) {
      const calls: string[] = [];
      const code = await dispatch([cmd], paths, makeDeps(calls, []));
      expect(code).toBe(0);
      expect(calls).toEqual(["ensureOpenCode", "updateSelf", "sync"]);
    }
  });

  test("desktop invokes launchOrInstallDesktop", async () => {
    const calls: string[] = [];
    const code = await dispatch(["desktop"], paths, makeDeps(calls, []));
    expect(code).toBe(0);
    expect(calls).toEqual(["desktop"]);
  });

  test("subcommand --help prints help without running destructive or mutating actions", async () => {
    const calls: string[] = [];
    const out: string[] = [];
    const code1 = await dispatch(["upgrade", "--help"], paths, makeDeps(calls, out));
    const code2 = await dispatch(["uninstall", "--help"], paths, makeDeps(calls, out));
    expect(code1).toBe(0);
    expect(code2).toBe(0);
    expect(calls).toEqual([]);
    expect(out[0]).toContain("UltraCode 1.2.0");
  });

  test("launchOrInstallDesktop downloads installer cleanly in dryRun when Desktop is not installed", async () => {
    const { createServer } = await import("node:http");
    const dir = await mkdtemp(join(tmpdir(), "uc-desktop-"));
    const srv = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end("mock-desktop-binary");
    });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const port = (srv.address() as { port: number }).port;
    const prevUrl = process.env.ULTRACODE_DESKTOP_DOWNLOAD_URL;
    process.env.ULTRACODE_DESKTOP_DOWNLOAD_URL = `http://127.0.0.1:${port}/desktop-installer`;
    const silentStream = { isTTY: false, write: () => true } as unknown as NodeJS.WriteStream;
    try {
      const p = resolvePaths({ HOME: dir, USERPROFILE: dir, LOCALAPPDATA: dir });
      const code = await launchOrInstallDesktop(p, {
        dryRun: true,
        platform: "darwin",
        arch: "arm64",
        skipInstalledCheck: true,
        statusStream: silentStream,
      });
      expect(code).toBe(0);
    } finally {
      if (prevUrl === undefined) delete process.env.ULTRACODE_DESKTOP_DOWNLOAD_URL;
      else process.env.ULTRACODE_DESKTOP_DOWNLOAD_URL = prevUrl;
      await new Promise<void>((resolve) => srv.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("--help prints minimal help with zero uc references", async () => {
    const out: string[] = [];
    const code = await dispatch(["--help"], paths, makeDeps([], out));
    expect(code).toBe(0);
    const rendered = out.join("\n");
    expect(rendered).toContain("UltraCode 1.2.0");
    expect(rendered).toContain("ultracode desktop");
    expect(rendered).toContain("ultracode pair");
    expect(rendered).not.toMatch(/\buc\b/);
  });

  test("bin.ts runs dispatch unconditionally without import.meta.main (Windows .exe safe)", async () => {
    const binPath = fileURLToPath(new URL("../src/bin.ts", import.meta.url));
    const binSource = await readFile(binPath, "utf8");
    expect(binSource).not.toContain("import.meta.main");
    const out = execFileSync(process.execPath, ["run", binPath, "version"], { encoding: "utf8" });
    expect(out.trim()).toBe("1.2.0");
  });

  test("runRalphWorkflow rejects non-linked worktree with exit code 2", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-ralph-main-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: dir });
      const goal = join(dir, "GOAL.md");
      await writeFile(goal, "# Goal\n");
      await mkdir(join(dir, ".ralph"), { recursive: true });
      await writeFile(join(dir, ".ralph", "ralph-tasks.md"), "- [ ] task\n");
      const errors: string[] = [];
      const code = await runRalphWorkflow(paths, ["run", goal], { cwd: dir, error: (m) => errors.push(m) });
      expect(code).toBe(2);
      expect(errors[0]).toContain("linked Git worktree");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("runRalphWorkflow bootstraps templates and runs in a linked worktree", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-ralph-wt-"));
    const wt = join(dir, "wt");
    try {
      const home = join(dir, "home");
      await mkdir(join(home, "bin"), { recursive: true });
      const fake = join(home, "bin", process.platform === "win32" ? "opencode.cmd" : "opencode");
      await writeFile(
        fake,
        process.platform === "win32" ? "@echo off\r\necho opencode v2.3.2\r\n" : "#!/bin/sh\nprintf 'opencode v2.3.2\\n'\n",
        { mode: 0o755 },
      );
      const p = resolvePaths({ HOME: home, USERPROFILE: home, LOCALAPPDATA: home, ULTRACODE_OPENCODE_BIN: fake, ULTRACODE_SKIP_RUNTIME: "1" });
      await apply(p, { runtime: false });

      const repo = join(dir, "repo");
      await mkdir(repo, { recursive: true });
      execFileSync("git", ["init", "-q"], { cwd: repo });
      execFileSync("git", ["config", "user.name", "Test"], { cwd: repo });
      execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
      await writeFile(join(repo, "README.md"), "# Test\n");
      execFileSync("git", ["add", "README.md"], { cwd: repo });
      execFileSync("git", ["commit", "-q", "-m", "init"], { cwd: repo });
      execFileSync("git", ["worktree", "add", "-q", "-b", "feat/ralph", wt], { cwd: repo });

      const goal = join(dir, "GOAL.md");
      await writeFile(goal, "# Goal\n");
      await mkdir(join(wt, ".ralph"), { recursive: true });
      await writeFile(join(wt, ".ralph", "ralph-tasks.md"), "- [ ] task\n");
      execFileSync("git", ["add", ".ralph/ralph-tasks.md"], { cwd: wt });
      execFileSync("git", ["commit", "-q", "-m", "add tasks"], { cwd: wt });

      let capturedArgs: string[] = [];
      let capturedCwd = "";
      const code = await runRalphWorkflow(p, ["run", goal, "5", "--no-questions"], {
        cwd: wt,
        runner: async (_paths, ralphArgs, opts) => {
          capturedArgs = ralphArgs;
          capturedCwd = opts?.cwd || "";
          execFileSync("git", ["add", "-A"], { cwd: wt });
          execFileSync("git", ["commit", "-q", "-m", "complete"], { cwd: wt });
          return 0;
        },
      });
      expect(code).toBe(0);
      expect(capturedCwd).toBeTruthy();
      expect(capturedArgs).toContain("--max-iterations");
      expect(capturedArgs).toContain("5");
      expect(capturedArgs).toContain("--no-questions");
      expect(await readFile(join(wt, ".ralph", "PROGRESS.md"), "utf8")).toBeTruthy();
      expect(await readFile(join(wt, ".ralph", "HANDOFF.md"), "utf8")).toBeTruthy();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("ralph run deduplicates --max-iterations/-n flags, defaults to 50, supports --init scaffolding, and auto-creates --worktree from main checkout", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-ralph-ergonomics-"));
    try {
      const home = join(dir, "home");
      await mkdir(join(home, "bin"), { recursive: true });
      const fake = join(home, "bin", process.platform === "win32" ? "opencode.cmd" : "opencode");
      await writeFile(
        fake,
        process.platform === "win32" ? "@echo off\r\necho opencode v2.4.1\r\n" : "#!/bin/sh\nprintf 'opencode v2.4.1\\n'\n",
        { mode: 0o755 },
      );
      const p = resolvePaths({
        HOME: home,
        USERPROFILE: home,
        LOCALAPPDATA: home,
        ULTRACODE_OPENCODE_BIN: fake,
        ULTRACODE_SKIP_RUNTIME: "1",
      });
      await apply(p, { runtime: false });

      const repo = join(dir, "repo");
      await mkdir(repo, { recursive: true });
      execFileSync("git", ["init", "-q"], { cwd: repo });
      execFileSync("git", ["config", "user.name", "Test"], { cwd: repo });
      execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
      await writeFile(join(repo, ".gitignore"), ".ralph/\n.opencode/ultracode/\n");
      await writeFile(join(repo, "SPEC.md"), "# Build Feature\n");
      execFileSync("git", ["add", ".gitignore", "SPEC.md"], { cwd: repo });
      execFileSync("git", ["commit", "-q", "-m", "init"], { cwd: repo });

      // Run directly from main checkout using --worktree auth --init --max-iterations 80
      let capturedArgs: string[] = [];
      let capturedCwd = "";
      const code1 = await runRalphWorkflow(
        p,
        ["run", "SPEC.md", "--worktree", "auth", "--init", "--max-iterations", "80", "--no-questions"],
        {
          cwd: repo,
          runner: async (_paths, ralphArgs, opts) => {
            capturedArgs = ralphArgs;
            capturedCwd = opts?.cwd || "";
            return 0;
          },
        },
      );
      expect(code1).toBe(0);
      expect(capturedCwd).toContain(".ultracode-worktrees");
      expect(capturedCwd).toContain("repo-auth");
      expect(capturedArgs.filter((a) => a === "--max-iterations")).toHaveLength(1);
      const maxIdx = capturedArgs.indexOf("--max-iterations");
      expect(capturedArgs[maxIdx + 1]).toBe("80");
      expect(capturedArgs).not.toContain("--worktree");
      expect(capturedArgs).not.toContain("--init");

      // Verify --init scaffolded ralph-tasks.md and .opencode/ultracode/{FEATURE_LIST.json,SPRINT_CONTRACT.md,UI_RUBRIC.md}
      expect(await readFile(join(capturedCwd, ".ralph", "ralph-tasks.md"), "utf8")).toContain("- [ ]");
      expect(await readFile(join(capturedCwd, ".opencode", "ultracode", "FEATURE_LIST.json"), "utf8")).toContain("F-001");
      expect(await readFile(join(capturedCwd, ".opencode", "ultracode", "SPRINT_CONTRACT.md"), "utf8")).toBeTruthy();
      expect(await readFile(join(capturedCwd, ".opencode", "ultracode", "UI_RUBRIC.md"), "utf8")).toBeTruthy();

      // Reusing --worktree auth without explicit max-iterations defaults to 50
      let defaultArgs: string[] = [];
      const code2 = await runRalphWorkflow(p, ["run", "SPEC.md", "--worktree", "auth"], {
        cwd: repo,
        runner: async (_paths, ralphArgs) => {
          defaultArgs = ralphArgs;
          return 0;
        },
      });
      expect(code2).toBe(0);
      const defIdx = defaultArgs.indexOf("--max-iterations");
      expect(defaultArgs[defIdx + 1]).toBe("50");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("ultracode setup-models --recommended and --inherit update opencode.jsonc preserving comments without touching agents/*.md", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-setup-models-cli-"));
    try {
      const home = join(dir, "home");
      await mkdir(join(home, "bin"), { recursive: true });
      const fake = join(home, "bin", process.platform === "win32" ? "opencode.cmd" : "opencode");
      const modelPayload = JSON.stringify({
        data: [
          { providerID: "openai", id: "gpt-6", enabled: true },
          { providerID: "openai", id: "gpt-6-codex", enabled: true },
          { providerID: "openai", id: "gpt-6-mini", enabled: true },
        ],
      });
      await writeFile(
        fake,
        process.platform === "win32"
          ? `@echo off\r\nif "%*"=="--version" (\r\n  echo opencode v2.4.1\r\n  exit /b 0\r\n)\r\nif "%*"=="api get /api/model" (\r\n  echo ${modelPayload}\r\n  exit /b 0\r\n)\r\nexit /b 0\r\n`
          : `#!/bin/sh\ncase "$*" in\n  --version) echo 'opencode v2.4.1';;\n  'api get /api/model') printf '%s\\n' '${modelPayload}';;\nesac\nexit 0\n`,
        { mode: 0o755 },
      );
      const p = resolvePaths({
        HOME: home,
        USERPROFILE: home,
        LOCALAPPDATA: home,
        ULTRACODE_OPENCODE_BIN: fake,
        ULTRACODE_SKIP_RUNTIME: "1",
      });
      await mkdir(p.config, { recursive: true });
      await writeFile(
        p.opencodeConfigFile,
        `{
  // custom comment survives setup-models
  "provider": { "openai": {} }
}
`,
      );
      await apply(p, { runtime: false });
      const beforeAgentMd = await readFile(join(p.config, "agents/UltraBuild.md"), "utf8");

      const out: string[] = [];
      const codeRec = await dispatch(["setup-models", "--recommended"], p, {
        ...makeDeps([], out),
      });
      expect(codeRec).toBe(0);

      const afterRecText = await readFile(p.opencodeConfigFile, "utf8");
      expect(afterRecText).toContain("// custom comment survives setup-models");
      const { parseJsonc } = await import("../src/config");
      const afterRec = parseJsonc(afterRecText) as any;
      expect(afterRec.agents.UltraPlan.model).toBe("openai/gpt-6");
      expect(afterRec.agents.UltraBuild.model).toBe("openai/gpt-6-codex");
      expect(afterRec.agents["ultracode/librarian"].model).toBe("openai/gpt-6-mini");
      expect(await readFile(join(p.config, "agents/UltraBuild.md"), "utf8")).toBe(beforeAgentMd);

      const codeInh = await dispatch(["setup-models", "--inherit"], p, {
        ...makeDeps([], out),
      });
      expect(codeInh).toBe(0);
      const afterInhText = await readFile(p.opencodeConfigFile, "utf8");
      expect(afterInhText).toContain("// custom comment survives setup-models");
      const afterInh = parseJsonc(afterInhText) as any;
      expect(afterInh.agents.UltraBuild).toBeUndefined();
      expect(afterInh.agents.build).toEqual({ hidden: true });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
