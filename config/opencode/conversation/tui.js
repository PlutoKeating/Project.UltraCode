import { toggle } from "./settings.js"

export default {
  id: "ultracode-conversation-ui",
  setup(ctx) {
    const controls = { permissions: "Command approvals", direction: "Direction questions" }
    ctx.keymap.layer(() => ({
      mode: "global",
      commands: Object.entries(controls).map(([key, title]) => ({
        id: "ultracode.toggle-" + key,
        title: "UltraCode · Toggle " + title,
        group: "UltraCode",
        palette: true,
        run: async () => {
          const value = await toggle(key)
          ctx.ui.toast.show({ message: title + " → " + value })
        },
      })),
    }))
  },
}
