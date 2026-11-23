import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { exists, sha256 } from "../src/fs";
import { run } from "../src/opencode";

describe.skipIf(process.platform === "win32")("install.sh minimalist zero-prereq flow", () => {
  test("handles opencode upgrade fallback, installs ultracode without uc, updates PATH idempotently, and renders minimal output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-install-sh-"));
    const scriptPath = fileURLToPath(new URL("../../../scripts/install.sh", import.meta.url));
    const mockUltracode = `#!/bin/sh
case "$1" in
  version) printf 'v1.0.0\\n';;
  apply) printf 'noisy apply log line\\n';;
  doctor) printf 'noisy doctor log line\\n';;
esac
exit 0
`;
    const hash = sha256(mockUltracode);
    const server = createServer((req, res) => {
      if (req.url?.endsWith(".sha256")) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(`${hash}  artifact\n`);
        return;
      }
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end(mockUltracode);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const home = join(dir, "home");
      const mockBin = join(dir, "mock-bin");
      await mkdir(home, { recursive: true });
      await mkdir(mockBin, { recursive: true });
      await writeFile(join(home, ".zshrc"), "# existing zshrc\n");
      const fakeOpenCode = join(mockBin, "opencode");
      await writeFile(
        fakeOpenCode,
        `#!/bin/sh
if [ "$1" = "--version" ]; then
  printf 'opencode v2.3.2\\n'
  exit 0
fi
if [ "$1" = "upgrade" ]; then
  printf 'simulated homebrew upgrade error\\n' >&2
  exit 1
fi
exit 0
`,
        { mode: 0o755 },
      );

      const env: NodeJS.ProcessEnv = {
        ...process.env,
        HOME: home,
        SHELL: "/bin/zsh",
        PATH: `${mockBin}:/usr/bin:/bin`,
        ULTRACODE_RELEASE_BASE_URL: `http://127.0.0.1:${port}`,
        ULTRACODE_OPENCODE_BIN: fakeOpenCode,
        ULTRACODE_SKIP_RUNTIME: "1",
        NO_COLOR: "1",
      };

      const first = await run("bash", [scriptPath], { env });
      expect(first.code).toBe(0);
      expect(first.stdout).toContain("UltraCode 1.0.0");
      expect(first.stdout).toContain("✓ Ready");
      expect(first.stdout).toContain("ultracode");
      expect(first.stdout).toContain("ultracode desktop");
      expect(first.stdout).toContain("ultracode pair");
      expect(first.stdout).not.toContain("noisy apply log line");
      expect(first.stdout).not.toMatch(/\buc\b/);
      expect(await exists(join(home, ".local", "bin", "ultracode"))).toBe(true);
      expect(await exists(join(home, ".local", "bin", "uc"))).toBe(false);

      const second = await run("bash", [scriptPath], { env });
      expect(second.code).toBe(0);
      const zshrc = await readFile(join(home, ".zshrc"), "utf8");
      const matches = zshrc.split("\n").filter((line) => line.includes(".local/bin"));
      expect(matches.length).toBe(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("auto-installs OpenCode when missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-install-sh-fresh-"));
    const scriptPath = fileURLToPath(new URL("../../../scripts/install.sh", import.meta.url));
    const mockUltracode = "#!/bin/sh\nif [ \"$1\" = \"version\" ]; then printf '1.0.0\\n'; fi\nexit 0\n";
    const hash = sha256(mockUltracode);
    const server = createServer((req, res) => {
      if (req.url?.endsWith(".sha256")) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(`${hash}  artifact\n`);
        return;
      }
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end(mockUltracode);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const home = join(dir, "home");
      await mkdir(home, { recursive: true });
      const installCmd = `mkdir -p "$HOME/.opencode/bin" && printf '#!/bin/sh\\nprintf "opencode v2.3.2\\\\n"\\n' > "$HOME/.opencode/bin/opencode" && chmod +x "$HOME/.opencode/bin/opencode"`;
      const res = await run("bash", [scriptPath], {
        env: {
          ...process.env,
          HOME: home,
          SHELL: "/bin/bash",
          PATH: "/usr/bin:/bin",
          ULTRACODE_RELEASE_BASE_URL: `http://127.0.0.1:${port}`,
          ULTRACODE_OPENCODE_INSTALL_CMD: installCmd,
          ULTRACODE_SKIP_RUNTIME: "1",
          NO_COLOR: "1",
        },
      });
      expect(res.code).toBe(0);
      expect(await exists(join(home, ".opencode", "bin", "opencode"))).toBe(true);
      expect(await exists(join(home, ".local", "bin", "ultracode"))).toBe(true);
      expect(res.stdout).toContain("✓ Ready");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("survives curl | bash when opencode upgrade reads from stdin", async () => {
    const dir = await mkdtemp(join(tmpdir(), "uc-install-sh-pipe-"));
    const scriptPath = fileURLToPath(new URL("../../../scripts/install.sh", import.meta.url));
    const scriptContent = await readFile(scriptPath, "utf8");
    const mockUltracode = `#!/bin/sh
case "$1" in
  version) printf 'v1.0.0\\n';;
  apply) printf 'apply ok\\n';;
  doctor) printf 'doctor ok\\n';;
esac
exit 0
`;
    const hash = sha256(mockUltracode);
    let requestedBinary = false;
    const server = createServer((req, res) => {
      if (req.url?.endsWith(".sha256")) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(`${hash}  artifact\n`);
        return;
      }
      requestedBinary = true;
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end(mockUltracode);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const home = join(dir, "home");
      const mockBin = join(dir, "mock-bin");
      await mkdir(home, { recursive: true });
      await mkdir(mockBin, { recursive: true });
      const fakeOpenCode = join(mockBin, "opencode");
      await writeFile(
        fakeOpenCode,
        `#!/bin/sh
if [ "$1" = "--version" ]; then
  printf 'opencode v2.3.2\\n'
  exit 0
fi
if [ "$1" = "upgrade" ]; then
  cat >/dev/null
  printf 'Done\\n'
  exit 0
fi
exit 0
`,
        { mode: 0o755 },
      );

      const res = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
        const child = spawn("bash", [], {
          env: {
            ...process.env,
            HOME: home,
            SHELL: "/bin/zsh",
            PATH: `${mockBin}:/usr/bin:/bin`,
            ULTRACODE_RELEASE_BASE_URL: `http://127.0.0.1:${port}`,
            ULTRACODE_OPENCODE_BIN: fakeOpenCode,
            ULTRACODE_SKIP_RUNTIME: "1",
            NO_COLOR: "1",
          },
          stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        child.on("error", reject);
        child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
        child.stdin.end(scriptContent);
      });

      expect(res.code).toBe(0);
      expect(requestedBinary).toBe(true);
      expect(await exists(join(home, ".local", "bin", "ultracode"))).toBe(true);
      expect(res.stdout).toContain("UltraCode 1.0.0");
      expect(res.stdout).toContain("✓ Ready");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  });
});
