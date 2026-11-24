import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

function normalizePattern(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
}

function globToRegExp(pattern) {
  let out = "^";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        if (pattern[i + 2] === "/") {
          out += "(?:.+/)?";
          i += 2;
        } else if (i > 0 && pattern[i - 1] === "/") {
          out = out.slice(0, -1) + "(?:/.*)?";
          i += 1;
        } else {
          out += ".*";
          i += 1;
        }
      } else {
        out += "[^/]*";
      }
    } else if (ch === "?") {
      out += "[^/]";
    } else if ("+.^$|()[]{}\\".includes(ch)) {
      out += "\\" + ch;
    } else {
      out += ch;
    }
  }
  out += "$";
  return new RegExp(out);
}

function hasWildcard(pattern) {
  return /[*?]/.test(pattern);
}

function staticDirPrefix(pattern) {
  const idx = pattern.search(/[*?]/);
  if (idx < 0) return pattern;
  const before = pattern.slice(0, idx).replace(/\/+$/, "");
  return before;
}

function trailingExt(pattern) {
  const base = pattern.split("/").pop() || "";
  const starIdx = base.lastIndexOf("*");
  if (starIdx < 0) return null;
  const tail = base.slice(starIdx + 1);
  return tail && !tail.includes("?") ? tail : null;
}

export function patternsOverlap(rawA, rawB) {
  const a = normalizePattern(rawA);
  const b = normalizePattern(rawB);
  if (!a || !b) return false;
  if (a === b || a === "*" || a === "**" || b === "*" || b === "**") return true;

  const wildA = hasWildcard(a);
  const wildB = hasWildcard(b);

  if (!wildA && !wildB) {
    return a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
  }

  if (wildA && !wildB) {
    if (globToRegExp(a).test(b)) return true;
    const prefixA = staticDirPrefix(a);
    return Boolean(prefixA && (prefixA === b || prefixA.startsWith(b + "/"))) || b.startsWith(a.replace(/\/\*\*$/, "") + "/");
  }

  if (!wildA && wildB) {
    return patternsOverlap(b, a);
  }

  const prefixA = staticDirPrefix(a);
  const prefixB = staticDirPrefix(b);
  const sharedTree =
    !prefixA ||
    !prefixB ||
    prefixA === prefixB ||
    prefixA.startsWith(prefixB + "/") ||
    prefixB.startsWith(prefixA + "/");
  if (!sharedTree) return false;

  const tailA = trailingExt(a);
  const tailB = trailingExt(b);
  if (tailA && tailB && !tailA.endsWith(tailB) && !tailB.endsWith(tailA)) {
    return false;
  }
  return true;
}

async function readTextIfExists(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function atomicWriteJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const serialized = JSON.stringify(data, null, 2) + "\n";
  try {
    await writeFile(tmp, serialized, "utf8");
    await rename(tmp, path);
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}

function parseQaReport(markdown) {
  const lines = markdown.split(/\r?\n/);
  let latestVerdict;
  let latestVerdictLine = -1;
  const failLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Ignore template placeholder lines
    if (/APPROVE\s*\/\s*REJECT/i.test(line) || /PASS\s*\/\s*FAIL\s*\/\s*NOT_VERIFIED/i.test(line)) {
      continue;
    }

    const verdictMatch = line.match(
      /^(?:[-*]\s*)?(?:\*{1,2})?(?:Result|Overall(?:\s+Verdict)?|Verdict|Final\s+Verdict)(?:\*{1,2})?\s*:\s*\*{0,2}(APPROVE|APPROVED|REJECT|REJECTED|BLOCKED|PASS|PASSED|FAIL|FAILED)\*{0,2}\s*$/i,
    );
    if (verdictMatch) {
      const raw = verdictMatch[1].toUpperCase();
      if (raw === "APPROVED" || raw === "PASS" || raw === "PASSED") latestVerdict = "APPROVE";
      else if (raw === "REJECTED") latestVerdict = "REJECT";
      else if (raw === "FAILED") latestVerdict = "FAIL";
      else latestVerdict = raw;
      latestVerdictLine = i;
      continue;
    }

    const tableFail = line.match(/^\|\s*([^|]+?)\s*\|\s*\*{0,2}FAIL(?:ED)?\*{0,2}\s*\|/i);
    if (tableFail) {
      failLines.push({ lineIndex: i, label: tableFail[1].trim() });
      continue;
    }

    const bulletFail = line.match(/^[-*]\s+([^:]+):\s*\*{0,2}FAIL(?:ED)?\*{0,2}(?:\s|$|—|-)/i);
    if (bulletFail) {
      failLines.push({ lineIndex: i, label: bulletFail[1].trim() });
    }
  }

  const unresolvedFails = failLines.filter(
    (entry) => !(latestVerdict === "APPROVE" && latestVerdictLine > entry.lineIndex),
  );

  return {
    verdict: latestVerdict,
    unresolvedFails: unresolvedFails.map((f) => f.label),
  };
}

