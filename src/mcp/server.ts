/**
 * MCP Server - Model Context Protocol server implementation.
 *
 * This implements the MCP protocol to expose the agent's tools
 * to external MCP clients (like Claude Desktop, Cursor, etc.).
 *
 * MCP Protocol Flow:
 * 1. Client connects via stdio or SSE
 * 2. Client sends initialize request → Server responds with capabilities
 * 3. Client sends tools/list → Server responds with tool definitions
 * 4. Client sends tools/call → Server executes and responds with result
 *
 * @see https://spec.modelcontextprotocol.io/specification/basic/
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Tool, ToolDefinition, ToolResult } from "../types/index.js";
import { logger } from "../utils/logger.js";

export class MCPServer {
  private server: Server;
  private tools = new Map<string, Tool>();

  constructor(config: { name: string; version: string }) {
    this.server = new Server(
      { name: config.name, version: config.version },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Register a tool with the MCP server.
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.definition.name, tool);
    logger.info(`MCP tool registered: ${tool.definition.name}`);
  }

  /**
   * Register multiple tools.
   */
  registerTools(tools: Tool[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * Start the server using stdio transport.
   * This is the standard way MCP servers communicate.
   */
  async startStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info("MCP server started (stdio transport)");
  }

  /**
   * Get the underlying MCP Server instance for advanced configuration.
   */
  getServer(): Server {
    return this.server;
  }

  // ─── Handler Setup ────────────────────────────────────────────────────

  private setupHandlers(): void {
    // Handle tools/list requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.values()).map((tool) => ({
        name: tool.definition.name,
        description: tool.definition.description,
        inputSchema: tool.definition.parameters,
      }));

      logger.debug(`MCP tools/list → ${tools.length} tools`);
      return { tools };
    });

    // Handle tools/call requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`MCP tools/call → ${name}(${JSON.stringify(args)})`);

      const tool = this.tools.get(name);
      if (!tool) {
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
      }

      try {
        const result: ToolResult = await tool.execute(args ?? {});
        return {
          content: [{ type: "text" as const, text: result.content }],
          isError: result.is_error ?? false,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    });
  }
}
