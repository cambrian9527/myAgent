/**
 * MyAgent - Production-grade AI Agent with MCP Server and Skill System.
 *
 * Architecture Overview:
 *
 * ┌─────────────────────────────────────────────────┐
 * │                   Agent                          │
 * │  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │
 *  │  │ LLM Client│  │ Tool Reg. │  │ Skill Loader│ │
 * │  └───────────┘  └───────────┘  └─────────────┘ │
 * │         │              │              │          │
 * │         └──────────────┼──────────────┘          │
 * │                        │                         │
 * │              ┌─────────▼──────────┐              │
 * │              │  Agentic Loop      │              │
 * │              │  (reason → act)    │              │
 * │              └────────────────────┘              │
 * └─────────────────────────────────────────────────┘
 *          │                              │
 *   ┌──────▼──────┐              ┌───────▼───────┐
 *   │  CLI / API  │              │  MCP Server   │
 *   │  Interface  │              │  (stdio/SSE)  │
 *   └─────────────┘              └───────────────┘
 *
 * Key Concepts:
 *
 * 1. Agent: The core loop that drives conversation with the LLM.
 *    It iteratively calls the LLM, executes tool calls, and feeds
 *    results back until a final answer is reached.
 *
 * 2. Tool: A single function that the agent can call. Each tool has
 *    a JSON Schema definition and an execute function.
 *
 * 3. Skill: A bundle of related tools + an optional system prompt.
 *    Skills are like plugins that extend the agent's capabilities.
 *
 * 4. MCP Server: Exposes the agent's tools via the Model Context
 *    Protocol, allowing external clients (Claude Desktop, Cursor)
 *    to discover and call the tools.
 */

export { Agent, LLMClient, ToolRegistry, SkillLoader } from "./agent/index.js";
export { MCPServer } from "./mcp/server.js";
export { allTools } from "./tools/index.js";
export { SkillBase, allSkills } from "./skills/index.js";
export type * from "./types/index.js";
