import { describe, expect, test } from "bun:test";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";
import { resolvePaths } from "../src/paths";
import { backup, replaceBinary, sha256 } from "../src/fs";
import { components } from "../src/components";
import { managedConfig } from "../src/managed";
import { assertSupportedOpenCode, ensureOpenCode, findOpenCode } from "../src/opencode";
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
    const payload = new TextEncoder().encode("ultracode-1.0.0-bin");
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
      expect(await readFile(p.binary, "utf8")).toBe("ultracode-1.0.0-bin");
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

  test("assertSupportedOpenCode accepts >=2.3.2 <3.0.0 silently without console.warn", () => {
    const warns: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warns.push(args);
    };
    try {
      expect(() => assertSupportedOpenCode("2.3.2")).not.toThrow();
      expect(() => assertSupportedOpenCode("2.4.0")).not.toThrow();
      expect(() => assertSupportedOpenCode("v2.4.0")).not.toThrow();
      expect(() => assertSupportedOpenCode("2.4.0-rc.1")).not.toThrow();
      expect(() => assertSupportedOpenCode("2.9.1")).not.toThrow();
      expect(warns.length).toBe(0);
    } finally {
      console.warn = originalWarn;
    }
  });

  test("assertSupportedOpenCode rejects <2.3.2 and >=3.0.0 with distinct contract errors", () => {
    expect(() => assertSupportedOpenCode("1.9.9")).toThrow(/2\.3\.2 or newer/i);
    expect(() => assertSupportedOpenCode("2.3.1")).toThrow(/2\.3\.2 or newer/i);
    expect(() => assertSupportedOpenCode("3.0.0")).toThrow(/major contract.*V3/i);
  });

  test("components retries /api/plugin when builtin-only response races async plugin loading and deduplicates superpowers", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-comp-retry-"));
    const prevSkip = process.env.ULTRACODE_SKIP_RUNTIME;
    delete process.env.ULTRACODE_SKIP_RUNTIME;
    try {
      const binDir = join(dir, "bin");
      await mkdir(binDir, { recursive: true });
      const countFile = join(dir, "plugin-api-calls.txt");
      const customSuperpowers = join(dir, "custom-superpowers");
      const jsonPath = customSuperpowers.replace(/\\/g, "\\\\");
      const attempt1 = JSON.stringify({
        data: [{ id: "opencode.agent", source: { type: "builtin" }, state: { status: "active" } }],
      });
      const attempt2 = JSON.stringify({
        data: [
          { id: "opencode.agent", source: { type: "builtin" }, state: { status: "active" } },
          { id: "superpowers", source: { type: "local", path: customSuperpowers }, state: { status: "active" } },
        ],
      });

      let fakeBin: string;
      if (process.platform === "win32") {
        fakeBin = join(binDir, "opencode.cmd");
        await writeFile(
          fakeBin,
          [
            "@echo off",
            'if "%*"=="--version" (',
            "  echo opencode v2.4.0",
            "  exit /b 0",
            ")",
            'if "%*"=="api get /api/plugin" (',
            `  if not exist "${countFile}" (`,
            `    > "${countFile}" echo 1`,
            `    echo {"data":[{"id":"opencode.agent","source":{"type":"builtin"},"state":{"status":"active"}}]}`,
            "    exit /b 0",
            "  )",
            `  > "${countFile}" echo 2`,
            `  echo {"data":[{"id":"opencode.agent","source":{"type":"builtin"},"state":{"status":"active"}},{"id":"superpowers","source":{"type":"local","path":"${jsonPath}"},"state":{"status":"active"}}]}`,
            "  exit /b 0",
            ")",
            "exit /b 1",
          ].join("\r\n"),
        );
      } else {
        fakeBin = join(binDir, "opencode");
        await writeFile(
          fakeBin,
          `#!/bin/sh
if [ "$*" = "--version" ]; then
  printf 'opencode v2.4.0\\n'
  exit 0
fi
if [ "$*" = "api get /api/plugin" ]; then
  if [ ! -f '${countFile}' ]; then
    printf '1' > '${countFile}'
    printf '%s\\n' '${attempt1}'
    exit 0
  fi
  printf '2' > '${countFile}'
  printf '%s\\n' '${attempt2}'
  exit 0
fi
exit 1
`,
          { mode: 0o755 },
        );
      }

      const p = resolvePaths({
        HOME: dir,
        USERPROFILE: dir,
        LOCALAPPDATA: dir,
        ULTRACODE_OPENCODE_BIN: fakeBin,
      });
      const res = await components(p, { plugins: [customSuperpowers] });
      expect((await readFile(countFile, "utf8")).trim()).toBe("2");
      expect(res.managed.plugins).toEqual([join(p.config, "ultracode", "conversation")]);

      await rm(countFile, { force: true });
      await components(p, {});
      expect((await readFile(countFile, "utf8")).trim()).toBe("1");

      // Verify 4-attempt ceiling when configured plugins exist and /api/plugin stays builtin-only
      const ceilingLog = join(dir, "ceiling-calls.log");
      let ceilingBin: string;
      if (process.platform === "win32") {
        ceilingBin = join(binDir, "opencode-ceiling.cmd");
        await writeFile(
          ceilingBin,
          [
            "@echo off",
            'if "%*"=="--version" (',
            "  echo opencode v2.4.0",
            "  exit /b 0",
            ")",
            'if "%*"=="api get /api/plugin" (',
            `  >> "${ceilingLog}" echo x`,
            `  echo {"data":[{"id":"opencode.agent","source":{"type":"builtin"},"state":{"status":"active"}}]}`,
            "  exit /b 0",
            ")",
            "exit /b 1",
          ].join("\r\n"),
        );
      } else {
        ceilingBin = join(binDir, "opencode-ceiling");
        await writeFile(
          ceilingBin,
          `#!/bin/sh
if [ "$*" = "--version" ]; then
  printf 'opencode v2.4.0\\n'
  exit 0
fi
if [ "$*" = "api get /api/plugin" ]; then
  printf 'x\\n' >> '${ceilingLog}'
  printf '%s\\n' '${attempt1}'
  exit 0
fi
exit 1
`,
          { mode: 0o755 },
        );
      }
      const pCeiling = resolvePaths({
        HOME: dir,
        USERPROFILE: dir,
        LOCALAPPDATA: dir,
        ULTRACODE_OPENCODE_BIN: ceilingBin,
      });
      await components(pCeiling, { plugins: ["custom-external-plugin"] });
      const ceilingLines = (await readFile(ceilingLog, "utf8")).trim().split(/\r?\n/).filter(Boolean);
      expect(ceilingLines).toHaveLength(4);
    } finally {
      if (prevSkip === undefined) delete process.env.ULTRACODE_SKIP_RUNTIME;
      else process.env.ULTRACODE_SKIP_RUNTIME = prevSkip;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
