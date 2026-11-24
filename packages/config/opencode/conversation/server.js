import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { Rpc } from "@opencode/plugin/rpc"
import { getAll, mode, set, toggle } from "./settings.js"
import { UltraCodeRpc } from "./rpc.js"
import { buildGoalAnchor, evaluateWorkspaceGate, mutateTaskGraph } from "./goal-gate.js"
import {
  applyRoleModelPreferencesJsonc,
  hasConfiguredRoleModels,
  markModelRoutingGuided,
  readOnboardingState,
  recommendRoleModels,
  resolveOpenCodeConfigFile,
  writeConfigAtomically,
} from "./onboarding.js"

const VERSION = "1.1.1"
const BOOT_ID = (globalThis.__ultracodeBootID ??= randomUUID())
const GOAL_PREFIX = "goal:"
const LEGACY_CHECKPOINT_PREFIX = "checkpoint:"
export const MAX_GOAL_ROUNDS = 60
export const MAX_CHECKPOINT_ROUNDS = 60
export const MAX_CHECKPOINT_STALLS = 3

export const OpencodeGoalRpc = Rpc.define({
  id: "opencode.goal",
  methods: {
    get: {
      input: {
        type: "object",
        properties: { sessionID: { type: "string" } },
        required: ["sessionID"],
      },
      output: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            properties: { status: { type: "string" } },
            additionalProperties: true,
          },
        ],
      },
    },
  },
  events: {
    changed: {
      schema: {
        type: "object",
        properties: {
          sessionID: { type: "string" },
        },
        additionalProperties: true,
      },
    },
  },
})

const guidance = `Help the user direct work in terms of audience, behavior, architecture and acceptance. Read project instructions. Directly handle bounded work. For ambiguous work research alternatives and batch consequential questions. A request to discuss or plan authorizes only that scope. For a clear extended delivery goal, use ultracode_checkpoint to schedule the next milestone when needed, without asking the user to activate a mode. Update or clear it as the user steers. Keep committable task, progress and handoff files in the repository for long work, using the project's convention or .ralph/. Record evidence and the next action. Delegate bounded work to fresh native subagents when useful. Keep the user's model unless their preferences, configured role mappings or allowed model pool justify another. Learn recurring preferences from feedback, with the user's ability to inspect, correct and forget them via conversation. Store only relevant working preferences in project notes. Follow repository Git rules and the user's configured author identity. Have complex changes independently reviewed; operate user-visible interfaces and visually inspect their rendered output. Keep routine messages to milestones, blockers and outcomes. If progress stalls, revise the approach or report the blocker. Continue while meaningful progress is possible. Close the checkpoint before asking the user a question, stopping, or reporting completion.`

function extractModelList(raw) {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.data)) return raw.data
    if (Array.isArray(raw.models)) return raw.models
    if (Array.isArray(raw.items)) return raw.items
  }
  return []
}

function unwrapSession(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  if ("data" in raw && raw.data && typeof raw.data === "object") return raw.data
  return raw
}

function extractMessageText(msg) {
  if (!msg || typeof msg !== "object") return ""
  if (typeof msg.content === "string") return msg.content
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((part) => (part && typeof part === "object" && typeof part.text === "string" ? part.text : ""))
      .join("\n")
  }
  return ""
}

function messagesContainGoalAnchor(messages) {
  if (!Array.isArray(messages)) return false
  return messages.some((msg) => {
    const text = extractMessageText(msg)
    return text.includes("<ultracode_goal_anchor>") || text.includes("<objective>")
  })
}

function truncateTitle(text, max = 60) {
  const clean = String(text || "").replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max - 1).trimEnd() + "…"
}

function toPublicGoalEntry(value) {
  const objective = String(value.objective || value.nextMilestone || "").trim()
  const nextMilestone = String(value.nextMilestone || "").trim()
  const reason = String(value.reason || "").trim()
  return {
    id: String(value.id || "goal"),
    objective,
    status: value.status === "paused" || value.status === "complete" ? value.status : "active",
    ...(nextMilestone ? { nextMilestone } : {}),
    ...(reason ? { reason } : {}),
    rounds: typeof value.rounds === "number" ? value.rounds : 0,
    maxRounds: typeof value.maxRounds === "number" ? value.maxRounds : MAX_GOAL_ROUNDS,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
  }
}

