import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { components } from "../src/components";
import { resolvePaths } from "../src/paths";

const installerRoot = fileURLToPath(new URL("..", import.meta.url));
const baselinePath = join(installerRoot, "..", "config", "upstream-baseline.json");

describe("declarative upstream baseline", () => {
  test("parses upstream-baseline.json with expected schema and pinned coordinates", async () => {
    const raw = await readFile(baselinePath, "utf8");
    const baseline = JSON.parse(raw);

    expect(baseline.schema).toBe(1);
    expect(typeof baseline.updatedAt).toBe("string");
    expect(baseline.opencode).toEqual({
      repo: "anomalyco/opencode",
      minSupported: "2.3.2",
      verifiedRelease: "2.4.0",
      pluginSdkPackage: "@opencode/plugin",
      pluginSdkVersion: "2.4.0",
    });
    expect(baseline.superpowers).toEqual({
      repo: "obra/superpowers",
      tag: "v7.0.2",
      tarballUrl: "https://codeload.github.com/obra/superpowers/tar.gz/refs/tags/v7.0.2",
      sha256: "a0bd5d862537ae2caa9a7b5546b7e597eeabda1b9ca8aa67abbbc967c9f2005e",
    });
    expect(baseline.playwrightMcp).toEqual({
      npmPackage: "@playwright/mcp",
      version: "0.0.86",
    });
    expect(baseline.ralph).toEqual({
      repo: "Th0rgal/open-ralph-wiggum",
      branch: "main",
      versionLabel: "1.3.1",
      commit: "53c87ded9fc329b452298f361145d17bf52cac09",
      tarballUrl: "https://codeload.github.com/Th0rgal/open-ralph-wiggum/tar.gz/53c87ded9fc329b452298f361145d17bf52cac09",
      sha256: "c7c77bd1ff288f157ed79711a3ac0d1982cbb7c5bd70d017a8308c6c45a3cc20",
    });
  });

  test("runtime.ts, components.ts, and opencode.ts consume upstream-baseline.json without drifted hardcoded literals", async () => {
    const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
    const runtimeMod = (await import("../src/runtime")) as Record<string, unknown>;
    const componentsMod = (await import("../src/components")) as Record<string, unknown>;

    expect(runtimeMod.PLAYWRIGHT_VERSION).toBe(baseline.playwrightMcp.version);
    expect(runtimeMod.RALPH_COMMIT).toBe(baseline.ralph.commit);
    expect(runtimeMod.SUPERPOWERS_TAG).toBe(baseline.superpowers.tag);
    expect(componentsMod.PLAYWRIGHT_MCP_SPEC).toBe(`${baseline.playwrightMcp.npmPackage}@${baseline.playwrightMcp.version}`);

    const runtimeSrc = await readFile(join(installerRoot, "src", "runtime.ts"), "utf8");
    const componentsSrc = await readFile(join(installerRoot, "src", "components.ts"), "utf8");
    const opencodeSrc = await readFile(join(installerRoot, "src", "opencode.ts"), "utf8");

    expect(runtimeSrc).toContain("upstream-baseline.json");
    expect(runtimeSrc).not.toContain('"0.0.86"');
    expect(runtimeSrc).not.toContain('"v7.0.2"');
    expect(runtimeSrc).not.toContain('"53c87ded9fc329b452298f361145d17bf52cac09"');

    expect(componentsSrc).toContain("upstream-baseline.json");
    expect(componentsSrc).not.toContain("0.0.86");

    expect(opencodeSrc).toContain("upstream-baseline.json");
    expect(opencodeSrc).not.toContain("2.3.2");

    const prevSkip = process.env.ULTRACODE_SKIP_RUNTIME;
    process.env.ULTRACODE_SKIP_RUNTIME = "1";
    try {
      const p = resolvePaths({ HOME: "/tmp/u" }, "linux");
      const res = await components(p, {
        mcp: {
          servers: {
            custom_pw: {
              type: "local",
              command: [
                "npx",
                "-y",
                `${baseline.playwrightMcp.npmPackage}@${baseline.playwrightMcp.version}`,
                "--browser",
                "chromium",
                "--headless",
                "--isolated",
                "--output-dir",
                ".opencode/ultracode/qa",
              ],
            },
          },
        },
      });
      expect(res.browser).toBe("custom_pw");
    } finally {
      if (prevSkip === undefined) delete process.env.ULTRACODE_SKIP_RUNTIME;
      else process.env.ULTRACODE_SKIP_RUNTIME = prevSkip;
    }
  });
});
