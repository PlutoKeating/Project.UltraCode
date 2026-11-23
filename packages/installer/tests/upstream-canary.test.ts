import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findOpenCode } from "../src/opencode";
import { resolvePaths } from "../src/paths";
import type { UpstreamBaseline } from "../src/runtime";
import {
  formatMarkdownReport,
  probeUpstreams,
  runLiveHostCanary,
} from "../../../scripts/check-upstreams";

const installerRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = join(installerRoot, "..", "..");
const baselinePath = join(repoRoot, "packages", "config", "upstream-baseline.json");

const serversToClose: Server[] = [];
const tempDirsToClean: string[] = [];

afterEach(async () => {
  while (serversToClose.length > 0) {
    const srv = serversToClose.pop();
    if (srv) {
      await new Promise<void>((resolve) => srv.close(() => resolve()));
    }
  }
  while (tempDirsToClean.length > 0) {
    const dir = tempDirsToClean.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function startMockServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
): Promise<string> {
  const server = createServer(handler);
  serversToClose.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Failed to bind mock server");
  return `http://127.0.0.1:${addr.port}`;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

describe("upstream probe & canary (scripts/check-upstreams.ts)", () => {
  test("probeUpstreams reports up-to-date when all 4 upstreams match upstream-baseline.json", async () => {
    const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as UpstreamBaseline;
    const baseUrl = await startMockServer((req, res) => {
      const url = decodeURIComponent(req.url || "/");
      if (url.startsWith("/gh/repos/anomalyco/opencode/releases")) {
        return sendJson(res, 200, [
          {
            tag_name: "v1.19.6",
            draft: false,
            prerelease: false,
            html_url: "https://github.com/anomalyco/opencode/releases/tag/v1.19.6",
          },
          {
            tag_name: `v${baseline.opencode.verifiedRelease}`,
            draft: false,
            prerelease: false,
            html_url: `https://github.com/anomalyco/opencode/releases/tag/v${baseline.opencode.verifiedRelease}`,
            published_at: "2026-11-23T00:00:00Z",
          },
        ]);
      }
      if (url === "/npm/@opencode/plugin/latest" || url === `/npm/@opencode/plugin/${baseline.opencode.pluginSdkVersion}`) {
        return sendJson(res, 200, {
          name: "@opencode/plugin",
          version: baseline.opencode.pluginSdkVersion,
          exports: {
            ".": "./dist/index.js",
            "./tui": "./dist/tui.js",
            "./gui": "./dist/gui.js",
            "./gui/vite": "./dist/vite.js",
            "./rpc": "./dist/rpc.js",
          },
        });
      }
      if (url.startsWith("/gh/repos/obra/superpowers/releases/latest")) {
        return sendJson(res, 200, {
          tag_name: baseline.superpowers.tag,
          html_url: `https://github.com/obra/superpowers/releases/tag/${baseline.superpowers.tag}`,
        });
      }
      if (url === "/npm/@playwright/mcp/latest") {
        return sendJson(res, 200, {
          name: "@playwright/mcp",
          version: baseline.playwrightMcp.version,
        });
      }
      if (url === `/gh/repos/Th0rgal/open-ralph-wiggum/commits/${baseline.ralph.branch}`) {
        return sendJson(res, 200, {
          sha: baseline.ralph.commit,
          html_url: `https://github.com/Th0rgal/open-ralph-wiggum/commit/${baseline.ralph.commit}`,
          commit: { message: "chore: release 1.3.1\n\nextra body" },
        });
      }
      sendJson(res, 404, { message: `Unhandled mock route: ${url}` });
    });

    const report = await probeUpstreams(baseline, {
      apiBaseUrls: {
        githubApi: `${baseUrl}/gh`,
        npmRegistry: `${baseUrl}/npm`,
        codeload: `${baseUrl}/codeload`,
      },
    });

    expect(report.hasUpdates).toBe(false);
    expect(report.hasErrors).toBe(false);
    expect(report.items).toHaveLength(4);
    for (const item of report.items) {
      expect(item.status).toBe("up-to-date");
    }
  });

  test("probeUpstreams detects updates, computes new tarball sha256 & SDK export diffs, handles branch 422 fallback, and formats Markdown", async () => {
    const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as UpstreamBaseline;
    const mockTarball = Buffer.from("fake-superpowers-v7.1.0-tarball-bytes");
    const expectedSuperpowersSha = createHash("sha256").update(mockTarball).digest("hex");

    const baseUrl = await startMockServer((req, res) => {
      const url = decodeURIComponent(req.url || "/");
      if (url.startsWith("/gh/repos/anomalyco/opencode/releases")) {
        return sendJson(res, 200, [
          {
            tag_name: "v2.5.0",
            draft: false,
            prerelease: false,
            html_url: "https://github.com/anomalyco/opencode/releases/tag/v2.5.0",
            published_at: "2026-11-24T00:00:00Z",
          },
        ]);
      }
      if (url === "/npm/@opencode/plugin/latest") {
        return sendJson(res, 200, {
          name: "@opencode/plugin",
          version: "2.5.0",
          exports: {
            ".": "./dist/index.js",
            "./tui": "./dist/tui.js",
            "./gui": "./dist/gui.js",
            "./gui/vite": "./dist/vite.js",
            "./rpc": "./dist/rpc.js",
            "./automation": "./dist/automation.js",
          },
        });
      }
      if (url === `/npm/@opencode/plugin/${baseline.opencode.pluginSdkVersion}`) {
        return sendJson(res, 200, {
          name: "@opencode/plugin",
          version: baseline.opencode.pluginSdkVersion,
          exports: {
            ".": "./dist/index.js",
            "./tui": "./dist/tui.js",
            "./gui": "./dist/gui.js",
            "./gui/vite": "./dist/vite.js",
            "./rpc": "./dist/rpc.js",
          },
        });
      }
      if (url.startsWith("/gh/repos/obra/superpowers/releases/latest")) {
        return sendJson(res, 200, {
          tag_name: "v7.1.0",
          html_url: "https://github.com/obra/superpowers/releases/tag/v7.1.0",
        });
      }
      if (url === "/codeload/obra/superpowers/tar.gz/refs/tags/v7.1.0") {
        res.writeHead(200, { "content-type": "application/gzip" });
        res.end(mockTarball);
        return;
      }
      if (url === "/npm/@playwright/mcp/latest") {
        return sendJson(res, 200, {
          name: "@playwright/mcp",
          version: "0.0.87",
        });
      }
      if (url === `/gh/repos/Th0rgal/open-ralph-wiggum/commits/${baseline.ralph.branch}`) {
        return sendJson(res, 422, { message: "No commit found for SHA: main" });
      }
      if (url.startsWith("/gh/repos/Th0rgal/open-ralph-wiggum/commits?per_page=1")) {
        return sendJson(res, 200, [
          {
            sha: baseline.ralph.commit,
            html_url: `https://github.com/Th0rgal/open-ralph-wiggum/commit/${baseline.ralph.commit}`,
            commit: { message: "chore: release 1.3.1" },
          },
        ]);
      }
      sendJson(res, 404, { message: `Unhandled mock route: ${url}` });
    });

    const report = await probeUpstreams(baseline, {
      apiBaseUrls: {
        githubApi: `${baseUrl}/gh`,
        npmRegistry: `${baseUrl}/npm`,
        codeload: `${baseUrl}/codeload`,
      },
    });

    expect(report.hasUpdates).toBe(true);
    expect(report.hasErrors).toBe(false);

    const oc = report.items.find((i) => i.id === "opencode");
    expect(oc?.status).toBe("update-available");
    expect(oc?.latestVersion).toBe("2.5.0");
    expect(oc?.releaseUrl).toBe("https://github.com/anomalyco/opencode/releases/tag/v2.5.0");
    expect(oc?.sdk?.latestVersion).toBe("2.5.0");
    expect(oc?.sdk?.addedExports).toEqual(["./automation"]);

    const sp = report.items.find((i) => i.id === "superpowers");
    expect(sp?.status).toBe("update-available");
    expect(sp?.latestVersion).toBe("v7.1.0");
    expect(sp?.sha256).toBe(expectedSuperpowersSha);

    const pw = report.items.find((i) => i.id === "playwrightMcp");
    expect(pw?.status).toBe("update-available");
    expect(pw?.latestVersion).toBe("0.0.87");
    expect(pw?.releaseUrl).toContain("@playwright/mcp");

    const ralph = report.items.find((i) => i.id === "ralph");
    expect(ralph?.status).toBe("up-to-date");

    const md = formatMarkdownReport(report);
    expect(md).toContain("2.5.0");
    expect(md).toContain("0.0.87");
    expect(md).toContain("v7.1.0");
    expect(md).toContain("https://github.com/anomalyco/opencode/releases/tag/v2.5.0");
    expect(md).toContain("./automation");
    expect(md).toContain(expectedSuperpowersSha);
    expect(md).toContain("upstream-stewardship");
  });

  test("probeUpstreams captures structured status: error on HTTP 403/500 without unhandled rejections and forwards token", async () => {
    const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as UpstreamBaseline;
    const authHeaders: string[] = [];

    const baseUrl = await startMockServer((req, res) => {
      const url = decodeURIComponent(req.url || "/");
      if (url.startsWith("/gh/")) {
        authHeaders.push(String(req.headers.authorization || ""));
        return sendJson(res, 403, { message: "API rate limit exceeded" });
      }
      if (url.startsWith("/npm/")) {
        return sendJson(res, 500, { error: "Internal registry outage" });
      }
      sendJson(res, 503, { error: "Unavailable" });
    });

    const report = await probeUpstreams(baseline, {
      token: "ghs_unit_test_token",
      apiBaseUrls: {
        githubApi: `${baseUrl}/gh`,
        npmRegistry: `${baseUrl}/npm`,
        codeload: `${baseUrl}/codeload`,
      },
    });

    expect(report.hasErrors).toBe(true);
    expect(authHeaders.length).toBeGreaterThan(0);
    expect(authHeaders.every((h) => h === "Bearer ghs_unit_test_token")).toBe(true);
    for (const item of report.items) {
      expect(item.status).toBe("error");
      expect(item.error).toMatch(/403|500/);
    }
  });
});

describe("upstream-stewardship skill & canary workflow hygiene", () => {
  test("SKILL.md, completeness-rubric.md, and upstream-canary.yml obey zero-path-hardcoding and spec constraints", async () => {
    const skillPath = join(repoRoot, ".opencode", "skills", "upstream-stewardship", "SKILL.md");
    const rubricPath = join(repoRoot, ".opencode", "skills", "upstream-stewardship", "references", "completeness-rubric.md");
    const workflowPath = join(repoRoot, ".github", "workflows", "upstream-canary.yml");

    const skill = await readFile(skillPath, "utf8");
    const skillLines = skill.split(/\r?\n/);
    expect(skillLines.length).toBeLessThan(260);

    const fmMatch = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    expect(fmMatch).not.toBeNull();
    const fm = fmMatch?.[1] || "";
    expect(fm).toMatch(/^name:\s*upstream-stewardship\s*$/m);
    const descMatch = fm.match(/^description:\s*(.+)$/m);
    expect(descMatch).not.toBeNull();
    const description = (descMatch?.[1] || "").trim().replace(/^["']|["']$/g, "");
    expect(description.startsWith("Use when")).toBe(true);
    expect(description.length).toBeGreaterThan(40);
    expect(description.length).toBeLessThan(1024);

    // Must link completeness-rubric.md one level deep and invoke check-upstreams.ts via bun interpreter
    expect(skill).toContain("references/completeness-rubric.md");
    expect(skill).toContain("bun run scripts/check-upstreams.ts");

    // Zero hardcoded TypeScript/JS source paths
    expect(skill).not.toMatch(/packages\/[a-z-]+\/src\/[a-z-]+\.tsx?/i);
    expect(skill).not.toMatch(/packages\/config\/opencode\/[a-z/-]+\.(js|ts|tsx|cjs)/i);

    // Rationalization table & Red Flags present
    expect(skill).toMatch(/Rationalization/i);
    expect(skill).toMatch(/Red Flags/i);

    const rubric = await readFile(rubricPath, "utf8");
    expect(rubric).toContain("opencode.browser");
    expect(rubric).toContain("opencode.goal");
    expect(rubric).toContain("tools.automation.create");
    expect(rubric).toContain('type: "code"');
    expect(rubric).not.toMatch(/packages\/[a-z-]+\/src\/[a-z-]+\.tsx?/i);

    const workflow = await readFile(workflowPath, "utf8");
    expect(workflow).toContain('cron: "0 6 * * *"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("issues: write");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain("upstream-sync");
    expect(workflow).not.toMatch(/\bgit\s+push\b/);
    expect(workflow).not.toMatch(/\bgit\s+commit\b/);
  });
});

const realOpencode = await findOpenCode(resolvePaths(process.env));

describe("live host canary in isolated temp HOME", () => {
  test("runLiveHostCanary passes apply + doctor in isolated temp HOME with stubbed opencode", async () => {
    const stubDir = await mkdtemp(join(tmpdir(), "ultracode-canary-stub-"));
    tempDirsToClean.push(stubDir);
    const stubBin =
      process.platform === "win32"
        ? join(stubDir, "opencode.cmd")
        : join(stubDir, "opencode");
    await mkdir(stubDir, { recursive: true });
    if (process.platform === "win32") {
      await writeFile(stubBin, "@echo off\r\necho opencode v2.4.0\r\n");
    } else {
      await writeFile(stubBin, "#!/bin/sh\nprintf 'opencode v2.4.0\\n'\n", { mode: 0o755 });
    }

    const res = await runLiveHostCanary({
      opencodeBin: stubBin,
      skipGuiNpmInstall: true,
      skipRuntimeDownload: true,
      rebuild: false,
    });

    expect(res.ok).toBe(true);
    expect(res.opencodeVersion).toBe("2.4.0");
    expect(res.checks.some((c) => c.name === "ultracode-apply" && c.ok)).toBe(true);
    expect(res.checks.some((c) => c.name === "ultracode-doctor" && c.ok)).toBe(true);
  });

  test.skipIf(!realOpencode)(
    "runLiveHostCanary({ skipGuiNpmInstall: true }) passes apply + doctor against real opencode on PATH",
    async () => {
      const res = await runLiveHostCanary({
        opencodeBin: realOpencode || undefined,
        skipGuiNpmInstall: true,
        skipRuntimeDownload: true,
        rebuild: false,
      });

      expect(res.ok).toBe(true);
      expect(res.opencodeVersion).toMatch(/^2\.\d+\.\d+$/);
      expect(res.checks.every((c) => c.ok)).toBe(true);
    },
  );
});
