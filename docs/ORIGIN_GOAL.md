> **历史立项背景**：本文件保留了 UltraCode **v0.1.0 之前**的原始问题提出与早期调研对话记录（基于当时个人多模型 / Vertex 实验场景）。当前公开正式版 UltraCode（v1.1.1）已演进为完全 **Provider/Model 中立**的 Goal Engineering（目标工程）增强层；最新设计与用法请参见 [README](../README.md)、[中文说明](../README_ZH.md) 与 [架构](ARCHITECTURE.md)。

## Question

前情提要：我知道模型能力和coding agent能力，包括harness方法论在业界的发展是日新月异的，并且业界共识“大部分旧模型或二线、三线的模型（例如GLM/Qwen/Doubao等）确实就是智力和能力都跟不上”，所以以下的讨论存在限定范围：
1. 2026年9月及以后的研究/技术成果/技术水准/业界共识
2. claude大模型sonnet5.5、opus5及newer version的模型水准
3. deepseek v4flash 1017的模型水准
4. gemini4系列（argon, carbon, hydrogen, neon）的模型水准
5. gpt-5.6-sol、gpt6及newer version的模型水准
6. kimi3.1pro的模型水准

现在我有一个非常显著的问题：
我用过非常多的coding agent来进行全栈开发，运维，负责很多大型软件或软硬件结合项目的全量开发和运维工作，包括但不限于后端构建、前端设计（尤其是艺术设计和审美方面，尤其是entire-software/entire-website这种包含多页面、大量功能的toC生产落地产品的UX design和跨大量场景的用户交互需求设计等的情况）
我现在的主力是claude code, 使用claude官方订阅，用过fable5.2, 也用过sonnet 5.5

但是额度有的时候不够用，我也会用一些其他的搭配
我可以自备等效于无限额度的低成本大模型，主要范围是在上述提到的讨论范围内，除了claude以外所有的模型

所以我会选择opencode作为主要的低成本大模型使用搭配

我也尝试过把低成本大模型接入到claude code中，或者接入到kimicode, deepseek harness等

我也用过codex, 搭配codex官方的模型，从5.6sol到6.2astra都用过

也尝试过codex+deepseek模型接入

我很好奇的是，在非常多（包括但不限于上述模型+agent harness搭配）的实际使用经历中，我会发现

就是说这个文明显感觉到claude code在各种各样的场景，尤其是比方说我有一个非常巨量的一个开发需求，比方说给一个软件完全重构或者说完全从零到一开发一个新的模块，开发多个新的模块，甚至是从单纯的一个spec立项文档直接到产出这个软件的过程中，包括我也使用一些/goal那种命令，在大量的使用当中我发现claude code的确实是具有最佳的使用效益的，包括它会倾向于更多的派遣子代理，然后特别长时间的任务当中，只要我的上下文足够明确，我提前把所有问题全部的确定好了之后，它确实能非常强的把所有功能全部实现，它在极长的一个一段的上下文当中，甚至是可能8小时9小时的长时间的任务当中，能够确保自始至终是要去完成这个任务

而比如说gemini+opencode这种配置，甚至是比如我把deepseek/gemini模型接入到claude code当中，也没有办法真的非常好的实现这些能力，容易出现一种虎头蛇尾的感觉

我想知道claude code+claude大模型，到底是在哪些方面显著地“强”？有没有办法，或者说有没有现有的调研或社区讨论，甚至是社区逆向成果，能够让我“窥探一下天机”，在不是纯粹的“claude code+claude大模型”的使用场景下，实现较强的、甚至一定程度实现纯血claude code工作的强能力和水准？

请根据这个具体的场景需求，需要你充分进行联网搜索，搜索范围包括但不限于github开源社区/其他开源社区/开发者个人博客/论坛/讨论帖/各种开发者tutorial或instructions文章等，充分调研与参考现有的社区最佳实践或方案，搜索最佳的方案/框架/实现思路或方法论，尽可能避免重复造轮子，在充分理解我们项目的立意和需求场景或典型用例的精神定义的前提下，充分脑暴，思考最佳的实践方案

## Answer

