import { Plugin } from "@opencode/plugin/tui"
import { toggle } from "./settings.js"
import { UltraCodeRpc } from "./rpc.js"

export default Plugin.define({
  id: "ultracode-conversation-ui",
  setup(ctx) {
    const controls = { permissions: "Command approvals", direction: "Direction questions" }
    const stopSlot = ctx.ui.slot({
      append: "home.footer.status",
      render: () => <text fg={ctx.theme.text.muted}>UltraCode</text>,
    })
    ctx.keymap.layer(() => ({
      mode: "global",
      commands: Object.entries(controls).map(([key, title]) => ({
        id: "ultracode.toggle-" + key,
        title: "UltraCode · Toggle " + title,
        group: "UltraCode",
        palette: true,
        run: async () => {
          let value
          try {
            const state = await ctx.client.rpc(UltraCodeRpc).toggleMode({ key })
            value = state[key]
          } catch {
            value = await toggle(key)
          }
          ctx.ui.toast.show({ message: title + " → " + value })
        },
      })),
    }))
    return () => stopSlot()
  },
})
