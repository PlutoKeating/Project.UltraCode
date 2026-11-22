import { isDeepStrictEqual } from "node:util";
import { applyEdits, modify, parse, type JSONPath, type ParseError } from "jsonc-parser";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface MergeResult {
  text: string;
  added: string[];
  conflicts: string[];
}

const formatting = { formattingOptions: { insertSpaces: true, tabSize: 2, eol: "\n" } };

function isObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function same(a: JsonValue, b: JsonValue): boolean {
  return isDeepStrictEqual(a, b);
}

function edit(text: string, path: JSONPath, value: JsonValue | undefined): string {
  return applyEdits(text, modify(text, path, value, formatting));
}

export function parseJsonc(text: string): JsonValue {
  const errors: ParseError[] = [];
  const value = parse(text, errors, { allowTrailingComma: true, disallowComments: false }) as JsonValue;
  if (errors.length > 0) throw new Error("Invalid JSONC configuration");
  return value ?? {};
}

export function mergeJsonc(source: string, managed: { [key: string]: JsonValue }, legacy = false): MergeResult {
  let text = source.trim() ? source : "{}";
  const added: string[] = [];
  const conflicts: string[] = [];

  function walk(path: JSONPath, expected: JsonValue): void {
    const root = parseJsonc(text);
    let current: JsonValue = root;
    for (const segment of path) {
      if (typeof segment === "number") return;
      if (!isObject(current)) return;
      current = current[segment] as JsonValue;
    }
    const label = path.join(".");
    if (current === undefined) {
      text = edit(text, path, expected);
      added.push(label);
      return;
    }
    if (!legacy && path.length === 3 && path[0] === "mcp" && path[1] === "servers") {
      if (!same(current, expected)) conflicts.push(label);
      return;
    }
    if (isObject(current) && isObject(expected)) {
      for (const [key, value] of Object.entries(expected)) walk([...path, key], value);
      return;
    }
    if (Array.isArray(current) && Array.isArray(expected)) {
      for (const item of expected) {
        const latest = parseJsonc(text);
        let target: JsonValue = latest;
        for (const segment of path) {
          if (typeof segment === "number") return;
          if (!isObject(target)) return;
          target = target[segment] as JsonValue;
        }
        if (!Array.isArray(target)) return;
        if (!target.some((entry) => legacy ? JSON.stringify(entry) === JSON.stringify(item) : same(entry, item))) {
          if (!legacy && label === "permissions" && isObject(item) && target.some(entry => isObject(entry) && same(entry.action!, item.action!) && same(entry.resource!, item.resource!))) {
            conflicts.push(label + ":" + item.action + ":" + item.resource);
            continue;
          }
          text = edit(text, [...path, target.length], item);
          added.push(`${label}[${target.length}]`);
        }
      }
      return;
    }
    if (!same(current, expected)) conflicts.push(label);
  }

  walk([], managed);
  return { text, added, conflicts };
}

// Records only additions made by our merge. Container ownership is separate
// so removing our last child never removes a pre-existing empty container.
export interface Addition {
  path: string[];
  kind: "value" | "member" | "object" | "array";
  value?: JsonValue;
}

export function additions(before: JsonValue | undefined, after: JsonValue, path: string[] = []): Addition[] {
  if (before !== undefined && same(before, after)) return [];
  if (before === undefined && path.length === 3 && path[0] === "mcp" && path[1] === "servers") return [{ path, kind: "value", value: after }];
  if (Array.isArray(after)) {
    const records: Addition[] = before === undefined ? [{ path, kind: "array" }] : [];
    for (const value of after) {
      if (!Array.isArray(before) || !before.some(item => same(item, value))) records.push({ path, kind: "member", value });
    }
    return records;
  }
  if (isObject(after)) {
    const records: Addition[] = before === undefined ? [{ path, kind: "object" }] : [];
    for (const [key, value] of Object.entries(after)) {
      records.push(...additions(before && isObject(before) ? before[key] : undefined, value, [...path, key]));
    }
    return records;
  }
  return [{ path, kind: "value", value: after }];
}

function at(root: JsonValue, path: string[]): JsonValue | undefined {
  let node: JsonValue | undefined = root;
  for (const key of path) node = node && isObject(node) ? node[key] : undefined;
  return node;
}

export function retire(source: string, owned: Addition[], wanted: JsonValue): { text: string; retained: Addition[] } {
  let text = source;
  const retained: Addition[] = [];
  for (const entry of [...owned].reverse()) {
    const current = at(parseJsonc(text), entry.path);
    const desired = at(wanted, entry.path);
    if (current === undefined) continue;
    if (entry.kind === "member") {
      if (!Array.isArray(current)) continue;
      const index = current.findIndex(item => same(item, entry.value!));
      if (index < 0) continue;
      if (Array.isArray(desired) && desired.some(item => same(item, entry.value!))) retained.unshift(entry);
      else text = edit(text, [...entry.path, index], undefined);
    } else if (entry.kind === "value") {
      if (!same(current, entry.value!)) continue;
      if (desired !== undefined && same(desired, current)) retained.unshift(entry);
      else text = edit(text, entry.path, undefined);
    } else {
      if (entry.kind === "array" ? !Array.isArray(current) : !isObject(current)) continue;
      if (desired !== undefined) retained.unshift(entry);
      else if (Object.keys(current as object).length === 0) text = edit(text, entry.path, undefined);
    }
  }
  return { text, retained };
}
