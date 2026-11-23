import { createHash } from "node:crypto";
import { chmod, copyFile, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import baselineJson from "../packages/config/upstream-baseline.json";
import { assertSupportedOpenCode, findOpenCode, opencodeVersion, run } from "../packages/installer/src/opencode";
import { resolvePaths } from "../packages/installer/src/paths";
import type { UpstreamBaseline } from "../packages/installer/src/runtime";

export type { UpstreamBaseline };

export type UpstreamStatus = "up-to-date" | "update-available" | "error";

export interface UpstreamSdkDiff {
  packageName: string;
  baselineVersion: string;
  latestVersion?: string;
  baselineExports?: string[];
  latestExports?: string[];
  addedExports?: string[];
  removedExports?: string[];
}

export interface UpstreamItemReport {
  id: "opencode" | "superpowers" | "playwrightMcp" | "ralph";
  name: string;
  status: UpstreamStatus;
  baselineVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  publishedAt?: string;
  summary?: string;
  tarballUrl?: string;
  sha256?: string;
  sdk?: UpstreamSdkDiff;
  error?: string;
}

export interface ProbeReport {
  checkedAt: string;
  baselineUpdatedAt: string;
  hasUpdates: boolean;
  hasErrors: boolean;
  fingerprint: string;
  items: UpstreamItemReport[];
}

export interface ProbeOptions {
  apiBaseUrls?: {
    githubApi?: string;
    npmRegistry?: string;
    codeload?: string;
  };
  token?: string;
  computeChangedTarballSha256?: boolean;
}

export interface LiveCanaryOptions {
  opencodeBin?: string;
  skipGuiNpmInstall?: boolean;
  skipRuntimeDownload?: boolean;
  rebuild?: boolean;
  targetPluginSdkVersion?: string;
}

export interface LiveCanaryCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface LiveCanaryResult {
  ok: boolean;
  opencodeVersion: string;
  checks: LiveCanaryCheck[];
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..");

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function sha256Hex(input: Uint8Array | string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function parseSemver(raw: string): [number, number, number] | null {
  const m = raw.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]);
  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) return null;
  return [major, minor, patch];
}

function compareSemver(a: [number, number, number], b: [number, number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

interface HttpJsonResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<HttpJsonResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: `Network error fetching ${url}: ${(err as Error).message}`,
    };
  }
  const text = await response.text();
  if (!response.ok) {
    let message = response.statusText || "HTTP error";
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      message = parsed.message || parsed.error || message;
    } catch {
      if (text.trim()) message = text.trim().slice(0, 160);
    }
    return {
      ok: false,
      status: response.status,
      error: `HTTP ${response.status} from ${url}: ${message}`,
    };
  }
  try {
    return {
      ok: true,
      status: response.status,
      data: JSON.parse(text) as T,
    };
  } catch (err) {
    return {
      ok: false,
      status: response.status,
      error: `Invalid JSON from ${url}: ${(err as Error).message}`,
    };
  }
}

async function tryFetchTarballSha256(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ultracode-upstream-steward" },
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return undefined;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return sha256Hex(bytes);
  } catch {
    return undefined;
  }
}

function extractExportKeys(pkgData: Record<string, unknown> | undefined): string[] {
  if (!pkgData || typeof pkgData.exports !== "object" || pkgData.exports === null) return [];
  return Object.keys(pkgData.exports as Record<string, unknown>).sort();
}

interface GitHubReleasePayload {
  tag_name?: string;
  html_url?: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
  name?: string;
}

interface GitHubCommitPayload {
  sha?: string;
  html_url?: string;
  commit?: {
    message?: string;
    committer?: { date?: string };
    author?: { date?: string };
  };
}

