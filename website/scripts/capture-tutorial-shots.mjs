#!/usr/bin/env bun
/**
 * UltraCode Website — Hands-On Tutorial Screenshot Capture
 *
 * Produces genuine 2× product screenshots for the website tutorials from an
 * isolated clean-room OpenCode v2.4.x + UltraCode sandbox. Nothing here touches
 * the maintainer's live OpenCode service or configuration:
 *   - every child process runs with an isolated HOME / XDG_* / OPENCODE_CONFIG_DIR
 *   - the shared background service is bound to a private loopback port
 *   - all output lands in website/public/tutorials/*.webp
 *
 * Usage:
 *   bun run website/scripts/capture-tutorial-shots.mjs [--only tui|gui|mobile|all]
 */

import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..", "..");
const outDir = join(repoRoot, "website", "public", "tutorials");

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : "all";

const OPENCODE_BIN =
  process.env.ULTRACODE_OPENCODE_BIN ||
  (await execFileAsync("sh", ["-c", "command -v opencode"]).then(
    (r) => r.stdout.trim(),
    () => join(process.env.HOME || "", ".opencode", "bin", "opencode"),
  ));

const ULTRACODE_BIN = resolve(
  process.env.ULTRACODE_CAPTURE_BIN || join(repoRoot, "packages", "installer", "dist", "ultracode-linux-x64"),
);

const SERVICE_PORT = 49419;

function log(msg) {
  process.stderr.write(`[capture] ${msg}\n`);
}

async function resolvePlaywright() {
  const candidates = [
    "playwright",
    join(process.env.HOME || "", ".local", "share", "ultracode", "runtime", "node_modules", "playwright", "index.mjs"),
  ];
  for (const candidate of candidates) {
    try {
      return await import(candidate);
    } catch {
      // try next
    }
  }
  throw new Error("Playwright was not found. Run `ultracode` once or install playwright to capture screenshots.");
}

async function resolveChrome() {
  if (process.env.ULTRACODE_CAPTURE_CHROME) return process.env.ULTRACODE_CAPTURE_CHROME;
  const base = join(process.env.HOME || "", ".cache", "ms-playwright");
  const entries = await execFileAsync("sh", ["-c", `ls -1 ${base} 2>/dev/null | grep '^chromium-' | sort -V | tail -n 1`]).then(
    (r) => r.stdout.trim(),
    () => "",
  );
  if (!entries) throw new Error("No Playwright Chromium build found in ~/.cache/ms-playwright.");
  return join(base, entries, "chrome-linux64", "chrome");
}

async function makeSandbox() {
  const root = await mkdtemp(join(tmpdir(), "ultracode-shots-"));
  const home = join(root, "home");
  const project = join(home, "周末读书会报名页");
  await mkdir(project, { recursive: true });
  await writeFile(
    join(project, "README.md"),
    "# 周末读书会报名页\n\n给社区周末读书会做一个在线报名页：能选场次、填人数，提交后显示确认卡片。\n",
  );
  const env = {
    PATH: `${join(home, ".local", "bin")}:${process.env.PATH || "/usr/local/bin:/usr/bin:/bin"}`,
    HOME: home,
    USER: "newcomer",
    SHELL: "/bin/zsh",
    TERM: "xterm-256color",
    LANG: "zh_CN.UTF-8",
    XDG_CONFIG_HOME: join(home, ".config"),
    XDG_DATA_HOME: join(home, ".local", "share"),
    XDG_STATE_HOME: join(home, ".local", "state"),
    XDG_CACHE_HOME: join(home, ".cache"),
    OPENCODE_CONFIG_DIR: join(home, ".config", "opencode"),
    ULTRACODE_HOME: join(home, ".local", "share", "ultracode"),
    ULTRACODE_BIN_DIR: join(home, ".local", "bin"),
    ULTRACODE_OPENCODE_BIN: OPENCODE_BIN,
    ULTRACODE_SKIP_BROWSER: "1",
    NO_COLOR: "1",
  };
  return { root, home, project, env };
}

function sh(cmd, { cwd, env } = {}) {
  return execFileAsync("sh", ["-c", cmd], { cwd, env, maxBuffer: 8 * 1024 * 1024 });
}

function tmux(args, options = {}) {
  return execFileAsync("tmux", args, { maxBuffer: 16 * 1024 * 1024, ...options });
}