export async function evaluateWorkspaceGate(directory) {
  const root = String(directory || process.cwd());
  const blockers = [];
  let totalFeatures = 0;
  let passedFeatures = 0;
  const pendingFeatureIDs = [];
  let qaVerdict;
  let uncheckedRalphTasks = 0;

  const featurePath = join(root, ".opencode", "ultracode", "FEATURE_LIST.json");
  const featureText = await readTextIfExists(featurePath);
  if (featureText !== null) {
    try {
      const parsed = JSON.parse(featureText);
      const features = Array.isArray(parsed?.features) ? parsed.features : [];
      totalFeatures = features.length;
      for (const feat of features) {
        const id = String(feat?.id ?? "unknown");
        const hasEvidenceObject = feat?.evidence !== null && typeof feat?.evidence === "object";
        const emptyEvidenceCmd =
          hasEvidenceObject && !String(feat.evidence.executedCommand ?? "").trim();
        const rejectedEvidence =
          hasEvidenceObject && String(feat.evidence.reviewerVerdict ?? "").toUpperCase() === "REJECT";

        if (feat?.passes !== true) {
          pendingFeatureIDs.push(id);
          blockers.push(`Feature ${id} is not yet verified (passes !== true)`);
        } else if (emptyEvidenceCmd) {
          pendingFeatureIDs.push(id);
          blockers.push(`Feature ${id} has passes:true but empty evidence.executedCommand`);
        } else if (rejectedEvidence) {
          pendingFeatureIDs.push(id);
          blockers.push(`Feature ${id} has reviewerVerdict REJECT`);
        } else {
          passedFeatures += 1;
        }
      }
    } catch {
      blockers.push(".opencode/ultracode/FEATURE_LIST.json contains invalid JSON");
    }
  }

  const qaPath = join(root, ".opencode", "ultracode", "QA_REPORT.md");
  const qaText = await readTextIfExists(qaPath);
  if (qaText !== null) {
    const qa = parseQaReport(qaText);
    qaVerdict = qa.verdict;
    if (qa.verdict === "REJECT" || qa.verdict === "BLOCKED" || qa.verdict === "FAIL") {
      blockers.push(`QA_REPORT.md verdict is ${qa.verdict}`);
    }
    for (const criterion of qa.unresolvedFails) {
      blockers.push(`QA_REPORT.md criterion "${criterion}" marked FAIL without subsequent APPROVE`);
    }
  }

  const ralphTasksPath = join(root, ".ralph", "ralph-tasks.md");
  const ralphText = await readTextIfExists(ralphTasksPath);
  if (ralphText !== null) {
    for (const line of ralphText.split(/\r?\n/)) {
      if (/^[-*]\s+\[\s\]\s+\S/.test(line)) {
        uncheckedRalphTasks += 1;
      }
    }
    if (uncheckedRalphTasks > 0) {
      blockers.push(`.ralph/ralph-tasks.md has ${uncheckedRalphTasks} unchecked top-level task(s)`);
    }
  }

  const fingerprint = blockers.length
    ? createHash("sha256").update(blockers.join("\n")).digest("hex").slice(0, 16)
    : "clean";

  return {
    ok: blockers.length === 0,
    fingerprint,
    blockers,
    summary: {
      totalFeatures,
      passedFeatures,
      pendingFeatureIDs,
      ...(qaVerdict ? { qaVerdict } : {}),
      uncheckedRalphTasks,
    },
  };
}

