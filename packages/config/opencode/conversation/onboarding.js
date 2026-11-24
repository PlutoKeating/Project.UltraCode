import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

export const ULTRACODE_MANAGED_ROLES = [
  "UltraPlan",
  "UltraBuild",
  "ultracode/architect",
  "ultracode/implementer",
  "ultracode/librarian",
  "ultracode/reviewer",
  "ultracode/visual-evaluator",
]

export function extractModels(raw) {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.data)) return raw.data
    if (Array.isArray(raw.models)) return raw.models
    if (Array.isArray(raw.items)) return raw.items
  }
  return []
}

function scoreModel(model) {
  const provider = String(model.providerID || "").trim()
  const id = String(model.id || model.modelID || "").trim()
  const full = `${provider}/${id}`
  const hay = `${provider} ${id} ${model.name || ""} ${model.family || ""}`.toLowerCase()
  const caps = model.capabilities && typeof model.capabilities === "object" ? model.capabilities : {}
  const compat = model.compatibility && typeof model.compatibility === "object" ? model.compatibility : {}

  const isLight =
    /(?:^|[-_/. ])(haiku|mini|nano|flash|lite|hydrogen|argon|small|instant|turbo|7b|8b)(?:$|[-_/. 0-9])/i.test(hay)
  const isUltraLight = /(?:^|[-_/. ])(nano|lite|argon|flash-lite|3b|1b)(?:$|[-_/. 0-9])/i.test(hay)
  const isBalancedFast = /(?:^|[-_/. ])(haiku|flash(?!-lite)|mini|hydrogen|instant)(?:$|[-_/. 0-9])/i.test(hay)
  const isDeepFlagship =
    /(?:^|[-_/. ])(opus|carbon|pro|ultra|o1|o3|o4|reasoner|r1|thinking|gpt-6(?!.*(?:mini|nano|codex))|gpt-5(?!.*(?:mini|nano|codex)))(?:$|[-_/. 0-9])/i.test(
      hay,
    )
  const isCodingWorkhorse = /(?:^|[-_/. ])(sonnet|codex|neon|coder|swe)(?:$|[-_/. 0-9])/i.test(hay)
  const hasReasoning =
    caps.reasoning === true ||
    caps.thinking === true ||
    Boolean(compat.reasoningField) ||
    Boolean(caps.reasoning && typeof caps.reasoning === "object" && caps.reasoning.supported === true)
  const hasInputArray = Array.isArray(caps.input)
  const hasVision =
    (hasInputArray && caps.input.includes("image")) ||
    caps.vision === true ||
    caps.image === true ||
    caps.multimodal === true ||
    (!hasInputArray && caps.input && typeof caps.input === "object" && caps.input.image === true)
  const lacksVision =
    (hasInputArray && !caps.input.includes("image")) ||
    ("vision" in caps && caps.vision === false) ||
    /(deepseek-r1|deepseek-coder|o1-mini|o3-mini|argon)/i.test(hay)

  let deep = 10
  if (isDeepFlagship) deep += 55
  if (hasReasoning) deep += 35
  if (isCodingWorkhorse) deep += 25
  if (isLight) deep -= 40

  let coding = 10
  if (isCodingWorkhorse) coding += 60
  if (isDeepFlagship) coding += 40
  if (isLight) coding -= 30
  if (isUltraLight) coding -= 20

  let fast = 10
  if (isBalancedFast) fast += 65
  else if (isLight) fast += 50
  if (isCodingWorkhorse) fast += 20
  if (isDeepFlagship) fast -= 15

  let visual = 10
  if (hasVision) visual += 40
  if (/(sonnet|neon|gpt-4o)/i.test(hay)) visual += 35
  else if (/(opus|carbon|gemini|gpt-6|gpt-5|vision|vl|pixtral)/i.test(hay)) visual += 30
  if (isUltraLight) visual -= 25
  if (lacksVision) visual -= 60

  return { full, deep, coding, fast, visual }
}

