import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import { atomicWrite, exists, sha256 } from "./fs";
import { findOpenCode, run } from "./opencode";
import type { Paths } from "./paths";

const PLAYWRIGHT_VERSION = "0.0.86";
const RALPH_COMMIT = "53c87ded9fc329b452298f361145d17bf52cac09";
const RUNTIME_LOCK = JSON.stringify({ playwright: PLAYWRIGHT_VERSION, ralph: RALPH_COMMIT, superpowers: "v7.0.2" });

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
  const superArchive = join(downloads, "superpowers-v7.0.2.tgz");
  const ralphArchive = join(downloads, `ralph-${RALPH_COMMIT}.tgz`);
  await downloadVerified(
    "https://codeload.github.com/obra/superpowers/tar.gz/refs/tags/v7.0.2",
    "a0bd5d862537ae2caa9a7b5546b7e597eeabda1b9ca8aa67abbbc967c9f2005e",
    superArchive,
  );
  await downloadVerified(
    `https://codeload.github.com/Th0rgal/open-ralph-wiggum/tar.gz/${RALPH_COMMIT}`,
    "c7c77bd1ff288f157ed79711a3ac0d1982cbb7c5bd70d017a8308c6c45a3cc20",
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
            "@playwright/mcp": PLAYWRIGHT_VERSION,
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
    await runBun(["x", `@playwright/mcp@${PLAYWRIGHT_VERSION}`, "install-browser", "chrome-for-testing"], {
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
