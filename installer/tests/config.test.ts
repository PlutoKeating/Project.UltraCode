import { describe, expect, test } from "bun:test";
import { mergeJsonc, parseJsonc, retire, additions } from "../src/config";

const managed = {
  default_agent: "UltraBuild",
  permissions: [{ action: "shell", resource: "git push *", effect: "ask" }],
  mcp: { servers: { ultracode_playwright: { type: "local", command: ["uc", "mcp"] } } },
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
    expect(value.mcp.servers.ultracode_playwright.command).toEqual(["uc", "mcp"]);
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
});
