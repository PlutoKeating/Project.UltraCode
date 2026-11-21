# UltraCode Installer

独立编译、用户级、Provider/Model 中立的 OpenCode 增强安装器。

## 接口

`apply/sync`、`doctor`、`update`、`up`、`uninstall`，以及内部 `mcp`、`ralph`。

## 验证

```bash
bun install
bun test
bun run check
bun run build
./dist/ultracode-current version
```

测试使用临时 HOME 和伪 OpenCode，不调用真实模型。`ULTRACODE_SKIP_RUNTIME` 与 `ULTRACODE_SKIP_BROWSER` 仅用于测试。

详细设计见 [ARCHITECTURE](docs/ARCHITECTURE.md)。
