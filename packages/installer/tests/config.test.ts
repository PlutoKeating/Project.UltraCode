import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { components } from "../src/components";
import { mergeJsonc, parseJsonc, retire, additions } from "../src/config";
import { managedConfig } from "../src/managed";
import { resolvePaths } from "../src/paths";

const managed = {
  default_agent: "UltraBuild",
  permissions: [{ action: "shell", resource: "git push *", effect: "ask" }],
  mcp: { servers: { ultracode_playwright: { type: "local", command: ["ultracode", "_mcp"] } } },
};

describe("maximum-union JSONC merge", () => {
  test("preserves comments, unknown providers and existing values", () => {
    const source = `{
  // user provider must survive
  "provider": {"custom": {"apiKey": "{env:CUSTOM_KEY}"}},
  "default_agent": "mine",
  "permissions": [{"action":"edit","resource":"*","effect":"allow"}]
}`;
    const result = mergeJsonc(source, managed);
    const value = parseJsonc(result.text) as Record<string, any>;
    expect(value.provider.custom.apiKey).toBe("{env:CUSTOM_KEY}");
    expect(value.default_agent).toBe("mine");
    expect(value.permissions).toHaveLength(2);
    expect(value.mcp.servers.ultracode_playwright.command).toEqual(["ultracode", "_mcp"]);
    expect(result.text).toContain("// user provider must survive");
    expect(result.conflicts).toContain("default_agent");
  });

  test("is idempotent and removes only exact managed values", () => {
    const merged = mergeJsonc("{}", managed);
    const twice = mergeJsonc(merged.text, managed);
    expect(twice.added).toEqual([]);
    expect(twice.text).toBe(merged.text);
    const withUser = mergeJsonc(merged.text, { mcp: { servers: { mine: { type: "remote", url: "https://example.com" } } } });
    const cleaned = retire(withUser.text, additions({}, parseJsonc(merged.text)), {}).text;
    const value = parseJsonc(cleaned) as Record<string, any>;
    expect(value.default_agent).toBeUndefined();
    expect(value.mcp.servers.mine.url).toBe("https://example.com");
    expect(value.mcp.servers.ultracode_playwright).toBeUndefined();
    expect(value.permissions).toBeUndefined();
  });

  test("managedConfig disables overlapping built-in opencode.goal and opencode.plan plugins, hides stock build/plan agents, and deduplicates without index shift", async () => {
    const root = await mkdtemp(join(tmpdir(), "ultracode-config-test-"));
    const prevSkip = process.env.ULTRACODE_SKIP_RUNTIME;
    process.env.ULTRACODE_SKIP_RUNTIME = "1";
    try {
      const paths = resolvePaths({
        HOME: root,
        OPENCODE_CONFIG_DIR: join(root, "opencode"),
        ULTRACODE_HOME: join(root, "ultracode"),
        ULTRACODE_BIN_DIR: join(root, "bin"),
      });
      const baseline = managedConfig(paths);
      expect(baseline.plugins).toEqual([
        "-opencode.goal",
        "-opencode.plan",
        join(paths.config, "ultracode", "conversation"),
        join(paths.runtime, "superpowers"),
      ]);
      expect(baseline.agents).toEqual({
        build: { hidden: true },
        plan: { hidden: true },
      });

      const existing = {
        plugins: [
          "-opencode.goal",
          pathToFileURL(join(paths.config, "ultracode", "conversation")).href,
        ],
      };
      const { managed: deduped } = await components(paths, existing);
      expect(deduped.plugins).toEqual([
        "-opencode.goal",
        "-opencode.plan",
        join(paths.runtime, "superpowers"),
      ]);
    } finally {
      if (prevSkip === undefined) delete process.env.ULTRACODE_SKIP_RUNTIME;
      else process.env.ULTRACODE_SKIP_RUNTIME = prevSkip;
      await rm(root, { recursive: true, force: true });
    }
  });
});
