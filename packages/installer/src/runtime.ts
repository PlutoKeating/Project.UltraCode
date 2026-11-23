import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import baseline from "../../config/upstream-baseline.json";
import { atomicWrite, exists, sha256 } from "./fs";
import { findOpenCode, run } from "./opencode";
import type { Paths } from "./paths";

export interface UpstreamBaseline {
  schema: 1;
  updatedAt: string;
  opencode: {
    repo: string;
    minSupported: string;
    verifiedRelease: string;
    pluginSdkPackage: string;
    pluginSdkVersion: string;
  };
  superpowers: {
    repo: string;
    tag: string;
    tarballUrl: string;
    sha256: string;
  };
  playwrightMcp: {
    npmPackage: string;
    version: string;
  };
  ralph: {
    repo: string;
    branch: string;
    versionLabel: string;
    commit: string;
    tarballUrl: string;
    sha256: string;
  };
}

export const upstreamBaseline = baseline as UpstreamBaseline;
export const PLAYWRIGHT_VERSION = upstreamBaseline.playwrightMcp.version;
export const RALPH_COMMIT = upstreamBaseline.ralph.commit;
export const SUPERPOWERS_TAG = upstreamBaseline.superpowers.tag;
const RUNTIME_LOCK = JSON.stringify({
  playwright: PLAYWRIGHT_VERSION,
  ralph: RALPH_COMMIT,
  superpowers: SUPERPOWERS_TAG,
});

async function downloadVerified(url: string, expectedHash: string, target: string): Promise<void> {
  if (await exists(target)) {
    const cached = new Uint8Array(await Bun.file(target).arrayBuffer());
    if (sha256(cached) === expectedHash) return;
  }
  const response = await fetch(url, { headers: { "User-Agent": "ultracode-installer" } });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const data = new Uint8Array(await response.arrayBuffer());
  const actual = sha256(data);
  if (actual !== expectedHash) throw new Error(`Checksum mismatch for ${url}: expected ${expectedHash}, got ${actual}`);
  await atomicWrite(target, data);
}

async function extractTar(archive: string, target: string): Promise<void> {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  const result = await run("tar", ["-xzf", archive, "-C", target, "--strip-components=1"]);
  if (result.code !== 0) throw new Error(`Could not extract ${archive}: ${result.stderr}`);
}

async function runBun(args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv; inherit?: boolean } = {}) {
  const env = { ...process.env, ...options.env, BUN_BE_BUN: "1" };
  const result = await run(process.execPath, args, { cwd: options.cwd, env, inherit: options.inherit });
  if (result.code !== 0 && !options.inherit) throw new Error(`Managed runtime command failed: ${result.stderr || result.stdout}`);
  return result;
}

async function installVendored(paths: Paths): Promise<void> {
  const vendor = join(paths.runtime, "vendor");
  const downloads = join(paths.home, "downloads");
  await mkdir(downloads, { recursive: true });
  const superArchive = join(downloads, `superpowers-${SUPERPOWERS_TAG}.tgz`);
  const ralphArchive = join(downloads, `ralph-${RALPH_COMMIT}.tgz`);
  await downloadVerified(
    upstreamBaseline.superpowers.tarballUrl,
    upstreamBaseline.superpowers.sha256,
    superArchive,
  );
  await downloadVerified(
    upstreamBaseline.ralph.tarballUrl,
    upstreamBaseline.ralph.sha256,
    ralphArchive,
  );
  await extractTar(superArchive, join(paths.runtime, "superpowers"));
  await extractTar(ralphArchive, join(vendor, "ralph"));
}

export const runtimeEntries = [
  "node_modules/@playwright/mcp/cli.js",
  "node_modules/@th0rgal/ralph-wiggum/bin/ralph.js",
  "superpowers/.opencode/plugins/superpowers.js",
];

export async function browserReady(paths: Paths): Promise<boolean> {
  const marker = join(paths.browsers, ".ultracode-ready");
  if (!(await exists(marker)) || (await Bun.file(marker).text()).trim() !== PLAYWRIGHT_VERSION) return false;
  const dirs = await readdir(paths.browsers).catch(() => [] as string[]);
  for (const dir of dirs.filter((name) => name.startsWith("chromium_headless_shell-") || name.startsWith("chromium-"))) {
    if (await exists(join(paths.browsers, dir, "INSTALLATION_COMPLETE"))) return true;
  }
  return false;
}

export async function installRuntime(paths: Paths): Promise<void> {
  await mkdir(paths.runtime, { recursive: true });
  const lockFile = join(paths.runtime, ".ultracode-lock");
  const ready = (await Promise.all(runtimeEntries.map((entry) => exists(join(paths.runtime, entry))))).every(Boolean);
  const locked = ready && (await exists(lockFile)) && (await Bun.file(lockFile).text()) === RUNTIME_LOCK;
  if (!locked) {
    await installVendored(paths);
    await writeFile(
      join(paths.runtime, "package.json"),
      `${JSON.stringify(
        {
          private: true,
          dependencies: {
            [upstreamBaseline.playwrightMcp.npmPackage]: PLAYWRIGHT_VERSION,
            "@th0rgal/ralph-wiggum": "file:./vendor/ralph",
          },
        },
        null,
        2,
      )}\n`,
    );
    await runBun(["install"], { cwd: paths.runtime });
    await atomicWrite(lockFile, RUNTIME_LOCK);
  }

  const browserMarker = join(paths.browsers, ".ultracode-ready");
  if (process.env.ULTRACODE_SKIP_BROWSER !== "1" && !(await browserReady(paths))) {
    await runBun(["x", `${upstreamBaseline.playwrightMcp.npmPackage}@${PLAYWRIGHT_VERSION}`, "install-browser", "chrome-for-testing"], {
      cwd: paths.runtime,
      env: { PLAYWRIGHT_BROWSERS_PATH: paths.browsers },
      inherit: false,
    });
    await atomicWrite(browserMarker, `${PLAYWRIGHT_VERSION}\n`);
  }
}

export async function runPlaywright(paths: Paths, args: string[] = []): Promise<number> {
  if (process.env.ULTRACODE_SKIP_RUNTIME !== "1") await installRuntime(paths);
  const cli = join(paths.runtime, "node_modules", "@playwright", "mcp", "cli.js");
  const serverArgs =
    args.length > 0
      ? args
      : ["--browser", "chromium", "--headless", "--isolated", "--output-dir", ".opencode/ultracode/qa"];
  const result = await runBun(["run", cli, ...serverArgs], {
    env: { PLAYWRIGHT_BROWSERS_PATH: paths.browsers },
    inherit: true,
  });
  return result.code;
}

export async function runRalph(paths: Paths, args: string[], options: { cwd?: string } = {}): Promise<number> {
  if (process.env.ULTRACODE_SKIP_RUNTIME !== "1") await installRuntime(paths);
  const opencode = await findOpenCode(paths);
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (opencode && isAbsolute(opencode)) {
    const dir = dirname(opencode);
    const parts = (env.PATH || "").split(delimiter).filter(Boolean);
    if (!parts.includes(dir)) env.PATH = [dir, ...parts].join(delimiter);
  }
  const cli = join(paths.runtime, "node_modules", "@th0rgal", "ralph-wiggum", "bin", "ralph.js");
  const result = await runBun(["run", cli, ...args], { cwd: options.cwd, env, inherit: true });
  return result.code;
}