async function killTmuxSession(name) {
  await execFileAsync("tmux", ["kill-session", "-t", name]).catch(() => {});
}

/** Boot the isolated UltraCode sandbox configuration. */
async function prepareSandbox(box) {
  // Reuse the maintainer's already-downloaded managed runtime read-only (Superpowers,
  // Ralph, Playwright MCP + Chromium) so the captured product state is the healthy
  // post-install state instead of a first-run download screen. Nothing is written there.
  const hostRuntimeHome = join(process.env.HOME || "", ".local", "share", "ultracode");
  for (const entry of ["runtime", "browsers"]) {
    const source = join(hostRuntimeHome, entry);
    const target = join(box.env.ULTRACODE_HOME, entry);
    await execFileAsync("ln", ["-sfn", source, target]).catch(() => {});
  }
  // The MCP server launches `${ULTRACODE_BIN_DIR}/ultracode _mcp`, so expose the
  // standalone binary under the sandbox bin directory the managed config expects.
  await mkdir(box.env.ULTRACODE_BIN_DIR, { recursive: true });
  await execFileAsync("ln", ["-sfn", ULTRACODE_BIN, join(box.env.ULTRACODE_BIN_DIR, "ultracode")]).catch(() => {});

  await execFileAsync(join(box.env.ULTRACODE_BIN_DIR, "ultracode"), ["apply"], { cwd: box.project, env: box.env }).catch(
    (error) => {
      throw new Error(`ultracode apply failed: ${error.stderr || error.message}`);
    },
  );
  await execFileAsync(OPENCODE_BIN, ["service", "set", "port", String(SERVICE_PORT)], { cwd: box.project, env: box.env }).catch(
    () => {},
  );
}

async function startServe(box) {
  const password = randomUUID();
  const child = spawn(OPENCODE_BIN, ["serve", "--hostname", "127.0.0.1", "--port", "0"], {
    cwd: box.project,
    env: { ...box.env, OPENCODE_PASSWORD: password },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = await new Promise((resolveUrl, rejectUrl) => {
    let buffer = "";
    const timer = setTimeout(() => rejectUrl(new Error("Timed out waiting for opencode serve")), 20_000);
    const onData = (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/https?:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolveUrl(match[0]);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("close", (code) => {
      clearTimeout(timer);
      rejectUrl(new Error(`opencode serve exited early (code ${code})`));
    });
  });
  // Warm the location so plugin loading starts before we drive the UI.
  await fetch(`${url}/api/plugin`, {
    headers: { Authorization: `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}` },
  }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 2500));
  return { child, url, password };
}

async function stopServe(server) {
  if (!server) return;
  server.child.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 300));
  server.child.kill("SIGKILL");
}

async function saveWebp(browser, png, target) {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(png, await readFile(png));
  const { stderr } = await execFileAsync("magick", [png, "-quality", "88", "-define", "webp:method=6", target]).catch(
    (error) => {
      throw new Error(`magick failed: ${error.stderr || error.message}`);
    },
  );
  if (stderr && /error/i.test(stderr)) throw new Error(stderr);
  log(`wrote ${target.replace(repoRoot + "/", "")}`);
}

/* ------------------------------------------------------------------ TUI ---- */

