import { copyFile, mkdir, realpath } from "node:fs/promises";
import { join, resolve } from "node:path";
import { exists } from "./fs";
import { run } from "./opencode";
import type { Paths } from "./paths";
import { runRalph } from "./runtime";

export interface RalphWorkflowOptions {
  cwd?: string;
  runner?: (paths: Paths, args: string[], options?: { cwd?: string }) => Promise<number>;
  error?: (msg: string) => void;
}

async function copyIfMissing(source: string, destination: string): Promise<void> {
  if ((await exists(destination)) || !(await exists(source))) return;
  await copyFile(source, destination);
}

export async function runRalphWorkflow(
  paths: Paths,
  args: string[],
  options: RalphWorkflowOptions = {},
): Promise<number> {
  const runner = options.runner ?? runRalph;
  const cwd = options.cwd ?? process.cwd();
  const reportError = options.error ?? ((msg: string) => console.error(msg));

  if (args[0] !== "run") {
    return runner(paths, args, { cwd });
  }

  const rest = args.slice(1);
  if (rest.length < 1) {
    reportError("Usage: ultracode ralph run <goal-file> [max-iterations] [flags...]");
    return 2;
  }

  const goalArg = rest[0]!;
  let maxIterations = "20";
  let extraFlags: string[] = [];

  if (rest.length >= 2 && !rest[1]!.startsWith("-")) {
    maxIterations = rest[1]!;
    extraFlags = rest.slice(2);
  } else {
    extraFlags = rest.slice(1);
  }

  if (!/^[1-9][0-9]*$/.test(maxIterations)) {
    reportError("max-iterations must be a positive integer.");
    return 2;
  }

  const [topRes, gitDirRes, commonDirRes] = await Promise.all([
    run("git", ["rev-parse", "--show-toplevel"], { cwd }).catch(() => ({ code: 1, stdout: "", stderr: "" })),
    run("git", ["rev-parse", "--git-dir"], { cwd }).catch(() => ({ code: 1, stdout: "", stderr: "" })),
    run("git", ["rev-parse", "--git-common-dir"], { cwd }).catch(() => ({ code: 1, stdout: "", stderr: "" })),
  ]);

  if (topRes.code !== 0 || gitDirRes.code !== 0 || commonDirRes.code !== 0) {
    reportError("UltraCode Ralph requires a dedicated linked Git worktree.");
    return 2;
  }

  const root = await realpath(topRes.stdout.trim());
  const gitDir = await realpath(resolve(cwd, gitDirRes.stdout.trim()));
  const commonDir = await realpath(resolve(cwd, commonDirRes.stdout.trim()));

  if (gitDir === commonDir) {
    reportError("UltraCode Ralph requires a dedicated linked Git worktree.");
    return 2;
  }

  const resolvedGoal = resolve(cwd, goalArg);
  if (!(await exists(resolvedGoal))) {
    reportError(`Goal file not found: ${goalArg}`);
    return 2;
  }

  const tasksFile = join(root, ".ralph", "ralph-tasks.md");
  if (!(await exists(tasksFile))) {
    reportError(`Missing task list: ${tasksFile}`);
    return 2;
  }

  const templatesDir = join(paths.config, "ultracode", "templates");
  await mkdir(join(root, ".ralph"), { recursive: true });
  await copyIfMissing(join(templatesDir, "PROGRESS.md"), join(root, ".ralph", "PROGRESS.md"));
  await copyIfMissing(join(templatesDir, "HANDOFF.md"), join(root, ".ralph", "HANDOFF.md"));
  await copyIfMissing(join(templatesDir, "gitignore"), join(root, ".ralph", ".gitignore"));
  await mkdir(join(root, ".opencode", "ultracode", "qa"), { recursive: true });
  await copyIfMissing(join(templatesDir, "qa.gitignore"), join(root, ".opencode", "ultracode", "qa", ".gitignore"));

  const status = await runner(
    paths,
    [
      "--prompt-file",
      resolvedGoal,
      "--prompt-template",
      join(paths.config, "ultracode", "prompt.md"),
      "--tasks",
      "--max-iterations",
      maxIterations,
      "--agent",
      "opencode",
      "--abort-promise",
      "BLOCKED",
      "--no-commit",
      "--no-allow-all",
      ...extraFlags,
    ],
    { cwd: root },
  );

  if (status !== 0) return status;

  if (await exists(join(root, ".ralph", "ralph-history.json"))) {
    reportError("Ralph stopped before completion; inspect .ralph/PROGRESS.md and .ralph/HANDOFF.md.");
    return 3;
  }

  const gitStatus = await run("git", ["status", "--porcelain"], { cwd: root });
  if (gitStatus.stdout.trim().length > 0) {
    reportError("Ralph completed with uncommitted changes; review and commit them before rerunning.");
    const shortStatus = await run("git", ["status", "--short"], { cwd: root });
    if (shortStatus.stdout.trim()) reportError(shortStatus.stdout.trim());
    return 5;
  }

  return 0;
}
