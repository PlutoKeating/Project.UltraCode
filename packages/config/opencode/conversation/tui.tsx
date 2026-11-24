import { createSignal } from "solid-js"
import { Plugin } from "@opencode/plugin/tui"
import { toggle } from "./settings.js"
import { UltraCodeRpc } from "./rpc.js"

export default Plugin.define({
  id: "ultracode-conversation-ui",
  setup(ctx) {
    const controls = { permissions: "Command approvals", direction: "Direction questions" }
    const [goals, setGoals] = createSignal({})

    const applyState = (state) => {
      if (state && typeof state === "object" && state.goals && typeof state.goals === "object") {
        setGoals(state.goals)
      }
    }

    const rpc = ctx.client.rpc(UltraCodeRpc)
    rpc.getState({}).then(applyState).catch(() => {})
    const unsubscribe = rpc.events.on("changed", (event) => applyState(event?.data))

    const activeSessionID = () => {
      try {
        const route = ctx.ui.router.current()
        return route?.type === "session" ? route.sessionID : undefined
      } catch {
        return undefined
      }
    }

    const stopHomeSlot = ctx.ui.slot({
      append: "home.footer.status",
      render: () => {
        const activeCount = Object.values(goals()).filter((g) => g?.status === "active").length
        return (
          <text fg={ctx.theme.text.muted}>
            {activeCount > 0 ? `UltraCode · ${activeCount} active` : "UltraCode"}
          </text>
        )
      },
    })

    const stopPromptSlot = ctx.ui.slot({
      append: "prompt.footer.status",
      render: (input) => {
        const goal = input?.sessionID ? goals()[input.sessionID] : undefined
        if (!goal) return <text fg={ctx.theme.text.muted}>UltraCode</text>
        if (goal.status === "active") {
          return <text fg={ctx.theme.text.muted}>{`UltraCode · Goal ${goal.rounds ?? 0}/${goal.maxRounds ?? 60}`}</text>
        }
        if (goal.status === "paused") {
          return <text fg={ctx.theme.text.muted}>UltraCode · Goal paused</text>
        }
        return <text fg={ctx.theme.text.muted}>UltraCode · Goal done</text>
      },
    })

    ctx.keymap.layer(() => ({
      mode: "global",
      commands: [
        ...Object.entries(controls).map(([key, title]) => ({
          id: "ultracode.toggle-" + key,
          title: "UltraCode · Toggle " + title,
          group: "UltraCode",
          palette: true,
          run: async () => {
            let value
            try {
              const state = await rpc.toggleMode({ key })
              applyState(state)
              value = state[key]
            } catch {
              value = await toggle(key)
            }
            ctx.ui.toast.show({ message: title + " → " + value })
          },
        })),
        {
          id: "ultracode.goal-pause-resume",
          title: "UltraCode · Pause / Resume Goal",
          group: "UltraCode",
          palette: true,
          run: async () => {
            const sessionID = activeSessionID()
            if (!sessionID) return
            const currentGoal = goals()[sessionID]
            if (!currentGoal) {
              ctx.ui.toast.show({ message: "No active or paused UltraCode Goal in this session" })
              return
            }
            if (currentGoal.status === "active") {
              const next = await rpc.pauseGoal({ sessionID })
              applyState(next)
              ctx.ui.toast.show({ message: "Goal paused" })
            } else if (currentGoal.status === "paused") {
              const next = await rpc.resumeGoal({ sessionID })
              applyState(next)
              ctx.ui.toast.show({ message: "Goal resumed" })
            }
          },
        },
        {
          id: "ultracode.goal-clear",
          title: "UltraCode · Clear Goal",
          group: "UltraCode",
          palette: true,
          run: async () => {
            const sessionID = activeSessionID()
            if (!sessionID) return
            const next = await rpc.clearGoal({ sessionID })
            applyState(next)
            ctx.ui.toast.show({ message: "Goal cleared" })
          },
        },
      ],
    }))

    return () => {
      unsubscribe?.()
      stopHomeSlot()
      stopPromptSlot()
    }
  },
})