const XTERM_HARNESS = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8" />
<link rel="stylesheet" href="/xterm.css" />
<style>
  html,body{margin:0;background:#000}
  #host{display:inline-block;padding:26px 30px 22px;background:#000}
  .xterm .xterm-viewport{background:#000!important}
</style></head>
<body><div id="host"><div id="term"></div></div>
<script src="/xterm.js"></script>
<script>
  window.renderTerminalStream = ({cols,rows,text}) => {
    const term = new Terminal({
      cols, rows, cursorBlink:false, cursorInactiveStyle:'none', convertEol:false,
      fontFamily: "'JetBrains Mono','Noto Sans Mono CJK SC','Noto Sans CJK SC','DejaVu Sans Mono',monospace",
      fontSize: 14, lineHeight: 1.0,
      theme:{background:'#000000',foreground:'#d4d4d4',cursor:'#000000',
        black:'#000000',red:'#e06c75',green:'#98c379',yellow:'#e5a03d',blue:'#61afef',
        magenta:'#c678dd',cyan:'#bae6fd',white:'#e5e5e5',
        brightBlack:'#5c6370',brightRed:'#ef8a92',brightGreen:'#b6e3a0',brightYellow:'#f0b860',
        brightBlue:'#8ac4f5',brightMagenta:'#dba0e8',brightCyan:'#d3f1ff',brightWhite:'#ffffff'}
    });
    term.open(document.getElementById('term'));
    term.write(text, () => { window.__rendered = true; });
    return true;
  };
</script></body></html>`;

async function startXtermHarness(box) {
  const dir = join(box.root, "xterm-harness");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), XTERM_HARNESS);
  const assetDir = process.env.ULTRACODE_CAPTURE_XTERM_ASSETS || dir;
  await execFileAsync("cp", [join(assetDir, "xterm.js"), join(dir, "xterm.js")]);
  await execFileAsync("cp", [join(assetDir, "xterm.css"), join(dir, "xterm.css")]);
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(request) {
      const path = new URL(request.url).pathname;
      const file = Bun.file(join(dir, path === "/" ? "index.html" : path));
      if (await file.exists()) return new Response(file);
      return new Response("not found", { status: 404 });
    },
  });
  return { server, url: `http://127.0.0.1:${server.port}/` };
}

function tmuxEnvArgs(env) {
  return Object.entries(env).flatMap(([key, value]) => [`${key}=${value}`]);
}

async function captureTuiScreen({ chromium, chrome, harness, box, session, name, cols = 120, rows = 34, keys = [] }) {
  await killTmuxSession(session);
  const rawLog = join(box.root, `${name}.ansi`);
  await rm(rawLog, { force: true });

  await tmux([
    "new-session",
    "-d",
    "-s",
    session,
    "-x",
    String(cols),
    "-y",
    String(rows),
    "-c",
    box.project,
    "env",
    "-i",
    ...tmuxEnvArgs(box.env),
    "bash",
    "-lc",
    `"${OPENCODE_BIN}" 2>&1; echo EXIT=$?; sleep 240`,
  ]);
  // Capture the true terminal output stream (not a flattened screen dump) so cursor
  // addressing, the block wordmark and colors survive the replay.
  await tmux(["pipe-pane", "-t", session, "-o", `cat > '${rawLog}'`]).catch(() => {});

  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const screen = (await tmux(["capture-pane", "-t", session, "-p"]).catch(() => ({ stdout: "" }))).stdout;
    if (/Ask anything/i.test(screen) && /UltraBuild|UltraPlan/.test(screen)) {
      ready = true;
      break;
    }
  }
  if (!ready) log(`warning: ${name} did not reach a steady TUI state`);

  // Let post-boot MCP/browser negotiation settle so the status line is stable.
  await new Promise((resolve) => setTimeout(resolve, 4000));

  for (const key of keys) {
    await tmux(["send-keys", "-t", session, key]);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  // A clear-screen request makes OpenTUI repaint the whole frame into the raw log.
  await tmux(["send-keys", "-t", session, "C-l"]).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 1600));
  await tmux(["pipe-pane", "-t", session]).catch(() => {});
  await killTmuxSession(session);

  const stream = await readFile(rawLog, "utf8").catch(() => "");
  if (!stream.trim()) throw new Error(`No terminal output captured for ${name}`);

  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    await page.goto(harness.url, { waitUntil: "load" });
    await page.evaluate((payload) => window.renderTerminalStream(payload), { cols, rows, text: stream });
    await page.waitForFunction(() => window.__rendered === true, null, { timeout: 15_000 });
    await page.waitForTimeout(400);
    const png = join(box.root, `${name}.png`);
    await page.locator("#host").screenshot({ path: png });
    await saveWebp(null, png, join(outDir, `${name}.webp`));
  } finally {
    await browser.close();
  }
}

/* ------------------------------------------------------------------ GUI ---- */

async function guiContext({ chromium, chrome, server, locale = "zh-CN", viewport }) {
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: "dark",
    locale,
    httpCredentials: { username: "opencode", password: server.password },
  });
  const page = await context.newPage();
  await page.goto(server.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const passwordLink = page.getByText("使用密码");
  if (await passwordLink.count()) {
    await passwordLink.click();
    await page.waitForTimeout(250);
    await page.locator('input[type="password"]').fill(server.password);
    await page.getByRole("button", { name: "连接" }).click();
    await page.waitForTimeout(1500);
  }
  return { browser, context, page };
}