export async function probeUpstreams(
  baseline: UpstreamBaseline = baselineJson as UpstreamBaseline,
  options: ProbeOptions = {},
): Promise<ProbeReport> {
  const githubApi = trimTrailingSlash(options.apiBaseUrls?.githubApi || "https://api.github.com");
  const npmRegistry = trimTrailingSlash(options.apiBaseUrls?.npmRegistry || "https://registry.npmjs.org");
  const codeload = trimTrailingSlash(options.apiBaseUrls?.codeload || "https://codeload.github.com");
  const computeHashes = options.computeChangedTarballSha256 !== false;

  const token = options.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const ghHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ultracode-upstream-steward",
  };
  if (token) {
    ghHeaders.Authorization = `Bearer ${token}`;
  }
  const npmHeaders: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "ultracode-upstream-steward",
  };

  const probeOpenCode = async (): Promise<UpstreamItemReport> => {
    const releasesUrl = `${githubApi}/repos/${baseline.opencode.repo}/releases?per_page=50`;
    const sdkLatestUrl = `${npmRegistry}/${baseline.opencode.pluginSdkPackage}/latest`;
    const [relRes, sdkRes] = await Promise.all([
      fetchJson<GitHubReleasePayload[] | GitHubReleasePayload>(releasesUrl, ghHeaders),
      fetchJson<Record<string, unknown>>(sdkLatestUrl, npmHeaders),
    ]);

    if (!relRes.ok || !sdkRes.ok) {
      const errors = [relRes.error, sdkRes.error].filter(Boolean).join("; ");
      return {
        id: "opencode",
        name: `OpenCode (${baseline.opencode.repo} + ${baseline.opencode.pluginSdkPackage})`,
        status: "error",
        baselineVersion: baseline.opencode.verifiedRelease,
        sdk: {
          packageName: baseline.opencode.pluginSdkPackage,
          baselineVersion: baseline.opencode.pluginSdkVersion,
        },
        error: errors || "Failed to query OpenCode upstream",
      };
    }

    const candidates = Array.isArray(relRes.data) ? relRes.data : relRes.data ? [relRes.data] : [];
    const stable = candidates.filter((r) => !r.draft && !r.prerelease && typeof r.tag_name === "string");
    const v2Plus = stable
      .map((r) => ({ release: r, semver: parseSemver(r.tag_name || "") }))
      .filter((entry): entry is { release: GitHubReleasePayload; semver: [number, number, number] } =>
        Boolean(entry.semver && entry.semver[0] >= 2),
      )
      .sort((a, b) => compareSemver(b.semver, a.semver));

    const chosen = v2Plus[0]?.release;
    if (!chosen?.tag_name) {
      return {
        id: "opencode",
        name: `OpenCode (${baseline.opencode.repo} + ${baseline.opencode.pluginSdkPackage})`,
        status: "error",
        baselineVersion: baseline.opencode.verifiedRelease,
        error: `No stable V2+ release tag found in ${releasesUrl}`,
      };
    }

    const latestCliVersion = chosen.tag_name.replace(/^v/, "");
    const latestSdkVersion = typeof sdkRes.data?.version === "string" ? sdkRes.data.version : "";
    if (!latestSdkVersion) {
      return {
        id: "opencode",
        name: `OpenCode (${baseline.opencode.repo} + ${baseline.opencode.pluginSdkPackage})`,
        status: "error",
        baselineVersion: baseline.opencode.verifiedRelease,
        error: `Missing version in ${sdkLatestUrl}`,
      };
    }

    const latestExports = extractExportKeys(sdkRes.data);
    let baselineExports: string[] | undefined;
    let addedExports: string[] | undefined;
    let removedExports: string[] | undefined;

    if (latestSdkVersion !== baseline.opencode.pluginSdkVersion) {
      const baseSdkRes = await fetchJson<Record<string, unknown>>(
        `${npmRegistry}/${baseline.opencode.pluginSdkPackage}/${baseline.opencode.pluginSdkVersion}`,
        npmHeaders,
      );
      if (baseSdkRes.ok && baseSdkRes.data) {
        baselineExports = extractExportKeys(baseSdkRes.data);
        const baseSet = new Set(baselineExports);
        const latestSet = new Set(latestExports);
        addedExports = latestExports.filter((k) => !baseSet.has(k));
        removedExports = baselineExports.filter((k) => !latestSet.has(k));
      }
    }

    const isUpdated =
      latestCliVersion !== baseline.opencode.verifiedRelease ||
      latestSdkVersion !== baseline.opencode.pluginSdkVersion;

    return {
      id: "opencode",
      name: `OpenCode (${baseline.opencode.repo} + ${baseline.opencode.pluginSdkPackage})`,
      status: isUpdated ? "update-available" : "up-to-date",
      baselineVersion: baseline.opencode.verifiedRelease,
      latestVersion: latestCliVersion,
      releaseUrl: chosen.html_url || `https://github.com/${baseline.opencode.repo}/releases/tag/${chosen.tag_name}`,
      publishedAt: chosen.published_at,
      sdk: {
        packageName: baseline.opencode.pluginSdkPackage,
        baselineVersion: baseline.opencode.pluginSdkVersion,
        latestVersion: latestSdkVersion,
        baselineExports,
        latestExports,
        addedExports,
        removedExports,
      },
    };
  };

  const probeSuperpowers = async (): Promise<UpstreamItemReport> => {
    const url = `${githubApi}/repos/${baseline.superpowers.repo}/releases/latest`;
    const res = await fetchJson<GitHubReleasePayload>(url, ghHeaders);
    if (!res.ok || !res.data?.tag_name) {
      return {
        id: "superpowers",
        name: `Superpowers (${baseline.superpowers.repo})`,
        status: "error",
        baselineVersion: baseline.superpowers.tag,
        error: res.error || `Missing tag_name from ${url}`,
      };
    }

    const latestTag = res.data.tag_name;
    const isUpdated = latestTag !== baseline.superpowers.tag;
    const tarballUrl = isUpdated
      ? `${codeload}/${baseline.superpowers.repo}/tar.gz/refs/tags/${latestTag}`
      : baseline.superpowers.tarballUrl;
    const sha256 = isUpdated
      ? computeHashes
        ? await tryFetchTarballSha256(tarballUrl)
        : undefined
      : baseline.superpowers.sha256;

    return {
      id: "superpowers",
      name: `Superpowers (${baseline.superpowers.repo})`,
      status: isUpdated ? "update-available" : "up-to-date",
      baselineVersion: baseline.superpowers.tag,
      latestVersion: latestTag,
      releaseUrl: res.data.html_url || `https://github.com/${baseline.superpowers.repo}/releases/tag/${latestTag}`,
      publishedAt: res.data.published_at,
      tarballUrl,
      sha256,
    };
  };

  const probePlaywrightMcp = async (): Promise<UpstreamItemReport> => {
    const url = `${npmRegistry}/${baseline.playwrightMcp.npmPackage}/latest`;
    const res = await fetchJson<Record<string, unknown>>(url, npmHeaders);
    const latestVersion = typeof res.data?.version === "string" ? res.data.version : "";
    if (!res.ok || !latestVersion) {
      return {
        id: "playwrightMcp",
        name: `Playwright MCP (${baseline.playwrightMcp.npmPackage})`,
        status: "error",
        baselineVersion: baseline.playwrightMcp.version,
        error: res.error || `Missing version from ${url}`,
      };
    }

    const isUpdated = latestVersion !== baseline.playwrightMcp.version;
    return {
      id: "playwrightMcp",
      name: `Playwright MCP (${baseline.playwrightMcp.npmPackage})`,
      status: isUpdated ? "update-available" : "up-to-date",
      baselineVersion: baseline.playwrightMcp.version,
      latestVersion,
      releaseUrl: `https://www.npmjs.com/package/${baseline.playwrightMcp.npmPackage}/v/${latestVersion}`,
    };
  };

  const probeRalph = async (): Promise<UpstreamItemReport> => {
    const branchUrl = `${githubApi}/repos/${baseline.ralph.repo}/commits/${encodeURIComponent(baseline.ralph.branch)}`;
    let commitPayload: GitHubCommitPayload | undefined;
    const branchRes = await fetchJson<GitHubCommitPayload>(branchUrl, ghHeaders);
    if (branchRes.ok && branchRes.data?.sha) {
      commitPayload = branchRes.data;
    } else if (branchRes.status === 422 || branchRes.status === 404) {
      // Upstream repository default branch may differ from baseline branch name (e.g., master vs main).
      const defaultCommitsUrl = `${githubApi}/repos/${baseline.ralph.repo}/commits?per_page=1`;
      const listRes = await fetchJson<GitHubCommitPayload[]>(defaultCommitsUrl, ghHeaders);
      if (listRes.ok && Array.isArray(listRes.data) && listRes.data[0]?.sha) {
        commitPayload = listRes.data[0];
      } else {
        return {
          id: "ralph",
          name: `Ralph (${baseline.ralph.repo})`,
          status: "error",
          baselineVersion: baseline.ralph.commit,
          error: listRes.error || branchRes.error || `Could not resolve HEAD commit for ${baseline.ralph.repo}`,
        };
      }
    } else {
      return {
        id: "ralph",
        name: `Ralph (${baseline.ralph.repo})`,
        status: "error",
        baselineVersion: baseline.ralph.commit,
        error: branchRes.error || `Could not resolve HEAD commit for ${baseline.ralph.repo}`,
      };
    }

    const latestCommit = commitPayload.sha || "";
    const isUpdated = latestCommit !== baseline.ralph.commit;
    const firstLine = (commitPayload.commit?.message || "").split(/\r?\n/)[0]?.trim() || undefined;
    const tarballUrl = isUpdated
      ? `${codeload}/${baseline.ralph.repo}/tar.gz/${latestCommit}`
      : baseline.ralph.tarballUrl;
    const sha256 = isUpdated
      ? computeHashes
        ? await tryFetchTarballSha256(tarballUrl)
        : undefined
      : baseline.ralph.sha256;

    return {
      id: "ralph",
      name: `Ralph (${baseline.ralph.repo})`,
      status: isUpdated ? "update-available" : "up-to-date",
      baselineVersion: baseline.ralph.commit,
      latestVersion: latestCommit,
      releaseUrl: commitPayload.html_url || `https://github.com/${baseline.ralph.repo}/commit/${latestCommit}`,
      publishedAt: commitPayload.commit?.committer?.date || commitPayload.commit?.author?.date,
      summary: firstLine,
      tarballUrl,
      sha256,
    };
  };

  const items = await Promise.all([
    probeOpenCode(),
    probeSuperpowers(),
    probePlaywrightMcp(),
    probeRalph(),
  ]);

  const hasUpdates = items.some((item) => item.status === "update-available");
  const hasErrors = items.some((item) => item.status === "error");
  const fingerprint = sha256Hex(
    JSON.stringify(
      items.map((i) => ({
        id: i.id,
        status: i.status,
        latestVersion: i.latestVersion,
        sdkLatest: i.sdk?.latestVersion,
        error: i.error,
      })),
    ),
  ).slice(0, 16);

  return {
    checkedAt: new Date().toISOString(),
    baselineUpdatedAt: baseline.updatedAt,
    hasUpdates,
    hasErrors,
    fingerprint,
    items,
  };
}

