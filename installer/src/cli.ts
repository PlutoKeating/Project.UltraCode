#!/usr/bin/env bun
import { readlink, rm, unlink } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { apply, doctor, uninstall, VERSION } from "./install";
import { resolvePaths } from "./paths";
import { updateSelf, upgradeOpenCode } from "./release";
import { runPlaywright, runRalph } from "./runtime";
import { exists } from "./fs";

const help = `UltraCode ${VERSION}

Usage:
  uc apply              Install or repair the additive OpenCode configuration
  uc sync               Alias for apply; safe after an official OpenCode update
  uc doctor             Check versions, files and configuration without model calls
  uc update             Update UltraCode to the latest stable release, then sync
  uc up                 Run the official OpenCode upgrade, then update and sync
  uc uninstall --yes    Remove only unmodified UltraCode-owned state
  uc mcp                Internal: start the managed Playwright MCP server
  uc ralph [args...]    Run the managed Ralph CLI
  uc version            Print the UltraCode version

No command reads provider credentials or makes a real model call.
`;

async function confirm(): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question("Remove UltraCode-owned state? User configuration and backups are preserved. [y/N] ");
  prompt.close();
  return answer.toLowerCase() === "y";
}

async function main(): Promise<number> {
  const [command = "help", ...args] = process.argv.slice(2);
  const paths = resolvePaths();
  switch (command) {
    case "apply":
    case "sync": {
      const report = await apply(paths);
      console.log(`UltraCode synchronized: ${report.files} files, ${report.added.length} configuration additions.`);
      for (const conflict of report.conflicts) console.warn(`Preserved: ${conflict}`);
      return 0;
    }
    case "doctor": {
      const issues = await doctor(paths);
      if (issues.length === 0) {
        console.log("UltraCode structural checks passed. No model call was made.");
        return 0;
      }
      for (const issue of issues) console.error(issue);
      return 1;
    }
    case "update": {
      const version = await updateSelf(paths);
      console.log(`Updated UltraCode to ${version}`);
      await apply(paths);
      return 0;
    }
    case "up": {
      await upgradeOpenCode(paths);
      const version = await updateSelf(paths);
      console.log(`Updated UltraCode to ${version}`);
      await apply(paths);
      return 0;
    }
    case "uninstall": {
      if (!args.includes("--yes") && !(await confirm())) return 2;
      const preserved = await uninstall(paths);
      await rm(paths.runtime, { recursive: true, force: true });
      if (await exists(paths.shortBinary)) {
        const link = await readlink(paths.shortBinary).catch(() => null);
        if (link === paths.binary) await unlink(paths.shortBinary).catch(() => {});
      }
      if (await exists(paths.binary)) await unlink(paths.binary).catch(() => {});
      for (const path of preserved) console.warn(`Preserved locally modified file: ${path}`);
      console.log("UltraCode removed. User configuration and backups were preserved.");
      return 0;
    }
    case "mcp": return runPlaywright(paths, args);
    case "ralph": return runRalph(paths, args);
    case "version":
    case "--version":
    case "-v": console.log(VERSION); return 0;
    case "help":
    case "--help":
    case "-h": console.log(help); return 0;
    default:
      console.error(`Unknown command: ${command}\n\n${help}`);
      return 2;
  }
}

main().then((code) => { process.exitCode = code; }).catch((error) => {
  console.error(`UltraCode: ${(error as Error).message}`);
  process.exitCode = 1;
});
