import { join } from "node:path";
import { atomicWrite, ensureParent, makeExecutable, sha256 } from "./fs";
import { run } from "./opencode";
import type { Paths } from "./paths";

const REPOSITORY = "PlutoKeating/Project.UltraCode";

interface ReleaseAsset { name: string; browser_download_url: string }
interface Release { tag_name: string; assets: ReleaseAsset[] }

function target(): string {
  const platform = process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  return `${platform}-${arch}`;
}

async function curl(url: string, output?: string): Promise<string> {
  const args = ["-fsSL", "-H", "User-Agent: ultracode-installer", url];
  if (output) args.push("-o", output);
  const result = await run("curl", args);
  if (result.code !== 0) throw new Error(`Download failed: ${url}: ${result.stderr}`);
  return output ? output : result.stdout;
}

export async function updateSelf(paths: Paths): Promise<string> {
  const response = await curl(`https://api.github.com/repos/${REPOSITORY}/releases/latest`);
  const release = JSON.parse(response) as Release;
  const name = `ultracode-${target()}`;
  const binary = release.assets.find((asset) => asset.name === name);
  const checksum = release.assets.find((asset) => asset.name === `${name}.sha256`);
  if (!binary || !checksum) throw new Error(`Release ${release.tag_name} has no artifact for ${target()}`);
  const dataPath = join(paths.home, "downloads", `release-${name}`);
  await ensureParent(dataPath);
  const checksumText = await curl(checksum.browser_download_url);
  await curl(binary.browser_download_url, dataPath);
  const data = Buffer.from(await Bun.file(dataPath).arrayBuffer());
  const expected = checksumText.trim().split(/\s+/)[0];
  if (!expected || sha256(data) !== expected) throw new Error("UltraCode release checksum verification failed");
  await atomicWrite(paths.binary, data, 0o755);
  await makeExecutable(paths.binary);
  return release.tag_name;
}

export async function upgradeOpenCode(paths: Paths): Promise<void> {
  const result = await run(paths.opencodeBinary, ["upgrade"], { inherit: true });
  if (result.code !== 0) throw new Error("The official OpenCode upgrade command failed");
}
