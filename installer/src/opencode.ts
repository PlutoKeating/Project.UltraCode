import { spawn } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import { atomicWrite, exists, replaceBinary } from "./fs";
import type { Paths } from "./paths";

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function run(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; inherit?: boolean } = {},
): Promise<CommandResult> {
  if (process.platform === "win32" && /\.ps1$/i.test(command)) {
    return run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", command, ...args], options);
  }
  const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      shell: useShell,
      stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export async function opencodeVersion(binary: string): Promise<string> {
  let result: CommandResult;
  try {
    result = await run(binary, ["--version"]);
  } catch {
    throw new Error(`OpenCode was not found or is not executable: ${binary}`);
  }
  if (result.code !== 0) throw new Error(`OpenCode was not found or is not executable: ${binary}`);
  const match = result.stdout.match(/v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Could not parse OpenCode version: ${result.stdout.trim()}`);
  return match.slice(1, 4).join(".");
}

export function assertSupportedOpenCode(version: string): void {
  const [major, minor, patch] = version.split(".").map(Number);
  if (major !== 2 || (minor ?? 0) < 3 || (minor === 3 && (patch ?? 0) < 2)) {
    throw new Error(`OpenCode ${version} is unsupported; install a recent V2 release (2.3.2 or newer).`);
  }
  if ((minor ?? 0) > 3) {
    console.warn(`OpenCode ${version} is newer than the tested 2.3.x matrix; running structural checks only.`);
  }
}

function defaultOpenCodeLocations(paths: Paths): string[] {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || join(paths.userHome, "AppData", "Local");
    return [
      join(localAppData, "opencode", "bin", "opencode.exe"),
      join(paths.userHome, ".opencode", "bin", "opencode.exe"),
      join(localAppData, "Programs", "OpenCode", "bin", "opencode.exe"),
    ];
  }
  return [
    join(paths.userHome, ".opencode", "bin", "opencode"),
    join(paths.userHome, ".local", "bin", "opencode"),
    "/opt/homebrew/bin/opencode",
    "/usr/local/bin/opencode",
  ];
}

export async function findOpenCode(paths: Paths): Promise<string | null> {
  const explicit = Boolean(process.env.ULTRACODE_OPENCODE_BIN) || paths.opencodeBinary !== "opencode";
  const baseCandidates: string[] = [];
  if (process.platform === "win32" && /\.ps1$/i.test(paths.opencodeBinary)) {
    const stem = paths.opencodeBinary.slice(0, -4);
    baseCandidates.push(`${stem}.exe`, `${stem}.cmd`, paths.opencodeBinary);
  } else if (process.platform === "win32" && !explicit) {
    baseCandidates.push("opencode.exe", "opencode.cmd", paths.opencodeBinary, ...defaultOpenCodeLocations(paths));
  } else if (explicit) {
    baseCandidates.push(paths.opencodeBinary);
  } else {
    baseCandidates.push(paths.opencodeBinary, ...defaultOpenCodeLocations(paths));
  }
  for (const candidate of baseCandidates) {
    try {
      await opencodeVersion(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  return null;
}

function prependPath(binary: string): void {
  if (!isAbsolute(binary)) return;
  const dir = dirname(binary);
  const parts = (process.env.PATH || "").split(delimiter).filter(Boolean);
  if (!parts.includes(dir)) {
    process.env.PATH = [dir, ...parts].join(delimiter);
  }
}

async function findFileRecursive(dir: string, targetName: string): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === targetName.toLowerCase()) return full;
    if (entry.isDirectory()) {
      const nested = await findFileRecursive(full, targetName);
      if (nested) return nested;
    }
  }
  return null;
}

async function installOfficialOpenCode(paths: Paths): Promise<void> {
  if (process.platform === "win32") {
    const arch = process.arch === "arm64" ? "arm64" : "x64";
    const url =
      process.env.ULTRACODE_OPENCODE_DOWNLOAD_URL ||
      `https://opencode.ai/update/api/latest/cli/opencode/opencode-windows-${arch}.zip`;
    const response = await fetch(url, { headers: { "User-Agent": "ultracode-installer" } });
    if (!response.ok) throw new Error(`Failed to download OpenCode (${response.status}): ${url}`);
    const zipBytes = new Uint8Array(await response.arrayBuffer());
    const work = join(paths.home, "downloads", `opencode-win-${Date.now()}`);
    const zipFile = `${work}.zip`;
    await atomicWrite(zipFile, zipBytes);
    await mkdir(work, { recursive: true });
    try {
      let extracted = await run("tar", ["-xf", zipFile, "-C", work]).catch(() => ({ code: 1, stdout: "", stderr: "" }));
      if (extracted.code !== 0) {
        extracted = await run("powershell", [
          "-NoProfile",
          "-Command",
          `Expand-Archive -LiteralPath '${zipFile.replace(/'/g, "''")}' -DestinationPath '${work.replace(/'/g, "''")}' -Force`,
        ]);
      }
      if (extracted.code !== 0) throw new Error(`Could not extract OpenCode archive: ${extracted.stderr}`);
      const exe = await findFileRecursive(work, "opencode.exe");
      if (!exe) throw new Error("OpenCode archive did not contain opencode.exe");
      const localAppData = process.env.LOCALAPPDATA || join(paths.userHome, "AppData", "Local");
      const binDir = join(localAppData, "opencode", "bin");
      const dest = join(binDir, "opencode.exe");
      const binData = new Uint8Array(await Bun.file(exe).arrayBuffer());
      await replaceBinary(dest, binData, "win32");
      prependPath(dest);
      await run("powershell", [
        "-NoProfile",
        "-Command",
        `$dir = '${binDir.replace(/'/g, "''")}'; $cur = [Environment]::GetEnvironmentVariable('Path', 'User'); if (-not $cur) { $cur = '' }; $parts = $cur -split ';' | Where-Object { $_ -ne '' }; if ($parts -notcontains $dir) { [Environment]::SetEnvironmentVariable('Path', (($parts + $dir) -join ';'), 'User') }`,
      ]).catch(() => {});
    } finally {
      await rm(zipFile, { force: true }).catch(() => {});
      await rm(work, { recursive: true, force: true }).catch(() => {});
    }
    return;
  }

  const installScript = process.env.ULTRACODE_OPENCODE_INSTALL_CMD || "curl -fsSL https://opencode.ai/v2/install | bash";
  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  delete childEnv.VERSION;
  const result = await run("bash", ["-c", installScript], { env: childEnv });
  if (result.code !== 0) {
    throw new Error(`Failed to install OpenCode: ${(result.stderr || result.stdout).trim()}`);
  }
}

export async function ensureOpenCode(
  paths: Paths,
  options: { installIfMissing?: boolean; upgradeIfPresent?: boolean; onStatus?: (msg: string) => void } = {},
): Promise<{ binary: string; version: string; action: "installed" | "upgraded" | "kept" }> {
  let binary = await findOpenCode(paths);
  if (!binary) {
    if (options.installIfMissing === false) {
      throw new Error("OpenCode V2 is not installed.");
    }
    options.onStatus?.("Installing OpenCode");
    await installOfficialOpenCode(paths);
    binary = await findOpenCode(paths);
    if (!binary) throw new Error("OpenCode installation finished, but the opencode binary was not found.");
    prependPath(binary);
    const version = await opencodeVersion(binary);
    assertSupportedOpenCode(version);
    return { binary, version, action: "installed" };
  }

  prependPath(binary);
  const before = await opencodeVersion(binary);
  if (options.upgradeIfPresent !== false) {
    options.onStatus?.("Updating OpenCode");
    await run(binary, ["upgrade"]).catch(() => ({ code: 1, stdout: "", stderr: "" }));
    binary = (await findOpenCode(paths)) ?? binary;
    prependPath(binary);
  }
  const after = await opencodeVersion(binary);
  assertSupportedOpenCode(after);
  return { binary, version: after, action: after !== before ? "upgraded" : "kept" };
}

export async function passthroughOpenCode(paths: Paths, args: string[]): Promise<number> {
  const binary = (await findOpenCode(paths)) ?? paths.opencodeBinary;
  const result = await run(binary, args, { inherit: true });
  return result.code;
}
