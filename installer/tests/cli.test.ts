import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePaths } from "../src/paths";
import { dispatch, type CliDeps } from "../src/cli";
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
      return "v0.3.0";
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

  test("--help prints minimal help with zero uc references", async () => {
    const out: string[] = [];
    const code = await dispatch(["--help"], paths, makeDeps([], out));
    expect(code).toBe(0);
    const rendered = out.join("\n");
    expect(rendered).toContain("UltraCode 0.3.0");
    expect(rendered).toContain("ultracode desktop");
    expect(rendered).toContain("ultracode pair");
    expect(rendered).not.toMatch(/\buc\b/);
  });

  test("bin.ts runs dispatch unconditionally without import.meta.main (Windows .exe safe)", async () => {
    const binPath = fileURLToPath(new URL("../src/bin.ts", import.meta.url));
    const binSource = await readFile(binPath, "utf8");
    expect(binSource).not.toContain("import.meta.main");
    const out = execFileSync(process.execPath, ["run", binPath, "version"], { encoding: "utf8" });
    expect(out.trim()).toBe("0.3.0");
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
});
