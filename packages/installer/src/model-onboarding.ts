import { createInterface } from "node:readline/promises";
import { join } from "node:path";
import { applyEdits, modify, type FormattingOptions } from "jsonc-parser";
import { parseJsonc } from "./config";
import { atomicWrite, backup, exists, readText } from "./fs";
import { findOpenCode, run } from "./opencode";
import type { Paths } from "./paths";

export const ULTRACODE_MANAGED_ROLES = [
  "UltraPlan",
  "UltraBuild",
  "ultracode/architect",
  "ultracode/implementer",
  "ultracode/librarian",
  "ultracode/reviewer",
  "ultracode/visual-evaluator",
] as const;

export interface ModelCandidate {
  providerID: string;
  id: string;
  modelID?: string;
  name?: string;
  family?: string;
  type?: string;
  enabled?: boolean;
  status?: string;
  capabilities?: Record<string, unknown>;
  compatibility?: Record<string, unknown>;
}

export interface RoleModelRecommendation {
  deep: string;
  coding: string;
  fast: string;
  visual: string;
  roles: Record<string, string>;
}

const formatting: { formattingOptions: FormattingOptions } = {
  formattingOptions: { insertSpaces: true, tabSize: 2, eol: "\n" },
};

function extractModelArray(raw: unknown): ModelCandidate[] {
  if (Array.isArray(raw)) return raw as ModelCandidate[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as ModelCandidate[];
    if (Array.isArray(obj.models)) return obj.models as ModelCandidate[];
    if (Array.isArray(obj.items)) return obj.items as ModelCandidate[];
  }
  return [];
}

function scoreModel(model: ModelCandidate) {
  const provider = String(model.providerID || "").trim();
  const id = String(model.id || model.modelID || "").trim();
  const full = `${provider}/${id}`;
  const hay = `${provider} ${id} ${model.name || ""} ${model.family || ""}`.toLowerCase();
  const caps = model.capabilities && typeof model.capabilities === "object" ? model.capabilities : {};
  const compat = model.compatibility && typeof model.compatibility === "object" ? model.compatibility : {};

  const isLight =
    /(?:^|[-_/. ])(haiku|mini|nano|flash|lite|hydrogen|argon|small|instant|turbo|7b|8b)(?:$|[-_/. 0-9])/i.test(hay);
  const isUltraLight = /(?:^|[-_/. ])(nano|lite|argon|flash-lite|3b|1b)(?:$|[-_/. 0-9])/i.test(hay);
  const isBalancedFast = /(?:^|[-_/. ])(haiku|flash(?!-lite)|mini|hydrogen|instant)(?:$|[-_/. 0-9])/i.test(hay);
  const isDeepFlagship =
    /(?:^|[-_/. ])(opus|carbon|pro|ultra|o1|o3|o4|reasoner|r1|thinking|gpt-6(?!.*(?:mini|nano|codex))|gpt-5(?!.*(?:mini|nano|codex)))(?:$|[-_/. 0-9])/i.test(
      hay,
    );
  const isCodingWorkhorse = /(?:^|[-_/. ])(sonnet|codex|neon|coder|swe)(?:$|[-_/. 0-9])/i.test(hay);
  const reasoningObj =
    caps.reasoning && typeof caps.reasoning === "object" ? (caps.reasoning as Record<string, unknown>) : null;
  const hasReasoning =
    caps.reasoning === true ||
    caps.thinking === true ||
    Boolean(compat.reasoningField) ||
    reasoningObj?.supported === true;
  const hasInputArray = Array.isArray(caps.input);
  const inputCaps =
    !hasInputArray && caps.input && typeof caps.input === "object" ? (caps.input as Record<string, unknown>) : null;
  const hasVision =
    (hasInputArray && (caps.input as unknown[]).includes("image")) ||
    caps.vision === true ||
    caps.image === true ||
    caps.multimodal === true ||
    inputCaps?.image === true;
  const lacksVision =
    (hasInputArray && !(caps.input as unknown[]).includes("image")) ||
    ("vision" in caps && caps.vision === false) ||
    /(deepseek-r1|deepseek-coder|o1-mini|o3-mini|argon)/i.test(hay);

  let deep = 10;
  if (isDeepFlagship) deep += 55;
  if (hasReasoning) deep += 35;
  if (isCodingWorkhorse) deep += 25;
  if (isLight) deep -= 40;

  let coding = 10;
  if (isCodingWorkhorse) coding += 60;
  if (isDeepFlagship) coding += 40;
  if (isLight) coding -= 30;
  if (isUltraLight) coding -= 20;

  let fast = 10;
  if (isBalancedFast) fast += 65;
  else if (isLight) fast += 50;
  if (isCodingWorkhorse) fast += 20;
  if (isDeepFlagship) fast -= 15;

  let visual = 10;
  if (hasVision) visual += 40;
  if (/(sonnet|neon|gpt-4o)/i.test(hay)) visual += 35;
  else if (/(opus|carbon|gemini|gpt-6|gpt-5|vision|vl|pixtral)/i.test(hay)) visual += 30;
  if (isUltraLight) visual -= 25;
  if (lacksVision) visual -= 60;

  return { full, deep, coding, fast, visual };
}

