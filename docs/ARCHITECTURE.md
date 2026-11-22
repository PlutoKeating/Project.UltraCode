# UltraCode 架构

## 1. 目标

UltraCode 解决两类问题：长程工程中的目标漂移、上下文腐烂与自评宽容；以及增强链路在新机、已有复杂配置和 OpenCode 官方升级后的可重复安装。

核心约束：Provider/Model 中立，不读取凭据，不做真实模型安装测试，不侵入官方二进制。

## 2. 长程工作流与目标工程（Goal Engineering）

```text
用户目标 / Spec（自然语言）
  → UltraBuild（默认主角色）/ UltraPlan（Shift+Tab 规划）
  → ultracode-conversation 插件（里程碑调度 / 权限与方向模式 / 模型池工具）
  → Superpowers：澄清、TDD、系统化调试
  → 后台子代理（agents/ultracode/）：architect / implementer / librarian / reviewer / visual-evaluator
  → Ralph 外层全新 opencode run（需要彻底重置上下文时）
  → Git、任务、Progress、Handoff 持久化
```

子代理隔离会话内上下文，Ralph 在顶层迭代之间创建新会话。二者不可互相替代。

所有角色不包含 `model`，Ralph 不传 `--model`。默认继承当前 OpenCode 会话模型；模型可通过 `ultracode_model` 查询可用模型池，并在用户明确指定或授权的模型池内切换。

## 3. 对话式目标工程插件与控制面

UltraCode 在 `~/.config/opencode/ultracode/conversation/` 注册一对嵌入式插件（随 CLI 内嵌，由安装器自动写入配置）：

- **`ultracode-conversation`（Server 入口，`server.js`）**：
  - 注入主会话系统引导（仅主会话，不重复注入子会话），按 `direction.mode` 切换方向决策约束。
  - 注册工具 `ultracode_checkpoint`：由模型登记或清除一次性下一里程碑；用户发送新输入（`session.prompt` 钩子）时自动清除旧调度；在 `experimental.idle` 且无关联后台子任务运行时，自动触发合成续跑消息推进下一里程碑。
  - 注册工具 `ultracode_model`：列出当前可用模型 ID，或在用户显式请求/授权模型池内调用 `ctx.session.switchModel` 切换当前会话模型。
  - 注册 `permission.evaluate` 钩子：当 `permissions.mode` 为 `auto` 时，自动放行宿主原本为 `ask` 的操作；显式 `deny` 规则始终保持生效。
- **`ultracode-conversation-ui`（TUI 入口，`tui.js`）**：
  - 在 TUI 命令面板（`UltraCode` 分组）注册全局开关命令：`ultracode.toggle-permissions`（**Command approvals**，默认 `auto`）和 `ultracode.toggle-direction`（**Direction questions**，默认 `manual`）。
  - 模式状态原子持久化至 `$ULTRACODE_HOME/permissions.mode` 与 `$ULTRACODE_HOME/direction.mode`（`0600` 权限）。

**跨重启与续跑边界**：只要 OpenCode 服务端进程持续运行，已登记的里程碑会在会话空闲时自动续跑；新用户输入或明确叫停会立即清除待续跑里程碑。服务进程重启后，内存中的里程碑调度不会无人值守地自动恢复，但长任务的任务清单、进度与交接文档持久保存在仓库内（`.ralph/` 或项目既有约定），用户可直接用自然语言要求“读取交接并继续”。

**工程与协作原则**：开工前先读仓库，涉及范围、验收或不可逆决策时集中调研并一次问齐；原对话聚焦里程碑、阻塞与结果；默认在当前工作区串行写入，必要时隔离到 linked worktree，遵守仓库 Git 规则与用户身份；复杂改动独立评审，用户可见界面必须实际操作并目视检查渲染结果；按真实进展决定续跑，公共版不施加默认硬性时间或轮次预算。

## 4. 分发模块与接口

```text
                  小接口
        apply / sync / doctor / update / up / uninstall
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
 Install Module     Config Module      Release Module
 文件所有权/卸载     最大并集 JSONC       稳定版本/SHA256
      │                  │                  │
 Runtime Module     OpenCode Adapter    Website Module
 私有运行时/浏览器   版本/官方升级        Stable/Next 双语站点
```

接口只暴露调用者需要的操作；平台、路径、备份、锁版本、原子写入、组件对账和验收属于内部实现。

## 5. 最大并集合并与组件身份对账

- 对象递归补缺失键。
- 数组按值去重追加，避免重复权限和插件。
- 已有不同标量保留并报告。
- JSONC 注释、未知字段、Provider、凭据引用和用户 MCP 原样保留。
- 主角色 `UltraBuild`（默认，总协调与执行）与 `UltraPlan`（规划，`Shift+Tab` 切换）安装在 `agents/`；5 个后台子代理（`architect`、`implementer`、`librarian`、`reviewer`、`visual-evaluator`）安装在 `agents/ultracode/`；不再安装旧版 `/ultracode-*` 斜杠命令。
- MCP 默认注册 `ultracode_playwright`；安装器按插件身份（`ultracode-conversation`、`superpowers`）、权限 `action`/`resource` 以及 MCP 启动契约识别冲突与等价组件——若用户已配置等价的无头隔离 Playwright MCP，安装器自动复用该服务名，并将视觉评审角色的权限与工具名对齐到复用名。
- 清单（schema v2）记录安装器实际添加的字段、数组成员与文件哈希，区分上游旧文件与用户本地修改；旧版清单（schema v1）通过可验证的安装前备份迁移，来源无法确认时保留原值。
- 卸载仅精确删除未修改的 UltraCode 所有状态。

## 6. 私有运行时

独立编译 CLI 内嵌 Bun 能力。安装器以子进程方式使用同一二进制安装固定版本 Ralph 与 Playwright，无需用户预装 Node/Bun，也不写全局包目录。

Superpowers 与 Ralph 的固定源码归档具有 SHA-256；Playwright 使用精确 npm 版本。浏览器存入 UltraCode 数据目录。

## 7. 官方升级接缝与运行时诊断

OpenCode 二进制只由官方安装脚本或 `opencode upgrade` 管理。

- `uc up`：显式执行官方升级，再更新 UltraCode 并 sync。
- `uc sync`：官方 `/update` 或安装脚本后的幂等修复。
- `uc doctor`：无真实模型调用的实时结构与运行时检查——校验 OpenCode 版本、受管文件完整性、当前项目实际注册的角色、Superpowers 与 UltraCode 插件的活动状态，以及所选浏览器 MCP 的连接状态。

当前测试基线为 OpenCode V2.3.x（v2.3.2+）；更新的 V2 只承诺结构检查，未来大版本需要显式适配。

## 8. 网站与发布

Astro Starlight 从单一内容源生成中文/英文 Stable/Next 路由，并把根 `install.sh` 复制到静态站点。Cloudflare Workers Static Assets 发布 `website/dist`。

维护者为稳定 tag 手动触发 Release 工作流，使用单个 Linux Runner 交叉编译四种目标，在宿主执行版本冒烟，生成 SHA-256 与 Artifact Attestations。CI 不使用真实模型、用户凭据或 Docker。
