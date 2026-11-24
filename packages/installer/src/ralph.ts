import { copyFile, mkdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
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
  if (rest.length < 1 || rest[0]!.startsWith("-")) {
    reportError("Usage: ultracode ralph run <goal-file> [max-iterations] [--worktree <name>] [--init] [flags...]");
    return 2;
  }

  const goalArg = rest[0]!;
  let maxIterations = "50";
  let rawExtra: string[];

  if (rest.length >= 2 && !rest[1]!.startsWith("-")) {
    maxIterations = rest[1]!;
    rawExtra = rest.slice(2);
  } else {
    rawExtra = rest.slice(1);
  }

  const extraFlags: string[] = [];
  let worktreeName: string | undefined;
  let initMode = false;

  for (let i = 0; i < rawExtra.length; i++) {
    const token = rawExtra[i]!;
    if (token === "--init") {
      initMode = true;
      continue;
    }
    if (token === "--max-iterations" || token === "-n") {
      const val = rawExtra[i + 1];
      if (!val) {
        reportError(`${token} requires a positive integer value.`);
        return 2;
      }
      maxIterations = val;
      i += 1;
      continue;
    }
    if (token.startsWith("--max-iterations=")) {
      maxIterations = token.slice("--max-iterations=".length);
      continue;
    }
    if (token.startsWith("-n=")) {
      maxIterations = token.slice(3);
      continue;
    }
    if (token === "--worktree") {
      const val = rawExtra[i + 1];
      if (!val || val.startsWith("-")) {
        reportError("--worktree requires a worktree name.");
        return 2;
      }
      worktreeName = val;
      i += 1;
      continue;
    }
    if (token.startsWith("--worktree=")) {
      const val = token.slice("--worktree=".length);
      if (!val || val.startsWith("-")) {
        reportError("--worktree requires a valid worktree name.");
        return 2;
      }
      worktreeName = val;
      continue;
    }
    extraFlags.push(token);
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
    reportError("UltraCode Ralph requires a dedicated linked Git worktree (or pass --worktree <name>).");
    return 2;
  }

  let root = await realpath(topRes.stdout.trim());
  const gitDir = await realpath(resolve(cwd, gitDirRes.stdout.trim()));
  const commonDir = await realpath(resolve(cwd, commonDirRes.stdout.trim()));

  if (gitDir === commonDir) {
    if (!worktreeName) {
      reportError("UltraCode Ralph requires a dedicated linked Git worktree (or pass --worktree <name>).");
      return 2;
    }
    if (!/^[a-zA-Z0-9._/-]+$/.test(worktreeName) || worktreeName.includes("..")) {
      reportError("Invalid --worktree name.");
      return 2;
    }
    const safeSlug = worktreeName.replace(/[\\/]+/g, "-");
    const worktreesParent = join(dirname(root), ".ultracode-worktrees");
    const targetWorktree = join(worktreesParent, `${basename(root)}-${safeSlug}`);
    await mkdir(worktreesParent, { recursive: true });

    if (!(await exists(join(targetWorktree, ".git")))) {
      const branchName = worktreeName.includes("/") ? worktreeName : `feature/${worktreeName}`;
      const branchExists = await run("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`], {
        cwd: root,
      });
      const addArgs =
        branchExists.code === 0
          ? ["worktree", "add", targetWorktree, branchName]
          : ["worktree", "add", "-b", branchName, targetWorktree];
      const created = await run("git", addArgs, { cwd: root });
      if (created.code !== 0) {
        reportError(`Failed to create linked Git worktree "${targetWorktree}": ${created.stderr.trim() || created.stdout.trim()}`);
        return 2;
      }
    }
    root = await realpath(targetWorktree);
  }

  const worktreeGoalCandidate = resolve(root, goalArg);
  const callerGoalCandidate = resolve(cwd, goalArg);
  const resolvedGoal = (await exists(worktreeGoalCandidate)) ? worktreeGoalCandidate : callerGoalCandidate;
  if (!(await exists(resolvedGoal))) {
    reportError(`Goal file not found: ${goalArg}`);
    return 2;
  }

  const templatesDir = join(paths.config, "ultracode", "templates");
  await mkdir(join(root, ".ralph"), { recursive: true });
  await mkdir(join(root, ".opencode", "ultracode", "qa"), { recursive: true });

  if (initMode) {
    await copyIfMissing(join(templatesDir, "FEATURE_LIST.json"), join(root, ".opencode", "ultracode", "FEATURE_LIST.json"));
    await copyIfMissing(join(templatesDir, "SPRINT_CONTRACT.md"), join(root, ".opencode", "ultracode", "SPRINT_CONTRACT.md"));
    await copyIfMissing(join(templatesDir, "UI_RUBRIC.md"), join(root, ".opencode", "ultracode", "UI_RUBRIC.md"));
    const starterTasks = join(root, ".ralph", "ralph-tasks.md");
    if (!(await exists(starterTasks))) {
      await writeFile(
        starterTasks,
        `# Ralph Tasks\n\n- [ ] Break down and verify features from ${basename(resolvedGoal)}\n`,
      );
    }
  }

  const tasksFile = join(root, ".ralph", "ralph-tasks.md");
  if (!(await exists(tasksFile))) {
    reportError(`Missing task list: ${tasksFile} (pass --init to scaffold starter artifacts)`);
    return 2;
  }

  await copyIfMissing(join(templatesDir, "PROGRESS.md"), join(root, ".ralph", "PROGRESS.md"));
  await copyIfMissing(join(templatesDir, "HANDOFF.md"), join(root, ".ralph", "HANDOFF.md"));
  await copyIfMissing(join(templatesDir, "gitignore"), join(root, ".ralph", ".gitignore"));
  await copyIfMissing(join(templatesDir, "qa.gitignore"), join(root, ".opencode", "ultracode", "qa", ".gitignore"));

  const prevRalphActive = process.env.ULTRACODE_RALPH_ACTIVE;
  process.env.ULTRACODE_RALPH_ACTIVE = "1";
  let status: number;
  try {
    status = await runner(
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
  } finally {
    if (prevRalphActive === undefined) delete process.env.ULTRACODE_RALPH_ACTIVE;
    else process.env.ULTRACODE_RALPH_ACTIVE = prevRalphActive;
  }

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
