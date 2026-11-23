import { createSignal, onCleanup } from "solid-js";
import { Command, ComposerPill, createKeyed, Plugin, SettingsPage } from "@opencode/plugin/gui";
import { UltraCodeRpc } from "../../config/opencode/conversation/rpc.js";

type ModeValue = "auto" | "manual";
type ModeKey = "permissions" | "direction";
interface UltraCodeState {
  permissions: ModeValue;
  direction: ModeValue;
}

function normalizeState(raw: unknown): UltraCodeState {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    permissions: obj.permissions === "manual" ? "manual" : "auto",
    direction: obj.direction === "auto" ? "auto" : "manual",
  };
}

export default Plugin.define({
  i18n: {
    en: {
      "pill.permissions": "Auto-approve",
      "pill.direction": "Ask on direction",
      "settings.permissions": "Command approvals",
      "settings.direction": "Direction questions",
      "command.permissions": "Toggle Command approvals",
      "command.direction": "Toggle Direction questions",
      "error.sync": "Could not update UltraCode mode",
      "state.on": "On",
      "state.off": "Off",
    },
    zh: {
      "pill.permissions": "自动执行",
      "pill.direction": "关键点确认",
      "settings.permissions": "命令自动执行",
      "settings.direction": "关键方向确认",
      "command.permissions": "切换命令自动执行",
      "command.direction": "切换关键方向确认",
      "error.sync": "无法更新 UltraCode 模式",
      "state.on": "开启",
      "state.off": "关闭",
    },
  },
  setup(ctx) {
    const [state, setState] = createSignal<UltraCodeState>({
      permissions: "auto",
      direction: "manual",
    });

    createKeyed(
      () => ctx.client,
      (client) => {
        const controller = new AbortController();
        const rpc = client.rpc(UltraCodeRpc);

        const loadInitialState = async () => {
          for (let attempt = 0; attempt < 6; attempt++) {
            if (controller.signal.aborted) return;
            try {
              const next = await rpc.getState({}, { signal: controller.signal } as any);
              if (!controller.signal.aborted) setState(normalizeState(next));
              return;
            } catch (error) {
              const type = error && typeof error === "object" ? (error as Record<string, unknown>).type : undefined;
              if (type !== "rpc.unavailable" || attempt === 5) return;
              await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
            }
          }
        };

        void loadInitialState();
        const unsubscribe = rpc.events.on("changed", (event) => {
          if (!controller.signal.aborted) setState(normalizeState(event.data));
        });
        onCleanup(() => {
          controller.abort();
          unsubscribe();
        });
      },
    );

    const updateMode = async (key: ModeKey, value: ModeValue) => {
      const next = await ctx.client.rpc(UltraCodeRpc).setMode({ key, value });
      const normalized = normalizeState(next);
      setState(normalized);
      return normalized;
    };

    const flipMode = async (key: ModeKey) => {
      const next = await ctx.client.rpc(UltraCodeRpc).toggleMode({ key });
      const normalized = normalizeState(next);
      setState(normalized);
      return normalized;
    };

    const handleError = () => {
      ctx.toast.show({ variant: "error", title: ctx.t("error.sync") });
    };

    ctx.add(ComposerPill, {
      id: "status",
      show: () => {
        const current = state();
        return {
          label: "UltraCode",
          rows: [
            {
              id: "permissions",
              label: ctx.t("pill.permissions"),
              detail: current.permissions === "auto" ? ctx.t("state.on") : ctx.t("state.off"),
              run: () => void flipMode("permissions").catch(handleError),
            },
            {
              id: "direction",
              label: ctx.t("pill.direction"),
              detail: current.direction === "manual" ? ctx.t("state.on") : ctx.t("state.off"),
              run: () => void flipMode("direction").catch(handleError),
            },
          ],
        };
      },
    });

    ctx.add(SettingsPage, {
      id: "ultracode",
      icon: "extensions",
      get title() {
        return "UltraCode";
      },
      get entries() {
        return [
          {
            id: "permissions",
            title: ctx.t("settings.permissions"),
            keywords: "ultracode permissions approvals auto",
          },
          {
            id: "direction",
            title: ctx.t("settings.direction"),
            keywords: "ultracode direction questions manual",
          },
        ];
      },
      render: () => {
        const ui = ctx.ui;
        return (
          <ui.SettingsLayout title="UltraCode">
            <ui.SettingsSection>
              <ui.SettingsRow id="permissions" title={ctx.t("settings.permissions")}>
                <ui.Switch
                  label={ctx.t("settings.permissions")}
                  hideLabel
                  checked={state().permissions === "auto"}
                  onChange={(checked) => void updateMode("permissions", checked ? "auto" : "manual").catch(handleError)}
                />
              </ui.SettingsRow>
              <ui.SettingsRow id="direction" title={ctx.t("settings.direction")}>
                <ui.Switch
                  label={ctx.t("settings.direction")}
                  hideLabel
                  checked={state().direction === "manual"}
                  onChange={(checked) => void updateMode("direction", checked ? "manual" : "auto").catch(handleError)}
                />
              </ui.SettingsRow>
            </ui.SettingsSection>
          </ui.SettingsLayout>
        );
      },
    });

    ctx.add(
      Command,
      (): Command => ({
        id: "toggle-permissions",
        title: ctx.t("command.permissions"),
        group: "UltraCode",
        run: async () => {
          try {
            const next = await flipMode("permissions");
            ctx.toast.show({
              title: `${ctx.t("settings.permissions")} · ${next.permissions === "auto" ? ctx.t("state.on") : ctx.t("state.off")}`,
            });
          } catch {
            handleError();
          }
        },
      }),
    );

    ctx.add(
      Command,
      (): Command => ({
        id: "toggle-direction",
        title: ctx.t("command.direction"),
        group: "UltraCode",
        run: async () => {
          try {
            const next = await flipMode("direction");
            ctx.toast.show({
              title: `${ctx.t("settings.direction")} · ${next.direction === "manual" ? ctx.t("state.on") : ctx.t("state.off")}`,
            });
          } catch {
            handleError();
          }
        },
      }),
    );
  },
});
