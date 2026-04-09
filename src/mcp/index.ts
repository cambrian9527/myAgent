/**
 * MCP Server entry point.
 *
 * Run this file to start the MCP server, which exposes
 * the agent's tools via the Model Context Protocol.
 *
 * Usage:
 *   npx tsx src/mcp/server.ts
 *
 * Or add to Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "myagent": {
 *         "command": "npx",
 *         "args": ["tsx", "path/to/myagent/src/mcp/server.ts"]
 *       }
 *     }
 *   }
 */

import "dotenv/config";
import { MCPServer } from "./server.js";
import { allTools } from "../tools/index.js";
import { logger } from "../utils/logger.js";

async function main() {
  const server = new MCPServer({
    name: process.env.MCP_SERVER_NAME ?? "myagent-mcp",
    version: process.env.MCP_SERVER_VERSION ?? "1.0.0",
  });

  // Register all available tools
  server.registerTools(allTools);

  logger.info(`MCP server starting with ${allTools.length} tools...`);

  // Start stdio transport
  await server.startStdio();
}

main().catch((error) => {
  logger.error("MCP server failed to start", error);
  process.exit(1);
});