async function resolveExecutablePath(binary: string): Promise<string> {
  if (isAbsolute(binary)) return binary;
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const found = await run(locator, [binary]).catch(() => ({ code: 1, stdout: "", stderr: "" }));
  if (found.code === 0) {
    const first = found.stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean);
    if (first) return first;
  }
  return binary;
}

export async function runLiveHostCanary(options: LiveCanaryOptions = {}): Promise<LiveCanaryResult> {
  const checks: LiveCanaryCheck[] = [];
  const discovered = options.opencodeBin ?? (await findOpenCode(resolvePaths(process.env)));
  if (!discovered) {
    return {
      ok: false,
      opencodeVersion: "missing",
      checks: [
        {
          name: "opencode-binary",
          ok: false,
          detail: "OpenCode binary was not found on PATH or standard install locations",
        },
      ],
    };
  }

  const resolvedOpencode = await resolveExecutablePath(discovered);
  let version = "unknown";
  try {
    version = await opencodeVersion(resolvedOpencode);
    assertSupportedOpenCode(version);
    checks.push({ name: "opencode-version", ok: true, detail: version });
  } catch (err) {
    checks.push({ name: "opencode-version", ok: false, detail: (err as Error).message });
    return { ok: false, opencodeVersion: version, checks };
  }

  if (!options.skipGuiNpmInstall) {
    const guiSandbox = await mkdtemp(join(tmpdir(), "ultracode-gui-canary-"));
    try {
      const sandboxGuiDir = join(guiSandbox, "packages", "plugin-gui");
      const sandboxConvDir = join(guiSandbox, "packages", "config", "opencode", "conversation");
      await mkdir(sandboxGuiDir, { recursive: true });
      await mkdir(sandboxConvDir, { recursive: true });

      await cp(join(repoRoot, "packages", "plugin-gui"), sandboxGuiDir, {
        recursive: true,
        filter: (src) => !src.includes("node_modules"),
      });
      await cp(join(repoRoot, "packages", "config", "opencode", "conversation"), sandboxConvDir, {
        recursive: true,
        filter: (src) => !src.endsWith("gui-experimental.cjs"),
      });

      const targetSdk = options.targetPluginSdkVersion || "latest";
      const bunEnv = {
        ...process.env,
        BUN_BE_BUN: "1",
        BUN_CONFIG_MAX_HTTP_REQUESTS: "4",
        CI: "1",
        NO_COLOR: "1",
      };
      const installRes = await run(
        process.execPath,
        ["add", "--dev", "--exact", "--network-concurrency=4", `@opencode/plugin@${targetSdk}`],
        { cwd: sandboxGuiDir, env: bunEnv },
      );
      if (installRes.code !== 0) {
        checks.push({
          name: "plugin-gui-sdk-install",
          ok: false,
          detail: (installRes.stderr || installRes.stdout).trim().slice(0, 300),
        });
      } else {
        let installedSdk = targetSdk;
        try {
          const sdkPkg = JSON.parse(
            await readFile(join(sandboxGuiDir, "node_modules", "@opencode", "plugin", "package.json"), "utf8"),
          ) as { version?: string };
          if (sdkPkg.version) installedSdk = sdkPkg.version;
        } catch {
          // keep requested version string
        }

        const checkRes = await run(process.execPath, ["run", "check"], { cwd: sandboxGuiDir, env: bunEnv });
        const buildRes =
          checkRes.code === 0
            ? await run(process.execPath, ["run", "build"], { cwd: sandboxGuiDir, env: bunEnv })
            : { code: 1, stdout: "", stderr: "Skipped after tsc failure" };
        const builtCjs = await fileExists(join(sandboxConvDir, "gui-experimental.cjs"));

        if (checkRes.code === 0 && buildRes.code === 0 && builtCjs) {
          checks.push({
            name: "plugin-gui-sdk-build",
            ok: true,
            detail: `@opencode/plugin@${installedSdk}`,
          });
        } else {
          const detail = (checkRes.stderr || checkRes.stdout || buildRes.stderr || buildRes.stdout).trim().slice(0, 300);
          checks.push({
            name: "plugin-gui-sdk-build",
            ok: false,
            detail: `@opencode/plugin@${installedSdk}: ${detail}`,
          });
        }
      }
    } finally {
      await rm(guiSandbox, { recursive: true, force: true }).catch(() => {});
    }
  }

  const installerDir = join(repoRoot, "packages", "installer");
  const ext = process.platform === "win32" ? ".exe" : "";
  const distBin = join(installerDir, "dist", `ultracode-current${ext}`);
  const shouldRebuild = options.rebuild !== undefined ? options.rebuild : true;
  if (shouldRebuild || !(await fileExists(distBin))) {
    const buildRes = await run(process.execPath, ["run", "build"], {
      cwd: installerDir,
      env: { ...process.env, BUN_BE_BUN: "1", NO_COLOR: "1" },
    });
    if (buildRes.code !== 0 || !(await fileExists(distBin))) {
      checks.push({
        name: "installer-build",
        ok: false,
        detail: (buildRes.stderr || buildRes.stdout).trim().slice(0, 300) || "ultracode-current binary missing",
      });
      return { ok: false, opencodeVersion: version, checks };
    }
  }
  checks.push({ name: "installer-binary", ok: true, detail: distBin });

  const hostSandbox = await mkdtemp(join(tmpdir(), "ultracode-host-canary-"));
  try {
    const sandboxBinDir = join(hostSandbox, "bin");
    await mkdir(sandboxBinDir, { recursive: true });
    const installedBin = join(sandboxBinDir, `ultracode${ext}`);
    await copyFile(distBin, installedBin);
    if (process.platform !== "win32") {
      await chmod(installedBin, 0o755);
    }

    const isolatedEnv: NodeJS.ProcessEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith("OPENCODE_") || key.startsWith("ULTRACODE_")) continue;
      isolatedEnv[key] = value;
    }
    const parentBunCache = process.env.BUN_INSTALL_CACHE_DIR || (process.env.HOME ? join(process.env.HOME, ".bun", "install", "cache") : "");
    Object.assign(isolatedEnv, {
      HOME: hostSandbox,
      USERPROFILE: hostSandbox,
      XDG_CONFIG_HOME: join(hostSandbox, ".config"),
      XDG_DATA_HOME: join(hostSandbox, ".local", "share"),
      XDG_STATE_HOME: join(hostSandbox, ".local", "state"),
      XDG_CACHE_HOME: join(hostSandbox, ".cache"),
      LOCALAPPDATA: join(hostSandbox, "AppData", "Local"),
      APPDATA: join(hostSandbox, "AppData", "Roaming"),
      OPENCODE_CONFIG_DIR: join(hostSandbox, ".config", "opencode"),
      ULTRACODE_HOME: join(hostSandbox, ".local", "share", "ultracode"),
      ULTRACODE_BIN_DIR: sandboxBinDir,
      ULTRACODE_OPENCODE_BIN: resolvedOpencode,
      ULTRACODE_SKIP_BROWSER: "1",
      BUN_CONFIG_MAX_HTTP_REQUESTS: "4",
      ...(parentBunCache ? { BUN_INSTALL_CACHE_DIR: parentBunCache } : {}),
      NO_COLOR: "1",
      CI: "1",
    });
    if (options.skipRuntimeDownload) {
      isolatedEnv.ULTRACODE_SKIP_RUNTIME = "1";
    }

    const applyRes = await run(installedBin, ["apply"], { cwd: hostSandbox, env: isolatedEnv });
    checks.push({
      name: "ultracode-apply",
      ok: applyRes.code === 0,
      detail: (applyRes.stderr || applyRes.stdout).trim().slice(0, 300) || "Applied cleanly",
    });

    const doctorRes = await run(installedBin, ["doctor"], { cwd: hostSandbox, env: isolatedEnv });
    checks.push({
      name: "ultracode-doctor",
      ok: doctorRes.code === 0,
      detail: (doctorRes.stderr || doctorRes.stdout).trim().slice(0, 300) || "Ready",
    });
  } finally {
    await rm(hostSandbox, { recursive: true, force: true }).catch(() => {});
  }

  return {
    ok: checks.every((c) => c.ok),
    opencodeVersion: version,
    checks,
  };
}

