import { posix, win32 } from "node:path";
import type { JsonValue } from "./config";
import type { Paths } from "./paths";

export function managedConfig(paths: Paths): { [key: string]: JsonValue } {
  const pathJoin = paths.config.includes("\\") ? win32.join : posix.join;
  return {
    default_agent: "UltraBuild",
    agents: {
      build: { hidden: true },
      plan: { hidden: true },
    },
    permissions: [
      { action: "shell", resource: "git push *", effect: "ask" },
      { action: "shell", resource: "git reset --hard *", effect: "ask" },
      { action: "shell", resource: "rm -rf *", effect: "ask" },
      { action: "ultracode_playwright_*", resource: "*", effect: "deny" },
    ],
    compaction: {
      auto: true,
      keep: { tokens: 15000 },
      buffer: "15%",
    },
    mcp: {
      servers: {
        ultracode_playwright: {
          type: "local",
          command: [paths.binary, "_mcp"],
          disabled: false,
          codemode: false,
          timeout: { startup: 60000, catalog: 30000, execution: 600000 },
        },
      },
    },
    plugins: [
      "-opencode.goal",
      "-opencode.plan",
      pathJoin(paths.config, "ultracode", "conversation"),
      pathJoin(paths.runtime, "superpowers"),
    ],
  };
}
