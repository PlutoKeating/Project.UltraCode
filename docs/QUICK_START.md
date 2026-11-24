# 快速开始

## 1. 一条命令安装

无需预先安装任何依赖——如果当前机器尚未安装官方 OpenCode V2（`v2.3.2+`，已验证兼容 `v2.4+`），安装脚本会自动通过官方渠道完成安装或更新。

**macOS / Linux**：

```bash
curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash
```

**Windows（PowerShell）**：

```powershell
irm https://ultracode.plutokeating.beer/install.ps1 | iex
```

安装完成后终端会显示极简就绪提示：

```text
UltraCode 1.1.1

✓ Ready

  ultracode
  ultracode desktop
  ultracode pair
```

## 2. 验证环境（零模型调用）

```bash
ultracode version
ultracode doctor
```

## 3. 选择你喜欢的使用方式

- **终端（TUI）**：在项目目录直接运行 `ultracode`（所有 `opencode` 参数与子命令均原样支持）。
- **桌面客户端（Desktop）**：运行 `ultracode desktop` 直接打开官方桌面端（若尚未安装，会自动下载并打开当前系统的官方安装包）。
- **网页端与手机端（Web & Mobile）**：运行 `ultracode pair`（远程穿透用 `ultracode pair --remote`），浏览器打开链接或用手机扫码即可接入。

## 4. 1 分钟最小体验示例

在空目录初始化 Git 并运行 `ultracode` 后，直接发送一句话目标：

> “帮我做一个本地离线可用的极简番茄钟网页，包含 25/5 分钟切换、开始/暂停/重置和桌面+移动端自适应；完成后启动本地预览，实际点击所有按钮并用真实浏览器截图做独立视觉检查，确认零控制台报错且界面无溢出后再交给我。”

- 按 `Shift+Tab` 可在默认主角色 `UltraBuild`（总协调与交付）与 `UltraPlan`（纯只读规划）之间切换。
- 在 OpenCode Desktop 点击输入框上方的 **UltraCode** 胶囊（可一键切换双开关，并在有排队里程碑时查看或一键清除下一阶段目标；或进入 **Settings → UltraCode**），在 TUI 命令面板搜索 **UltraCode**，或在网页/手机端输入 `/approvals`、`/direction`，可随时切换 **Command approvals** 与 **Direction questions**。

## 5. 日常升级与卸载

一键升级官方 OpenCode 与 UltraCode：

```bash
ultracode upgrade
```

仅重新同步配置：

```bash
ultracode sync
```

无痕卸载（保留你的个人配置与备份）：

```bash
ultracode uninstall --yes
```
