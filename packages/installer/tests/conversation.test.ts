import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const installerRoot = fileURLToPath(new URL("..", import.meta.url));
const conversationSrcDir = join(installerRoot, "..", "config", "opencode", "conversation");
const pluginGuiNodeModules = join(installerRoot, "..", "plugin-gui", "node_modules");

interface StorageEntry {
  key: string;
  value: unknown;
}

function createMockStorage(backing = new Map<string, unknown>()) {
  return {
    backing,
    async get(key: string) {
      return backing.get(key);
    },
    async set(key: string, value: unknown) {
      backing.set(key, JSON.parse(JSON.stringify(value)));
    },
    async remove(key: string) {
      backing.delete(key);
    },
    async scan(options: { prefix: string; after?: string; limit?: number }) {
      const limit = options.limit ?? 100;
      const sorted = [...backing.entries()]
        .filter(([key]) => key.startsWith(options.prefix) && (!options.after || key > options.after))
        .sort(([a], [b]) => a.localeCompare(b));
      const slice = sorted.slice(0, limit);
      const entries: StorageEntry[] = slice.map(([key, value]) => ({
        key,
        value: JSON.parse(JSON.stringify(value)),
      }));
      const last = slice[slice.length - 1];
      return {
        entries,
        next: sorted.length > limit && last ? last[0] : undefined,
      };
    },
  };
}

interface MockHarnessOptions {
  storage?: ReturnType<typeof createMockStorage>;
  goalState?: (sessionID: string, rpcDef: { id: string }) => unknown;
  models?: unknown;
}

function createMockContext(directory: string, options: MockHarnessOptions = {}) {
  const storage = options.storage ?? createMockStorage();
  const emitted: Array<{ event: string; data: any }> = [];
  const syntheticCalls: Array<{ sessionID: string; text: string }> = [];
  const promptCalls: Array<{ sessionID: string; text: string }> = [];
  const interruptCalls: string[] = [];
  const sessionRecords = new Map<string, { id: string; parentID?: string; title?: string; agent?: string; location: { directory: string } }>();
  const tools = new Map<string, any>();
  const toolHooks = new Map<string, (event: any) => Promise<void> | void>();
  const commands = new Map<string, any>();
  const agents = new Map<string, any>([
    ["build", { id: "build", hidden: false }],
    ["plan", { id: "plan", hidden: false }],
    ["UltraBuild", { id: "UltraBuild", hidden: false }],
    ["UltraPlan", { id: "UltraPlan", hidden: false }],
  ]);
  let defaultAgent: string | undefined;
  const sessionHooks = new Map<string, (event: any) => Promise<void> | void>();
  const permissionHooks = new Map<string, (event: any) => Promise<void> | void>();
  let rpcHandlers: Record<string, (input: any) => Promise<any>> = {};
  let registeredRpcDef: any = null;
  const registeredRpcs = new Map<string, { definition: any; handlers: Record<string, (input: any) => Promise<any>> }>();
  const eventSubscribers = new Set<(evt: any) => void>();

  const ensureSession = (sessionID: string) => {
    let rec = sessionRecords.get(sessionID);
    if (!rec) {
      rec = { id: sessionID, parentID: undefined, title: undefined, agent: "UltraBuild", location: { directory } };
      sessionRecords.set(sessionID, rec);
    }
    return rec;
  };

  const rpcFn = Object.assign(
    (definition: { id: string; methods: Record<string, unknown>; events: Record<string, unknown> }) => {
      Object.entries(definition.events);
      Object.entries(definition.methods);
      return {
        get: async ({ sessionID }: { sessionID: string }) => {
          if (options.goalState) return options.goalState(sessionID, definition);
          const reg = registeredRpcs.get(definition.id);
          if (reg?.handlers.get) return reg.handlers.get({ sessionID });
          return null;
        },
      };
    },
    {
      register: async (definition: any, handlers: Record<string, (input: any) => Promise<any>>) => {
        Object.entries(definition.events);
        Object.entries(definition.methods);
        registeredRpcs.set(definition.id, { definition, handlers });
        if (definition.id === "ultracode") {
          registeredRpcDef = definition;
          rpcHandlers = handlers;
        }
        return {
          events: {
            emit: async (event: string, data: any) => {
              if (definition.id === "ultracode") {
                emitted.push({ event, data });
              }
            },
          },
          dispose: async () => {},
        };
      },
    },
  );

  const ctx = {
    location: { directory },
    storage,
    rpc: rpcFn,
    agent: {
      transform: async (fn: (editor: any) => void) => {
        fn({
          list: () => [...agents.values()],
          get: (id: string) => agents.get(id),
          default: (id: string | undefined) => {
            if (id && !agents.has(id)) throw new Error(`Unknown agent: ${id}`);
            defaultAgent = id;
          },
          update: (id: string, updater: (agent: any) => void) => {
            const found = agents.get(id);
            if (found) updater(found);
          },
          remove: (id: string) => {
            agents.delete(id);
          },
        });
      },
      reload: async () => {},
    },
    command: {
      transform: async (fn: (editor: { add: (cmd: any) => void }) => void) => {
        fn({
          add(cmd) {
            commands.set(cmd.name, cmd);
          },
        });
      },
      reload: async () => {},
    },
    permission: {
      hook: async (name: string, fn: (event: any) => Promise<void> | void) => {
        permissionHooks.set(name, fn);
      },
    },
    tool: {
      transform: async (fn: (editor: { add: (tool: any) => void }) => void) => {
        fn({
          add(tool) {
            tools.set(tool.name, tool);
          },
        });
      },
      hook: async (name: string, fn: (event: any) => Promise<void> | void) => {
        toolHooks.set(name, fn);
      },
    },
    event: {
      subscribe: (opts?: { signal?: AbortSignal; types?: readonly string[] }) => {
        const queue: any[] = [];
        let resolveNext: ((res: IteratorResult<any>) => void) | null = null;
        let closed = false;
        const push = (evt: any) => {
          if (closed) return;
          if (opts?.types && !opts.types.includes(evt.type)) return;
          if (resolveNext) {
            const r = resolveNext;
            resolveNext = null;
            r({ value: evt, done: false });
          } else {
            queue.push(evt);
          }
        };
        eventSubscribers.add(push);
        const close = () => {
          if (closed) return;
          closed = true;
          eventSubscribers.delete(push);
          if (resolveNext) {
            const r = resolveNext;
            resolveNext = null;
            r({ value: undefined, done: true });
          }
        };
        opts?.signal?.addEventListener("abort", close, { once: true });
        return {
          [Symbol.asyncIterator]() {
            return {
              next() {
                if (queue.length > 0) return Promise.resolve({ value: queue.shift(), done: false });
                if (closed) return Promise.resolve({ value: undefined, done: true });
                return new Promise<IteratorResult<any>>((res) => {
                  resolveNext = res;
                });
              },
              return() {
                close();
                return Promise.resolve({ value: undefined, done: true });
              },
            };
          },
        };
      },
    },
    session: {
      hook: async (name: string, fn: (event: any) => Promise<void> | void) => {
        sessionHooks.set(name, fn);
      },
      get: async ({ sessionID }: { sessionID: string }) => ensureSession(sessionID),
      update: async ({ sessionID, title }: { sessionID: string; title?: string }) => {
        const rec = ensureSession(sessionID);
        if (title !== undefined) rec.title = title;
      },
      prompt: async (call: { sessionID: string; text: string }) => {
        promptCalls.push(call);
        return { id: "msg_1" };
      },
      synthetic: async (call: { sessionID: string; text: string }) => {
        syntheticCalls.push(call);
      },
      interrupt: async ({ sessionID }: { sessionID: string }) => {
        interruptCalls.push(sessionID);
      },
      switchModel: async () => {},
    },
    model: {
      list: async () =>
        options.models ?? {
          location: { directory },
          data: [{ providerID: "test", id: "m1", enabled: true }],
        },
    },
  };

  return {
    ctx,
    storage,
    emitted,
    syntheticCalls,
    promptCalls,
    interruptCalls,
    sessionRecords,
    tools,
    toolHooks,
    commands,
    agents,
    get defaultAgent() {
      return defaultAgent;
    },
    sessionHooks,
    permissionHooks,
    registeredRpcs,
    emitHostEvent: async (evt: any) => {
      for (const sub of [...eventSubscribers]) sub(evt);
      await new Promise((r) => setTimeout(r, 10));
    },
    get rpcHandlers() {
      return rpcHandlers;
    },
    get registeredRpcDef() {
      return registeredRpcDef;
    },
  };
}

