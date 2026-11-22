import { replaceBinary, sha256 } from "./fs";
import { ensureOpenCode } from "./opencode";
import type { Paths } from "./paths";

const REPOSITORY = "PlutoKeating/Project.UltraCode";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}
interface Release {
  tag_name: string;
  assets: ReleaseAsset[];
}

function artifactName(platform: NodeJS.Platform = process.platform, arch: string = process.arch): string {
  const os = platform === "win32" ? "windows" : platform === "darwin" ? "darwin" : "linux";
  const cpu = arch === "arm64" ? "arm64" : "x64";
  const ext = os === "windows" ? ".exe" : "";
  return `ultracode-${os}-${cpu}${ext}`;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { headers: { "User-Agent": "ultracode-installer" } });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": "ultracode-installer" } });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return response.text();
}

export async function updateSelf(paths: Paths): Promise<string> {
  const name = artifactName();
  let binaryUrl: string;
  let checksumUrl: string;
  let tag: string;

  if (process.env.ULTRACODE_RELEASE_BASE_URL) {
    const base = process.env.ULTRACODE_RELEASE_BASE_URL.replace(/\/+$/, "");
    binaryUrl = `${base}/${name}`;
    checksumUrl = `${base}/${name}.sha256`;
    tag = process.env.ULTRACODE_VERSION || "latest";
  } else {
    const repo = process.env.ULTRACODE_REPOSITORY || REPOSITORY;
    const release = JSON.parse(await fetchText(`https://api.github.com/repos/${repo}/releases/latest`)) as Release;
    const binary = release.assets.find((asset) => asset.name === name);
    const checksum = release.assets.find((asset) => asset.name === `${name}.sha256`);
    if (!binary || !checksum) throw new Error(`Release ${release.tag_name} has no artifact for ${name}`);
    binaryUrl = binary.browser_download_url;
    checksumUrl = checksum.browser_download_url;
    tag = release.tag_name;
  }

  const [checksumText, data] = await Promise.all([fetchText(checksumUrl), fetchBytes(binaryUrl)]);
  const expected = checksumText.trim().split(/\s+/)[0];
  if (!expected || sha256(data) !== expected) throw new Error("UltraCode release checksum verification failed");
  await replaceBinary(paths.binary, data);
  return tag;
}

export async function upgradeOpenCode(paths: Paths): Promise<void> {
  await ensureOpenCode(paths, { installIfMissing: true, upgradeIfPresent: true });
}