你观察到的现象在 2026 年的 Agent 工程界已经是明确共识：**长程任务（8–9 小时级别）的稳定性，决胜点不在单次推理智商，而在“模型权重 × Harness 工程”的联合对齐**。纯血 `Claude Code + Claude 5` 之所以能从 Spec 一路跑通全栈交付而很少“虎头蛇尾”，背后既有 2026 年两次关键技术揭秘的实锤，也有一套可以直接移植到你手头 **OpenCode + 无限额度 低成本大模型** 的社区成熟方案。

---

### 一、 “天机”拆解：纯血 `Claude Code + Claude 5` 到底强在哪？

结合 2026 年 3 月 Claude Code 源码泄漏（`v2.1.88` 约 51.2 万行 TypeScript）以及 Anthropic 官方发表的两篇核心技术报告，纯血组合的护城河主要在三层：

1. **模型与 Harness 的 RL 联合训练（把规范“刻进权重”）**
Anthropic 在 2026 年 7 月公开的 [Claude 5 上下文工程新规](https://www.developersdigest.tech/blog/context-engineering-claude-5-new-rules-2026)中披露：针对 Opus 5 和 Fable 5 等新一代模型，团队**直接删掉了 Claude Code 超过 80% 的系统提示词**，而编码评测成绩没有任何下降。
这意味着“何时主动派子代理、何时用渐进式披露、如何在长程中保持目标不漂移”已经被做进了 Claude 5 家族的强化学习后训练里。相反，当你把 **低成本大模型 或 DeepSeek V4.1** 塞进 Claude Code 这种极简契约里时，非 Claude 模型既没对齐过这套隐式工具习惯，还会因为接口细节差异触发各种卡死或提前终止（比如社区在 OpenCode 中高频踩坑的 Gemini `thoughtSignature` 缺失、工具调用后停摆或子代理空会话问题，见 [OpenCode #4832](https://github.com/anomalyco/opencode/issues/4832)、[#14972](https://github.com/anomalyco/opencode/issues/14972)、[#20645](https://github.com/anomalyco/opencode/issues/20645)）。
2. **8 级压缩引擎 + 3 层记忆 + 子代理上下文隔离**
根据社区对泄漏源码的逆向分析（[Inside Claude Code's Leak](https://medium.com/data-science-collective/inside-claude-codes-leak-8-compaction-modes-3-memory-tiers-44-flags-anthropic-never-talked-c9740c501e63) 与 [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)），Claude Code 绝不是简单的 `while` 循环，它靠这套机制撑过 9 小时而不发生 Context Rot（上下文腐烂）：
* **8 种级联压缩模式**：单次工具输出超过 5 万字符自动落盘并只留 2KB 预览（Tool Result Budget）；无 LLM 开销的滑动裁剪（Snip）；服务端缓存级精准删旧工具结果（Cached Microcompact）；在窗口用到 **83.5% 时 Fork 子代理生成严格 9 段式结构化摘要并复用父会话 Cache Key**（Auto-Compact）；以及防死循环熔断器（Circuit Breaker）。
* **3 层记忆隔离**：`CLAUDE.md`（Tier 3）位于动态边界之上，是唯一在 Auto-Compact 后**一字不差保留**的规则层；`MEMORY.md`（Tier 2）只做指针索引按需加载，不撑爆窗口。
* **激进的子代理上下文隔离**：探索代码库、跑全量测试、查报错堆栈全丢给子代理在独立窗口里消化，主代理只收几十字的精炼结论。


3. **解决“上下文焦虑”与前端“自评宽容”**
Anthropic 在 [《Harness design for long-running application development》](https://www.anthropic.com/research/harness-design-long-running-apps) 中指出了导致“虎头蛇尾”的两个底层病理：
* **Context Anxiety（上下文焦虑）**：模型一旦感知上下文快满，就会本能地敷衍收尾或伪造完成状态。早期 Sonnet 4.5 必须靠 **Context Resets（彻底清零窗口 + 结构化交接文件）** 才能续命，而 Opus/Fable 家族在训练中大幅消除了这种焦虑。
* **Self-Evaluation Bias（自评偏差）**：在主观审美（你重点提到的 toC 多页面 UI/UX 设计）上，同一个 Agent 写完页面后自己检查几乎必然“盲目自信”。Anthropic 的破局方式是**仿 GAN 的三角色分离**：`Planner`（扩写 Spec 与视觉语言）→ `Generator`（分 Sprint 实现）↔ 独立的 `Skeptical Evaluator`（挂载 Playwright 实机点击+截图，按可评分的 Rubric 挑刺打回），并在每个 Sprint 前先签一份 **Sprint Contract（验收契约）**。



---

### 二、 非纯血环境的最优解：如何用好“无限额度 低成本大模型”？

用 `v2.3.0+` + `oh-my-opencode` + `Ralph Loop**`

* **升级底座**：确保使用 [OpenCode v2.3.0+](https://ai-tldr.dev/tools/opencode/)（2026 年 11 月刚上线默认后台子代理机制）。
* **核心插件 [oh-my-opencode**](https://github.com/opensoft/oh-my-opencode)（或轻量版 [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim)）：它直接把 Claude Code 的核心工作流移植到了 OpenCode，提供 `Prometheus`（需求面试官与规划）、`Atlas`（分发与独立验收）、`Sisyphus`（主执行）、`Oracle`（架构调试）、`Multimodal Looker`（多模态视觉检查）以及防偷懒的 **Todo Enforcer**。
* **核心外挂 [Ralph Wiggum Loop**](https://ralphloop.sh/blog/ralph-loop-with-opencode/)（如 [opencode-ralph-loop](https://github.com/charfeng1/opencode-ralph-loop)、[open-ralph-wiggum](https://github.com/Th0rgal/open-ralph-wiggum)，`oh-my-opencode` 也内置了 `/ralph-loop`）：**用“外部死循环 + 全新上下文窗口（Context Reset）”取代单会话硬撑**。每轮迭代都重开一个干净的 OpenCode 会话，从磁盘读取 `Spec/PRD + Task Checklist + Git Diff`，做完一个模块并通过测试才提交进入下一轮。**因为你的 低成本大模型 是无限额度，每轮重传 Context 完全零成本**，这正好完美绕开了非 Claude 模型在超长上下文中的衰减和偷懒问题。
* **方法论约束 [obra/superpowers**](https://github.com/obra/superpowers)：支持一键装进 OpenCode ，强制执行 `Spec 头脑风暴 -> 计划拆解 -> 子代理驱动 TDD -> 任务间 Review`，用硬性测试红绿灯锁死交付质量。

---

### 三、 落地实操步骤（将 OpenCode + 低成本模型 改造成长程开发流水线）

1. **安装 oh-my-opencode 并做 低成本大模型 分层路由:** 前置条件：OpenCode v2.3.0+.
安装 `oh-my-opencode` 后，在配置文件中按角色拆分配额（而非全塞同一个模型）：将 `Prometheus`（规划）和 `Oracle`（深层 Debug）绑定到 **Ultra级别低成本大模型**；将 `Sisyphus`（主执行）与 `Atlas`（编排）绑定到 **Pro级别低成本大模型**（或 Argon）；将高频检索类的 `Explore` / `Librarian` 绑定到 **Flash级别低成本大模型**。


2. **用 Ralph Loop 替代单会话长跑:** 解决虎头蛇尾的核心开关.
不要在单个对话窗口里下达 8 小时的总指令。把你的 Spec 文档拆成带验收标准的 `tasks.md`，使用 `oh-my-opencode` 内置的 `/ralph-loop` 或外部 [opencode-ralph-loop](https://github.com/charfeng1/opencode-ralph-loop)，让每次循环都在**全新上下文**中只啃 1 个模块并跑通单测、Git Commit 后再进入下一轮。


3. **为前端 UX/UI 挂载独立的 Playwright 视觉评审环:** 复刻 Anthropic 的 GAN 式审美提升.
参考 [Anthropic 长程前端实验](https://www.anthropic.com/research/harness-design-long-running-apps) 的 4 项评分标准（**设计统一性、原创性/严禁默认紫白 AI 模板、排版工艺、交互可用性**）写一份 `UI RUBRIC.md`。给独立的 QA 子代理（或利用 低成本大模型 原生多模态能力）挂载 **Playwright MCP**，强制要求它在每个页面完成后启动本地服务、真实点击所有交互状态并截图对照 Rubric 打分，不达标直接打回重写。

