import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";
import { resolvePaths } from "../src/paths";
import { backup, replaceBinary } from "../src/fs";
import { managedConfig } from "../src/managed";

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
});
