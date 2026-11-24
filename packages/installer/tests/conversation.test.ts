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
}

function createMockContext(directory: string, options: MockHarnessOptions = {}) {
  const storage = options.storage ?? createMockStorage();
  const emitted: Array<{ event: string; data: any }> = [];
  const syntheticCalls: Array<{ sessionID: string; text: string }> = [];
  const tools = new Map<string, any>();
  const commands = new Map<string, any>();
  const sessionHooks = new Map<string, (event: any) => Promise<void> | void>();
  const permissionHooks = new Map<string, (event: any) => Promise<void> | void>();
  let rpcHandlers: Record<string, (input: any) => Promise<any>> = {};
  let registeredRpcDef: any = null;

  const rpcFn = Object.assign(
    (definition: { id: string; methods: Record<string, unknown>; events: Record<string, unknown> }) => {
      Object.entries(definition.events);
      Object.entries(definition.methods);
      return {
        get: async ({ sessionID }: { sessionID: string }) => {
          if (options.goalState) return options.goalState(sessionID, definition);
          return null;
        },
      };
    },
    {
      register: async (definition: any, handlers: Record<string, (input: any) => Promise<any>>) => {
        Object.entries(definition.events);
        Object.entries(definition.methods);
        registeredRpcDef = definition;
        rpcHandlers = handlers;
        return {
          events: {
            emit: async (event: string, data: any) => {
              emitted.push({ event, data });
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
    },
    session: {
      hook: async (name: string, fn: (event: any) => Promise<void> | void) => {
        sessionHooks.set(name, fn);
      },
      get: async ({ sessionID }: { sessionID: string }) => ({ id: sessionID, parentID: undefined }),
      synthetic: async (call: { sessionID: string; text: string }) => {
        syntheticCalls.push(call);
      },
      switchModel: async () => {},
    },
    model: {
      list: async () => [{ providerID: "test", id: "m1", enabled: true }],
    },
  };

  return {
    ctx,
    storage,
    emitted,
    syntheticCalls,
    tools,
    commands,
    sessionHooks,
    permissionHooks,
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
      MAX_CHECKPOINT_STALLS: serverMod.MAX_CHECKPOINT_STALLS,
      serverPlugin: serverMod.default,
    };
  }

  test("persists scheduled checkpoint in ctx.storage, exposes it in getState(), and fires synthetic on idle", async () => {
    const { UltraCodeRpc, serverPlugin } = await importFreshConversation({ newServerProcess: true });
    expect(UltraCodeRpc.methods.clearCheckpoint).toBeDefined();
    expect(UltraCodeRpc.methods.getState.output.properties.checkpoints).toEqual({
      type: "object",
      additionalProperties: { type: "string" },
    });

    const harness = createMockContext(root);
    await serverPlugin.setup(harness.ctx);

    const checkpointTool = harness.tools.get("ultracode_checkpoint");
    expect(checkpointTool).toBeDefined();

    const res = await checkpointTool.execute({ next: "  Verify API schema  " }, { sessionID: "ses_alpha" });
    expect(res.content).toBe("Next milestone recorded.");

    const stored = harness.storage.backing.get("checkpoint:ses_alpha") as Record<string, unknown> | undefined;
    expect(stored).toBeDefined();
    expect(stored?.next).toBe("Verify API schema");
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

    // Background clear -> fires synthetic once and clears active next
    await idleHook({ sessionID: "ses_alpha", background: [] });
    expect(harness.syntheticCalls).toEqual([
      {
        sessionID: "ses_alpha",
        text: "Continue the authorized goal from the latest handoff: Verify API schema",
      },
    ]);

    const stateAfterIdle = await harness.rpcHandlers.getState!({});
    expect(stateAfterIdle.checkpoints).toEqual({});
  });

  test("purges stale checkpoints from previous bootID during setup and idle while preserving same-boot reloads", async () => {
    const sharedStorage = createMockStorage();
    await sharedStorage.set("checkpoint:ses_stale_setup", {
      next: "From crashed server",
      bootID: "boot-old-process",
      rounds: 1,
      stalls: 0,
      lastMilestone: "From crashed server",
      updatedAt: Date.now() - 10_000,
    });

    const first = await importFreshConversation({ newServerProcess: true });
    const harness1 = createMockContext(root, { storage: sharedStorage });
    await first.serverPlugin.setup(harness1.ctx);

    // Stale checkpoint from old bootID was purged on setup
    expect(sharedStorage.backing.has("checkpoint:ses_stale_setup")).toBe(false);

    // Schedule valid checkpoint on current process bootID
    await harness1.tools.get("ultracode_checkpoint").execute({ next: "Hot reload safe" }, { sessionID: "ses_live" });

    // Simulate hot location reload in the SAME server process (same globalThis.__ultracodeBootID)
    const reloaded = await importFreshConversation({ newServerProcess: false });
    const harnessReload = createMockContext(root, { storage: sharedStorage });
    await reloaded.serverPlugin.setup(harnessReload.ctx);
    expect((await harnessReload.rpcHandlers.getState!({})).checkpoints).toEqual({
      ses_live: "Hot reload safe",
    });

    // Inject a stale-boot record before idle and verify idle purges it without firing synthetic
    await sharedStorage.set("checkpoint:ses_stale_idle", {
      next: "Injected stale",
      bootID: "another-stale-boot",
      rounds: 0,
      stalls: 0,
      lastMilestone: "Injected stale",
      updatedAt: Date.now(),
    });
    await harnessReload.sessionHooks.get("experimental.idle")!({
      sessionID: "ses_stale_idle",
      background: [],
    });
    expect(harnessReload.syntheticCalls).toHaveLength(0);
    expect(sharedStorage.backing.has("checkpoint:ses_stale_idle")).toBe(false);

    // Simulate FULL server restart (new bootID) -> previously live checkpoint is now stale and purged
    const restarted = await importFreshConversation({ newServerProcess: true });
    const harnessRestart = createMockContext(root, { storage: sharedStorage });
    await restarted.serverPlugin.setup(harnessRestart.ctx);
    expect(sharedStorage.backing.has("checkpoint:ses_live")).toBe(false);
    expect((await harnessRestart.rpcHandlers.getState!({})).checkpoints).toEqual({});
  });

  test("trips circuit breaker on 3 consecutive identical milestones or 25 rounds, and resets on prompt hook", async () => {
    const { serverPlugin } = await importFreshConversation({ newServerProcess: true });
    const harness = createMockContext(root);
    await serverPlugin.setup(harness.ctx);

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

    // Fresh user prompt resets counters and clears active checkpoint
    await promptHook({ sessionID: "ses_stall" });
    const afterReset = await checkpointTool.execute({ next: "Fix flaky assertion" }, { sessionID: "ses_stall" });
    expect(afterReset.content).toBe("Next milestone recorded.");
    await promptHook({ sessionID: "ses_stall" });
    expect((await harness.rpcHandlers.getState!({})).checkpoints).toEqual({});

    // 25-round cap on ses_rounds
    const beforeCount = harness.syntheticCalls.length;
    for (let i = 1; i <= 25; i++) {
      const res = await checkpointTool.execute({ next: `Milestone #${i}` }, { sessionID: "ses_rounds" });
      expect(res.content).toBe("Next milestone recorded.");
      await idleHook({ sessionID: "ses_rounds", background: [] });
    }
    expect(harness.syntheticCalls.length - beforeCount).toBe(25);

    const r26 = await checkpointTool.execute({ next: "Milestone #26" }, { sessionID: "ses_rounds" });
    expect(r26.content.toLowerCase()).toContain("circuit breaker");
    await idleHook({ sessionID: "ses_rounds", background: [] });
    expect(harness.syntheticCalls.length - beforeCount).toBe(25);
  });

  test("defers cleanly to official /goal when opencode.goal reports status active", async () => {
    const { serverPlugin } = await importFreshConversation({ newServerProcess: true });
    let activeGoal = true;
    const queriedDefs: string[] = [];
    const harness = createMockContext(root, {
      goalState: (sessionID, def) => {
        queriedDefs.push(`${def.id}:${sessionID}`);
        return activeGoal ? { id: "g1", status: "active", objective: "Ship feature" } : { id: "g1", status: "paused" };
      },
    });
    await serverPlugin.setup(harness.ctx);

    const checkpointTool = harness.tools.get("ultracode_checkpoint");
    const idleHook = harness.sessionHooks.get("experimental.idle")!;

    await checkpointTool.execute({ next: "Redundant step" }, { sessionID: "ses_goal" });
    expect((await harness.rpcHandlers.getState!({})).checkpoints).toEqual({ ses_goal: "Redundant step" });

    await idleHook({ sessionID: "ses_goal", background: [] });
    expect(queriedDefs).toContain("opencode.goal:ses_goal");
    expect(harness.syntheticCalls).toHaveLength(0);
    expect((await harness.rpcHandlers.getState!({})).checkpoints).toEqual({});

    // When /goal is paused/inactive, ultracode_checkpoint resumes firing normally
    activeGoal = false;
    await checkpointTool.execute({ next: "UltraCode step" }, { sessionID: "ses_goal" });
    await idleHook({ sessionID: "ses_goal", background: [] });
    expect(harness.syntheticCalls).toHaveLength(1);
  });

  test("OpencodeGoalRpc defines events: {}, works with real @opencode/client makeRpc, and idle survives synchronous rpc errors", async () => {
    const { OpencodeGoalRpc, serverPlugin } = await importFreshConversation({ newServerProcess: true });
    expect(OpencodeGoalRpc.events).toEqual({});

    const { makeRpc } = await import(
      pathToFileURL(join(pluginGuiNodeModules, "@opencode", "client", "dist", "promise", "rpc.js")).href
    );
    const rawCalls: any[] = [];
    const realRpc = makeRpc(
      {
        rpc: {
          call: async (req: any) => {
            rawCalls.push(req);
            return { output: { status: "paused" } };
          },
        },
      },
      {
        subscribe: async function* () {},
      },
    );
    const goalClient = realRpc(OpencodeGoalRpc);
    const goalOut = await goalClient.get({ sessionID: "ses_real_rpc" });
    expect(goalOut).toEqual({ status: "paused" });
    expect(rawCalls).toHaveLength(1);
    expect(rawCalls[0]).toMatchObject({
      rpcID: "opencode.goal",
      method: "get",
      input: { sessionID: "ses_real_rpc" },
    });

    const harness = createMockContext(root);
    await serverPlugin.setup(harness.ctx);
    // Simulate a synchronous throw during ctx.rpc(OpencodeGoalRpc) client construction
    harness.ctx.rpc = Object.assign(
      () => {
        throw new Error("Simulated synchronous client-construction failure");
      },
      { register: harness.ctx.rpc.register },
    ) as any;

    await harness.tools.get("ultracode_checkpoint").execute({ next: "Survive sync rpc throw" }, { sessionID: "ses_sync_err" });
    await harness.sessionHooks.get("experimental.idle")!({ sessionID: "ses_sync_err", background: [] });
    expect(harness.syntheticCalls).toEqual([
      {
        sessionID: "ses_sync_err",
        text: "Continue the authorized goal from the latest handoff: Survive sync rpc throw",
      },
    ]);
  });

  test("mid-turn empty checkpoint ({ next: '' }) preserves rounds and stalls without prompt hook and still trips MAX_CHECKPOINT_STALLS = 3", async () => {
    const { MAX_CHECKPOINT_STALLS, serverPlugin } = await importFreshConversation({ newServerProcess: true });
    expect(MAX_CHECKPOINT_STALLS).toBe(3);

    const harness = createMockContext(root);
    await serverPlugin.setup(harness.ctx);
    const checkpointTool = harness.tools.get("ultracode_checkpoint");
    const idleHook = harness.sessionHooks.get("experimental.idle")!;

    // Advance 1 round so rounds === 1 before mid-turn clear/re-arm attempts
    await checkpointTool.execute({ next: "warmup step" }, { sessionID: "ses_midclear" });
    await idleHook({ sessionID: "ses_midclear", background: [] });
    expect((harness.storage.backing.get("checkpoint:ses_midclear") as any)?.rounds).toBe(1);

    const a1 = await checkpointTool.execute({ next: "step A" }, { sessionID: "ses_midclear" });
    expect(a1.content).toBe("Next milestone recorded.");

    const c1 = await checkpointTool.execute({ next: "" }, { sessionID: "ses_midclear" });
    expect(c1.content).toBe("Continuation cleared.");
    expect((await harness.rpcHandlers.getState!({})).checkpoints).toEqual({});
    expect(harness.storage.backing.get("checkpoint:ses_midclear")).toMatchObject({
      next: "",
      rounds: 1,
      stalls: 1,
      lastMilestone: "step A",
    });

    const a2 = await checkpointTool.execute({ next: "step A" }, { sessionID: "ses_midclear" });
    expect(a2.content).toBe("Next milestone recorded.");

    const c2 = await checkpointTool.execute({ next: "" }, { sessionID: "ses_midclear" });
    expect(c2.content).toBe("Continuation cleared.");
    expect((await harness.rpcHandlers.getState!({})).checkpoints).toEqual({});
    expect(harness.storage.backing.get("checkpoint:ses_midclear")).toMatchObject({
      next: "",
      rounds: 1,
      stalls: 2,
      lastMilestone: "step A",
    });

    const a3 = await checkpointTool.execute({ next: "step A" }, { sessionID: "ses_midclear" });
    expect(a3.content.toLowerCase()).toContain("circuit breaker");
    expect(a3.content.toLowerCase()).toContain("repeated identical milestone");
    expect(harness.storage.backing.get("checkpoint:ses_midclear")).toMatchObject({
      next: "",
      rounds: 1,
      stalls: 3,
      lastMilestone: "step A",
    });
  });

  test("clearCheckpoint removes checkpoint:<sessionID> from ctx.storage and emits changed with empty checkpoints", async () => {
    const { serverPlugin } = await importFreshConversation({ newServerProcess: true });
    const harness = createMockContext(root);
    await serverPlugin.setup(harness.ctx);

    await harness.tools.get("ultracode_checkpoint").execute({ next: "Pending work" }, { sessionID: "ses_clear" });
    expect(harness.storage.backing.has("checkpoint:ses_clear")).toBe(true);

    harness.emitted.length = 0;
    const clearedState = await harness.rpcHandlers.clearCheckpoint!({ sessionID: "ses_clear" });
    expect(harness.storage.backing.has("checkpoint:ses_clear")).toBe(false);
    expect(clearedState.checkpoints).toEqual({});
    expect(harness.emitted).toHaveLength(1);
    expect(harness.emitted[0]).toEqual({
      event: "changed",
      data: clearedState,
    });
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

    expect(guiPlugin.i18n.en["pill.checkpoint"]).toBe("Next milestone");
    expect(guiPlugin.i18n.en["pill.clear"]).toBe("Clear");
    expect(guiPlugin.i18n.zh["pill.checkpoint"]).toBe("下一里程碑");
    expect(guiPlugin.i18n.zh["pill.clear"]).toBe("清除");
    expect(guiPlugin.i18n.ar["pill.checkpoint"]).toBe("المرحلة التالية");
    expect(guiPlugin.i18n.ar["pill.clear"]).toBe("مسح");
    expect(guiPlugin.i18n.fr["pill.checkpoint"]).toBe("Prochaine étape");
    expect(guiPlugin.i18n.fr["pill.clear"]).toBe("Effacer");
    expect(guiPlugin.i18n.ru["pill.checkpoint"]).toBe("Следующий этап");
    expect(guiPlugin.i18n.ru["pill.clear"]).toBe("Очистить");
    expect(guiPlugin.i18n.es["pill.checkpoint"]).toBe("Siguiente hito");
    expect(guiPlugin.i18n.es["pill.clear"]).toBe("Limpiar");

    let currentServerState = {
      permissions: "auto",
      direction: "manual",
      version: "1.1.1",
      checkpoints: {
        ses_long: "1234567890123456789012345678901234567890",
      } as Record<string, string>,
    };
    const clearedCalls: Array<{ sessionID: string; options?: unknown }> = [];
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
        events: {
          on: () => () => {},
        },
      }),
    };

    const contributions = new Map<unknown, any>();
    const dispose: () => void = solid.createRoot((d: () => void) => {
      guiPlugin.setup({
        client,
        t: (key: string) => guiPlugin.i18n.en[key] ?? key,
        toast: { show: () => {} },
        ui: {},
        add: (registry: unknown, item: any) => {
          contributions.set(registry, item);
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
      expect(otherView.rows.map((r: any) => r.id)).toEqual(["permissions", "direction"]);

      // Session with active checkpoint appends truncated 3rd row with Clear detail and forwards { location }
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
