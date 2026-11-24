import { Rpc } from "@opencode/plugin/rpc"

const goalEntrySchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    objective: { type: "string" },
    status: { type: "string", enum: ["active", "paused", "complete"] },
    nextMilestone: { type: "string" },
    reason: { type: "string" },
    rounds: { type: "number" },
    maxRounds: { type: "number" },
    updatedAt: { type: "number" },
  },
  required: ["id", "objective", "status", "rounds", "maxRounds", "updatedAt"],
  additionalProperties: false,
}

const sessionInputSchema = {
  type: "object",
  properties: {
    sessionID: { type: "string", minLength: 1 },
  },
  required: ["sessionID"],
  additionalProperties: false,
}

const stateSchema = {
  type: "object",
  properties: {
    permissions: { type: "string", enum: ["auto", "manual"] },
    direction: { type: "string", enum: ["auto", "manual"] },
    version: { type: "string" },
    checkpoints: {
      type: "object",
      additionalProperties: { type: "string" },
    },
    goals: {
      type: "object",
      additionalProperties: goalEntrySchema,
    },
  },
  required: ["permissions", "direction", "version", "checkpoints", "goals"],
  additionalProperties: false,
}

export const UltraCodeRpc = Rpc.define({
  id: "ultracode",
  methods: {
    getState: {
      input: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
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
    clearCheckpoint: {
      input: sessionInputSchema,
      output: stateSchema,
    },
    pauseGoal: {
      input: sessionInputSchema,
      output: stateSchema,
    },
    resumeGoal: {
      input: sessionInputSchema,
      output: stateSchema,
    },
    clearGoal: {
      input: sessionInputSchema,
      output: stateSchema,
    },
  },
  events: {
    changed: {
      schema: stateSchema,
    },
  },
})