export function recommendRoleModels(models: ReadonlyArray<ModelCandidate> | unknown): RoleModelRecommendation | null {
  const list = extractModelArray(models);
  const seen = new Set<string>();
  const candidates: ModelCandidate[] = [];

  for (const m of list) {
    if (!m || typeof m !== "object") continue;
    if (m.enabled === false) continue;
    if (m.status === "deprecated") continue;
    if (m.type && !["chat", "language", "llm"].includes(String(m.type).toLowerCase())) continue;
    const providerID = String(m.providerID || "").trim();
    const id = String(m.id || m.modelID || "").trim();
    if (!providerID || !id) continue;
    const key = `${providerID}/${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(m);
  }

  if (candidates.length < 2) return null;

  const scored = candidates.map(scoreModel);
  const pickBest = (field: "deep" | "coding" | "fast" | "visual") =>
    [...scored].sort((a, b) => b[field] - a[field])[0]!.full;

  const deep = pickBest("deep");
  const coding = pickBest("coding");
  const fast = pickBest("fast");
  const visual = pickBest("visual");

  return {
    deep,
    coding,
    fast,
    visual,
    roles: {
      UltraPlan: deep,
      "ultracode/architect": deep,
      "ultracode/reviewer": deep,
      UltraBuild: coding,
      "ultracode/implementer": coding,
      "ultracode/librarian": fast,
      "ultracode/visual-evaluator": visual,
    },
  };
}

export function hasRoleModelOverrides(configText: string): boolean {
  try {
    const parsed = parseJsonc(configText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const agents = (parsed as Record<string, unknown>).agents;
    if (!agents || typeof agents !== "object" || Array.isArray(agents)) return false;
    return ULTRACODE_MANAGED_ROLES.some((role) => {
      const entry = (agents as Record<string, unknown>)[role];
      return Boolean(
        entry &&
          typeof entry === "object" &&
          !Array.isArray(entry) &&
          typeof (entry as Record<string, unknown>).model === "string" &&
          String((entry as Record<string, unknown>).model).trim().length > 0,
      );
    });
  } catch {
    return false;
  }
}

export function applyRoleModelPreferences(
  existingConfigText: string,
  roleModels: Record<string, string> | "inherit",
): string {
  let text = existingConfigText.trim() ? existingConfigText : "{}\n";

  if (roleModels === "inherit") {
    for (const role of ULTRACODE_MANAGED_ROLES) {
      const parsed = parseJsonc(text) as Record<string, any>;
      const roleEntry = parsed?.agents?.[role];
      if (!roleEntry || typeof roleEntry !== "object") continue;
      if ("model" in roleEntry) {
        text = applyEdits(text, modify(text, ["agents", role, "model"], undefined, formatting));
      }
      const afterModel = parseJsonc(text) as Record<string, any>;
      if (afterModel?.agents?.[role] && Object.keys(afterModel.agents[role]).length === 0) {
        text = applyEdits(text, modify(text, ["agents", role], undefined, formatting));
      }
    }
    const finalParsed = parseJsonc(text) as Record<string, any>;
    if (finalParsed?.agents && Object.keys(finalParsed.agents).length === 0) {
      text = applyEdits(text, modify(text, ["agents"], undefined, formatting));
    }
    return text.endsWith("\n") ? text : `${text}\n`;
  }

  for (const [role, modelSpec] of Object.entries(roleModels)) {
    if (!modelSpec) continue;
    text = applyEdits(text, modify(text, ["agents", role, "model"], modelSpec, formatting));
  }
  return text.endsWith("\n") ? text : `${text}\n`;
}

async function resolveTargetConfigFile(paths: Paths): Promise<string> {
  if (await exists(paths.opencodeConfigFile)) return paths.opencodeConfigFile;
  const json = join(paths.config, "opencode.json");
  return (await exists(json)) ? json : paths.opencodeConfigFile;
}

async function persistOnboardingState(paths: Paths, reason: string): Promise<void> {
  const onboardingFile = join(paths.home, "onboarding.json");
  let existing: Record<string, unknown> = {};
  if (await exists(onboardingFile)) {
    try {
      existing = JSON.parse(await readText(onboardingFile)) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }
  await atomicWrite(
    onboardingFile,
    JSON.stringify({ ...existing, modelRoutingGuidedVersion: 1, reason, updatedAt: Date.now() }, null, 2) + "\n",
  );
}

async function discoverOpenCodeModels(paths: Paths): Promise<ModelCandidate[]> {
  const opencode = (await findOpenCode(paths)) ?? paths.opencodeBinary;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await run(opencode, ["api", "get", "/api/model"]).catch(() => ({ code: 1, stdout: "", stderr: "" }));
    if (res.code === 0 && res.stdout.trim()) {
      try {
        const extracted = extractModelArray(JSON.parse(res.stdout));
        if (extracted.length > 0) return extracted;
      } catch {
        // retry after async provider plugin startup
      }
    }
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 180));
    }
  }
  const fallback = await run(opencode, ["api", "--standalone", "get", "/api/model"]).catch(() => ({
    code: 1,
    stdout: "",
    stderr: "",
  }));
  if (fallback.code === 0 && fallback.stdout.trim()) {
    try {
      return extractModelArray(JSON.parse(fallback.stdout));
    } catch {
      return [];
    }
  }
  return [];
}

export async function runSetupModelsCli(
  paths: Paths,
  args: string[],
  io: { log: (msg: string) => void; error: (msg: string) => void },
): Promise<number> {
  const modeArg = args.includes("--inherit")
    ? "inherit"
    : args.includes("--recommended")
      ? "recommended"
      : args.includes("--status")
        ? "status"
        : "interactive";

  const file = await resolveTargetConfigFile(paths);
  const existingText = (await exists(file)) ? await readText(file) : "{}\n";

  if (modeArg === "inherit") {
    const updated = applyRoleModelPreferences(existingText, "inherit");
    if (updated !== existingText) {
      await backup(file, join(paths.home, "backups"));
      await atomicWrite(file, updated);
    }
    await persistOnboardingState(paths, "cli-inherit");
    io.log("✓ Role model overrides cleared (all roles inherit active session model)");
    return 0;
  }

  const models = await discoverOpenCodeModels(paths);
  const recommendation = recommendRoleModels(models);

  if (modeArg === "status" || (modeArg === "interactive" && !process.stdin.isTTY)) {
    const parsed = parseJsonc(existingText) as Record<string, any>;
    const configuredRoles = ULTRACODE_MANAGED_ROLES.map((r) => [r, parsed?.agents?.[r]?.model] as const).filter(
      ([, m]) => typeof m === "string" && m.trim(),
    );

    if (configuredRoles.length > 0) {
      io.log("Configured role models:");
      for (const [role, model] of configuredRoles) io.log(`  ${role}: ${model}`);
    } else {
      io.log("Configured role models: inherit active session model (default)");
    }
    if (recommendation) {
      io.log("\nRecommended multi-tier pairing (`ultracode setup-models --recommended`):");
      for (const [role, model] of Object.entries(recommendation.roles)) {
        io.log(`  ${role}: ${model}`);
      }
    }
    return 0;
  }

  if (!recommendation) {
    io.log("Fewer than 2 chat models are currently configured in OpenCode; roles will inherit your session model.");
    return 0;
  }

  if (modeArg === "interactive") {
    io.log("Recommended role model preferences:");
    for (const [role, model] of Object.entries(recommendation.roles)) {
      io.log(`  ${role.padEnd(28)} ${model}`);
    }
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await prompt.question("\nApply recommended role models to opencode.jsonc? [Y/n] ");
    prompt.close();
    const normalized = answer.trim().toLowerCase();
    if (normalized && normalized !== "y" && normalized !== "yes") {
      await persistOnboardingState(paths, "cli-declined");
      io.log("Kept default session model inheritance.");
      return 0;
    }
  }

  const updated = applyRoleModelPreferences(existingText, recommendation.roles);
  if (updated !== existingText) {
    await backup(file, join(paths.home, "backups"));
    await atomicWrite(file, updated);
  }
  await persistOnboardingState(paths, "cli-recommended");
  io.log("✓ Applied recommended role models to OpenCode configuration");
  for (const [role, model] of Object.entries(recommendation.roles)) {
    io.log(`  ${role}: ${model}`);
  }
  return 0;
}
