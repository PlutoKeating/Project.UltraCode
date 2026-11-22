import { spawn } from "node:child_process";

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function run(command: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv; inherit?: boolean } = {}): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => { stdout += chunk; });
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export async function opencodeVersion(binary: string): Promise<string> {
  const result = await run(binary, ["--version"]);
  if (result.code !== 0) throw new Error(`OpenCode was not found or is not executable: ${binary}`);
  const match = result.stdout.match(/v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Could not parse OpenCode version: ${result.stdout.trim()}`);
  return match.slice(1, 4).join(".");
}

export function assertSupportedOpenCode(version: string): void {
  const [major, minor, patch] = version.split(".").map(Number);
  if (major !== 2 || (minor ?? 0) < 3 || (minor === 3 && (patch ?? 0) < 2)) throw new Error(`OpenCode ${version} is unsupported; install a recent V2 release (2.3.2 or newer).`);
  if ((minor ?? 0) > 3) console.warn(`OpenCode ${version} is newer than the tested 2.3.x matrix; running structural checks only.`);
}