export default {
  id: "ultracode-conversation",
  async setup(ctx) {
    const fallbackStore = (globalThis.__ultracodeFallbackStorage ??= new Map())
    const awaitingQuestionSessions = new Set()
    const lastAgentBySession = new Map()
    const transitionedFromPlanSessions = new Set()
    let onboardingChecked = false
    const eventAbort = new AbortController()

    const storage = ctx.storage ?? {
      get: async (key) => fallbackStore.get(key),
      set: async (key, value) => {
        fallbackStore.set(key, value)
      },
      remove: async (key) => {
        fallbackStore.delete(key)
      },
      scan: async ({ prefix, after, limit = 100 }) => {
        const sorted = [...fallbackStore.entries()]
          .filter(([key]) => key.startsWith(prefix) && (!after || key > after))
          .sort(([a], [b]) => a.localeCompare(b))
        const slice = sorted.slice(0, limit)
        return {
          entries: slice.map(([key, value]) => ({ key, value })),
          next: sorted.length > limit && slice.length > 0 ? slice[slice.length - 1][0] : undefined,
        }
      },
    }

    const scanPrefix = async (prefix) => {
      const all = []
      let after
      while (true) {
        const page = await storage.scan({ prefix, after, limit: 100 })
        const entries = Array.isArray(page?.entries) ? page.entries : []
        all.push(...entries)
        if (!page?.next || entries.length === 0) break
        after = page.next
      }
      return all
    }

    // Purge any legacy v1.1.x checkpoint:* entries
    for (const legacy of await scanPrefix(LEGACY_CHECKPOINT_PREFIX)) {
      await storage.remove(legacy.key)
    }

    // Reconcile goal:* entries on boot / hot reload
    for (const entry of await scanPrefix(GOAL_PREFIX)) {
      const value = entry.value && typeof entry.value === "object" ? entry.value : null
      if (!value) {
        await storage.remove(entry.key)
        continue
      }
      if (value.bootID !== BOOT_ID) {
        if (value.explicit) {
          if (value.status === "active") {
            await storage.set(entry.key, {
              ...value,
              status: "paused",
              reason: "Server restarted — resume to continue",
              awaitingUserQuestion: false,
              pendingPostQuestionContinue: false,
              updatedAt: Date.now(),
            })
          }
        } else {
          await storage.remove(entry.key)
        }
      }
    }

    const getSessionSafe = async (sessionID) => {
      if (!sessionID || typeof ctx.session?.get !== "function") return null
      try {
        return unwrapSession(await ctx.session.get({ sessionID }))
      } catch {
        return null
      }
    }

    const resolveSessionDirectory = async (sessionID) => {
      const session = await getSessionSafe(sessionID)
      return session?.location?.directory || ctx.location?.directory || process.cwd()
    }

    const sendSessionInput = async (sessionID, text) => {
      if (typeof ctx.session?.prompt === "function") {
        await ctx.session.prompt({ sessionID, text })
      } else {
        await ctx.session.synthetic({ sessionID, text })
      }
    }

    const collectGoalsAndCheckpoints = async () => {
      const checkpoints = {}
      const goals = {}
      for (const entry of await scanPrefix(GOAL_PREFIX)) {
        if (!entry.key.startsWith(GOAL_PREFIX)) continue
        const sessionID = entry.key.slice(GOAL_PREFIX.length)
        const value = entry.value && typeof entry.value === "object" ? entry.value : null
        if (!sessionID || !value) continue

        const nextMilestone = typeof value.nextMilestone === "string" ? value.nextMilestone.trim() : ""
        const objective = typeof value.objective === "string" ? value.objective.trim() : ""

        if (value.explicit) {
          goals[sessionID] = toPublicGoalEntry(value)
          if (value.status === "active" && value.bootID === BOOT_ID) {
            checkpoints[sessionID] = nextMilestone || objective
          }
        } else if (value.bootID === BOOT_ID && value.status === "active" && nextMilestone) {
          checkpoints[sessionID] = nextMilestone
          goals[sessionID] = toPublicGoalEntry(value)
        }
      }
      return { checkpoints, goals }
    }

    const initialMaps = await collectGoalsAndCheckpoints()
    let cached = { ...(await getAll()), version: VERSION, ...initialMaps }

    const syncState = async () => {
      const [modes, maps] = await Promise.all([getAll(), collectGoalsAndCheckpoints()])
      cached = { ...modes, version: VERSION, ...maps }
      return cached
    }

    const notifyLocations = () => {
      try {
        const child = spawn(process.execPath, ["api", "post", "/api/location/reload", "--data", "{}"], {
          cwd: ctx.location?.directory,
          stdio: "ignore",
          windowsHide: true,
        })
        child.on("error", () => {})
        child.unref?.()
      } catch {
        // Ignore in standalone one-shot contexts where background service API is unused
      }
    }

    let registration
    const emitChanged = async () => {
      const state = await syncState()
      if (registration) await registration.events.emit("changed", state)
      return state
    }

    const pauseSessionGoal = async (sessionID, reason = "Paused by user", interruptRunning = false) => {
      const key = GOAL_PREFIX + sessionID
      awaitingQuestionSessions.delete(sessionID)
      const existing = await storage.get(key)
      if (existing && typeof existing === "object") {
        await storage.set(key, {
          ...existing,
          status: "paused",
          reason,
          awaitingUserQuestion: false,
          pendingPostQuestionContinue: false,
          updatedAt: Date.now(),
        })
      }
      if (interruptRunning && typeof ctx.session?.interrupt === "function") {
        await ctx.session.interrupt({ sessionID }).catch(() => {})
      }
      return emitChanged()
    }

    const resumeSessionGoal = async (sessionID) => {
      const key = GOAL_PREFIX + sessionID
      awaitingQuestionSessions.delete(sessionID)
      const existing = await storage.get(key)
      if (!existing || typeof existing !== "object") {
        return emitChanged()
      }
      const nextRecord = {
        ...existing,
        status: "active",
        bootID: BOOT_ID,
        reason: "",
        stalls: 0,
        gateStalls: 0,
        lastGateFingerprint: "",
        awaitingUserQuestion: false,
        pendingPostQuestionContinue: false,
        updatedAt: Date.now(),
      }
      await storage.set(key, nextRecord)
      const state = await emitChanged()
      const milestone = String(nextRecord.nextMilestone || "").trim()
      const resumeText = milestone
        ? `Resume the authorized goal ("${nextRecord.objective}") from the latest handoff. Next milestone: ${milestone}`
        : `Resume the authorized goal ("${nextRecord.objective}") from the latest repository state, .opencode/ultracode/FEATURE_LIST.json, and handoff files.`
      await ctx.session.synthetic({ sessionID, text: resumeText })
      return state
    }

    const clearSessionGoal = async (sessionID, interruptRunning = false) => {
      awaitingQuestionSessions.delete(sessionID)
      await storage.remove(GOAL_PREFIX + sessionID)
      await storage.remove(LEGACY_CHECKPOINT_PREFIX + sessionID)
      if (interruptRunning && typeof ctx.session?.interrupt === "function") {
        await ctx.session.interrupt({ sessionID }).catch(() => {})
      }
      return emitChanged()
    }

    // Register silent null-stub for opencode.goal so stock TUI/Desktop Goal pills stay hidden without retry storms
    await ctx.rpc
      .register(OpencodeGoalRpc, {
        get: async () => null,
      })
      .catch(() => null)

    registration = await ctx.rpc.register(UltraCodeRpc, {
      getState: async () => syncState(),
      setMode: async (input) => {
        const { key, value } = input
        await set(key, value)
        const state = await syncState()
        await ctx.command.reload().catch(() => {})
        await registration.events.emit("changed", state)
        notifyLocations()
        return state
      },
      toggleMode: async (input) => {
        const { key } = input
        await toggle(key)
        const state = await syncState()
        await ctx.command.reload().catch(() => {})
        await registration.events.emit("changed", state)
        notifyLocations()
        return state
      },
      clearCheckpoint: async (input) => clearSessionGoal(input.sessionID, false),
      pauseGoal: async (input) => pauseSessionGoal(input.sessionID, "Paused by user", true),
      resumeGoal: async (input) => resumeSessionGoal(input.sessionID),
      clearGoal: async (input) => clearSessionGoal(input.sessionID, true),
    })

    if (typeof ctx.agent?.transform === "function") {
      await ctx.agent.transform((editor) => {
        try {
          for (const builtInId of ["build", "plan"]) {
            if (editor.get(builtInId)) {
              editor.update(builtInId, (agent) => {
                agent.hidden = true
              })
            }
          }
          if (editor.get("UltraBuild")) {
            editor.default("UltraBuild")
          }
        } catch {
          // Never allow agent transform edge cases to disable ultracode-conversation
        }
      })
    }

    const applySlashMode = async (key, rawText) => {
      const arg = String(rawText || "").trim().toLowerCase()
      if (arg === "auto" || arg === "manual") await set(key, arg)
      else await toggle(key)
      const state = await syncState()
      await ctx.command.reload().catch(() => {})
      await registration.events.emit("changed", state)
      notifyLocations()
    }

    const executeGoalCommand = async ({ sessionID, prompt }) => {
      const rawText = String(prompt?.text || "").trim()
      const lower = rawText.toLowerCase()

      if (!rawText || lower === "status") {
        const existing = await storage.get(GOAL_PREFIX + sessionID)
        const summary =
          existing && typeof existing === "object"
            ? `UltraCode Goal [${existing.status}] (${existing.rounds ?? 0}/${existing.maxRounds ?? MAX_GOAL_ROUNDS} rounds): ${existing.objective}${existing.reason ? ` — ${existing.reason}` : ""}`
            : "No active UltraCode goal on this session. Usage: `/goal [--auto] <objective>`, `/goal pause`, `/goal resume`, `/goal clear`."
        await ctx.session.synthetic({ sessionID, text: summary })
        return
      }

      if (lower === "pause") {
        await pauseSessionGoal(sessionID, "Paused via /goal pause", true)
        return
      }

      if (lower === "clear" || lower === "stop" || lower === "cancel") {
        await clearSessionGoal(sessionID, true)
        return
      }

      if (lower === "resume") {
        await resumeSessionGoal(sessionID)
        return
      }

      let autoFlag = false
      let objective = rawText
      if (/^--auto(?:\s+|$)/i.test(objective)) {
        autoFlag = true
        objective = objective.replace(/^--auto\s*/i, "").trim()
      } else if (/\s+--auto$/i.test(objective)) {
        autoFlag = true
        objective = objective.replace(/\s+--auto$/i, "").trim()
      }
      if (!objective) return

      const effectiveDirection = autoFlag ? "auto" : await mode("direction")
      const record = {
        id: randomUUID(),
        objective,
        status: "active",
        explicit: true,
        nextMilestone: "",
        reason: "",
        rounds: 0,
        maxRounds: MAX_GOAL_ROUNDS,
        stalls: 0,
        gateStalls: 0,
        lastMilestone: "",
        lastGateFingerprint: "",
        awaitingUserQuestion: false,
        pendingPostQuestionContinue: false,
        bootID: BOOT_ID,
        updatedAt: Date.now(),
      }
      await storage.set(GOAL_PREFIX + sessionID, record)
      await emitChanged()

      const session = await getSessionSafe(sessionID)
      const currentTitle = String(session?.title || "").trim()
      if (!currentTitle || /^(new session|untitled)$/i.test(currentTitle)) {
        await ctx.session.update?.({ sessionID, title: truncateTitle(objective, 60) }).catch(() => {})
      }

      const directionDirective =
        effectiveDirection === "manual"
          ? "Before writing production code on ambiguous requirements, research relevant community/OSS prior art and batch all consequential scope, UX, or architecture questions upfront in a single multi-choice `question` card, then wait for the user's reply."
          : "Autonomous direction mode is active: resolve non-destructive design and implementation trade-offs autonomously within the stated scope without stopping to ask routine questions, recording your rulings clearly."

      const kickoff = [
        `<ultracode_goal_anchor>`,
        `<objective>`,
        objective,
        `</objective>`,
        `</ultracode_goal_anchor>`,
        ``,
        `UltraCode Goal Engine is active for this session (${MAX_GOAL_ROUNDS} max continuation rounds, deterministic workspace evidence gate enabled).`,
        `- ${directionDirective}`,
        `- For multi-feature work, initialize and maintain \`.opencode/ultracode/FEATURE_LIST.json\` via \`ultracode_task_graph\` and schedule bounded milestones via \`ultracode_checkpoint\`.`,
        `- Delegate isolated implementation, review (\`ultracode/reviewer\`), and real-browser QA (\`ultracode/visual-evaluator\`) to fresh subagents with non-overlapping owned files.`,
        `- Do not declare completion until all tests, builds, and workspace evidence gates pass with fresh proof.`,
      ].join("\n")

      await sendSessionInput(sessionID, kickoff)
    }

    const executeReviewCommand = async ({ sessionID, prompt }) => {
      const scopeArg = String(prompt?.text || "").trim()
      const targetDesc = scopeArg ? `target scope \`${scopeArg}\`` : "the current working tree and branch changes"
      const reviewPrompt = [
        `Run an independent evidence-based verification review of ${targetDesc}.`,
        `1. Inspect \`git status --short\` and the exact diff range without self-grading your own work inline.`,
        `2. Dispatch a fresh \`subagent\` with \`agent: "ultracode/reviewer"\` against the real diff, project instructions, and acceptance criteria.`,
        `3. If user-facing UI, styles, or routes were touched, also start or verify the live preview and dispatch \`agent: "ultracode/visual-evaluator"\` for real Chromium interaction and responsive inspection.`,
        `4. Report the independent verdict(s) with cited file:line and command evidence, or fix any blocking findings before signing off.`,
      ].join("\n")
      await sendSessionInput(sessionID, reviewPrompt)
    }

    const executeSetupModelsCommand = async ({ sessionID, prompt }) => {
      const arg = String(prompt?.text || "").trim().toLowerCase()
      const cfgFile = await resolveOpenCodeConfigFile()
      let currentText = "{}\n"
      try {
        const { readFile } = await import("node:fs/promises")
        currentText = await readFile(cfgFile, "utf8")
      } catch {
        currentText = "{}\n"
      }

      if (arg === "inherit" || arg === "reset" || arg === "clear") {
        const updated = applyRoleModelPreferencesJsonc(currentText, "inherit")
        if (updated !== currentText) {
          await writeConfigAtomically(cfgFile, updated)
        }
        await markModelRoutingGuided("command-inherit")
        onboardingChecked = true
        notifyLocations()
        return
      }

      const models = extractModelList(await ctx.model.list().catch(() => []))
      const rec = recommendRoleModels(models)

      if (arg === "recommended" || arg === "auto") {
        if (!rec) return
        const updated = applyRoleModelPreferencesJsonc(currentText, rec.roles)
        if (updated !== currentText) {
          await writeConfigAtomically(cfgFile, updated)
        }
        await markModelRoutingGuided("command-recommended")
        onboardingChecked = true
        notifyLocations()
        return
      }

      await markModelRoutingGuided("command-interactive")
      onboardingChecked = true
      const mappingLines = rec
        ? Object.entries(rec.roles)
            .map(([role, spec]) => `- \`${role}\` → \`${spec}\``)
            .join("\n")
        : "- Fewer than 2 chat models are currently configured; all roles inherit the active session model."

      const interactivePrompt = [
        `Help the user configure optional UltraCode per-role model preferences in \`${cfgFile}\` (without modifying \`agents/*.md\`).`,
        ``,
        `Detected recommended pairing from the user's configured OpenCode models:`,
        mappingLines,
        ``,
        `Present a concise multi-choice \`question\` card asking whether to:`,
        `1. Apply the recommended multi-tier role models above (Recommended when >=2 models exist)`,
        `2. Keep default active-session model inheritance across all roles`,
        `3. Customize individual role models from their available pool`,
        ``,
        `After the user answers, update only \`agents.<role>.model\` in \`${cfgFile}\` while preserving all existing JSONC comments and unrelated settings.`,
      ].join("\n")
      await sendSessionInput(sessionID, interactivePrompt)
    }

    await ctx.command.transform((editor) => {
      editor.add({
        name: "goal",
        description: "Start, pause, resume, or clear an evidence-gated UltraCode Goal (/goal [--auto] <objective> | pause | resume | clear)",
        execute: executeGoalCommand,
      })
      editor.add({
        name: "review",
        description: "Dispatch independent ultracode/reviewer (and visual-evaluator when UI applies) verification",
        execute: executeReviewCommand,
      })
      editor.add({
        name: "setup-models",
        description: "Configure optional multi-tier role models in opencode.jsonc (/setup-models [recommended|inherit|status])",
        execute: executeSetupModelsCommand,
      })
      editor.add({
        name: "approvals",
        description: `[${cached.permissions}] Command approvals (auto|manual)`,
        execute: async ({ prompt }) => applySlashMode("permissions", prompt?.text),
      })
      editor.add({
        name: "direction",
        description: `[${cached.direction}] Direction questions (manual|auto)`,
        execute: async ({ prompt }) => applySlashMode("direction", prompt?.text),
      })
    })

    await ctx.permission.hook("evaluate", async (event) => {
      if (event.effect === "ask" && (await mode("permissions")) === "auto") event.effect = "allow"
    })

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "ultracode_model",
        description:
          "List available model IDs, or switch this session to an explicitly requested model or a model within the user-authorized pool. Omit both fields to list.",
        options: { codemode: true },
        input: { type: "object", properties: { providerID: { type: "string" }, id: { type: "string" } }, additionalProperties: false },
        execute: async ({ providerID, id }, context) => {
          const models = extractModelList(await ctx.model.list()).filter((model) => model.enabled !== false)
          if (!providerID && !id) return { content: models.map((model) => model.providerID + "/" + model.id).join("\n") }
          if (!models.some((model) => model.providerID === providerID && model.id === id)) return { content: "Model unavailable." }
          await ctx.session.switchModel({ sessionID: context.sessionID, model: { providerID, id } })
          return { content: "Selected " + providerID + "/" + id }
        },
      })

      editor.add({
        name: "ultracode_checkpoint",
        options: { codemode: false },
        description: "Schedule the next milestone of the current authorized goal. Pass empty next to clear it. Re-arm only while making progress.",
        input: { type: "object", properties: { next: { type: "string" } }, required: ["next"], additionalProperties: false },
        execute: async (input, context) => {
          const key = GOAL_PREFIX + context.sessionID
          const milestone = typeof input?.next === "string" ? input.next.trim() : ""
          const raw = await storage.get(key)
          const existing =
            raw && typeof raw === "object" && (raw.bootID === BOOT_ID || raw.explicit) ? raw : null

          if (!milestone) {
            if (existing) {
              await storage.set(key, {
                ...existing,
                bootID: BOOT_ID,
                nextMilestone: "",
                pendingPostQuestionContinue: false,
                ...(existing.explicit ? {} : { status: "paused" }),
                updatedAt: Date.now(),
              })
            } else {
              await storage.remove(key)
            }
            await emitChanged()
            return { content: "Continuation cleared." }
          }

          const maxRounds = typeof existing?.maxRounds === "number" ? existing.maxRounds : MAX_CHECKPOINT_ROUNDS
          const rounds = typeof existing?.rounds === "number" ? existing.rounds : 0
          const stalls =
            existing?.lastMilestone === milestone
              ? (typeof existing.stalls === "number" ? existing.stalls : 1) + 1
              : 1

          if (rounds >= maxRounds || stalls >= MAX_CHECKPOINT_STALLS) {
            const reason = rounds >= maxRounds ? "max checkpoint rounds reached" : "repeated identical milestone"
            await storage.set(key, {
              id: existing?.id || randomUUID(),
              objective: existing?.explicit ? existing.objective : milestone,
              explicit: Boolean(existing?.explicit),
              status: "paused",
              reason: `Circuit breaker: ${reason}`,
              nextMilestone: "",
              bootID: BOOT_ID,
              rounds,
              maxRounds,
              stalls,
              gateStalls: existing?.gateStalls || 0,
              lastMilestone: milestone,
              lastGateFingerprint: existing?.lastGateFingerprint || "",
              awaitingUserQuestion: false,
              pendingPostQuestionContinue: false,
              updatedAt: Date.now(),
            })
            await emitChanged()
            return {
              content: `Checkpoint circuit breaker tripped (${reason}). Stop and report status or blockers to the user.`,
            }
          }

          await storage.set(key, {
            id: existing?.id || randomUUID(),
            objective: existing?.explicit ? existing.objective : milestone,
            explicit: Boolean(existing?.explicit),
            status: "active",
            reason: "",
            nextMilestone: milestone,
            bootID: BOOT_ID,
            rounds,
            maxRounds,
            stalls,
            gateStalls: 0,
            lastMilestone: milestone,
            lastGateFingerprint: "",
            awaitingUserQuestion: false,
            pendingPostQuestionContinue: false,
            updatedAt: Date.now(),
          })
          await emitChanged()
          return { content: "Next milestone recorded." }
        },
      })

      editor.add({
        name: "ultracode_task_graph",
        options: { codemode: true },
        description:
          "Manage .opencode/ultracode/FEATURE_LIST.json deterministically (status, init, claim with non-overlapping ownedFiles & dependency check, verify with executedCommand + evidenceSummary, or block).",
        input: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["status", "init", "claim", "verify", "block"] },
            featureID: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            dependencies: { type: "array", items: { type: "string" } },
            ownedFiles: { type: "array", items: { type: "string" } },
            steps: { type: "array", items: { type: "string" } },
            verification: { type: "string" },
            executedCommand: { type: "string" },
            evidenceSummary: { type: "string" },
            reviewerVerdict: { type: "string", enum: ["APPROVE", "REJECT"] },
            reason: { type: "string" },
          },
          required: ["action"],
          additionalProperties: false,
        },
        execute: async (input, context) => {
          const dir = await resolveSessionDirectory(context.sessionID)
          const res = await mutateTaskGraph(dir, input)
          return { content: res.content }
        },
      })
    })

    if (typeof ctx.tool?.hook === "function") {
      await ctx.tool.hook("execute.before", async (event) => {
        if (event.tool !== "question") return
        awaitingQuestionSessions.add(event.sessionID)
        const key = GOAL_PREFIX + event.sessionID
        const existing = await storage.get(key)
        if (existing && typeof existing === "object") {
          await storage.set(key, {
            ...existing,
            awaitingUserQuestion: true,
            updatedAt: Date.now(),
          })
        }
      })

      await ctx.tool.hook("execute.after", async (event) => {
        if (event.tool !== "question") return
        const key = GOAL_PREFIX + event.sessionID
        const existing = await storage.get(key)
        if (event.status === "completed") {
          awaitingQuestionSessions.delete(event.sessionID)
          if (existing && typeof existing === "object") {
            await storage.set(key, {
              ...existing,
              awaitingUserQuestion: false,
              pendingPostQuestionContinue: Boolean(existing.explicit && existing.status === "active"),
              stalls: 0,
              gateStalls: 0,
              updatedAt: Date.now(),
            })
          }
        } else {
          // Question dismissed/cancelled/errored -> wait until next user prompt
          awaitingQuestionSessions.add(event.sessionID)
          if (existing && typeof existing === "object") {
            await storage.set(key, {
              ...existing,
              awaitingUserQuestion: true,
              pendingPostQuestionContinue: false,
              updatedAt: Date.now(),
            })
          }
        }
      })
    }

    if (typeof ctx.event?.subscribe === "function") {
      ;(async () => {
        try {
          const stream = ctx.event.subscribe({
            signal: eventAbort.signal,
            types: [
              "session.execution.interrupted",
              "session.execution.failed",
              "session.deleted",
              "session.agent.selected",
            ],
          })
          for await (const evt of stream) {
            if (eventAbort.signal.aborted) break
            const payload = evt?.data && typeof evt.data === "object" ? evt.data : evt
            const sessionID = payload?.sessionID
            if (!sessionID) continue

            if (evt.type === "session.deleted") {
              awaitingQuestionSessions.delete(sessionID)
              lastAgentBySession.delete(sessionID)
              transitionedFromPlanSessions.delete(sessionID)
              await storage.remove(GOAL_PREFIX + sessionID)
              await emitChanged()
              continue
            }

            if (evt.type === "session.agent.selected") {
              const prev = lastAgentBySession.get(sessionID)
              const nextAgent = payload?.agent
              if (prev === "UltraPlan" && nextAgent && nextAgent !== "UltraPlan") {
                transitionedFromPlanSessions.add(sessionID)
              } else if (nextAgent === "UltraPlan") {
                transitionedFromPlanSessions.delete(sessionID)
              }
              if (nextAgent) lastAgentBySession.set(sessionID, nextAgent)
              continue
            }

            if (evt.type === "session.execution.interrupted") {
              const reason = payload?.reason
              if (!reason || reason === "user" || reason === "inactivity") {
                const existing = await storage.get(GOAL_PREFIX + sessionID)
                if (existing && typeof existing === "object" && existing.status === "active") {
                  await pauseSessionGoal(
                    sessionID,
                    reason === "inactivity" ? "Paused after inactivity" : "Interrupted by user",
                    false,
                  )
                }
              }
              continue
            }

            if (evt.type === "session.execution.failed") {
              const existing = await storage.get(GOAL_PREFIX + sessionID)
              if (existing && typeof existing === "object" && existing.status === "active") {
                await pauseSessionGoal(sessionID, "Paused due to execution error", false)
              }
            }
          }
        } catch {
          // Stream closed on plugin reload or shutdown
        }
      })()
    }

    await ctx.session.hook("prompt", async (event) => {
      awaitingQuestionSessions.delete(event.sessionID)
      const key = GOAL_PREFIX + event.sessionID
      const existing = await storage.get(key)
      if (!existing || typeof existing !== "object") return

      if (existing.explicit) {
        await storage.set(key, {
          ...existing,
          bootID: BOOT_ID,
          stalls: 0,
          gateStalls: 0,
          lastGateFingerprint: "",
          awaitingUserQuestion: false,
          pendingPostQuestionContinue: false,
          updatedAt: Date.now(),
        })
        await emitChanged()
      } else {
        await storage.remove(key)
        await emitChanged()
      }
    })

    const applyGoalContextAnchor = async (event, includeSystemGuidance) => {
      const session = await getSessionSafe(event.sessionID)
      if (session?.parentID) return

      const currentAgent = event.agent || session?.agent
      const prevAgent = lastAgentBySession.get(event.sessionID)
      if (prevAgent === "UltraPlan" && currentAgent && currentAgent !== "UltraPlan") {
        transitionedFromPlanSessions.add(event.sessionID)
      } else if (currentAgent === "UltraPlan") {
        transitionedFromPlanSessions.delete(event.sessionID)
      }
      if (currentAgent) {
        lastAgentBySession.set(event.sessionID, currentAgent)
      }

      if (includeSystemGuidance && Array.isArray(event.system)) {
        const direction = await mode("direction")
        event.system.push({
          type: "text",
          text:
            guidance +
            (direction === "manual"
              ? " Ask the user about material direction changes."
              : " Resolve directional choices yourself within the user's stated scope."),
        })

        if (transitionedFromPlanSessions.has(event.sessionID) && currentAgent && currentAgent !== "UltraPlan") {
          event.system.push({
            type: "text",
            text: `<system-update>Active agent switched from read-only UltraPlan to ${currentAgent}. Earlier read-only planning restrictions no longer apply; file edits, commands, verification, and subagent delegation are authorized.</system-update>`,
          })
        }

        if (!onboardingChecked && process.env.ULTRACODE_RALPH_ACTIVE !== "1") {
          const prevOnboard = await readOnboardingState()
          if (prevOnboard && Number(prevOnboard.modelRoutingGuidedVersion) >= 1) {
            onboardingChecked = true
          } else {
            const cfgFile = await resolveOpenCodeConfigFile()
            let cfgText = ""
            try {
              const { readFile } = await import("node:fs/promises")
              cfgText = await readFile(cfgFile, "utf8")
            } catch {
              cfgText = ""
            }
            if (cfgText && hasConfiguredRoleModels(cfgText)) {
              onboardingChecked = true
              await markModelRoutingGuided("preconfigured").catch(() => {})
            } else {
              const models = extractModelList(await ctx.model.list().catch(() => []))
              const rec = recommendRoleModels(models)
              if (rec) {
                onboardingChecked = true
                await markModelRoutingGuided("shown").catch(() => {})
                event.system.push({
                  type: "text",
                  text: `<ultracode_onboarding_hint>Multiple configured models were detected (recommended tier pairing: deep=${rec.deep}, coding=${rec.coding}, fast=${rec.fast}, visual=${rec.visual}). Without blocking the user's request, include a brief one-line tip at the end of your response noting they can run \`/setup-models\` (or \`/setup-models recommended\`) anytime to bind optional per-role model preferences in opencode.jsonc.</ultracode_onboarding_hint>`,
                })
              }
            }
          }
        }
      }

      const goal = await storage.get(GOAL_PREFIX + event.sessionID)
      if (goal && typeof goal === "object" && goal.status === "active") {
        const anchorText = buildGoalAnchor(goal)
        if (anchorText && Array.isArray(event.messages) && !messagesContainGoalAnchor(event.messages)) {
          const insertAt = Math.min(1, event.messages.length)
          event.messages.splice(insertAt, 0, {
            role: "user",
            content: [{ type: "text", text: anchorText }],
          })
        }
      }
    }

    await ctx.session.hook("context", async (event) => {
      await applyGoalContextAnchor(event, true)
    })

    await ctx.session.hook("compaction", async (event) => {
      await applyGoalContextAnchor(event, false)
    })

    await ctx.session.hook("experimental.idle", async (event) => {
      const key = GOAL_PREFIX + event.sessionID
      const raw = await storage.get(key)
      if (!raw || typeof raw !== "object") return

      if (raw.bootID !== BOOT_ID) {
        if (raw.explicit) {
          if (raw.status === "active") {
            await storage.set(key, {
              ...raw,
              status: "paused",
              reason: "Server restarted — resume to continue",
              awaitingUserQuestion: false,
              pendingPostQuestionContinue: false,
              updatedAt: Date.now(),
            })
            await emitChanged()
          }
        } else {
          await storage.remove(key)
          await emitChanged()
        }
        return
      }

      if (raw.status !== "active") return
      if (awaitingQuestionSessions.has(event.sessionID) || raw.awaitingUserQuestion) return
      if (Array.isArray(event.background) && event.background.some((job) => job.sessionID === event.sessionID)) return

      const maxRounds = typeof raw.maxRounds === "number" ? raw.maxRounds : MAX_GOAL_ROUNDS
      const rounds = typeof raw.rounds === "number" ? raw.rounds : 0
      const milestone = typeof raw.nextMilestone === "string" ? raw.nextMilestone.trim() : ""

      if (milestone) {
        if (rounds >= maxRounds) {
          await storage.set(key, {
            ...raw,
            status: "paused",
            reason: `Circuit breaker: max goal rounds reached (${maxRounds})`,
            nextMilestone: "",
            pendingPostQuestionContinue: false,
            updatedAt: Date.now(),
          })
          await emitChanged()
          return
        }

        await storage.set(key, {
          ...raw,
          ...(raw.explicit ? {} : { status: "paused" }),
          nextMilestone: "",
          rounds: rounds + 1,
          gateStalls: 0,
          lastGateFingerprint: "",
          pendingPostQuestionContinue: false,
          updatedAt: Date.now(),
        })
        await emitChanged()
        const text = raw.explicit
          ? `Continue the authorized goal ("${raw.objective}") from the latest handoff: ${milestone}`
          : "Continue the authorized goal from the latest handoff: " + milestone
        await ctx.session.synthetic({
          sessionID: event.sessionID,
          text,
        })
        return
      }

      if (!raw.explicit) return

      const sessionDir = await resolveSessionDirectory(event.sessionID)
      const gate = await evaluateWorkspaceGate(sessionDir)

      if (!gate.ok) {
        const gateStalls = raw.lastGateFingerprint === gate.fingerprint ? (raw.gateStalls || 0) + 1 : 1
        if (rounds >= maxRounds || gateStalls >= MAX_CHECKPOINT_STALLS) {
          const reason =
            rounds >= maxRounds
              ? `Circuit breaker: max goal rounds reached (${maxRounds})`
              : `Circuit breaker: workspace evidence gate blocked ${MAX_CHECKPOINT_STALLS} consecutive times without progress (${gate.blockers[0] || "pending items"})`
          await storage.set(key, {
            ...raw,
            status: "paused",
            reason,
            gateStalls,
            lastGateFingerprint: gate.fingerprint,
            pendingPostQuestionContinue: false,
            updatedAt: Date.now(),
          })
          await emitChanged()
          return
        }

        await storage.set(key, {
          ...raw,
          rounds: rounds + 1,
          gateStalls,
          lastGateFingerprint: gate.fingerprint,
          pendingPostQuestionContinue: false,
          updatedAt: Date.now(),
        })
        await emitChanged()
        await ctx.session.synthetic({
          sessionID: event.sessionID,
          text: [
            `Workspace completion gate blocked finishing "${raw.objective}". Pending verification items:`,
            ...gate.blockers.map((b) => `- ${b}`),
            `Complete and verify the pending items with real command/QA evidence, or schedule the next bounded milestone with ultracode_checkpoint.`,
          ].join("\n"),
        })
        return
      }

      if (raw.pendingPostQuestionContinue && rounds < maxRounds) {
        await storage.set(key, {
          ...raw,
          rounds: rounds + 1,
          pendingPostQuestionContinue: false,
          updatedAt: Date.now(),
        })
        await emitChanged()
        await ctx.session.synthetic({
          sessionID: event.sessionID,
          text: `Clarification answered for goal "${raw.objective}". Proceed with implementation and verification, tracking features in .opencode/ultracode/FEATURE_LIST.json or milestones via ultracode_checkpoint.`,
        })
        return
      }

      await storage.set(key, {
        ...raw,
        status: "complete",
        nextMilestone: "",
        reason: "",
        gateStalls: 0,
        lastGateFingerprint: "clean",
        pendingPostQuestionContinue: false,
        updatedAt: Date.now(),
      })
      await emitChanged()
    })

    return () => {
      eventAbort.abort()
    }
  },
}
