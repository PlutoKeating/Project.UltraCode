import { getAll, mode, set, toggle } from "./settings.js"
import { UltraCodeRpc } from "./rpc.js"

const guidance = `Help the user direct work in terms of audience, behavior, architecture and acceptance. Read project instructions. Directly handle bounded work. For ambiguous work research alternatives and batch consequential questions. A request to discuss or plan authorizes only that scope. For a clear extended delivery goal, use ultracode_checkpoint to schedule the next milestone when needed, without asking the user to activate a mode. Update or clear it as the user steers. Keep committable task, progress and handoff files in the repository for long work, using the project's convention or .ralph/. Record evidence and the next action. Delegate bounded work to fresh native subagents when useful. Keep the user's model unless their preferences, configured role mappings or allowed model pool justify another. Learn recurring preferences from feedback, with the user's ability to inspect, correct and forget them via conversation. Store only relevant working preferences in project notes. Follow repository Git rules and the user's configured author identity. Have complex changes independently reviewed; operate user-visible interfaces and visually inspect their rendered output. Keep routine messages to milestones, blockers and outcomes. If progress stalls, revise the approach or report the blocker. Continue while meaningful progress is possible. Close the checkpoint before asking the user a question, stopping, or reporting completion.`

export default {
  id: "ultracode-conversation",
  async setup(ctx) {
    // A restart leaves the on-disk handoff available, without resuming unattended.
    const next = new Map()
    const registration = await ctx.rpc.register(UltraCodeRpc, {
      getState: async () => getAll(),
      setMode: async (input) => {
        const { key, value } = input
        await set(key, value)
        const state = await getAll()
        await registration.events.emit("changed", state)
        return state
      },
      toggleMode: async (input) => {
        const { key } = input
        await toggle(key)
        const state = await getAll()
        await registration.events.emit("changed", state)
        return state
      },
    })
    await ctx.permission.hook("evaluate", async (event) => {
      if (event.effect === "ask" && await mode("permissions") === "auto") event.effect = "allow"
    })
    await ctx.tool.transform(editor => {
      editor.add({
        name: "ultracode_model",
        description: "List available model IDs, or switch this session to an explicitly requested model or a model within the user-authorized pool. Omit both fields to list.",
        options: { codemode: true },
        input: { type: "object", properties: { providerID: { type: "string" }, id: { type: "string" } }, additionalProperties: false },
        execute: async ({ providerID, id }, context) => {
          const models = (await ctx.model.list()).filter(model => model.enabled !== false)
          if (!providerID && !id) return { content: models.map(model => model.providerID + "/" + model.id).join("\n") }
          if (!models.some(model => model.providerID === providerID && model.id === id)) return { content: "Model unavailable." }
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
          if (input.next.trim()) next.set(context.sessionID, input.next.trim())
          else next.delete(context.sessionID)
          return { content: input.next.trim() ? "Next milestone recorded." : "Continuation cleared." }
        },
      })
    })
    await ctx.session.hook("prompt", event => { next.delete(event.sessionID) })
    await ctx.session.hook("context", async event => {
      const session = await ctx.session.get({ sessionID: event.sessionID })
      if (session.parentID) return
      const direction = await mode("direction")
      event.system.push({ type: "text", text: guidance + (direction === "manual"
        ? " Ask the user about material direction changes."
        : " Resolve directional choices yourself within the user's stated scope.") })
    })
    await ctx.session.hook("experimental.idle", async event => {
      const milestone = next.get(event.sessionID)
      if (!milestone || event.background.some(job => job.sessionID === event.sessionID)) return
      next.delete(event.sessionID)
      await ctx.session.synthetic({ sessionID: event.sessionID, text: "Continue the authorized goal from the latest handoff: " + milestone })
    })
  },
}