export async function mutateTaskGraph(directory, input) {
  const root = String(directory || process.cwd());
  const action = String(input?.action ?? "status");
  const featurePath = join(root, ".opencode", "ultracode", "FEATURE_LIST.json");

  let doc = { features: [] };
  const existingText = await readTextIfExists(featurePath);
  if (existingText !== null) {
    try {
      const parsed = JSON.parse(existingText);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.features)) {
        doc = parsed;
      }
    } catch {
      return { ok: false, content: "Invalid JSON in .opencode/ultracode/FEATURE_LIST.json." };
    }
  }

  if (action === "status") {
    const gate = await evaluateWorkspaceGate(root);
    const lines = [
      `Features: ${gate.summary.passedFeatures}/${gate.summary.totalFeatures} verified`,
      gate.summary.pendingFeatureIDs.length
        ? `Pending features: ${gate.summary.pendingFeatureIDs.join(", ")}`
        : "Pending features: none",
      `Workspace gate: ${gate.ok ? "PASS" : `BLOCKED (${gate.blockers.join("; ")})`}`,
    ];
    return { ok: true, content: lines.join("\n") };
  }

  const featureID = String(input?.featureID ?? "").trim();
  if (!featureID) {
    return { ok: false, content: `featureID is required for action "${action}".` };
  }

  const idx = doc.features.findIndex((f) => f?.id === featureID);
  const current = idx >= 0 ? doc.features[idx] : null;

  if (action === "init") {
    const nextEntry = {
      id: featureID,
      category: input?.category || current?.category || "functional",
      description: input?.description || current?.description || featureID,
      dependencies: Array.isArray(input?.dependencies) ? input.dependencies : current?.dependencies || [],
      ownedFiles: Array.isArray(input?.ownedFiles) ? input.ownedFiles : current?.ownedFiles || [],
      status: current?.passes === true ? "verified" : "pending",
      steps: Array.isArray(input?.steps) ? input.steps : current?.steps || [],
      verification: input?.verification ?? current?.verification ?? "",
      passes: current?.passes === true,
      evidence: current?.evidence ?? null,
    };
    if (idx >= 0) doc.features[idx] = { ...current, ...nextEntry };
    else doc.features.push(nextEntry);
    await atomicWriteJson(featurePath, doc);
    return { ok: true, content: `Initialized feature ${featureID}.` };
  }

  if (action === "claim") {
    const deps = Array.isArray(input?.dependencies)
      ? input.dependencies
      : Array.isArray(current?.dependencies)
        ? current.dependencies
        : [];
    for (const depID of deps) {
      const dep = doc.features.find((f) => f?.id === depID);
      if (!dep || dep.passes !== true) {
        return {
          ok: false,
          content: `Cannot claim ${featureID}: dependency ${depID} is not yet verified.`,
        };
      }
    }

    const ownedFiles = Array.isArray(input?.ownedFiles)
      ? input.ownedFiles
      : Array.isArray(current?.ownedFiles)
        ? current.ownedFiles
        : [];
    for (const other of doc.features) {
      if (!other || other.id === featureID || other.status !== "in_progress") continue;
      const otherOwned = Array.isArray(other.ownedFiles) ? other.ownedFiles : [];
      for (const myPattern of ownedFiles) {
        for (const theirPattern of otherOwned) {
          if (patternsOverlap(myPattern, theirPattern)) {
            return {
              ok: false,
              content: `Cannot claim ${featureID}: ownedFiles "${myPattern}" overlaps in-progress feature ${other.id} ("${theirPattern}").`,
            };
          }
        }
      }
    }

    const claimed = {
      ...(current ?? {
        id: featureID,
        category: input?.category || "functional",
        description: input?.description || featureID,
        steps: Array.isArray(input?.steps) ? input.steps : [],
        verification: input?.verification || "",
        passes: false,
        evidence: null,
      }),
      dependencies: deps,
      ownedFiles,
      status: "in_progress",
      passes: false,
    };
    if (idx >= 0) doc.features[idx] = claimed;
    else doc.features.push(claimed);
    await atomicWriteJson(featurePath, doc);
    return { ok: true, content: `Claimed feature ${featureID} (${ownedFiles.join(", ") || "no ownedFiles declared"}).` };
  }

  if (action === "verify") {
    const executedCommand = String(input?.executedCommand ?? "").trim();
    const evidenceSummary = String(input?.evidenceSummary ?? "").trim();
    if (!executedCommand || !evidenceSummary) {
      return {
        ok: false,
        content: "Cannot verify feature: non-empty executedCommand and evidenceSummary are required.",
      };
    }
    if (String(input?.reviewerVerdict ?? "").toUpperCase() === "REJECT") {
      return {
        ok: false,
        content: `Cannot verify ${featureID}: reviewerVerdict is REJECT.`,
      };
    }
    if (!current) {
      return {
        ok: false,
        content: `Cannot verify ${featureID}: feature does not exist in FEATURE_LIST.json.`,
      };
    }
    doc.features[idx] = {
      ...current,
      status: "verified",
      passes: true,
      evidence: {
        executedCommand,
        evidenceSummary,
        ...(input?.reviewerVerdict ? { reviewerVerdict: input.reviewerVerdict } : {}),
        verifiedAt: new Date().toISOString(),
      },
    };
    await atomicWriteJson(featurePath, doc);
    return { ok: true, content: `Verified feature ${featureID} with command "${executedCommand}".` };
  }

  if (action === "block") {
    const reason = String(input?.reason ?? "").trim() || "Blocked";
    const blocked = {
      ...(current ?? {
        id: featureID,
        category: input?.category || "functional",
        description: input?.description || featureID,
        dependencies: [],
        ownedFiles: [],
        steps: [],
        verification: "",
        evidence: null,
      }),
      status: "blocked",
      passes: false,
      blockedReason: reason,
    };
    if (idx >= 0) doc.features[idx] = blocked;
    else doc.features.push(blocked);
    await atomicWriteJson(featurePath, doc);
    return { ok: true, content: `Marked feature ${featureID} blocked: ${reason}` };
  }

  return { ok: false, content: `Unsupported task graph action "${action}".` };
}

export function buildGoalAnchor(goal) {
  const objective = String(goal?.objective ?? "").trim();
  if (!objective) return "";
  return [
    "<ultracode_goal_anchor>",
    "<objective>",
    objective,
    "</objective>",
    "Keep all work aligned with this authorized objective. Verify every requirement with real command or browser evidence before declaring completion.",
    "</ultracode_goal_anchor>",
  ].join("\n");
}
