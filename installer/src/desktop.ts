import { spawn } from "node:child_process";
import { join } from "node:path";
import { atomicWrite, exists, replaceBinary } from "./fs";
import { run } from "./opencode";
import type { Paths } from "./paths";
import { createSpinner } from "./ui";

function spawnDetached(command: string, args: string[] = []): void {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.on("error", () => {});
  child.unref();
}

async function findInstalledDesktop(
  paths: Paths,
  platform: NodeJS.Platform,
): Promise<{ command: string; args: string[] } | null> {
  if (platform === "darwin") {
    const candidates = ["/Applications/OpenCode.app", join(paths.userHome, "Applications", "OpenCode.app")];
    for (const app of candidates) {
      if (await exists(app)) return { command: "open", args: ["-a", app] };
    }
    return null;
  }

  if (platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || join(paths.userHome, "AppData", "Local");
    const candidates = [
      join(localAppData, "Programs", "OpenCode", "OpenCode.exe"),
      join(process.env.ProgramFiles || "C:\\Program Files", "OpenCode", "OpenCode.exe"),
    ];
    for (const exe of candidates) {
      if (await exists(exe)) return { command: exe, args: [] };
    }
    return null;
  }

  const whichRes = await run("sh", ["-c", "command -v opencode-desktop"]).catch(() => ({ code: 1, stdout: "", stderr: "" }));
  if (whichRes.code === 0 && whichRes.stdout.trim()) {
    return { command: whichRes.stdout.trim(), args: [] };
  }
  const candidates = [
    "/usr/bin/opencode-desktop",
    join(paths.bin, "OpenCode.AppImage"),
    join(paths.userHome, ".local", "bin", "OpenCode.AppImage"),
  ];
  for (const bin of candidates) {
    if (await exists(bin)) return { command: bin, args: [] };
  }
  return null;
}

function desktopDownloadAsset(platform: NodeJS.Platform, arch: string): { filename: string; url: string } {
  const cpu = arch === "arm64" ? "arm64" : "x64";
  const base = "https://opencode.ai/update/api/latest/desktop/opencode";
  if (platform === "darwin") {
    const filename = `opencode-desktop-mac-${cpu}.dmg`;
    return { filename, url: `${base}/${filename}` };
  }
  if (platform === "win32") {
    const filename = `opencode-desktop-win-${cpu}.exe`;
    return { filename, url: `${base}/${filename}` };
  }
  const linuxArch = cpu === "arm64" ? "arm64" : "x86_64";
  const filename = `opencode-desktop-linux-${linuxArch}.AppImage`;
  return { filename, url: `${base}/${filename}` };
}

export async function launchOrInstallDesktop(
  paths: Paths,
  options: {
    dryRun?: boolean;
    platform?: NodeJS.Platform;
    arch?: string;
    skipInstalledCheck?: boolean;
    statusStream?: NodeJS.WriteStream;
  } = {},
): Promise<number> {
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  if (!options.skipInstalledCheck) {
    const installed = await findInstalledDesktop(paths, platform);
    if (installed) {
      if (!options.dryRun) spawnDetached(installed.command, installed.args);
      return 0;
    }
  }

  const asset = desktopDownloadAsset(platform, arch);
  const url = process.env.ULTRACODE_DESKTOP_DOWNLOAD_URL || asset.url;
  const spinner = createSpinner("Downloading OpenCode Desktop", options.statusStream);
  try {
    const response = await fetch(url, { headers: { "User-Agent": "ultracode-installer" } });
    if (!response.ok) throw new Error(`Failed to download OpenCode Desktop (${response.status}): ${url}`);
    const bytes = new Uint8Array(await response.arrayBuffer());

    if (platform === "linux") {
      const target = join(paths.bin, "OpenCode.AppImage");
      await replaceBinary(target, bytes, "linux");
      spinner.stop();
      if (!options.dryRun) spawnDetached(target, []);
      return 0;
    }

    const installerPath = join(paths.home, "downloads", asset.filename);
    await atomicWrite(installerPath, bytes, 0o755);
    spinner.stop();

    if (!options.dryRun) {
      if (platform === "darwin") {
        await run("open", [installerPath]);
      } else {
        // Use Start-Process so Windows UAC elevation prompts work cleanly via ShellExecute
        spawnDetached("powershell.exe", [
          "-NoProfile",
          "-WindowStyle",
          "Hidden",
          "-Command",
          `Start-Process -FilePath '${installerPath.replace(/'/g, "''")}'`,
        ]);
      }
    }
    return 0;
  } catch (error) {
    spinner.stop();
    throw error;
  }
}
