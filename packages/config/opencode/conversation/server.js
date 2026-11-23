import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { Rpc } from "@opencode/plugin/rpc"
import { getAll, mode, set, toggle } from "./settings.js"
import { UltraCodeRpc } from "./rpc.js"

const VERSION = "1.0.0"
const BOOT_ID = (globalThis.__ultracodeBootID ??= randomUUID())
const CHECKPOINT_PREFIX = "checkpoint:"
export const MAX_CHECKPOINT_ROUNDS = 25
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
})

const guidance = `Help the user direct work in terms of audience, behavior, architecture and acceptance. Read project instructions. Directly handle bounded work. For ambiguous work research alternatives and batch consequential questions. A request to discuss or plan authorizes only that scope. For a clear extended delivery goal, use ultracode_checkpoint to schedule the next milestone when needed, without asking the user to activate a mode. Update or clear it as the user steers. Keep committable task, progress and handoff files in the repository for long work, using the project's convention or .ralph/. Record evidence and the next action. Delegate bounded work to fresh native subagents when useful. Keep the user's model unless their preferences, configured role mappings or allowed model pool justify another. Learn recurring preferences from feedback, with the user's ability to inspect, correct and forget them via conversation. Store only relevant working preferences in project notes. Follow repository Git rules and the user's configured author identity. Have complex changes independently reviewed; operate user-visible interfaces and visually inspect their rendered output. Keep routine messages to milestones, blockers and outcomes. If progress stalls, revise the approach or report the blocker. Continue while meaningful progress is possible. Close the checkpoint before asking the user a question, stopping, or reporting completion.`

export default {
  id: "ultracode-conversation",
  async setup(ctx) {
    const fallbackStore = (globalThis.__ultracodeFallbackStorage ??= new Map())
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

    const scanCheckpointEntries = async () => {
      const all = []
      let after
      while (true) {
        const page = await storage.scan({ prefix: CHECKPOINT_PREFIX, after, limit: 100 })
        const entries = Array.isArray(page?.entries) ? page.entries : []
        all.push(...entries)
        if (!page?.next || entries.length === 0) break
        after = page.next
      }
      return all
    }

    for (const entry of await scanCheckpointEntries()) {
      const value = entry.value && typeof entry.value === "object" ? entry.value : null
      if (!value || value.bootID !== BOOT_ID) {
        await storage.remove(entry.key)
      }
    }

    const listActiveCheckpoints = async () => {
      const checkpoints = {}
      for (const entry of await scanCheckpointEntries()) {
        if (!entry.key.startsWith(CHECKPOINT_PREFIX)) continue
        const sessionID = entry.key.slice(CHECKPOINT_PREFIX.length)
        const value = entry.value && typeof entry.value === "object" ? entry.value : null
        if (sessionID && value?.bootID === BOOT_ID && typeof value.next === "string" && value.next.trim()) {
          checkpoints[sessionID] = value.next.trim()
        }
      }
      return checkpoints
    }

    let cached = { ...(await getAll()), version: VERSION, checkpoints: await listActiveCheckpoints() }

    const syncState = async () => {
      const [modes, checkpoints] = await Promise.all([getAll(), listActiveCheckpoints()])
      cached = { ...modes, version: VERSION, checkpoints }
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
      clearCheckpoint: async (input) => {
        await storage.remove(CHECKPOINT_PREFIX + input.sessionID)
        return emitChanged()
      },
    })

    const applySlashMode = async (key, rawText) => {
      const arg = String(rawText || "").trim().toLowerCase()
      if (arg === "auto" || arg === "manual") await set(key, arg)
      else await toggle(key)
      const state = await syncState()
      await ctx.command.reload().catch(() => {})
      await registration.events.emit("changed", state)
      notifyLocations()
    }

    await ctx.command.transform((editor) => {
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
          const models = (await ctx.model.list()).filter((model) => model.enabled !== false)
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
          const key = CHECKPOINT_PREFIX + context.sessionID
          const milestone = typeof input?.next === "string" ? input.next.trim() : ""
          if (!milestone) {
            await storage.remove(key)
            await emitChanged()
            return { content: "Continuation cleared." }
          }
          const raw = await storage.get(key)
          const existing = raw && typeof raw === "object" && raw.bootID === BOOT_ID ? raw : null
          const rounds = typeof existing?.rounds === "number" ? existing.rounds : 0
          const stalls =
            existing?.lastMilestone === milestone
              ? (typeof existing.stalls === "number" ? existing.stalls : 1) + 1
              : 1
          if (rounds >= MAX_CHECKPOINT_ROUNDS || stalls >= MAX_CHECKPOINT_STALLS) {
            await storage.set(key, {
              next: "",
              bootID: BOOT_ID,
              rounds,
              stalls,
              lastMilestone: milestone,
              updatedAt: Date.now(),
            })
            await emitChanged()
            const reason = rounds >= MAX_CHECKPOINT_ROUNDS ? "max checkpoint rounds reached" : "repeated identical milestone"
            return {
              content: `Checkpoint circuit breaker tripped (${reason}). Stop and report status or blockers to the user.`,
            }
          }
          await storage.set(key, {
            next: milestone,
            bootID: BOOT_ID,
            rounds,
            stalls,
            lastMilestone: milestone,
            updatedAt: Date.now(),
          })
          await emitChanged()
          return { content: "Next milestone recorded." }
        },
      })
    })
    await ctx.session.hook("prompt", async (event) => {
      const key = CHECKPOINT_PREFIX + event.sessionID
      const existing = await storage.get(key)
      if (existing !== undefined) {
        await storage.remove(key)
        await emitChanged()
      }
    })
    await ctx.session.hook("context", async (event) => {
      const session = await ctx.session.get({ sessionID: event.sessionID })
      if (session.parentID) return
      const direction = await mode("direction")
      event.system.push({
        type: "text",
        text:
          guidance +
          (direction === "manual"
            ? " Ask the user about material direction changes."
            : " Resolve directional choices yourself within the user's stated scope."),
      })
    })
    await ctx.session.hook("experimental.idle", async (event) => {
      const key = CHECKPOINT_PREFIX + event.sessionID
      const raw = await storage.get(key)
      if (!raw || typeof raw !== "object") return
      if (raw.bootID !== BOOT_ID) {
        await storage.remove(key)
        await emitChanged()
        return
      }
      const milestone = typeof raw.next === "string" ? raw.next.trim() : ""
      if (!milestone) return
      if (Array.isArray(event.background) && event.background.some((job) => job.sessionID === event.sessionID)) return

      const goal =
        typeof ctx.rpc === "function"
          ? await ctx
              .rpc(OpencodeGoalRpc)
              .get({ sessionID: event.sessionID })
              .catch(() => null)
          : null
      if (goal?.status === "active") {
        await storage.remove(key)
        await emitChanged()
        return
      }

      const rounds = typeof raw.rounds === "number" ? raw.rounds : 0
      if (rounds >= MAX_CHECKPOINT_ROUNDS) {
        await storage.set(key, { ...raw, next: "", updatedAt: Date.now() })
        await emitChanged()
        return
      }

      await storage.set(key, {
        ...raw,
        next: "",
        rounds: rounds + 1,
        updatedAt: Date.now(),
      })
      await emitChanged()
      await ctx.session.synthetic({
        sessionID: event.sessionID,
        text: "Continue the authorized goal from the latest handoff: " + milestone,
      })
    })
  },
}
