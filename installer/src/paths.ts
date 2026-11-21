import { homedir } from "node:os";
import { join } from "node:path";

export interface UltraCodePaths {
  userHome: string;
  home: string;
  config: string;
  bin: string;
  binary: string;
  shortBinary: string;
  manifest: string;
  runtime: string;
  browsers: string;
  opencodeConfigFile: string;
  opencodeBinary: string;
}

export function resolvePaths(env: NodeJS.ProcessEnv = process.env): UltraCodePaths {
  const userHome = env.HOME || homedir();
  const dataHome = env.XDG_DATA_HOME || join(userHome, ".local", "share");
  const configHome = env.XDG_CONFIG_HOME || join(userHome, ".config");
  const home = env.ULTRACODE_HOME || join(dataHome, "ultracode");
  const config = env.OPENCODE_CONFIG_DIR || join(configHome, "opencode");
  const bin = env.ULTRACODE_BIN_DIR || join(userHome, ".local", "bin");

  return {
    userHome,
    home,
    config,
    bin,
    binary: join(bin, "ultracode"),
    shortBinary: join(bin, "uc"),
    manifest: join(home, "manifest.json"),
    runtime: join(home, "runtime"),
    browsers: join(home, "browsers"),
    opencodeConfigFile: join(config, "opencode.jsonc"),
    opencodeBinary: env.ULTRACODE_OPENCODE_BIN || "opencode",
  };
}

export type Paths = ReturnType<typeof resolvePaths>;
