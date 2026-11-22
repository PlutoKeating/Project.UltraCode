#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { rename, rm, unlink } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { launchOrInstallDesktop } from "./desktop";
import { exists, sweepOldBinaries } from "./fs";
import { apply, doctor, uninstall, VERSION } from "./install";
import { ensureOpenCode, passthroughOpenCode, run } from "./opencode";
import { resolvePaths, type Paths } from "./paths";
import { runRalphWorkflow } from "./ralph";
import { updateSelf } from "./release";
import { runPlaywright } from "./runtime";
import { createSpinner } from "./ui";

export interface CliDeps {
  passthroughOpenCode: (paths: Paths, args: string[]) => Promise<number>;
  ensureOpenCode: typeof ensureOpenCode;
  updateSelf: (paths: Paths) => Promise<string>;
  sync: (paths: Paths) => Promise<number>;
  doctor: (paths: Paths) => Promise<string[]>;
  uninstall: (paths: Paths) => Promise<string[]>;
  runPlaywright: (paths: Paths, args: string[]) => Promise<number>;
  runRalphWorkflow: (paths: Paths, args: string[]) => Promise<number>;
  launchOrInstallDesktop: (paths: Paths) => Promise<number>;
  log: (msg: string) => void;
  error: (msg: string) => void;
}

export function formatHelp(version = VERSION): string {
  return `UltraCode ${version.replace(/^v/, "")}

  ultracode [args...]     Open OpenCode
  ultracode desktop       Open or install Desktop app
  ultracode pair          Connect browser or mobile
  ultracode upgrade       Update OpenCode and UltraCode
  ultracode sync          Sync configuration
  ultracode doctor        Check setup
  ultracode uninstall     Remove UltraCode
  ultracode ralph         Run Ralph loop
  ultracode version       Print version`;
}

async function confirmRemoval(): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question("Remove UltraCode? User configuration and backups are preserved. [y/N] ");
  prompt.close();
  return answer.trim().toLowerCase() === "y";
}

async function runSyncInPlace(paths: Paths, errorLog: (msg: string) => void): Promise<number> {
  const report = await apply(paths);
  for (const conflict of report.conflicts) errorLog(`Preserved: ${conflict}`);
  return 0;
}

function defaultDeps(): CliDeps {
  return {
    passthroughOpenCode,
    ensureOpenCode,
    updateSelf,
    sync: async (paths) => {
      if (await exists(paths.binary)) {
        const res = await run(paths.binary, ["sync"]);
        const filtered = res.stderr
          .split(/\r?\n/)
          .filter((line) => line.trim() && line.trim() !== "Setting up")
          .join("\n");
        if (filtered) console.error(filtered);
        return res.code;
      }
      return runSyncInPlace(paths, (msg) => console.warn(msg));
    },
    doctor,
    uninstall,
    runPlaywright,
    runRalphWorkflow: (paths, args) => runRalphWorkflow(paths, args),
    launchOrInstallDesktop: (paths) => launchOrInstallDesktop(paths),
    log: (msg) => console.log(msg),
    error: (msg) => console.error(msg),
  };
}

async function removeOwnBinary(binaryPath: string): Promise<void> {
  if (!(await exists(binaryPath))) return;
  if (process.platform !== "win32") {
    await unlink(binaryPath).catch(() => {});
    return;
  }
  await sweepOldBinaries(binaryPath);
  try {
    await unlink(binaryPath);
  } catch {
    const oldPath = `${binaryPath}.old-${process.pid}-${Date.now()}`;
    await rename(binaryPath, oldPath).catch(() => {});
    const escaped = binaryPath.replace(/'/g, "''");
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-WindowStyle",
        "Hidden",
        "-Command",
        `Start-Sleep -Milliseconds 500; Get-ChildItem -LiteralPath (Split-Path -Parent '${escaped}') -Filter ((Split-Path -Leaf '${escaped}') + '.old*') -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue`,
      ],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
  }
}

export async function dispatch(argv: string[], paths: Paths = resolvePaths(), deps?: CliDeps): Promise<number> {
  const d = deps ?? defaultDeps();
  if (argv.length === 0) {
    return d.passthroughOpenCode(paths, []);
  }

  const [command, ...args] = argv;
  switch (command) {
    case "apply":
    case "sync": {
      const spinner = deps ? null : createSpinner("Setting up");
      try {
        const code = deps ? await d.sync(paths) : await runSyncInPlace(paths, d.error);
        spinner?.stop();
        if (code === 0 && !deps) d.log("✓ Ready");
        return code;
      } catch (err) {
        spinner?.stop();
        throw err;
      }
    }
    case "doctor": {
      const issues = await d.doctor(paths);
      if (issues.length === 0) {
        d.log("✓ Ready");
        return 0;
      }
      for (const issue of issues) d.error(issue);
      return 1;
    }
    case "upgrade":
    case "update":
    case "up": {
      const spinner = deps ? null : createSpinner("Checking OpenCode");
      try {
        await d.ensureOpenCode(paths, {
          installIfMissing: true,
          upgradeIfPresent: true,
          onStatus: (msg) => spinner?.update(msg),
        });
        spinner?.update("Updating UltraCode");
        const tag = await d.updateSelf(paths);
        spinner?.update("Setting up");
        const code = await d.sync(paths);
        spinner?.stop();
        if (code === 0) d.log(`✓ UltraCode ${tag.replace(/^v/, "")}`);
        return code;
      } catch (err) {
        spinner?.stop();
        throw err;
      }
    }
    case "desktop":
      return d.launchOrInstallDesktop(paths);
    case "uninstall": {
      if (!args.includes("--yes") && !(await confirmRemoval())) return 2;
      const preserved = await d.uninstall(paths);
      await rm(paths.runtime, { recursive: true, force: true });
      await rm(paths.browsers, { recursive: true, force: true });
      await removeOwnBinary(paths.binary);
      for (const path of preserved) d.error(`Preserved: ${path}`);
      d.log("✓ Removed");
      return 0;
    }
    case "_mcp":
      return d.runPlaywright(paths, args);
    case "ralph":
      return d.runRalphWorkflow(paths, args);
    case "version":
    case "--version":
    case "-v":
      d.log(VERSION);
      return 0;
    case "help":
    case "--help":
    case "-h":
      d.log(formatHelp());
      return 0;
    default:
      return d.passthroughOpenCode(paths, argv);
  }
}
