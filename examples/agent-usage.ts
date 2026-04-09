/**
 * Example: Using the Agent programmatically.
 *
 * This example shows how to create and use the agent
 * without the CLI, for integration into your own applications.
 */

import "dotenv/config";
import { Agent, LLMClient } from "../src/agent/index";
import { allTools } from "../src/tools/index";
import { allSkills } from "../src/skills/index";
import type { LLMConfig } from "../src/types/index";

async function main() {
  // 1. Configure the LLM client
  const llmConfig: LLMConfig = {
    apiKey: process.env.LLM_API_KEY ?? "your-api-key",
    baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
    model: process.env.LLM_MODEL ?? "gpt-4o",
    maxTokens: 4096,
    temperature: 0.7,
  };

  const llm = new LLMClient(llmConfig);

  // 2. Create the agent with tools and skills
  const agent = new Agent(
    {
      name: "example-agent",
      description: "An example agent",
      systemPrompt:
        "You are a helpful coding assistant. " +
        "Use tools when needed to answer questions accurately.",
      maxTurns: 10,
      tools: allTools,
      skills: allSkills,
    },
    llm
  );

  // 3. Run the agent
  const result = await agent.run("List the files in the current directory and tell me what's here", {
    onToolCall: (name, params) => {
      console.log(`[Tool Call] ${name}:`, params);
    },
    onToolResult: (name, result) => {
      console.log(`[Tool Result] ${name}:`, result.is_error ? "ERROR" : "OK");
    },
  });

  console.log("\n=== Final Answer ===");
  console.log(result.finalText);
  console.log(`\nTurns: ${result.turnsUsed}, Tool calls: ${result.toolCallsCount}`);
}

main().catch(console.error);
