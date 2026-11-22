import { homedir } from "node:os";
import { posix, win32 } from "node:path";

export interface UltraCodePaths {
  userHome: string;
  home: string;
  config: string;
  bin: string;
  binary: string;
  manifest: string;
  runtime: string;
  browsers: string;
  opencodeConfigFile: string;
  opencodeBinary: string;
}

export function resolvePaths(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): UltraCodePaths {
  const pathJoin = platform === "win32" ? win32.join : posix.join;
  if (platform === "win32") {
    const userHome = env.USERPROFILE || env.HOME || homedir();
    const localAppData = env.LOCALAPPDATA || pathJoin(userHome, "AppData", "Local");
    const home = env.ULTRACODE_HOME || pathJoin(localAppData, "ultracode");
    const configHome = env.XDG_CONFIG_HOME || pathJoin(userHome, ".config");
    const config = env.OPENCODE_CONFIG_DIR || pathJoin(configHome, "opencode");
    const bin = env.ULTRACODE_BIN_DIR || pathJoin(home, "bin");
    return {
      userHome,
      home,
      config,
      bin,
      binary: pathJoin(bin, "ultracode.exe"),
      manifest: pathJoin(home, "manifest.json"),
      runtime: pathJoin(home, "runtime"),
      browsers: pathJoin(home, "browsers"),
      opencodeConfigFile: pathJoin(config, "opencode.jsonc"),
      opencodeBinary: env.ULTRACODE_OPENCODE_BIN || "opencode",
    };
  }

  const userHome = env.HOME || homedir();
  const dataHome = env.XDG_DATA_HOME || pathJoin(userHome, ".local", "share");
  const configHome = env.XDG_CONFIG_HOME || pathJoin(userHome, ".config");
  const home = env.ULTRACODE_HOME || pathJoin(dataHome, "ultracode");
  const config = env.OPENCODE_CONFIG_DIR || pathJoin(configHome, "opencode");
  const bin = env.ULTRACODE_BIN_DIR || pathJoin(userHome, ".local", "bin");

  return {
    userHome,
    home,
    config,
    bin,
    binary: pathJoin(bin, "ultracode"),
    manifest: pathJoin(home, "manifest.json"),
    runtime: pathJoin(home, "runtime"),
    browsers: pathJoin(home, "browsers"),
    opencodeConfigFile: pathJoin(config, "opencode.jsonc"),
    opencodeBinary: env.ULTRACODE_OPENCODE_BIN || "opencode",
  };
}

export type Paths = ReturnType<typeof resolvePaths>;
