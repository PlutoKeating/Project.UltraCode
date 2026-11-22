# UltraCode Installer & CLI

独立编译、跨平台（Linux / macOS / Windows）、Provider/Model 中立的统一 `ultracode` CLI 与安装器。

## 接口

内置 `apply/sync`、`doctor`、`upgrade/update/up`、`desktop`、`uninstall`、`ralph`、`version`、`help` 以及内部 `_mcp`；其余所有参数与子命令直接透传至官方 `opencode`。

## 验证

```bash
bun install --cwd ../plugin-gui
bun run --cwd ../plugin-gui build
bun install
bun test
bun run check
bun run build
./dist/ultracode-current version
```

测试使用临时目录与伪 OpenCode，不调用真实模型。`ULTRACODE_SKIP_RUNTIME` 与 `ULTRACODE_SKIP_BROWSER` 仅用于测试。

详细设计见 [ARCHITECTURE](docs/ARCHITECTURE.md)。
