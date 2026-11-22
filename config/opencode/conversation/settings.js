import { homedir } from "node:os"
import { join } from "node:path"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"

const directory = process.env.ULTRACODE_HOME || join(process.env.XDG_DATA_HOME || join(homedir(), ".local/share"), "ultracode")
const defaults = { permissions: "auto", direction: "manual" }

export async function mode(key) {
  try {
    const value = await readFile(join(directory, key + ".mode"), "utf8")
    return value === "auto" ? "auto" : "manual"
  } catch (error) {
    if (error.code === "ENOENT") return defaults[key]
    throw error
  }
}

export async function toggle(key) {
  const value = await mode(key) === "auto" ? "manual" : "auto"
  await mkdir(directory, { recursive: true })
  const target = join(directory, key + ".mode")
  const temporary = target + "." + randomUUID()
  await writeFile(temporary, value, { mode: 0o600 })
  await rename(temporary, target)
  return value
}
