import server from "../../config/opencode/conversation/server.js" with { type: "text" };
import settings from "../../config/opencode/conversation/settings.js" with { type: "text" };
import tui from "../../config/opencode/conversation/tui.js" with { type: "text" };
import architect from "../../config/opencode/agents/architect.md" with { type: "text" };
import implementer from "../../config/opencode/agents/implementer.md" with { type: "text" };
import librarian from "../../config/opencode/agents/librarian.md" with { type: "text" };
import orchestrator from "../../config/opencode/agents/orchestrator.md" with { type: "text" };
import planner from "../../config/opencode/agents/planner.md" with { type: "text" };
import reviewer from "../../config/opencode/agents/reviewer.md" with { type: "text" };
import visualEvaluator from "../../config/opencode/agents/visual-evaluator.md" with { type: "text" };
import ralphPrompt from "../../config/opencode/ralph/prompt.md" with { type: "text" };
import ralphRunner from "../../config/opencode/ralph/run.sh" with { type: "text" };
import featureList from "../../config/opencode/ralph/templates/FEATURE_LIST.json" with { type: "text" };
import handoff from "../../config/opencode/ralph/templates/HANDOFF.md" with { type: "text" };
import progress from "../../config/opencode/ralph/templates/PROGRESS.md" with { type: "text" };
import qaReport from "../../config/opencode/ralph/templates/QA_REPORT.md" with { type: "text" };
import qaGitignore from "../../config/opencode/ralph/templates/qa.gitignore" with { type: "text" };
import sprintContract from "../../config/opencode/ralph/templates/SPRINT_CONTRACT.md" with { type: "text" };
import ralphGitignore from "../../config/opencode/ralph/templates/gitignore" with { type: "text" };
import uiRubric from "../../config/opencode/ralph/templates/UI_RUBRIC.md" with { type: "text" };

export interface Asset {
  target: string;
  content: string;
  executable?: boolean;
}

export const assets: Asset[] = [
  { target: "ultracode/conversation/server.js", content: server },
  { target: "ultracode/conversation/settings.js", content: settings },
  { target: "ultracode/conversation/tui.js", content: tui },
  { target: "agents/ultracode/architect.md", content: architect },
  { target: "agents/ultracode/implementer.md", content: implementer },
  { target: "agents/ultracode/librarian.md", content: librarian },
  { target: "agents/uc-apex.md", content: orchestrator },
  { target: "agents/uc-atlas.md", content: planner },
  { target: "agents/ultracode/reviewer.md", content: reviewer },
  { target: "agents/ultracode/visual-evaluator.md", content: visualEvaluator },
  { target: "ultracode/prompt.md", content: ralphPrompt },
  { target: "ultracode/run.sh", content: ralphRunner, executable: true },
  { target: "ultracode/templates/FEATURE_LIST.json", content: featureList as unknown as string },
  { target: "ultracode/templates/HANDOFF.md", content: handoff },
  { target: "ultracode/templates/PROGRESS.md", content: progress },
  { target: "ultracode/templates/QA_REPORT.md", content: qaReport },
  { target: "ultracode/templates/SPRINT_CONTRACT.md", content: sprintContract },
  { target: "ultracode/templates/UI_RUBRIC.md", content: uiRubric },
  { target: "ultracode/templates/gitignore", content: ralphGitignore },
  { target: "ultracode/templates/qa.gitignore", content: qaGitignore },
];
