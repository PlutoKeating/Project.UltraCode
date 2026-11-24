import { createSignal, onCleanup } from "solid-js";
import { Command, ComposerPill, type ComposerPillRow, type ComposerPillTone, createKeyed, Plugin, SettingsPage } from "@opencode/plugin/gui";
import { UltraCodeRpc } from "../../config/opencode/conversation/rpc.js";

type ModeValue = "auto" | "manual";
type ModeKey = "permissions" | "direction";
type GoalStatus = "active" | "paused" | "complete";

interface GoalEntry {
  id: string;
  objective: string;
  status: GoalStatus;
  nextMilestone?: string;
  reason?: string;
  rounds: number;
  maxRounds: number;
  updatedAt: number;
}

interface UltraCodeState {
  permissions: ModeValue;
  direction: ModeValue;
  checkpoints: Record<string, string>;
  goals: Record<string, GoalEntry>;
}

function truncateText(value: string, max = 36): string {
  return value.length > max ? value.slice(0, max - 1) + "…" : value;
}

function normalizeState(raw: unknown): UltraCodeState {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const checkpoints: Record<string, string> = {};
  if (obj.checkpoints && typeof obj.checkpoints === "object") {
    for (const [key, value] of Object.entries(obj.checkpoints as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) {
        checkpoints[key] = value.trim();
      }
    }
  }
  const goals: Record<string, GoalEntry> = {};
  if (obj.goals && typeof obj.goals === "object") {
    for (const [key, value] of Object.entries(obj.goals as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const g = value as Record<string, unknown>;
      const objective = typeof g.objective === "string" ? g.objective.trim() : "";
      if (!objective) continue;
      const status: GoalStatus = g.status === "paused" || g.status === "complete" ? g.status : "active";
      const nextMilestone = typeof g.nextMilestone === "string" && g.nextMilestone.trim() ? g.nextMilestone.trim() : undefined;
      const reason = typeof g.reason === "string" && g.reason.trim() ? g.reason.trim() : undefined;
      goals[key] = {
        id: typeof g.id === "string" && g.id ? g.id : key,
        objective,
        status,
        ...(nextMilestone ? { nextMilestone } : {}),
        ...(reason ? { reason } : {}),
        rounds: typeof g.rounds === "number" ? g.rounds : 0,
        maxRounds: typeof g.maxRounds === "number" ? g.maxRounds : 60,
        updatedAt: typeof g.updatedAt === "number" ? g.updatedAt : 0,
      };
    }
  }
  return {
    permissions: obj.permissions === "manual" ? "manual" : "auto",
    direction: obj.direction === "auto" ? "auto" : "manual",
    checkpoints,
    goals,
  };
}

export default Plugin.define({
  i18n: {
    en: {
      "pill.permissions": "Auto-approve",
      "pill.direction": "Ask on direction",
      "pill.checkpoint": "Next milestone",
      "pill.goal.active": "Goal",
      "pill.goal.paused": "Goal paused",
      "pill.goal.complete": "Goal complete",
      "pill.pause": "Pause",
      "pill.resume": "Resume",
      "pill.clear": "Clear",
      "settings.permissions": "Command approvals",
      "settings.direction": "Direction questions",
      "command.permissions": "Toggle Command approvals",
      "command.direction": "Toggle Direction questions",
      "command.goal.pause": "Pause active Goal",
      "command.goal.resume": "Resume paused Goal",
      "command.goal.clear": "Clear session Goal",
      "error.sync": "Could not update UltraCode mode",
      "state.on": "On",
      "state.off": "Off",
    },
    zh: {
      "pill.permissions": "自动执行",
      "pill.direction": "关键点确认",
      "pill.checkpoint": "下一里程碑",
      "pill.goal.active": "目标进行中",
      "pill.goal.paused": "目标已暂停",
      "pill.goal.complete": "目标已完成",
      "pill.pause": "暂停",
      "pill.resume": "继续",
      "pill.clear": "清除",
      "settings.permissions": "命令自动执行",
      "settings.direction": "关键方向确认",
      "command.permissions": "切换命令自动执行",
      "command.direction": "切换关键方向确认",
      "command.goal.pause": "暂停当前目标",
      "command.goal.resume": "恢复已暂停目标",
      "command.goal.clear": "清除会话目标",
      "error.sync": "无法更新 UltraCode 模式",
      "state.on": "开启",
      "state.off": "关闭",
    },
    ar: {
      "pill.permissions": "موافقة تلقائية",
      "pill.direction": "تأكيد الاتجاه",
      "pill.checkpoint": "المرحلة التالية",
      "pill.goal.active": "الهدف نشط",
      "pill.goal.paused": "الهدف متوقف",
      "pill.goal.complete": "الهدف مكتمل",
      "pill.pause": "إيقاف مؤقت",
      "pill.resume": "استئناف",
      "pill.clear": "مسح",
      "settings.permissions": "موافقات الأوامر",
      "settings.direction": "أسئلة الاتجاه",
      "command.permissions": "تبديل موافقات الأوامر",
      "command.direction": "تبديل أسئلة الاتجاه",
      "command.goal.pause": "إيقاف الهدف النشط مؤقتاً",
      "command.goal.resume": "استئناف الهدف المتوقف",
      "command.goal.clear": "مسح هدف الجلسة",
      "error.sync": "تعذّر تحديث وضع UltraCode",
      "state.on": "مفعّل",
      "state.off": "موقوف",
    },
    fr: {
      "pill.permissions": "Approbation auto",
      "pill.direction": "Confirmer les choix",
      "pill.checkpoint": "Prochaine étape",
      "pill.goal.active": "Objectif actif",
      "pill.goal.paused": "Objectif en pause",
      "pill.goal.complete": "Objectif terminé",
      "pill.pause": "Pause",
      "pill.resume": "Reprendre",
      "pill.clear": "Effacer",
      "settings.permissions": "Approbation des commandes",
      "settings.direction": "Questions d’orientation",
      "command.permissions": "Basculer l’approbation des commandes",
      "command.direction": "Basculer les questions d’orientation",
      "command.goal.pause": "Mettre l’objectif en pause",
      "command.goal.resume": "Reprendre l’objectif en pause",
      "command.goal.clear": "Effacer l’objectif de la session",
      "error.sync": "Impossible de mettre à jour le mode UltraCode",
      "state.on": "Activé",
      "state.off": "Désactivé",
    },
    ru: {
      "pill.permissions": "Автоодобрение",
      "pill.direction": "Уточнять курс",
      "pill.checkpoint": "Следующий этап",
      "pill.goal.active": "Цель активна",
      "pill.goal.paused": "Цель на паузе",
      "pill.goal.complete": "Цель завершена",
      "pill.pause": "Пауза",
      "pill.resume": "Продолжить",
      "pill.clear": "Очистить",
      "settings.permissions": "Одобрение команд",
      "settings.direction": "Вопросы по направлению",
      "command.permissions": "Переключить одобрение команд",
      "command.direction": "Переключить вопросы по направлению",
      "command.goal.pause": "Приостановить активную цель",
      "command.goal.resume": "Возобновить цель",
      "command.goal.clear": "Очистить цель сессии",
      "error.sync": "Не удалось обновить режим UltraCode",
      "state.on": "Вкл",
      "state.off": "Выкл",
    },
    es: {
      "pill.permissions": "Autoaprobar",
      "pill.direction": "Consultar dirección",
      "pill.checkpoint": "Siguiente hito",
      "pill.goal.active": "Objetivo activo",
      "pill.goal.paused": "Objetivo en pausa",
      "pill.goal.complete": "Objetivo completado",
      "pill.pause": "Pausar",
      "pill.resume": "Reanudar",
      "pill.clear": "Limpiar",
      "settings.permissions": "Aprobación de comandos",
      "settings.direction": "Preguntas de dirección",
      "command.permissions": "Alternar aprobación de comandos",
      "command.direction": "Alternar preguntas de dirección",
      "command.goal.pause": "Pausar objetivo activo",
      "command.goal.resume": "Reanudar objetivo en pausa",
      "command.goal.clear": "Limpiar objetivo de la sesión",
      "error.sync": "No se pudo actualizar el modo de UltraCode",
      "state.on": "Activo",
      "state.off": "Inactivo",
    },
  },
  setup(ctx) {
    const [state, setState] = createSignal<UltraCodeState>({
      permissions: "auto",
      direction: "manual",
      checkpoints: {},
      goals: {},
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

    type SessionTarget = {
      id: string;
      directory?: string;
      location?: unknown;
      server?: { client?: typeof ctx.client };
    };

    const sessionCallContext = (session: SessionTarget) => {
      const loc = session.location ?? (session.directory ? { directory: session.directory } : undefined);
      const rpcClient = (session.server?.client ?? ctx.client).rpc(UltraCodeRpc);
      return { rpcClient, options: loc ? ({ location: loc } as any) : undefined };
    };

    const clearSessionCheckpoint = async (session: SessionTarget) => {
      const { rpcClient, options } = sessionCallContext(session);
      const next = await rpcClient.clearCheckpoint({ sessionID: session.id }, options);
      const normalized = normalizeState(next);
      setState(normalized);
      return normalized;
    };

    const pauseSessionGoal = async (session: SessionTarget) => {
      const { rpcClient, options } = sessionCallContext(session);
      const next = await rpcClient.pauseGoal({ sessionID: session.id }, options);
      const normalized = normalizeState(next);
      setState(normalized);
      return normalized;
    };

    const resumeSessionGoal = async (session: SessionTarget) => {
      const { rpcClient, options } = sessionCallContext(session);
      const next = await rpcClient.resumeGoal({ sessionID: session.id }, options);
      const normalized = normalizeState(next);
      setState(normalized);
      return normalized;
    };

    const clearSessionGoal = async (session: SessionTarget) => {
      const { rpcClient, options } = sessionCallContext(session);
      const next = await rpcClient.clearGoal({ sessionID: session.id }, options);
      const normalized = normalizeState(next);
      setState(normalized);
      return normalized;
    };

    const handleError = () => {
      ctx.toast.show({ variant: "error", title: ctx.t("error.sync") });
    };

    ctx.add(ComposerPill, {
      id: "status",
      show: (input) => {
        const current = state();
        const session = input?.session;
        const sessionID = session?.id;
        const goal = sessionID ? current.goals[sessionID] : undefined;
        const milestone = sessionID ? current.checkpoints[sessionID] : undefined;
        const rows: ComposerPillRow[] = [
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
        ];

        let label = "UltraCode";
        let tone: ComposerPillTone | undefined;

        if (session && sessionID && goal) {
          const summary = truncateText(goal.nextMilestone || goal.objective, 36);
          if (goal.status === "active") {
            label = `UltraCode · ${goal.rounds}/${goal.maxRounds}`;
            rows.push({
              id: "goal-toggle",
              label: `${ctx.t("pill.goal.active")}: ${summary}`,
              detail: ctx.t("pill.pause"),
              run: () => void pauseSessionGoal(session).catch(handleError),
            });
            rows.push({
              id: "goal-clear",
              label: ctx.t("pill.clear"),
              detail: `${goal.rounds}/${goal.maxRounds}`,
              run: () => void clearSessionGoal(session).catch(handleError),
            });
          } else if (goal.status === "paused") {
            tone = "warning";
            rows.push({
              id: "goal-toggle",
              label: `${ctx.t("pill.goal.paused")}: ${summary}`,
              tone: "warning",
              detail: ctx.t("pill.resume"),
              run: () => void resumeSessionGoal(session).catch(handleError),
            });
            rows.push({
              id: "goal-clear",
              label: ctx.t("pill.clear"),
              detail: goal.reason ? truncateText(goal.reason, 24) : `${goal.rounds}/${goal.maxRounds}`,
              run: () => void clearSessionGoal(session).catch(handleError),
            });
          } else {
            tone = "success";
            rows.push({
              id: "goal-clear",
              label: `${ctx.t("pill.goal.complete")}: ${summary}`,
              tone: "success",
              detail: ctx.t("pill.clear"),
              run: () => void clearSessionGoal(session).catch(handleError),
            });
          }
        } else if (session && sessionID && milestone) {
          rows.push({
            id: "checkpoint",
            label: `${ctx.t("pill.checkpoint")}: ${truncateText(milestone, 36)}`,
            detail: ctx.t("pill.clear"),
            run: () => void clearSessionCheckpoint(session).catch(handleError),
          });
        }

        return {
          label,
          ...(tone ? { tone } : {}),
          rows,
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

    ctx.add(
      Command,
      (): Command => ({
        id: "pause-goal",
        title: ctx.t("command.goal.pause"),
        group: "UltraCode",
        section: "session",
        enabled: (() => {
          const currentSession = ctx.sessions?.current?.();
          return Boolean(currentSession && state().goals[currentSession.id]?.status === "active");
        })(),
        run: async () => {
          const currentSession = ctx.sessions?.current?.();
          if (!currentSession) return;
          try {
            await pauseSessionGoal(currentSession);
          } catch {
            handleError();
          }
        },
      }),
    );

    ctx.add(
      Command,
      (): Command => ({
        id: "resume-goal",
        title: ctx.t("command.goal.resume"),
        group: "UltraCode",
        section: "session",
        enabled: (() => {
          const currentSession = ctx.sessions?.current?.();
          return Boolean(currentSession && state().goals[currentSession.id]?.status === "paused");
        })(),
        run: async () => {
          const currentSession = ctx.sessions?.current?.();
          if (!currentSession) return;
          try {
            await resumeSessionGoal(currentSession);
          } catch {
            handleError();
          }
        },
      }),
    );

    ctx.add(
      Command,
      (): Command => ({
        id: "clear-goal",
        title: ctx.t("command.goal.clear"),
        group: "UltraCode",
        section: "session",
        enabled: (() => {
          const currentSession = ctx.sessions?.current?.();
          return Boolean(currentSession && state().goals[currentSession.id]);
        })(),
        run: async () => {
          const currentSession = ctx.sessions?.current?.();
          if (!currentSession) return;
          try {
            await clearSessionGoal(currentSession);
          } catch {
            handleError();
          }
        },
      }),
    );
  },
});