export function recommendRoleModels(rawModels) {
  const list = extractModels(rawModels)
  const seen = new Set()
  const candidates = []

  for (const m of list) {
    if (!m || typeof m !== "object") continue
    if (m.enabled === false) continue
    if (m.status === "deprecated") continue
    if (m.type && !["chat", "language", "llm"].includes(String(m.type).toLowerCase())) continue
    const providerID = String(m.providerID || "").trim()
    const id = String(m.id || m.modelID || "").trim()
    if (!providerID || !id) continue
    const key = `${providerID}/${id}`
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push(m)
  }

  if (candidates.length < 2) return null

  const scored = candidates.map(scoreModel)
  const pickBest = (field) =>
    [...scored].sort((a, b) => b[field] - a[field])[0].full

  const deep = pickBest("deep")
  const coding = pickBest("coding")
  const fast = pickBest("fast")
  const visual = pickBest("visual")

  return {
    deep,
    coding,
    fast,
    visual,
    roles: {
      UltraPlan: deep,
      "ultracode/architect": deep,
      "ultracode/reviewer": deep,
      UltraBuild: coding,
      "ultracode/implementer": coding,
      "ultracode/librarian": fast,
      "ultracode/visual-evaluator": visual,
    },
  }
}

// Zero-dependency comment-preserving JSONC parser & surgical agents.<role>.model editor
function skipTrivia(text, idx) {
  const len = text.length
  let i = idx
  while (i < len) {
    const ch = text[i]
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      i += 1
      continue
    }
    if (ch === "/" && text[i + 1] === "/") {
      i += 2
      while (i < len && text[i] !== "\n") i += 1
      continue
    }
    if (ch === "/" && text[i + 1] === "*") {
      i += 2
      while (i < len && !(text[i] === "*" && text[i + 1] === "/")) i += 1
      if (i < len) i += 2
      continue
    }
    break
  }
  return i
}

function parseStringToken(text, start) {
  let i = start + 1
  let value = ""
  while (i < text.length) {
    const ch = text[i]
    if (ch === "\\") {
      const next = text[i + 1]
      if (next === '"' || next === "\\" || next === "/") value += next
      else if (next === "n") value += "\n"
      else if (next === "r") value += "\r"
      else if (next === "t") value += "\t"
      else if (next === "u") {
        value += String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16) || 0)
        i += 4
      } else value += next || ""
      i += 2
      continue
    }
    if (ch === '"') {
      return { type: "string", start, end: i + 1, value }
    }
    value += ch
    i += 1
  }
  throw new Error("Unterminated string in JSONC")
}

function parseValueNode(text, idx) {
  const i = skipTrivia(text, idx)
  if (i >= text.length) throw new Error("Unexpected EOF in JSONC")
  const ch = text[i]
  if (ch === '"') return parseStringToken(text, i)
  if (ch === "{") {
    const props = []
    let p = skipTrivia(text, i + 1)
    while (p < text.length && text[p] !== "}") {
      if (text[p] !== '"') throw new Error("Expected property name in JSONC object")
      const keyTok = parseStringToken(text, p)
      let afterKey = skipTrivia(text, keyTok.end)
      if (text[afterKey] !== ":") throw new Error("Expected ':' in JSONC object")
      const valNode = parseValueNode(text, afterKey + 1)
      let afterVal = skipTrivia(text, valNode.end)
      let commaIndex = null
      if (text[afterVal] === ",") {
        commaIndex = afterVal
        afterVal = skipTrivia(text, afterVal + 1)
      }
      props.push({
        key: keyTok.value,
        start: keyTok.start,
        end: valNode.end,
        commaIndex,
        value: valNode,
      })
      p = afterVal
    }
    if (text[p] !== "}") throw new Error("Expected '}' in JSONC object")
    return { type: "object", start: i, closeBrace: p, end: p + 1, props }
  }
  if (ch === "[") {
    const items = []
    let p = skipTrivia(text, i + 1)
    while (p < text.length && text[p] !== "]") {
      const item = parseValueNode(text, p)
      items.push(item)
      p = skipTrivia(text, item.end)
      if (text[p] === ",") p = skipTrivia(text, p + 1)
    }
    if (text[p] !== "]") throw new Error("Expected ']' in JSONC array")
    return { type: "array", start: i, end: p + 1, items }
  }
  let end = i
  while (end < text.length && !/[\s,}\]/]/.test(text[end])) end += 1
  const raw = text.slice(i, end)
  let value = raw
  if (raw === "true") value = true
  else if (raw === "false") value = false
  else if (raw === "null") value = null
  else if (!Number.isNaN(Number(raw))) value = Number(raw)
  return { type: "primitive", start: i, end, value }
}

