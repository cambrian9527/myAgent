#!/usr/bin/env node

/**
 * CLI entry point for the Agent.
 *
 * Usage:
 *   npx tsx src/cli.ts "Your question here"
 *   npx tsx src/cli.ts --interactive
 *   npx tsx src/cli.ts --mcp
 */

import "dotenv/config";
import { Agent, LLMClient } from "./agent/index.js";
import { allTools } from "./tools/index.js";
import { allSkills } from "./skills/index.js";
import { MCPServer } from "./mcp/server.js";
import type { LLMConfig } from "./types/index.js";
import { logger } from "./utils/logger.js";

// ─── Load Configuration ─────────────────────────────────────────────────────

function loadConfig(): LLMConfig {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    console.error("Error: LLM_API_KEY environment variable is required");
    console.error("Create a .env file based on .env.example");
    process.exit(1);
  }

  return {
    apiKey,
    baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
    model: process.env.LLM_MODEL ?? "gpt-4o",
    maxTokens: parseInt(process.env.AGENT_MAX_TOKENS ?? "4096", 10),
    temperature: parseFloat(process.env.AGENT_TEMPERATURE ?? "0.7"),
  };
}

// ─── Run Agent ───────────────────────────────────────────────────────────────

async function runAgent(query: string): Promise<void> {
  const config = loadConfig();
  const llm = new LLMClient(config);

  const agent = new Agent(
    {
      name: "myagent",
      description: "A production-grade AI agent",
      systemPrompt:
        "You are a helpful AI assistant with access to various tools. " +
        "Use the tools available to you to accomplish the user's request. " +
        "Always think step-by-step and explain your reasoning.",
      maxTurns: parseInt(process.env.AGENT_MAX_TURNS ?? "20", 10),
      tools: allTools,
      skills: allSkills,
    },
    llm
  );

  console.log(`\n🤖 Agent: Processing your request...\n`);

  const result = await agent.run(query, {
    onToolCall: (name, params) => {
      console.log(`  🔧 Calling tool: ${name}`);
      console.log(`     Params: ${JSON.stringify(params).slice(0, 100)}...`);
    },
    onToolResult: (name, result) => {
      const icon = result.is_error ? "❌" : "✅";
      console.log(`  ${icon} Tool result (${name}): ${result.content.slice(0, 100)}...`);
    },
  });

  console.log(`\n━━━ Final Answer ━━━\n`);
  console.log(result.finalText);
  console.log(`\n━━━ Stats: ${result.turnsUsed} turns, ${result.toolCallsCount} tool calls ━━━\n`);
}

// ─── Run MCP Server ──────────────────────────────────────────────────────────

async function runMCP(): Promise<void> {
  const server = new MCPServer({
    name: process.env.MCP_SERVER_NAME ?? "myagent-mcp",
    version: process.env.MCP_SERVER_VERSION ?? "1.0.0",
  });

  server.registerTools(allTools);
  await server.startStdio();
}

// ─── Interactive Mode ────────────────────────────────────────────────────────

async function runInteractive(): Promise<void> {
  const config = loadConfig();
  const llm = new LLMClient(config);

  const agent = new Agent(
    {
      name: "myagent",
      description: "A production-grade AI agent",
      systemPrompt:
        "You are a helpful AI assistant. Use tools when needed. Think step by step.",
      maxTurns: parseInt(process.env.AGENT_MAX_TURNS ?? "20", 10),
      tools: allTools,
      skills: allSkills,
    },
    llm
  );

  console.log("\n🤖 MyAgent Interactive Mode");
  console.log("Type your message and press Enter. Type 'exit' to quit.\n");

  const readline = await import("node:readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Gracefully handle stdin close (e.g. piped input exhausted)
  rl.on("close", () => {
    process.exit(0);
  });

  const askQuestion = (): void => {
    rl.question("You: ", async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed === "exit" || trimmed === "quit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      try {
        const result = await agent.continue(trimmed, {
          onToolCall: (name) => console.log(`  🔧 ${name}`),
        });
        console.log(`\nAgent: ${result.finalText}\n`);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--mcp")) {
    await runMCP();
    return;
  }

  if (args.includes("--interactive") || args.includes("-i")) {
    await runInteractive();
    return;
  }

  const query = args.join(" ");
  if (!query) {
    console.log("Usage:");
    console.log("  npx tsx src/cli.ts \"Your question\"    - Run a single query");
    console.log("  npx tsx src/cli.ts --interactive       - Interactive mode");
    console.log("  npx tsx src/cli.ts --mcp               - Start MCP server");
    return;
  }

  await runAgent(query);
}

main().catch((error) => {
  logger.error("Fatal error", error);
  process.exit(1);
});
