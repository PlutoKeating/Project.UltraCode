import { createHash } from "node:crypto";
import { chmod, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, win32 } from "node:path";

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function ensureParent(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

export async function atomicWrite(path: string, content: string | Uint8Array, mode = 0o644): Promise<void> {
  await ensureParent(path);
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, content, { mode });
  await rename(temporary, path);
}

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export function sha256(content: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function backup(path: string, directory: string): Promise<string | null> {
  if (!(await exists(path))) return null;
  const name = path.includes("\\") ? win32.basename(path) : basename(path);
  const target = join(directory, `${Date.now()}-${name}`);
  await ensureParent(target);
  await writeFile(target, await readFile(path));
  return target;
}

export async function makeExecutable(path: string): Promise<void> {
  if (process.platform === "win32") return;
  await chmod(path, 0o755);
}

export async function sweepOldBinaries(target: string): Promise<void> {
  const dir = dirname(target);
  const base = target.includes("\\") ? win32.basename(target) : basename(target);
  const entries = await readdir(dir).catch(() => [] as string[]);
  for (const entry of entries) {
    if (entry === `${base}.old` || entry.startsWith(`${base}.old-`)) {
      await rm(join(dir, entry), { force: true }).catch(() => {});
    }
  }
}

export async function replaceBinary(
  target: string,
  data: Uint8Array,
  platform: NodeJS.Platform = process.platform,
): Promise<void> {
  await ensureParent(target);
  let movedOld: string | null = null;
  if (platform === "win32") {
    await sweepOldBinaries(target);
    if (await exists(target)) {
      movedOld = `${target}.old-${process.pid}-${Date.now()}`;
      await rename(target, movedOld);
    }
  }
  try {
    await atomicWrite(target, data, 0o755);
  } catch (error) {
    if (movedOld && !(await exists(target))) {
      await rename(movedOld, target).catch(() => {});
    }
    throw error;
  }
  if (platform !== "win32") await chmod(target, 0o755);
  if (platform === "win32") {
    await sweepOldBinaries(target);
  }
}