export function parseJsoncLoose(text) {
  const trimmed = String(text || "").trim()
  if (!trimmed) return {}
  const node = parseValueNode(text, 0)
  function materialize(n) {
    if (n.type === "object") {
      const out = {}
      for (const prop of n.props) out[prop.key] = materialize(prop.value)
      return out
    }
    if (n.type === "array") return n.items.map(materialize)
    return n.value
  }
  return materialize(node)
}

export function hasConfiguredRoleModels(configText) {
  try {
    const parsed = parseJsoncLoose(configText)
    const agents = parsed && typeof parsed === "object" && parsed.agents && typeof parsed.agents === "object" ? parsed.agents : null
    if (!agents) return false
    return ULTRACODE_MANAGED_ROLES.some((role) => {
      const entry = agents[role]
      return Boolean(entry && typeof entry === "object" && typeof entry.model === "string" && entry.model.trim())
    })
  } catch {
    return false
  }
}

function insertObjectProperty(text, objNode, key, rawJsonValue, indent) {
  if (objNode.props.length === 0) {
    const inner = text.slice(objNode.start + 1, objNode.closeBrace)
    if (!inner.trim()) {
      const parentIndent = indent.length >= 2 ? indent.slice(2) : ""
      return (
        text.slice(0, objNode.start + 1) +
        `\n${indent}${JSON.stringify(key)}: ${rawJsonValue}\n${parentIndent}` +
        text.slice(objNode.closeBrace)
      )
    }
    return (
      text.slice(0, objNode.start + 1) +
      `\n${indent}${JSON.stringify(key)}: ${rawJsonValue}` +
      text.slice(objNode.start + 1)
    )
  }
  const last = objNode.props[objNode.props.length - 1]
  if (last.commaIndex !== null) {
    return (
      text.slice(0, last.commaIndex + 1) +
      `\n${indent}${JSON.stringify(key)}: ${rawJsonValue}` +
      text.slice(last.commaIndex + 1)
    )
  }
  return (
    text.slice(0, last.end) +
    `,\n${indent}${JSON.stringify(key)}: ${rawJsonValue}` +
    text.slice(last.end)
  )
}

function removeObjectProperty(text, objNode, propIndex) {
  const prop = objNode.props[propIndex]
  let removeStart = prop.start
  // Also absorb leading horizontal whitespace and preceding newline on the same line
  while (removeStart > objNode.start + 1 && (text[removeStart - 1] === " " || text[removeStart - 1] === "\t")) {
    removeStart -= 1
  }
  if (removeStart > objNode.start + 1 && text[removeStart - 1] === "\n") {
    removeStart -= 1
    if (removeStart > objNode.start + 1 && text[removeStart - 1] === "\r") removeStart -= 1
  }

  let removeEnd = prop.commaIndex !== null ? prop.commaIndex + 1 : prop.end
  if (prop.commaIndex === null && propIndex > 0) {
    const prev = objNode.props[propIndex - 1]
    if (prev.commaIndex !== null) {
      return text.slice(0, prev.commaIndex) + text.slice(prev.commaIndex + 1, removeStart) + text.slice(removeEnd)
    }
  }
  return text.slice(0, removeStart) + text.slice(removeEnd)
}