async function openProject(page, box) {
  const addProject = page.getByRole("button", { name: "添加项目" }).first();
  if (await addProject.count()) {
    await addProject.click();
    await page.waitForTimeout(600);
    const search = page.getByPlaceholder("搜索项目或输入 ~/路径…");
    if (await search.count()) {
      await search.fill(box.project);
      await page.waitForTimeout(500);
      const pick = page.getByRole("button", { name: "选择文件夹" });
      if (await pick.count()) await pick.click();
      await page.waitForTimeout(1500);
    }
  }
}

async function shoot(page, box, name) {
  const png = join(box.root, `${name}.png`);
  await page.screenshot({ path: png });
  await saveWebp(null, png, join(outDir, `${name}.webp`));
}

async function captureGui({ chromium, chrome, server, box }) {
  const { browser, page } = await guiContext({ chromium, chrome, server, viewport: { width: 1280, height: 800 } });
  try {
    await shoot(page, box, "desktop-home");
    await openProject(page, box);
    await shoot(page, box, "desktop-project-added");

    const newSession = page.getByRole("button", { name: "新建会话" }).first();
    if (await newSession.count()) {
      await newSession.click();
      await page.waitForTimeout(1800);
      await shoot(page, box, "desktop-composer");
    }
  } finally {
    await browser.close();
  }
}

async function captureMobile({ chromium, chrome, server, box }) {
  const { browser, page } = await guiContext({
    chromium,
    chrome,
    server,
    viewport: { width: 390, height: 844 },
  });
  try {
    await page.waitForTimeout(1200);
    await shoot(page, box, "mobile-home");
    await openProject(page, box);
    const newSession = page.getByRole("button", { name: "新建会话" }).first();
    if (await newSession.count()) {
      await newSession.click();
      await page.waitForTimeout(1800);
      await shoot(page, box, "mobile-composer");
    }
  } finally {
    await browser.close();
  }
}

/* ----------------------------------------------------------------- main ---- */

const box = await makeSandbox();
let serve;
let harness;
let chromium;
let chrome;

try {
  await mkdir(outDir, { recursive: true });
  await prepareSandbox(box);
  ({ chromium } = await resolvePlaywright());
  chrome = await resolveChrome();
  log(`sandbox ${box.root}`);
  log(`opencode ${OPENCODE_BIN}`);

  if (only === "tui" || only === "all") {
    const xtermDir = join(repoRoot, "website", "node_modules", "@xterm", "xterm");
    const assetsDir = join(box.root, "xterm-assets");
    await mkdir(assetsDir, { recursive: true });
    await execFileAsync("cp", [join(xtermDir, "lib", "xterm.js"), join(assetsDir, "xterm.js")]);
    await execFileAsync("cp", [join(xtermDir, "css", "xterm.css"), join(assetsDir, "xterm.css")]);
    process.env.ULTRACODE_CAPTURE_XTERM_ASSETS = assetsDir;
    harness = await startXtermHarness(box);

    await captureTuiScreen({ chromium, chrome, harness, box, session: "uc-shot-welcome", name: "terminal-welcome" });
    await captureTuiScreen({
      chromium,
      chrome,
      harness,
      box,
      session: "uc-shot-plan",
      name: "terminal-plan-mode",
      keys: ["BTab"],
    });
    await captureTuiScreen({
      chromium,
      chrome,
      harness,
      box,
      session: "uc-shot-commands",
      name: "terminal-commands",
      keys: ["C-p"],
    });
  }

  if (only === "gui" || only === "mobile" || only === "all") {
    serve = await startServe(box);
    log(`serve ${serve.url}`);
    if (only === "gui" || only === "all") await captureGui({ chromium, chrome, server: serve, box });
    if (only === "mobile" || only === "all") await captureMobile({ chromium, chrome, server: serve, box });
  }
} finally {
  await stopServe(serve);
  if (harness?.server) harness.server.stop(true);
  await execFileAsync(OPENCODE_BIN, ["service", "stop"], { env: box.env }).catch(() => {});
  await rm(box.root, { recursive: true, force: true }).catch(() => {});
}
