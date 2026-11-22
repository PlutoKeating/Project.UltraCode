import { Rpc } from "@opencode/plugin/rpc"

const stateSchema = {
  type: "object",
  properties: {
    permissions: { type: "string", enum: ["auto", "manual"] },
    direction: { type: "string", enum: ["auto", "manual"] },
  },
  required: ["permissions", "direction"],
  additionalProperties: false,
}

export const UltraCodeRpc = Rpc.define({
  id: "ultracode",
  methods: {
    getState: {
      output: stateSchema,
    },
    setMode: {
      input: {
        type: "object",
        properties: {
          key: { type: "string", enum: ["permissions", "direction"] },
          value: { type: "string", enum: ["auto", "manual"] },
        },
        required: ["key", "value"],
        additionalProperties: false,
      },
      output: stateSchema,
    },
    toggleMode: {
      input: {
        type: "object",
        properties: {
          key: { type: "string", enum: ["permissions", "direction"] },
        },
        required: ["key"],
        additionalProperties: false,
      },
      output: stateSchema,
    },
  },
  events: {
    changed: {
      schema: stateSchema,
    },
  },
})
