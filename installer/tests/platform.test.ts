import { describe, expect, test } from "bun:test";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";
import { resolvePaths } from "../src/paths";
import { backup, replaceBinary, sha256 } from "../src/fs";
import { components } from "../src/components";
import { managedConfig } from "../src/managed";
import { ensureOpenCode, findOpenCode } from "../src/opencode";
import { updateSelf } from "../src/release";

async function makeFakeOpenCode(dir: string, versionOutput: string, upgradeExitCode: number): Promise<string> {
  await mkdir(dir, { recursive: true });
  if (process.platform === "win32") {
    const script = join(dir, "opencode.cmd");
    await writeFile(
      script,
      `@echo off\r\nif "%1"=="--version" (\r\n  echo ${versionOutput}\r\n  exit /b 0\r\n)\r\nif "%1"=="upgrade" (\r\n  exit /b ${upgradeExitCode}\r\n)\r\nexit /b 0\r\n`,
    );
    return script;
  }
  const script = join(dir, "opencode");
  await writeFile(
    script,
    `#!/bin/sh\nif [ "$1" = "--version" ]; then\n  printf '%s\\n' '${versionOutput}'\n  exit 0\nfi\nif [ "$1" = "upgrade" ]; then\n  exit ${upgradeExitCode}\nfi\nexit 0\n`,
    { mode: 0o755 },
  );
  return script;
}

describe("cross-platform paths and fs", () => {
  test("resolves Windows native paths without shortBinary", () => {
    const p = resolvePaths({ USERPROFILE: "C:\\Users\\Ada", LOCALAPPDATA: "C:\\Users\\Ada\\AppData\\Local" }, "win32");
    expect("shortBinary" in p).toBe(false);
    expect(p.binary).toBe(win32.join("C:\\Users\\Ada\\AppData\\Local", "ultracode", "bin", "ultracode.exe"));
    expect(p.home).toBe(win32.join("C:\\Users\\Ada\\AppData\\Local", "ultracode"));
  });

  test("managedConfig uses internal _mcp subcommand and join() plugin paths", () => {
    const p = resolvePaths({ HOME: "/tmp/u" }, "linux");
    const cfg = managedConfig(p) as any;
    expect(cfg.mcp.servers.ultracode_playwright.command).toEqual([p.binary, "_mcp"]);
    expect(cfg.plugins).toEqual(["/tmp/u/.config/opencode/ultracode/conversation", "/tmp/u/.local/share/ultracode/runtime/superpowers"]);
  });

  test("backup extracts filename safely and replaceBinary swaps atomically", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-fs-"));
    try {
      const file = join(dir, "ultracode.exe");
      await writeFile(file, "v1");
      const saved = await backup(file, join(dir, "backups"));
      expect(saved?.endsWith("-ultracode.exe")).toBe(true);
      await replaceBinary(file, new TextEncoder().encode("v2"), "win32");
      expect(await readFile(file, "utf8")).toBe("v2");
      expect(await readFile(`${file}.old`, "utf8").catch(() => null)).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("ensureOpenCode keeps valid >=2.3.2 binary when upgrade fails", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-oc-"));
    try {
      const fake = await makeFakeOpenCode(join(dir, "bin"), "opencode v2.3.2", 1);
      const p = resolvePaths({ HOME: dir, USERPROFILE: dir, LOCALAPPDATA: dir, ULTRACODE_OPENCODE_BIN: fake });
      expect(await findOpenCode(p)).toBe(fake);
      const res = await ensureOpenCode(p, { installIfMissing: false, upgradeIfPresent: true });
      expect(res).toEqual({ binary: fake, version: "2.3.2", action: "kept" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("ensureOpenCode throws when existing binary is <2.3.2 and upgrade fails", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-oc-old-"));
    try {
      const fake = await makeFakeOpenCode(join(dir, "bin"), "opencode v2.2.0", 1);
      const p = resolvePaths({ HOME: dir, USERPROFILE: dir, LOCALAPPDATA: dir, ULTRACODE_OPENCODE_BIN: fake });
      await expect(ensureOpenCode(p, { installIfMissing: false, upgradeIfPresent: true })).rejects.toThrow(/unsupported/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("updateSelf downloads via fetch, verifies sha256, and replaces binary without uc symlink", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-rel-"));
    const payload = new TextEncoder().encode("ultracode-0.3.0-bin");
    const hash = sha256(payload);
    const server = createServer((req, res) => {
      if (req.url?.endsWith(".sha256")) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(`${hash}  artifact\n`);
        return;
      }
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end(payload);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as { port: number };
    const prevBase = process.env.ULTRACODE_RELEASE_BASE_URL;
    process.env.ULTRACODE_RELEASE_BASE_URL = `http://127.0.0.1:${addr.port}`;
    try {
      const p = resolvePaths({ HOME: dir, USERPROFILE: dir, LOCALAPPDATA: dir });
      const tag = await updateSelf(p);
      expect(tag).toBeTruthy();
      expect(await readFile(p.binary, "utf8")).toBe("ultracode-0.3.0-bin");
    } finally {
      if (prevBase === undefined) delete process.env.ULTRACODE_RELEASE_BASE_URL;
      else process.env.ULTRACODE_RELEASE_BASE_URL = prevBase;
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("components handles npm-style file:./plugin specifier without throwing Invalid URL", async () => {
    const prevSkip = process.env.ULTRACODE_SKIP_RUNTIME;
    process.env.ULTRACODE_SKIP_RUNTIME = "1";
    try {
      const p = resolvePaths({ HOME: "/tmp/u" }, "linux");
      const res = await components(p, { plugins: ["file:./my-local-plugin"] });
      expect(Array.isArray(res.managed.plugins)).toBe(true);
    } finally {
      if (prevSkip === undefined) delete process.env.ULTRACODE_SKIP_RUNTIME;
      else process.env.ULTRACODE_SKIP_RUNTIME = prevSkip;
    }
  });
});
