import { exists, readText, atomicWrite } from "./fs";
import type { Paths } from "./paths";

import type { Addition } from "./config";

export interface InstallManifest {
  schema: 1 | 2;
  configFile?: string;
  owned?: Addition[];
  version: string;
  files: Record<string, string>;
  installedAt: string;
}

export async function readManifest(paths: Paths): Promise<InstallManifest | null> {
  if (!(await exists(paths.manifest))) return null;
  return JSON.parse(await readText(paths.manifest)) as InstallManifest;
}

export async function writeManifest(paths: Paths, version: string, files: Record<string, string>, configFile: string, owned: Addition[]): Promise<void> {
  const manifest: InstallManifest = { schema: 2, configFile, owned, version, files, installedAt: new Date().toISOString() };
  await atomicWrite(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
}