export function formatMarkdownReport(probe: ProbeReport, canary?: LiveCanaryResult): string {
  const lines: string[] = [];
  lines.push(`<!-- ultracode-upstream-fingerprint: ${probe.fingerprint} -->`);
  lines.push("# UltraCode Upstream Stewardship & Canary Report");
  lines.push("");
  lines.push(`- **Checked At:** \`${probe.checkedAt}\``);
  lines.push(`- **Baseline Updated:** \`${probe.baselineUpdatedAt}\``);
  lines.push(`- **Updates Available:** \`${probe.hasUpdates}\``);
  lines.push(`- **Probe Errors:** \`${probe.hasErrors}\``);
  if (canary) {
    lines.push(`- **Live Host Canary (\`opencode v${canary.opencodeVersion}\`):** \`${canary.ok ? "PASS" : "FAIL"}\``);
  }
  lines.push("");
  lines.push("## 1. Monitored Upstreams");
  lines.push("");
  lines.push("| Upstream | Status | Baseline | Latest | Reference |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const item of probe.items) {
    const baseLabel =
      item.id === "ralph"
        ? `\`${item.baselineVersion.slice(0, 10)}\``
        : item.sdk
          ? `\`${item.baselineVersion}\` (SDK \`${item.sdk.baselineVersion}\`)`
          : `\`${item.baselineVersion}\``;
    const latestLabel =
      item.status === "error"
        ? "—"
        : item.id === "ralph"
          ? `\`${(item.latestVersion || "").slice(0, 10)}\``
          : item.sdk
            ? `\`${item.latestVersion}\` (SDK \`${item.sdk.latestVersion}\`)`
            : `\`${item.latestVersion}\``;
    const escapedError = item.error
      ? item.error.replace(/\|/g, "\\|").replace(/`/g, "\\`").replace(/\r?\n/g, " ")
      : "";
    const ref = item.releaseUrl ? `[Release / Commit](${item.releaseUrl})` : escapedError || "—";
    lines.push(`| ${item.name} | \`${item.status}\` | ${baseLabel} | ${latestLabel} | ${ref} |`);
  }

  const changedOrErrored = probe.items.filter((i) => i.status !== "up-to-date");
  if (changedOrErrored.length > 0) {
    lines.push("");
    lines.push("## 2. Delta & Diagnostic Details");
    lines.push("");
    for (const item of changedOrErrored) {
      lines.push(`### ${item.name}`);
      if (item.error) {
        lines.push(`- **Error:** \`${item.error}\``);
      } else {
        lines.push(`- **Transition:** \`${item.baselineVersion}\` → \`${item.latestVersion}\``);
        if (item.releaseUrl) lines.push(`- **Upstream URL:** ${item.releaseUrl}`);
        if (item.summary) lines.push(`- **Commit Summary:** ${item.summary}`);
        if (item.tarballUrl) lines.push(`- **Candidate Tarball URL:** \`${item.tarballUrl}\``);
        if (item.sha256) lines.push(`- **Computed Tarball SHA-256:** \`${item.sha256}\``);
        if (item.sdk) {
          lines.push(`- **Plugin SDK (\`${item.sdk.packageName}\`):** \`${item.sdk.baselineVersion}\` → \`${item.sdk.latestVersion}\``);
          if (item.sdk.addedExports?.length) {
            lines.push(`- **Added SDK Exports:** \`${item.sdk.addedExports.join("`, `")}\``);
          }
          if (item.sdk.removedExports?.length) {
            lines.push(`- **Removed SDK Exports:** \`${item.sdk.removedExports.join("`, `")}\``);
          }
        }
      }
      lines.push("");
    }
  }

  if (canary) {
    lines.push("");
    lines.push("## 3. Clean-Room Live Host Canary");
    lines.push("");
    lines.push("| Check | Result | Detail |");
    lines.push("| --- | --- | --- |");
    for (const check of canary.checks) {
      lines.push(`| \`${check.name}\` | \`${check.ok ? "PASS" : "FAIL"}\` | ${check.detail ? check.detail.replace(/\|/g, "\\|").replace(/\r?\n/g, " ") : "—"} |`);
    }
  }

  lines.push("");
  lines.push("## 4. Local Maintainer Action (Zero-Bot-Commit Workflow)");
  lines.push("");
  lines.push("Run UltraCode locally in this repository and invoke the `upstream-stewardship` skill:");
  lines.push("");
  lines.push("```bash");
  lines.push(
    'ultracode run "Load the upstream-stewardship skill and execute the 6-step upstream stewardship protocol to align with the latest upstream delta."',
  );
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

function readFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  const val = args[idx + 1];
  return val && !val.startsWith("--") ? val : undefined;
}

async function runCli(argv: string[]): Promise<number> {
  const jsonMode = argv.includes("--json");
  const mdMode = argv.includes("--markdown");
  const verifyLive = argv.includes("--verify-live");
  const failOnOutdated = argv.includes("--fail-on-outdated");
  const skipGuiNpmInstall = argv.includes("--skip-gui-npm-install");
  const outJson = readFlagValue(argv, "--out-json");
  const outMd = readFlagValue(argv, "--out-md");

  const probe = await probeUpstreams();
  const canary = verifyLive ? await runLiveHostCanary({ skipGuiNpmInstall }) : undefined;
  const overallOk = !probe.hasErrors && (!canary || canary.ok);

  const jsonPayload = JSON.stringify(
    {
      ok: overallOk,
      ...probe,
      ...(canary ? { canary } : {}),
    },
    null,
    2,
  );
  const mdPayload = formatMarkdownReport(probe, canary);

  if (outJson) {
    await mkdir(dirname(outJson), { recursive: true });
    await writeFile(outJson, `${jsonPayload}\n`);
  }
  if (outMd) {
    await mkdir(dirname(outMd), { recursive: true });
    await writeFile(outMd, mdPayload);
  }

  if (jsonMode) {
    process.stdout.write(`${jsonPayload}\n`);
  } else if (mdMode || (!outJson && !outMd)) {
    process.stdout.write(mdPayload);
  }

  if (!overallOk) return 1;
  if (failOnOutdated && probe.hasUpdates) return 10;
  return 0;
}

if ((import.meta as { main?: boolean }).main) {
  runCli(process.argv.slice(2))
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error((err as Error).stack || (err as Error).message);
      process.exit(1);
    });
}
