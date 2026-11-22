import { homedir } from "node:os"
import { join } from "node:path"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"

const defaults = { permissions: "auto", direction: "manual" }

function directory() {
  if (process.env.ULTRACODE_HOME) return process.env.ULTRACODE_HOME
  if (process.platform === "win32") {
    return join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "ultracode")
  }
  return join(process.env.XDG_DATA_HOME || join(homedir(), ".local/share"), "ultracode")
}

export async function mode(key) {
  const fallback = defaults[key] ?? "manual"
  try {
    const value = (await readFile(join(directory(), key + ".mode"), "utf8")).trim()
    return value === "auto" || value === "manual" ? value : fallback
  } catch (error) {
    if (error.code === "ENOENT") return fallback
    throw error
  }
}

export async function getAll() {
  const [permissions, direction] = await Promise.all([mode("permissions"), mode("direction")])
  return { permissions, direction }
}

export async function set(key, value) {
  const normalized = value === "auto" ? "auto" : "manual"
  const dir = directory()
  await mkdir(dir, { recursive: true })
  const target = join(dir, key + ".mode")
  const temporary = target + "." + randomUUID()
  await writeFile(temporary, normalized, { mode: 0o600 })
  await rename(temporary, target)
  return normalized
}

export async function toggle(key) {
  const next = (await mode(key)) === "auto" ? "manual" : "auto"
  return set(key, next)
}
