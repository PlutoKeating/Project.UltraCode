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
        const rpc = client.rpc(UltraCodeRpc);
        void rpc
          .getState({})
          .then((next) => setState(normalizeState(next)))
          .catch(() => {});
        const unsubscribe = rpc.events.on("changed", (event) => {
          setState(normalizeState(event.data));
        });
        onCleanup(() => unsubscribe());
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
              run: () => void flipMode("permissions"),
            },
            {
              id: "direction",
              label: ctx.t("pill.direction"),
              detail: current.direction === "manual" ? ctx.t("state.on") : ctx.t("state.off"),
              run: () => void flipMode("direction"),
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
                  onChange={(checked) => void updateMode("permissions", checked ? "auto" : "manual")}
                />
              </ui.SettingsRow>
              <ui.SettingsRow id="direction" title={ctx.t("settings.direction")}>
                <ui.Switch
                  label={ctx.t("settings.direction")}
                  hideLabel
                  checked={state().direction === "manual"}
                  onChange={(checked) => void updateMode("direction", checked ? "manual" : "auto")}
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
          const next = await flipMode("permissions");
          ctx.toast.show({
            title: `${ctx.t("settings.permissions")} · ${next.permissions === "auto" ? ctx.t("state.on") : ctx.t("state.off")}`,
          });
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
          const next = await flipMode("direction");
          ctx.toast.show({
            title: `${ctx.t("settings.direction")} · ${next.direction === "manual" ? ctx.t("state.on") : ctx.t("state.off")}`,
          });
        },
      }),
    );
  },
});