describe("ultracode-conversation durable checkpoints, circuit breaker, and /goal coexistence", () => {
  let root = "";
  let previousHome: string | undefined;
  let instanceCounter = 0;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ultracode-conversation-test-"));
    previousHome = process.env.ULTRACODE_HOME;
    process.env.ULTRACODE_HOME = join(root, "ultracode-home");
    await symlink(
      pluginGuiNodeModules,
      join(root, "node_modules"),
      process.platform === "win32" ? "junction" : "dir",
    );
    delete (globalThis as Record<string, unknown>).__ultracodeBootID;
    delete (globalThis as Record<string, unknown>).__ultracodeCheckpoints;
  });

  afterEach(async () => {
    if (previousHome === undefined) delete process.env.ULTRACODE_HOME;
    else process.env.ULTRACODE_HOME = previousHome;
    delete (globalThis as Record<string, unknown>).__ultracodeBootID;
    delete (globalThis as Record<string, unknown>).__ultracodeCheckpoints;
    await rm(root, { recursive: true, force: true });
  });

  async function importFreshConversation(options: { newServerProcess?: boolean } = {}) {
    if (options.newServerProcess) {
      delete (globalThis as Record<string, unknown>).__ultracodeBootID;
    }
    const dir = join(root, `conv-${++instanceCounter}`);
    await cp(conversationSrcDir, dir, { recursive: true });
    const rpcMod = await import(pathToFileURL(join(dir, "rpc.js")).href);
    const serverMod = await import(pathToFileURL(join(dir, "server.js")).href);
    return {
      UltraCodeRpc: rpcMod.UltraCodeRpc,
      OpencodeGoalRpc: serverMod.OpencodeGoalRpc,
      MAX_GOAL_ROUNDS: serverMod.MAX_GOAL_ROUNDS,
      MAX_CHECKPOINT_ROUNDS: serverMod.MAX_CHECKPOINT_ROUNDS,
      MAX_CHECKPOINT_STALLS: serverMod.MAX_CHECKPOINT_STALLS,
      serverPlugin: serverMod.default,
    };
  }

  test("persists scheduled checkpoint in unified goal:<sessionID> storage, exposes checkpoints & goals in getState(), and fires synthetic on idle", async () => {
    const { UltraCodeRpc, MAX_GOAL_ROUNDS, MAX_CHECKPOINT_ROUNDS, serverPlugin } = await importFreshConversation({
      newServerProcess: true,
    });
    expect(MAX_GOAL_ROUNDS).toBe(60);
    expect(MAX_CHECKPOINT_ROUNDS).toBe(60);
    expect(UltraCodeRpc.methods.clearCheckpoint).toBeDefined();
    expect(UltraCodeRpc.methods.pauseGoal).toBeDefined();
    expect(UltraCodeRpc.methods.resumeGoal).toBeDefined();
    expect(UltraCodeRpc.methods.clearGoal).toBeDefined();
    expect(UltraCodeRpc.methods.getState.output.properties.checkpoints).toEqual({
      type: "object",
      additionalProperties: { type: "string" },
    });
    expect(UltraCodeRpc.methods.getState.output.properties.goals).toBeDefined();

    const harness = createMockContext(root);
    const cleanup = await serverPlugin.setup(harness.ctx);

    try {
      const checkpointTool = harness.tools.get("ultracode_checkpoint");
      expect(checkpointTool).toBeDefined();

      const res = await checkpointTool.execute({ next: "  Verify API schema  " }, { sessionID: "ses_alpha" });
      expect(res.content).toBe("Next milestone recorded.");

      const stored = harness.storage.backing.get("goal:ses_alpha") as Record<string, unknown> | undefined;
      expect(stored).toBeDefined();
      expect(stored?.nextMilestone).toBe("Verify API schema");
      expect(typeof stored?.bootID).toBe("string");

      const state = await harness.rpcHandlers.getState!({});
      expect(state.checkpoints).toEqual({ ses_alpha: "Verify API schema" });
      expect(harness.emitted[harness.emitted.length - 1]?.data.checkpoints).toEqual({
        ses_alpha: "Verify API schema",
      });

      const idleHook = harness.sessionHooks.get("experimental.idle")!;
      // Background job running for this session -> must wait
      await idleHook({ sessionID: "ses_alpha", background: [{ sessionID: "ses_alpha" }] });
      expect(harness.syntheticCalls).toHaveLength(0);

      // Background clear -> fires synthetic once and clears active nextMilestone
      await idleHook({ sessionID: "ses_alpha", background: [] });
      expect(harness.syntheticCalls).toEqual([
        {
          sessionID: "ses_alpha",
          text: "Continue the authorized goal from the latest handoff: Verify API schema",
        },
      ]);

      const stateAfterIdle = await harness.rpcHandlers.getState!({});
      expect(stateAfterIdle.checkpoints).toEqual({});
    } finally {
      await cleanup?.();
    }
  });

  test("purges stale implicit checkpoints from previous bootID while transitioning explicit /goal entries to paused on server restart", async () => {
    const sharedStorage = createMockStorage();
    await sharedStorage.set("goal:ses_stale_setup", {
      id: "g_imp",
      objective: "From crashed server",
      status: "active",
      explicit: false,
      nextMilestone: "From crashed server",
      bootID: "boot-old-process",
      rounds: 1,
      maxRounds: 60,
      stalls: 0,
      lastMilestone: "From crashed server",
      updatedAt: Date.now() - 10_000,
    });
    await sharedStorage.set("goal:ses_explicit_restart", {
      id: "g_exp",
      objective: "Ship billing service",
      status: "active",
      explicit: true,
      nextMilestone: "Run integration tests",
      bootID: "boot-old-process",
      rounds: 4,
      maxRounds: 60,
      stalls: 0,
      lastMilestone: "Run integration tests",
      updatedAt: Date.now() - 5_000,
    });

    const first = await importFreshConversation({ newServerProcess: true });
    const harness1 = createMockContext(root, { storage: sharedStorage });
    const c1 = await first.serverPlugin.setup(harness1.ctx);

    try {
      // Stale implicit checkpoint from old bootID was purged on setup
      expect(sharedStorage.backing.has("goal:ses_stale_setup")).toBe(false);
      // Explicit /goal from old bootID was transitioned to paused (NOT deleted!)
      const pausedExplicit = sharedStorage.backing.get("goal:ses_explicit_restart") as any;
      expect(pausedExplicit?.status).toBe("paused");
      expect(pausedExplicit?.objective).toBe("Ship billing service");

      const state1 = await harness1.rpcHandlers.getState!({});
      expect(state1.goals.ses_explicit_restart).toMatchObject({
        id: "g_exp",
        objective: "Ship billing service",
        status: "paused",
        rounds: 4,
        maxRounds: 60,
      });

      // Resume via UltraCodeRpc.resumeGoal under the new BOOT_ID
      const resumedState = await harness1.rpcHandlers.resumeGoal!({ sessionID: "ses_explicit_restart" });
      expect(resumedState.goals.ses_explicit_restart.status).toBe("active");
      expect(harness1.syntheticCalls.some((c) => c.sessionID === "ses_explicit_restart")).toBe(true);

      // Schedule valid implicit checkpoint on current process bootID
      await harness1.tools.get("ultracode_checkpoint").execute({ next: "Hot reload safe" }, { sessionID: "ses_live" });

      // Simulate hot location reload in the SAME server process (same globalThis.__ultracodeBootID)
      const reloaded = await importFreshConversation({ newServerProcess: false });
      const harnessReload = createMockContext(root, { storage: sharedStorage });
      const c2 = await reloaded.serverPlugin.setup(harnessReload.ctx);
      try {
        expect((await harnessReload.rpcHandlers.getState!({})).checkpoints.ses_live).toBe("Hot reload safe");
      } finally {
        await c2?.();
      }
    } finally {
      await c1?.();
    }
  });

  test("trips circuit breaker on 3 consecutive identical milestones or 60 rounds, and resets implicit checkpoint on prompt hook", async () => {
    const { serverPlugin } = await importFreshConversation({ newServerProcess: true });
    const harness = createMockContext(root);
    const cleanup = await serverPlugin.setup(harness.ctx);

    try {
      const checkpointTool = harness.tools.get("ultracode_checkpoint");
      const idleHook = harness.sessionHooks.get("experimental.idle")!;
      const promptHook = harness.sessionHooks.get("prompt")!;

      // 3 consecutive identical milestones on ses_stall
      const r1 = await checkpointTool.execute({ next: "Fix flaky assertion" }, { sessionID: "ses_stall" });
      expect(r1.content).toBe("Next milestone recorded.");
      await idleHook({ sessionID: "ses_stall", background: [] });

      const r2 = await checkpointTool.execute({ next: "Fix flaky assertion" }, { sessionID: "ses_stall" });
      expect(r2.content).toBe("Next milestone recorded.");
      await idleHook({ sessionID: "ses_stall", background: [] });
      expect(harness.syntheticCalls).toHaveLength(2);

      const r3 = await checkpointTool.execute({ next: "Fix flaky assertion" }, { sessionID: "ses_stall" });
      expect(r3.content.toLowerCase()).toContain("circuit breaker");
      expect((await harness.rpcHandlers.getState!({})).checkpoints).toEqual({});

      await idleHook({ sessionID: "ses_stall", background: [] });
      expect(harness.syntheticCalls).toHaveLength(2);

      // Fresh user prompt resets counters and clears implicit checkpoint
      await promptHook({ sessionID: "ses_stall" });
      const afterReset = await checkpointTool.execute({ next: "Fix flaky assertion" }, { sessionID: "ses_stall" });
      expect(afterReset.content).toBe("Next milestone recorded.");
      await promptHook({ sessionID: "ses_stall" });
      expect((await harness.rpcHandlers.getState!({})).checkpoints).toEqual({});

      // 60-round cap on ses_rounds
      const beforeCount = harness.syntheticCalls.length;
      for (let i = 1; i <= 60; i++) {
        const res = await checkpointTool.execute({ next: `Milestone #${i}` }, { sessionID: "ses_rounds" });
        expect(res.content).toBe("Next milestone recorded.");
        await idleHook({ sessionID: "ses_rounds", background: [] });
      }
      expect(harness.syntheticCalls.length - beforeCount).toBe(60);

      const r61 = await checkpointTool.execute({ next: "Milestone #61" }, { sessionID: "ses_rounds" });
      expect(r61.content.toLowerCase()).toContain("circuit breaker");
      await idleHook({ sessionID: "ses_rounds", background: [] });
      expect(harness.syntheticCalls.length - beforeCount).toBe(60);
    } finally {
      await cleanup?.();
    }
  });

  test("registers OpencodeGoalRpc (id: 'opencode.goal') null-stub so stock OpenCode Goal pills stay hidden without retry storms", async () => {
    const { OpencodeGoalRpc, serverPlugin } = await importFreshConversation({ newServerProcess: true });
    expect(OpencodeGoalRpc.id).toBe("opencode.goal");
    expect(OpencodeGoalRpc.events.changed).toBeDefined();

    const harness = createMockContext(root);
    const cleanup = await serverPlugin.setup(harness.ctx);
    try {
      const stub = harness.registeredRpcs.get("opencode.goal");
      expect(stub).toBeDefined();
      expect(await stub!.handlers.get!({ sessionID: "ses_any" })).toBeNull();

      // Also works with real @opencode/client makeRpc
      const { makeRpc } = await import(
        pathToFileURL(join(pluginGuiNodeModules, "@opencode", "client", "dist", "promise", "rpc.js")).href
      );
      const realRpc = makeRpc(
        {
          rpc: {
            call: async (req: any) => ({
              output: await stub!.handlers[req.method]!(req.input),
            }),
          },
        },
        {
          subscribe: async function* () {},
        },
      );
      const goalClient = realRpc(OpencodeGoalRpc);
      expect(await goalClient.get({ sessionID: "ses_real_rpc" })).toBeNull();
    } finally {
      await cleanup?.();
    }
  });

  test("mid-turn empty checkpoint ({ next: '' }) preserves rounds and stalls without prompt hook and still trips MAX_CHECKPOINT_STALLS = 3", async () => {
    const { MAX_CHECKPOINT_STALLS, serverPlugin } = await importFreshConversation({ newServerProcess: true });
    expect(MAX_CHECKPOINT_STALLS).toBe(3);

    const harness = createMockContext(root);
    const cleanup = await serverPlugin.setup(harness.ctx);
    try {
      const checkpointTool = harness.tools.get("ultracode_checkpoint");
      const idleHook = harness.sessionHooks.get("experimental.idle")!;

      await checkpointTool.execute({ next: "warmup step" }, { sessionID: "ses_midclear" });
      await idleHook({ sessionID: "ses_midclear", background: [] });
      expect((harness.storage.backing.get("goal:ses_midclear") as any)?.rounds).toBe(1);

      const a1 = await checkpointTool.execute({ next: "step A" }, { sessionID: "ses_midclear" });
      expect(a1.content).toBe("Next milestone recorded.");

      const c1 = await checkpointTool.execute({ next: "" }, { sessionID: "ses_midclear" });
      expect(c1.content).toBe("Continuation cleared.");
      expect((await harness.rpcHandlers.getState!({})).checkpoints).toEqual({});
      expect(harness.storage.backing.get("goal:ses_midclear")).toMatchObject({
        nextMilestone: "",
        rounds: 1,
        stalls: 1,
        lastMilestone: "step A",
      });

      const a2 = await checkpointTool.execute({ next: "step A" }, { sessionID: "ses_midclear" });
      expect(a2.content).toBe("Next milestone recorded.");

      const c2 = await checkpointTool.execute({ next: "" }, { sessionID: "ses_midclear" });
      expect(c2.content).toBe("Continuation cleared.");
      expect((await harness.rpcHandlers.getState!({})).checkpoints).toEqual({});
      expect(harness.storage.backing.get("goal:ses_midclear")).toMatchObject({
        nextMilestone: "",
        rounds: 1,
        stalls: 2,
        lastMilestone: "step A",
      });

      const a3 = await checkpointTool.execute({ next: "step A" }, { sessionID: "ses_midclear" });
      expect(a3.content.toLowerCase()).toContain("circuit breaker");
      expect(a3.content.toLowerCase()).toContain("repeated identical milestone");
    } finally {
      await cleanup?.();
    }
  });

  test("clearCheckpoint and clearGoal remove goal:<sessionID> from ctx.storage and emit changed", async () => {
    const { serverPlugin } = await importFreshConversation({ newServerProcess: true });
    const harness = createMockContext(root);
    const cleanup = await serverPlugin.setup(harness.ctx);
    try {
      await harness.tools.get("ultracode_checkpoint").execute({ next: "Pending work" }, { sessionID: "ses_clear" });
      expect(harness.storage.backing.has("goal:ses_clear")).toBe(true);

      harness.emitted.length = 0;
      const clearedState = await harness.rpcHandlers.clearCheckpoint!({ sessionID: "ses_clear" });
      expect(harness.storage.backing.has("goal:ses_clear")).toBe(false);
      expect(clearedState.checkpoints).toEqual({});
      expect(harness.emitted).toHaveLength(1);
    } finally {
      await cleanup?.();
    }
  });

  test("/goal creates active goal, titles untitled session, respects direction manual vs --auto, handles question lifecycle, user interrupt, premature completion gate, post-compaction anchor, agent hiding, UltraPlan->UltraBuild transition, and /review", async () => {
    const { serverPlugin } = await importFreshConversation({ newServerProcess: true });
    const workDir = join(root, "goal-workspace");
    await mkdir(join(workDir, ".opencode", "ultracode"), { recursive: true });
    const harness = createMockContext(workDir);
    // Verify ctx.agent.transform does NOT fail even if UltraBuild is not yet loaded before post phase
    harness.agents.delete("UltraBuild");
    const cleanup = await serverPlugin.setup(harness.ctx);

    try {
      // 1. Built-in build & plan hidden; no throw when UltraBuild absent during early plugin phase
      expect(harness.agents.get("build")?.hidden).toBe(true);
      expect(harness.agents.get("plan")?.hidden).toBe(true);

      // Also verify ultracode_model works with OpenCode v2.4.1 { location, data: [...] } ModelListOutput shape
      const modelListOut = await harness.tools.get("ultracode_model").execute({}, { sessionID: "ses_g1" });
      expect(modelListOut.content).toBe("test/m1");

      // 2. /goal in manual direction mode creates goal:ses_g1, titles untitled session, and kicks off with question/prior-art guidance
      const goalCmd = harness.commands.get("goal");
      expect(goalCmd).toBeDefined();
      await goalCmd.execute({
        sessionID: "ses_g1",
        prompt: { text: "Build an offline Pomodoro web app" },
        delivery: "queue",
      });

      expect(harness.sessionRecords.get("ses_g1")?.title).toBe("Build an offline Pomodoro web app");
      expect(harness.promptCalls).toHaveLength(1);
      expect(harness.promptCalls[0]?.text).toContain("question");
      const stateActive = await harness.rpcHandlers.getState!({});
      expect(stateActive.goals.ses_g1).toMatchObject({
        objective: "Build an offline Pomodoro web app",
        status: "active",
        rounds: 0,
        maxRounds: 60,
      });

      // /goal --auto skips manual question prompt and uses autonomous direction
      await goalCmd.execute({
        sessionID: "ses_g_auto",
        prompt: { text: "--auto Migrate legacy config parser" },
        delivery: "queue",
      });
      expect(harness.promptCalls[1]?.text.toLowerCase()).toContain("autonomous");

      // 3. question tool lifecycle on active /goal:
      // Case A: completed question resets awaitingUserQuestion immediately so idle continuation proceeds
      const beforeTool = harness.toolHooks.get("execute.before")!;
      const afterTool = harness.toolHooks.get("execute.after")!;
      const idleHook = harness.sessionHooks.get("experimental.idle")!;
      const promptHook = harness.sessionHooks.get("prompt")!;

      await beforeTool({ tool: "question", sessionID: "ses_g1", id: "call_q1", input: {} });
      await afterTool({
        tool: "question",
        sessionID: "ses_g1",
        id: "call_q1",
        input: {},
        status: "completed",
        result: { content: "Selected Option A" },
      });
      await idleHook({ sessionID: "ses_g1", background: [] });
      expect(harness.syntheticCalls.length).toBe(1);

      // Case B: errored/cancelled question keeps awaitingUserQuestion = true until user sends prompt, and prompt NEVER deletes active /goal!
      await beforeTool({ tool: "question", sessionID: "ses_g1", id: "call_q2", input: {} });
      await afterTool({
        tool: "question",
        sessionID: "ses_g1",
        id: "call_q2",
        input: {},
        status: "error",
        error: new Error("User dismissed"),
      });
      const countBeforeDismissedIdle = harness.syntheticCalls.length;
      await idleHook({ sessionID: "ses_g1", background: [] });
      expect(harness.syntheticCalls.length).toBe(countBeforeDismissedIdle);

      await promptHook({ sessionID: "ses_g1", prompt: { text: "Use SQLite and dark mode" } });
      expect((await harness.rpcHandlers.getState!({})).goals.ses_g1.status).toBe("active");

      // 4. Premature completion blocked by evaluateWorkspaceGate + 3-stall circuit breaker into paused
      await writeFile(
        join(workDir, ".opencode", "ultracode", "FEATURE_LIST.json"),
        JSON.stringify({ features: [{ id: "F-101", description: "Timer countdown", passes: false }] }, null, 2),
      );
      const countBeforeGate = harness.syntheticCalls.length;
      await idleHook({ sessionID: "ses_g1", background: [] });
      expect(harness.syntheticCalls.length).toBe(countBeforeGate + 1);
      expect(harness.syntheticCalls[harness.syntheticCalls.length - 1]?.text).toContain("F-101");

      await idleHook({ sessionID: "ses_g1", background: [] });
      expect(harness.syntheticCalls.length).toBe(countBeforeGate + 2);

      // 3rd identical gate failure trips circuit breaker into status: "paused"
      await idleHook({ sessionID: "ses_g1", background: [] });
      expect(harness.syntheticCalls.length).toBe(countBeforeGate + 2);
      const pausedByGate = (await harness.rpcHandlers.getState!({})).goals.ses_g1;
      expect(pausedByGate.status).toBe("paused");
      expect(pausedByGate.reason.toLowerCase()).toContain("circuit breaker");

      // Resume + verify feature via ultracode_task_graph -> next idle transitions goal to "complete"
      await goalCmd.execute({ sessionID: "ses_g1", prompt: { text: "resume" }, delivery: "queue" });
      expect((await harness.rpcHandlers.getState!({})).goals.ses_g1.status).toBe("active");

      // 5. Post-compaction context hook splices round-invariant <ultracode_goal_anchor> at index Math.min(1, messages.length) without mutating last message
      const contextHook = harness.sessionHooks.get("context")!;
      const summaryMsg = { role: "user", content: [{ type: "text", text: "Compacted summary without objective tag" }] };
      const lastMsg = { role: "user", content: [{ type: "text", text: "Continue step" }] };
      const ctxEvent = {
        sessionID: "ses_g1",
        agent: "UltraPlan",
        system: [] as any[],
        messages: [summaryMsg, lastMsg],
      };
      await contextHook(ctxEvent);
      expect(ctxEvent.messages).toHaveLength(3);
      expect(ctxEvent.messages[0]).toBe(summaryMsg);
      expect(ctxEvent.messages[2]).toBe(lastMsg);
      expect(ctxEvent.messages[2]!.content[0]!.text).toBe("Continue step");
      expect(ctxEvent.messages[1]!.content[0]!.text).toContain("<ultracode_goal_anchor>");

      // Switching from UltraPlan to UltraBuild injects <system-update> lifting read-only restriction
      const ctxEventBuild = {
        sessionID: "ses_g1",
        agent: "UltraBuild",
        system: [] as any[],
        messages: ctxEvent.messages,
      };
      await contextHook(ctxEventBuild);
      expect(ctxEventBuild.system.some((s) => s.text.includes("<system-update>"))).toBe(true);
      // Anchor was not duplicated when already present in messages
      expect(ctxEventBuild.messages).toHaveLength(3);

      // Complete F-101 via ultracode_task_graph tool and confirm idle marks goal complete
      const graphTool = harness.tools.get("ultracode_task_graph");
      expect(graphTool).toBeDefined();
      const verRes = await graphTool.execute(
        {
          action: "verify",
          featureID: "F-101",
          executedCommand: "bun test",
          evidenceSummary: "Timer verified",
        },
        { sessionID: "ses_g1" },
      );
      expect(verRes.content).toContain("Verified feature F-101");
      await idleHook({ sessionID: "ses_g1", background: [] });
      expect((await harness.rpcHandlers.getState!({})).goals.ses_g1.status).toBe("complete");

      // 6. User interrupt transitions active goal to paused
      await harness.emitHostEvent({
        type: "session.execution.interrupted",
        data: { sessionID: "ses_g_auto", reason: "user" },
      });
      expect((await harness.rpcHandlers.getState!({})).goals.ses_g_auto.status).toBe("paused");

      // 7. /review dispatches independent ultracode/reviewer verification prompt
      const reviewCmd = harness.commands.get("review");
      expect(reviewCmd).toBeDefined();
      const promptsBeforeReview = harness.promptCalls.length;
      await reviewCmd.execute({
        sessionID: "ses_g_auto",
        prompt: { text: "main...HEAD" },
        delivery: "queue",
      });
      expect(harness.promptCalls.length).toBe(promptsBeforeReview + 1);
      expect(harness.promptCalls[harness.promptCalls.length - 1]?.text).toContain("ultracode/reviewer");
    } finally {
      await cleanup?.();
    }
  });

  test("built gui-experimental.cjs exposes 6-locale checkpoint strings and session-scoped ComposerPill clear row", async () => {
    const guiCode = await readFile(join(conversationSrcDir, "gui-experimental.cjs"), "utf8");
    const solid = await import(pathToFileURL(join(pluginGuiNodeModules, "solid-js", "dist", "solid.js")).href);
    const guiSdk = await import(
      pathToFileURL(join(pluginGuiNodeModules, "@opencode", "plugin", "dist", "gui", "index.js")).href
    );
    const rpcSdk = await import(
      pathToFileURL(join(pluginGuiNodeModules, "@opencode", "plugin", "dist", "rpc.js")).href
    );

    const hostModules: Record<string, unknown> = {
      "solid-js": solid,
      "solid-js/web": {},
      "@opencode/plugin/gui": guiSdk,
      "@opencode/plugin/rpc": rpcSdk,
    };
    const cjsExports: Record<string, any> = {};
    new Function("exports", "require", guiCode)(cjsExports, (id: string) => {
      if (id in hostModules) return hostModules[id];
      throw new Error(`Unexpected host require: ${id}`);
    });
    const guiPlugin = cjsExports.default;

    for (const locale of ["en", "zh", "ar", "fr", "ru", "es"]) {
      for (const key of [
        "pill.checkpoint",
        "pill.goal.active",
        "pill.goal.paused",
        "pill.goal.complete",
        "pill.pause",
        "pill.resume",
        "pill.clear",
        "command.goal.pause",
        "command.goal.resume",
        "command.goal.clear",
      ]) {
        expect(typeof guiPlugin.i18n[locale]?.[key]).toBe("string");
        expect(guiPlugin.i18n[locale][key].length).toBeGreaterThan(0);
      }
    }

    let currentServerState: any = {
      permissions: "auto",
      direction: "manual",
      version: "1.1.1",
      checkpoints: {
        ses_long: "1234567890123456789012345678901234567890",
      } as Record<string, string>,
      goals: {
        ses_goal_ui: {
          id: "g_ui",
          objective: "Ship full-stack dashboard",
          status: "active",
          nextMilestone: "Verify dark mode contrast",
          rounds: 3,
          maxRounds: 60,
          updatedAt: 1000,
        },
      } as Record<string, any>,
    };
    const clearedCalls: Array<{ sessionID: string; options?: unknown }> = [];
    const goalActionCalls: Array<{ action: string; sessionID: string; options?: unknown }> = [];
    const client = {
      rpc: () => ({
        getState: async () => currentServerState,
        setMode: async () => currentServerState,
        toggleMode: async () => currentServerState,
        clearCheckpoint: async ({ sessionID }: { sessionID: string }, options?: unknown) => {
          clearedCalls.push({ sessionID, options });
          const nextCheckpoints = { ...currentServerState.checkpoints };
          delete nextCheckpoints[sessionID];
          currentServerState = { ...currentServerState, checkpoints: nextCheckpoints };
          return currentServerState;
        },
        pauseGoal: async ({ sessionID }: { sessionID: string }, options?: unknown) => {
          goalActionCalls.push({ action: "pause", sessionID, options });
          currentServerState = {
            ...currentServerState,
            goals: {
              ...currentServerState.goals,
              [sessionID]: { ...currentServerState.goals[sessionID], status: "paused", reason: "Paused by user" },
            },
          };
          return currentServerState;
        },
        resumeGoal: async ({ sessionID }: { sessionID: string }, options?: unknown) => {
          goalActionCalls.push({ action: "resume", sessionID, options });
          currentServerState = {
            ...currentServerState,
            goals: {
              ...currentServerState.goals,
              [sessionID]: { ...currentServerState.goals[sessionID], status: "active", reason: "" },
            },
          };
          return currentServerState;
        },
        clearGoal: async ({ sessionID }: { sessionID: string }, options?: unknown) => {
          goalActionCalls.push({ action: "clear", sessionID, options });
          const nextGoals = { ...currentServerState.goals };
          delete nextGoals[sessionID];
          currentServerState = { ...currentServerState, goals: nextGoals };
          return currentServerState;
        },
        events: {
          on: () => () => {},
        },
      }),
    };

    const contributions = new Map<unknown, any>();
    const commandList: any[] = [];
    const dispose: () => void = solid.createRoot((d: () => void) => {
      guiPlugin.setup({
        client,
        t: (key: string) => guiPlugin.i18n.en[key] ?? key,
        toast: { show: () => {} },
        sessions: { current: () => ({ id: "ses_goal_ui", directory: "/workspace/ui" }) },
        ui: {},
        add: (registry: unknown, item: any) => {
          if (registry === guiSdk.Command) commandList.push(item);
          else contributions.set(registry, item);
        },
      });
      return d;
    });

    try {
      await new Promise((r) => setTimeout(r, 15));
      const pill = contributions.get(guiSdk.ComposerPill);
      expect(pill).toBeDefined();

      // Unscheduled session has only the 2 standard rows
      const otherView = pill.show({ session: { id: "ses_other" } });
      expect(otherView.label).toBe("UltraCode");
      expect(otherView.rows.map((r: any) => r.id)).toEqual(["permissions", "direction"]);

      // Active Goal session shows round count in label and Pause + Clear rows
      const goalActiveView = pill.show({ session: { id: "ses_goal_ui", directory: "/workspace/ui" } });
      expect(goalActiveView.label).toBe("UltraCode · 3/60");
      expect(goalActiveView.tone).toBeUndefined();
      expect(goalActiveView.rows.map((r: any) => r.id)).toEqual(["permissions", "direction", "goal-toggle", "goal-clear"]);
      expect(goalActiveView.rows[2].detail).toBe("Pause");

      // Click Pause -> transitions pill to warning tone with Resume action
      goalActiveView.rows[2].run();
      await new Promise((r) => setTimeout(r, 15));
      const goalPausedView = pill.show({ session: { id: "ses_goal_ui", directory: "/workspace/ui" } });
      expect(goalPausedView.tone).toBe("warning");
      expect(goalPausedView.rows[2].detail).toBe("Resume");

      // Click Resume -> back to active, then Clear -> removes goal rows
      goalPausedView.rows[2].run();
      await new Promise((r) => setTimeout(r, 15));
      expect(pill.show({ session: { id: "ses_goal_ui", directory: "/workspace/ui" } }).label).toBe("UltraCode · 3/60");

      goalPausedView.rows[3].run();
      await new Promise((r) => setTimeout(r, 15));
      expect(pill.show({ session: { id: "ses_goal_ui", directory: "/workspace/ui" } }).rows.map((r: any) => r.id)).toEqual([
        "permissions",
        "direction",
      ]);
      expect(goalActionCalls.map((c) => c.action)).toEqual(["pause", "resume", "clear"]);

      // Bare checkpoint fallback still appends 3rd checkpoint row with Clear detail and forwards { location }
      const activeView = pill.show({ session: { id: "ses_long", directory: "/workspace/alpha" } });
      expect(activeView.rows.map((r: any) => r.id)).toEqual(["permissions", "direction", "checkpoint"]);
      expect(activeView.rows[2].label).toBe("Next milestone: 12345678901234567890123456789012345…");
      expect(activeView.rows[2].detail).toBe("Clear");

      activeView.rows[2].run();
      await new Promise((r) => setTimeout(r, 15));
      expect(clearedCalls).toEqual([
        {
          sessionID: "ses_long",
          options: { location: { directory: "/workspace/alpha" } },
        },
      ]);

      const afterClearView = pill.show({ session: { id: "ses_long", directory: "/workspace/alpha" } });
      expect(afterClearView.rows.map((r: any) => r.id)).toEqual(["permissions", "direction"]);

      // Verify tui.tsx exposes live Goal status slot and Pause/Resume + Clear Goal palette commands
      const tuiCode = await readFile(join(conversationSrcDir, "tui.tsx"), "utf8");
      expect(tuiCode).toContain("prompt.footer.status");
      expect(tuiCode).toContain("pauseGoal");
      expect(tuiCode).toContain("resumeGoal");
      expect(tuiCode).toContain("clearGoal");
    } finally {
      dispose();
    }
  });
});

