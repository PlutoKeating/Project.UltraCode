import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cp, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
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
    (definition: { id: string }) => ({
      get: async ({ sessionID }: { sessionID: string }) => {
        if (options.goalState) return options.goalState(sessionID, definition);
        return null;
      },
    }),
    {
      register: async (definition: any, handlers: Record<string, (input: any) => Promise<any>>) => {
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
    return { UltraCodeRpc: rpcMod.UltraCodeRpc, serverPlugin: serverMod.default };
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
      version: "1.1.0",
      checkpoints: {
        ses_long: "1234567890123456789012345678901234567890",
      } as Record<string, string>,
    };
    const clearedSessions: string[] = [];
    const client = {
      rpc: () => ({
        getState: async () => currentServerState,
        setMode: async () => currentServerState,
        toggleMode: async () => currentServerState,
        clearCheckpoint: async ({ sessionID }: { sessionID: string }) => {
          clearedSessions.push(sessionID);
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

      // Session with active checkpoint appends truncated 3rd row with Clear detail
      const activeView = pill.show({ session: { id: "ses_long" } });
      expect(activeView.rows.map((r: any) => r.id)).toEqual(["permissions", "direction", "checkpoint"]);
      expect(activeView.rows[2].label).toBe("Next milestone: 12345678901234567890123456789012345…");
      expect(activeView.rows[2].detail).toBe("Clear");

      activeView.rows[2].run();
      await new Promise((r) => setTimeout(r, 15));
      expect(clearedSessions).toEqual(["ses_long"]);

      const afterClearView = pill.show({ session: { id: "ses_long" } });
      expect(afterClearView.rows.map((r: any) => r.id)).toEqual(["permissions", "direction"]);
    } finally {
      dispose();
    }
  });
});