export function applyRoleModelPreferencesJsonc(existingConfigText, roleModels) {
  let text = String(existingConfigText || "").trim() ? String(existingConfigText) : "{\n}\n"

  if (roleModels === "inherit") {
    for (const role of ULTRACODE_MANAGED_ROLES) {
      const root = parseValueNode(text, 0)
      if (root.type !== "object") break
      const agentsProp = root.props.find((p) => p.key === "agents")
      if (!agentsProp || agentsProp.value.type !== "object") break
      const roleIdx = agentsProp.value.props.findIndex((p) => p.key === role)
      if (roleIdx < 0) continue
      const roleProp = agentsProp.value.props[roleIdx]
      if (roleProp.value.type !== "object") continue
      const modelIdx = roleProp.value.props.findIndex((p) => p.key === "model")
      if (modelIdx < 0) continue
      if (roleProp.value.props.length === 1) {
        text = removeObjectProperty(text, agentsProp.value, roleIdx)
      } else {
        text = removeObjectProperty(text, roleProp.value, modelIdx)
      }
    }
    const finalRoot = parseValueNode(text, 0)
    if (finalRoot.type === "object") {
      const agentsIdx = finalRoot.props.findIndex((p) => p.key === "agents")
      if (agentsIdx >= 0) {
        const agentsObj = finalRoot.props[agentsIdx].value
        if (
          agentsObj.type === "object" &&
          agentsObj.props.length === 0 &&
          !text.slice(agentsObj.start + 1, agentsObj.closeBrace).includes("//") &&
          !text.slice(agentsObj.start + 1, agentsObj.closeBrace).includes("/*")
        ) {
          text = removeObjectProperty(text, finalRoot, agentsIdx)
        }
      }
    }
    return text.endsWith("\n") ? text : `${text}\n`
  }

  // Ensure root.agents exists
  {
    const root = parseValueNode(text, 0)
    if (root.type === "object" && !root.props.some((p) => p.key === "agents")) {
      text = insertObjectProperty(text, root, "agents", "{\n  }", "  ")
    }
  }

  for (const [role, modelSpec] of Object.entries(roleModels || {})) {
    if (!modelSpec) continue
    const root = parseValueNode(text, 0)
    if (root.type !== "object") break
    const agentsProp = root.props.find((p) => p.key === "agents")
    if (!agentsProp || agentsProp.value.type !== "object") break
    const roleProp = agentsProp.value.props.find((p) => p.key === role)
    if (!roleProp) {
      text = insertObjectProperty(
        text,
        agentsProp.value,
        role,
        `{ "model": ${JSON.stringify(modelSpec)} }`,
        "    ",
      )
    } else if (roleProp.value.type === "object") {
      const modelProp = roleProp.value.props.find((p) => p.key === "model")
      if (modelProp) {
        text =
          text.slice(0, modelProp.value.start) +
          JSON.stringify(modelSpec) +
          text.slice(modelProp.value.end)
      } else {
        text = insertObjectProperty(roleProp.value ? text : text, roleProp.value, "model", JSON.stringify(modelSpec), "      ")
      }
    }
  }

  return text.endsWith("\n") ? text : `${text}\n`
}

export function resolveUltraCodeHome(env = process.env) {
  if (env.ULTRACODE_HOME) return env.ULTRACODE_HOME
  if (process.platform === "win32") {
    return join(env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "ultracode")
  }
  return join(env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "ultracode")
}

export function resolveOpenCodeConfigDir(env = process.env) {
  if (env.OPENCODE_CONFIG_DIR) return env.OPENCODE_CONFIG_DIR
  const configHome = env.XDG_CONFIG_HOME || join(env.USERPROFILE || env.HOME || homedir(), ".config")
  return join(configHome, "opencode")
}

export async function resolveOpenCodeConfigFile(env = process.env) {
  const dir = resolveOpenCodeConfigDir(env)
  const jsonc = join(dir, "opencode.jsonc")
  try {
    await readFile(jsonc, "utf8")
    return jsonc
  } catch {
    // check opencode.json next
  }
  const json = join(dir, "opencode.json")
  try {
    await readFile(json, "utf8")
    return json
  } catch {
    return jsonc
  }
}

export async function writeConfigAtomically(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true })
  const tmp = `${filePath}.tmp-${randomUUID()}`
  try {
    await writeFile(tmp, content, "utf8")
    await rename(tmp, filePath)
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {})
    throw err
  }
}

export async function readOnboardingState(env = process.env) {
  const target = join(resolveUltraCodeHome(env), "onboarding.json")
  try {
    return JSON.parse(await readFile(target, "utf8"))
  } catch {
    return null
  }
}

export async function markModelRoutingGuided(reason = "shown", env = process.env) {
  const target = join(resolveUltraCodeHome(env), "onboarding.json")
  const existing = (await readOnboardingState(env)) || {}
  const next = {
    ...existing,
    modelRoutingGuidedVersion: 1,
    reason,
    updatedAt: Date.now(),
  }
  await writeConfigAtomically(target, JSON.stringify(next, null, 2) + "\n")
  return next
}