describe("goal-gate deterministic workspace evidence gate and task graph", () => {
  let workDir = "";

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "ultracode-goal-gate-test-"));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  async function importGoalGate() {
    return import(pathToFileURL(join(conversationSrcDir, "goal-gate.js")).href);
  }

  test("mutateTaskGraph rejects marking a feature verified without executedCommand and evidenceSummary, enforces dependencies, and detects overlapping ownedFiles across in_progress features", async () => {
    const { mutateTaskGraph } = await importGoalGate();

    await mutateTaskGraph(workDir, {
      action: "init",
      featureID: "F-001",
      description: "Auth login endpoint",
      ownedFiles: ["src/auth/**"],
    });
    await mutateTaskGraph(workDir, {
      action: "init",
      featureID: "F-002",
      description: "Auth session middleware",
      dependencies: ["F-001"],
      ownedFiles: ["src/auth/login.ts"],
    });
    await mutateTaskGraph(workDir, {
      action: "init",
      featureID: "F-003",
      description: "Billing webhook",
      ownedFiles: ["src/billing/**"],
    });

    const resBad = await mutateTaskGraph(workDir, {
      action: "verify",
      featureID: "F-001",
      executedCommand: "",
      evidenceSummary: "",
    });
    expect(resBad.ok).toBe(false);
    expect(resBad.content).toContain("executedCommand");

    // Dependency check: F-002 depends on unverified F-001
    const depBlocked = await mutateTaskGraph(workDir, {
      action: "claim",
      featureID: "F-002",
    });
    expect(depBlocked.ok).toBe(false);
    expect(depBlocked.content).toContain("F-001");

    // Claim F-001 owning src/auth/**
    const claim1 = await mutateTaskGraph(workDir, {
      action: "claim",
      featureID: "F-001",
      ownedFiles: ["src/auth/**"],
    });
    expect(claim1.ok).toBe(true);

    // Overlapping claim on src/auth/login.ts while F-001 is in_progress must fail
    const conflict = await mutateTaskGraph(workDir, {
      action: "claim",
      featureID: "F-004",
      ownedFiles: ["src/auth/login.ts"],
    });
    expect(conflict.ok).toBe(false);
    expect(conflict.content).toContain("F-001");

    // Disjoint claim on src/billing/** succeeds in parallel
    const disjoint = await mutateTaskGraph(workDir, {
      action: "claim",
      featureID: "F-003",
      ownedFiles: ["src/billing/**"],
    });
    expect(disjoint.ok).toBe(true);

    // Verify F-001 with real command and evidence releases ownership and unblocks F-002
    const verified1 = await mutateTaskGraph(workDir, {
      action: "verify",
      featureID: "F-001",
      executedCommand: "bun test tests/auth.test.ts",
      evidenceSummary: "4/4 auth tests passed",
      reviewerVerdict: "APPROVE",
    });
    expect(verified1.ok).toBe(true);

    const claim2AfterVerify = await mutateTaskGraph(workDir, {
      action: "claim",
      featureID: "F-002",
      ownedFiles: ["src/auth/login.ts"],
    });
    expect(claim2AfterVerify.ok).toBe(true);
  });

  test("evaluateWorkspaceGate blocks completion when FEATURE_LIST.json has passes:false, empty evidence command, QA_REPORT.md REJECT/FAIL, or unchecked ralph-tasks.md, and passes when all clear", async () => {
    const { evaluateWorkspaceGate, buildGoalAnchor } = await importGoalGate();

    // Empty workspace passes gate cleanly
    const emptyGate = await evaluateWorkspaceGate(workDir);
    expect(emptyGate.ok).toBe(true);
    expect(emptyGate.blockers).toEqual([]);

    await mkdir(join(workDir, ".opencode", "ultracode"), { recursive: true });
    await mkdir(join(workDir, ".ralph"), { recursive: true });

    await writeFile(
      join(workDir, ".opencode", "ultracode", "FEATURE_LIST.json"),
      JSON.stringify(
        {
          features: [
            { id: "F-001", description: "Feature 1", passes: false },
            {
              id: "F-002",
              description: "Feature 2",
              passes: true,
              status: "verified",
              evidence: { executedCommand: "", evidenceSummary: "claimed without running" },
            },
          ],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(workDir, ".opencode", "ultracode", "QA_REPORT.md"),
      "# Independent QA Report\n\n## Verdict\n- Result: REJECT\n\n| Criterion | PASS / FAIL / NOT_VERIFIED |\n| --- | --- |\n| Mobile layout | FAIL |\n",
    );
    await writeFile(join(workDir, ".ralph", "ralph-tasks.md"), "- [x] Done item\n- [ ] Pending task item\n");

    const gate1 = await evaluateWorkspaceGate(workDir);
    expect(gate1.ok).toBe(false);
    expect(gate1.blockers.join("\n")).toContain("F-001");
    expect(gate1.blockers.join("\n")).toContain("F-002");
    expect(gate1.blockers.join("\n")).toContain("REJECT");
    expect(gate1.summary.uncheckedRalphTasks).toBe(1);

    // Deterministic fingerprint for identical blocker state
    const gate1Repeat = await evaluateWorkspaceGate(workDir);
    expect(gate1Repeat.fingerprint).toBe(gate1.fingerprint);

    // Resolve all blockers (and ensure unedited QA_REPORT template phrasing does not false-positive when Result is APPROVE)
    await writeFile(
      join(workDir, ".opencode", "ultracode", "FEATURE_LIST.json"),
      JSON.stringify(
        {
          features: [
            {
              id: "F-001",
              description: "Feature 1",
              passes: true,
              status: "verified",
              evidence: { executedCommand: "bun test", evidenceSummary: "all green" },
            },
            {
              id: "F-002",
              description: "Feature 2",
              passes: true,
              status: "verified",
              evidence: { executedCommand: "bun run check", evidenceSummary: "0 errors" },
            },
          ],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(workDir, ".opencode", "ultracode", "QA_REPORT.md"),
      "# Independent QA Report\n\n## Verdict\n- Result: APPROVE\n\n| Criterion | PASS / FAIL / NOT_VERIFIED |\n| --- | --- |\n| Mobile layout | PASS |\n\nA check not actually executed must be NOT_VERIFIED. Any hard-gate failure requires REJECT.\n",
    );
    await writeFile(join(workDir, ".ralph", "ralph-tasks.md"), "- [x] Done item\n- [x] Pending task item\n");

    const gatePass = await evaluateWorkspaceGate(workDir);
    expect(gatePass.ok).toBe(true);
    expect(gatePass.blockers).toEqual([]);
    expect(gatePass.summary.passedFeatures).toBe(2);
    expect(gatePass.summary.qaVerdict).toBe("APPROVE");
    expect(gatePass.summary.uncheckedRalphTasks).toBe(0);

    // Round- and timestamp-invariant anchor
    const anchorA = buildGoalAnchor({ objective: "Ship Goal Engine 2.0", rounds: 1, updatedAt: 100 } as any);
    const anchorB = buildGoalAnchor({ objective: "Ship Goal Engine 2.0", rounds: 42, updatedAt: 999999 } as any);
    expect(anchorA).toBe(anchorB);
    expect(anchorA).toContain("<ultracode_goal_anchor>");
    expect(anchorA).toContain("<objective>");
    expect(anchorA).toContain("Ship Goal Engine 2.0");
  });
});

describe("first-use model routing onboarding and /setup-models", () => {
  let root = "";
  let prevHome: string | undefined;
  let prevConfigDir: string | undefined;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ultracode-onboarding-test-"));
    prevHome = process.env.ULTRACODE_HOME;
    prevConfigDir = process.env.OPENCODE_CONFIG_DIR;
    process.env.ULTRACODE_HOME = join(root, "ultracode-home");
    process.env.OPENCODE_CONFIG_DIR = join(root, "opencode-config");
    await symlink(
      pluginGuiNodeModules,
      join(root, "node_modules"),
      process.platform === "win32" ? "junction" : "dir",
    );
  });

  afterEach(async () => {
    if (prevHome === undefined) delete process.env.ULTRACODE_HOME;
    else process.env.ULTRACODE_HOME = prevHome;
    if (prevConfigDir === undefined) delete process.env.OPENCODE_CONFIG_DIR;
    else process.env.OPENCODE_CONFIG_DIR = prevConfigDir;
    await rm(root, { recursive: true, force: true });
  });

  test("recommendRoleModels pairs multi-tier model pools accurately and returns null when fewer than 2 models exist", async () => {
    const onboarding = await import(pathToFileURL(join(conversationSrcDir, "onboarding.js")).href);

    expect(onboarding.recommendRoleModels([])).toBeNull();
    expect(onboarding.recommendRoleModels([{ providerID: "anthropic", id: "claude-sonnet-4-6" }])).toBeNull();

    // Google Vertex Carbon / Neon / Hydrogen / Argon pool
    const vertexRec = onboarding.recommendRoleModels([
      { providerID: "google-vertex", id: "gemini-4-carbon", capabilities: { reasoning: true, vision: true } },
      { providerID: "google-vertex", id: "gemini-4-neon", capabilities: { vision: true } },
      { providerID: "google-vertex", id: "gemini-4-hydrogen", capabilities: { vision: true } },
      { providerID: "google-vertex", id: "gemini-4-argon", capabilities: { vision: false } },
    ]);
    expect(vertexRec).not.toBeNull();
    expect(vertexRec.deep).toBe("google-vertex/gemini-4-carbon");
    expect(vertexRec.coding).toBe("google-vertex/gemini-4-neon");
    expect(vertexRec.fast).toBe("google-vertex/gemini-4-hydrogen");
    expect(vertexRec.roles.UltraPlan).toBe("google-vertex/gemini-4-carbon");
    expect(vertexRec.roles["ultracode/architect"]).toBe("google-vertex/gemini-4-carbon");
    expect(vertexRec.roles["ultracode/reviewer"]).toBe("google-vertex/gemini-4-carbon");
    expect(vertexRec.roles.UltraBuild).toBe("google-vertex/gemini-4-neon");
    expect(vertexRec.roles["ultracode/implementer"]).toBe("google-vertex/gemini-4-neon");
    expect(vertexRec.roles["ultracode/librarian"]).toBe("google-vertex/gemini-4-hydrogen");

    // Anthropic Opus / Sonnet / Haiku pool
    const anthropicRec = onboarding.recommendRoleModels([
      { providerID: "anthropic", id: "claude-opus-4-6" },
      { providerID: "anthropic", id: "claude-sonnet-4-6" },
      { providerID: "anthropic", id: "claude-haiku-4-5" },
    ]);
    expect(anthropicRec.deep).toBe("anthropic/claude-opus-4-6");
    expect(anthropicRec.coding).toBe("anthropic/claude-sonnet-4-6");
    expect(anthropicRec.fast).toBe("anthropic/claude-haiku-4-5");
    expect(anthropicRec.visual).toBe("anthropic/claude-sonnet-4-6");

    // OpenAI GPT-6 / Codex / Mini pool
    const openaiRec = onboarding.recommendRoleModels([
      { providerID: "openai", id: "gpt-6" },
      { providerID: "openai", id: "gpt-6-codex" },
      { providerID: "openai", id: "gpt-6-mini" },
    ]);
    expect(openaiRec.deep).toBe("openai/gpt-6");
    expect(openaiRec.coding).toBe("openai/gpt-6-codex");
    expect(openaiRec.fast).toBe("openai/gpt-6-mini");

    // Parity check between embedded onboarding.js and TypeScript model-onboarding.ts
    const tsOnboarding = await import("../src/model-onboarding");
    expect(
      tsOnboarding.recommendRoleModels([
        { providerID: "google-vertex", id: "gemini-4-carbon", capabilities: { reasoning: true, vision: true } },
        { providerID: "google-vertex", id: "gemini-4-neon", capabilities: { vision: true } },
        { providerID: "google-vertex", id: "gemini-4-hydrogen", capabilities: { vision: true } },
        { providerID: "google-vertex", id: "gemini-4-argon", capabilities: { vision: false } },
      ]),
    ).toEqual(vertexRec);
  });

  test("first-session onboarding hint fires at most once, skips child subagents and pre-configured roles, and /setup-models recommended|inherit updates opencode.jsonc in zero tokens preserving comments", async () => {
    const configDir = process.env.OPENCODE_CONFIG_DIR!;
    await mkdir(join(configDir, "agents"), { recursive: true });
    const agentFile = join(configDir, "agents", "UltraBuild.md");
    await writeFile(agentFile, "---\ndescription: unchanged\n---\n");
    const configFile = join(configDir, "opencode.jsonc");
    await writeFile(
      configFile,
      `{
  // preserve top user comment
  "default_agent": "UltraBuild",
  "agents": {
    "build": { "hidden": true },
    "plan": { "hidden": true }
  }
}
`,
    );

    const convDir = join(root, "conv-onboard");
    await cp(conversationSrcDir, convDir, { recursive: true });
    const serverMod = await import(pathToFileURL(join(convDir, "server.js")).href);

    const harness = createMockContext(root, {
      models: {
        location: { directory: root },
        data: [
          { providerID: "anthropic", id: "claude-opus-4-6", enabled: true },
          { providerID: "anthropic", id: "claude-sonnet-4-6", enabled: true },
          { providerID: "anthropic", id: "claude-haiku-4-5", enabled: true },
        ],
      },
    });
    harness.sessionRecords.set("ses_child", {
      id: "ses_child",
      parentID: "ses_root",
      location: { directory: root },
    });

    const cleanup = await serverMod.default.setup(harness.ctx);
    try {
      const contextHook = harness.sessionHooks.get("context")!;

      // Child session NEVER triggers onboarding hint or consumes onboarding.json
      const childSystem: any[] = [];
      await contextHook({ sessionID: "ses_child", agent: "ultracode/implementer", system: childSystem, messages: [] });
      expect(childSystem).toHaveLength(0);

      // First interactive root session fires onboarding hint ONCE
      const rootSystem1: any[] = [];
      await contextHook({ sessionID: "ses_root", agent: "UltraBuild", system: rootSystem1, messages: [] });
      expect(rootSystem1.some((s) => s.text.includes("/setup-models"))).toBe(true);

      // Second turn on root session NEVER fires onboarding hint again
      const rootSystem2: any[] = [];
      await contextHook({ sessionID: "ses_root", agent: "UltraBuild", system: rootSystem2, messages: [] });
      expect(rootSystem2.some((s) => s.text.includes("/setup-models"))).toBe(false);

      // /setup-models recommended writes agents.<role>.model in ZERO tokens while preserving comments and agents/*.md
      const setupCmd = harness.commands.get("setup-models");
      expect(setupCmd).toBeDefined();
      await setupCmd.execute({
        sessionID: "ses_root",
        prompt: { text: "recommended" },
        delivery: "queue",
      });
      expect(harness.promptCalls).toHaveLength(0);
      expect(harness.syntheticCalls).toHaveLength(0);

      const updatedJsonc = await readFile(configFile, "utf8");
      expect(updatedJsonc).toContain("// preserve top user comment");
      const { parseJsonc } = await import("../src/config");
      const parsed = parseJsonc(updatedJsonc) as any;
      expect(parsed.agents.build).toEqual({ hidden: true });
      expect(parsed.agents.UltraPlan.model).toBe("anthropic/claude-opus-4-6");
      expect(parsed.agents.UltraBuild.model).toBe("anthropic/claude-sonnet-4-6");
      expect(parsed.agents["ultracode/librarian"].model).toBe("anthropic/claude-haiku-4-5");
      // Managed agents/*.md file untouched!
      expect(await readFile(agentFile, "utf8")).toBe("---\ndescription: unchanged\n---\n");

      // /setup-models inherit removes only the role model overrides cleanly in zero tokens
      await setupCmd.execute({
        sessionID: "ses_root",
        prompt: { text: "inherit" },
        delivery: "queue",
      });
      const inheritedJsonc = await readFile(configFile, "utf8");
      expect(inheritedJsonc).toContain("// preserve top user comment");
      const parsedInherit = parseJsonc(inheritedJsonc) as any;
      expect(parsedInherit.agents.build).toEqual({ hidden: true });
      expect(parsedInherit.agents.plan).toEqual({ hidden: true });
      expect(parsedInherit.agents.UltraBuild).toBeUndefined();
      expect(parsedInherit.agents["ultracode/librarian"]).toBeUndefined();

      // Fresh onboarding.json + pre-existing agents.UltraBuild.model NEVER fires onboarding hint
      await rm(join(process.env.ULTRACODE_HOME!, "onboarding.json"), { force: true });
      await writeFile(
        configFile,
        `{\n  "agents": {\n    "UltraBuild": { "model": "anthropic/claude-sonnet-4-6" }\n  }\n}\n`,
      );
      const harnessPre = createMockContext(root, {
        models: {
          location: { directory: root },
          data: [
            { providerID: "anthropic", id: "claude-opus-4-6", enabled: true },
            { providerID: "anthropic", id: "claude-sonnet-4-6", enabled: true },
          ],
        },
      });
      const cleanupPre = await serverMod.default.setup(harnessPre.ctx);
      try {
        const preSystem: any[] = [];
        await harnessPre.sessionHooks.get("context")!({
          sessionID: "ses_pre",
          agent: "UltraBuild",
          system: preSystem,
          messages: [],
        });
        expect(preSystem.some((s) => s.text.includes("/setup-models"))).toBe(false);
      } finally {
        await cleanupPre?.();
      }
    } finally {
      await cleanup?.();
    }
  });
});
