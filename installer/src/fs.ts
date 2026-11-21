import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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

export function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function backup(path: string, directory: string): Promise<string | null> {
  if (!(await exists(path))) return null;
  const target = join(directory, `${Date.now()}-${path.split("/").pop()}`);
  await ensureParent(target);
  await writeFile(target, await readFile(path));
  return target;
}

export async function makeExecutable(path: string): Promise<void> {
  await chmod(path, 0o755);
}
