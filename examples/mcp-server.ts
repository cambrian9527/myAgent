/**
 * Example: Using the MCP Server standalone.
 *
 * This example demonstrates starting the MCP server
 * and how a client would interact with it.
 */

import { MCPServer } from "../src/mcp/server";
import { allTools } from "../src/tools/index";
import { allSkills } from "../src/skills/index";
import type { Tool } from "../src/types/index";

async function main() {
  const server = new MCPServer({
    name: "myagent-mcp-example",
    version: "1.0.0",
  });

  // Register built-in tools
  server.registerTools(allTools);

  // Register skill tools
  for (const skill of allSkills) {
    for (const toolDef of skill.tools) {
      const tool: Tool = {
        definition: toolDef,
        execute: (params) => skill.execute(toolDef.name, params),
      };
      server.registerTool(tool);
    }
  }

  console.log("MCP Server configured with tools:");
  for (const tool of allTools) {
    console.log(`  - ${tool.definition.name}: ${tool.definition.description.slice(0, 60)}...`);
  }

  console.log("\nTo start the server:");
  console.log("  npx tsx src/mcp/index.ts");
  console.log("\nOr add to Claude Desktop config:");
  console.log(JSON.stringify(
    {
      mcpServers: {
        myagent: {
          command: "npx",
          args: ["tsx", "path/to/myagent/src/mcp/index.ts"],
        },
      },
    },
    null,
    2
  ));
}

main().catch(console.error);
