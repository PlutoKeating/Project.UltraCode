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
  return JSON.stringify(a) === JSON.stringify(b);
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

export function mergeJsonc(source: string, managed: { [key: string]: JsonValue }, basePath: JSONPath = []): MergeResult {
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
        if (!target.some((entry) => same(entry, item))) {
          text = edit(text, [...path, target.length], item);
          added.push(`${label}[${target.length}]`);
        }
      }
      return;
    }
    if (!same(current, expected)) conflicts.push(label);
  }

  walk(basePath, managed);
  return { text, added, conflicts };
}

export function removeJsoncValues(source: string, managed: { [key: string]: JsonValue }): string {
  let text = source;

  function walk(path: JSONPath, expected: JsonValue): void {
    const root = parseJsonc(text);
    let current: JsonValue = root;
    for (const segment of path) {
      if (typeof segment === "number") return;
      if (!isObject(current)) return;
      current = current[segment] as JsonValue;
    }
    if (current === undefined) return;
    if (isObject(current) && isObject(expected)) {
      for (const [key, value] of Object.entries(expected)) walk([...path, key], value);
      if (path.length > 0) {
        const latest = parseJsonc(text);
        let remaining: JsonValue = latest;
        for (const segment of path) {
          if (typeof segment === "number") return;
          if (!isObject(remaining)) return;
          remaining = remaining[segment] as JsonValue;
        }
        if (isObject(remaining) && Object.keys(remaining).length === 0) text = edit(text, path, undefined);
      }
      return;
    }
    if (Array.isArray(current) && Array.isArray(expected)) {
      let remaining = current.length;
      for (let index = current.length - 1; index >= 0; index -= 1) {
        if (expected.some((item) => same(current[index] as JsonValue, item))) {
          text = edit(text, [...path, index], undefined);
          remaining -= 1;
        }
      }
      if (remaining === 0 && path.length > 0) text = edit(text, path, undefined);
      return;
    }
    if (same(current, expected)) text = edit(text, path, undefined);
  }

  walk([], managed);
  return text;
}
