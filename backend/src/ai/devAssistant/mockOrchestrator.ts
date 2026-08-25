// The AI Dev Assistant's no-API-key fallback — same principle as
// ai/mockAnalyzer.ts: the app (and this feature) must work with zero API
// key. No LLM planner and no LLM synthesis here; a simple keyword heuristic
// picks agents, and the "diagnosis" is just the raw findings, clearly
// labeled as such rather than dressed up as an AI opinion.
import { searchRepo, getRecentGitLog, searchRecentLogs, runTestSuite, extractSearchKeywords } from "./tools";
import { AgentName, OnStep } from "./orchestratorGraph";

function pickAgents(question: string): AgentName[] {
  const q = question.toLowerCase();
  const agents: AgentName[] = ["repo"]; // always search the codebase
  if (/\b(log|error|exception|crash)\b/.test(q)) agents.push("log");
  if (/\b(test|broken|bug|regression|fail)\b/.test(q)) agents.push("test");
  agents.push("git"); // cheap, usually relevant context
  return agents;
}

export async function runDevAssistantMock(question: string, onStep: OnStep) {
  onStep("orchestrator", "running");
  const selectedAgents = pickAgents(question);
  onStep("orchestrator", "done", `Selected (keyword heuristic, no LLM): ${selectedAgents.join(", ")}`);

  const findings: Record<string, string> = {};
  const keywords = extractSearchKeywords(question);

  for (const agent of selectedAgents) {
    onStep(agent, "running");
    let result: string;
    if (agent === "repo") result = await searchRepo(keywords);
    else if (agent === "git") result = await getRecentGitLog(10);
    else if (agent === "log") result = searchRecentLogs(keywords);
    else result = await runTestSuite();
    findings[agent] = result;
    onStep(agent, "done", result.length > 800 ? `${result.slice(0, 800)}…` : result);
  }

  onStep("diagnosis", "running");
  const diagnosis =
    "No GROQ_API_KEY configured — showing raw findings only, no AI synthesis. " +
    "Set GROQ_API_KEY for an actual diagnosis and recommendation.\n\n" +
    Object.entries(findings)
      .map(([agent, text]) => `--- ${agent} ---\n${text}`)
      .join("\n\n");
  onStep("diagnosis", "done", diagnosis);

  return { selectedAgents, findings, diagnosis };
}
