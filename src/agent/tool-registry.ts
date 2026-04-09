/**
 * Tool Registry - Manages tool registration and execution.
 *
 * Provides a centralized registry for all tools available to the agent,
 * including those from skills and standalone tool definitions.
 */

import type { Tool, ToolDefinition, ToolResult } from "../types/index.js";

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  /**
   * Register a tool.
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.definition.name)) {
      throw new Error(`Tool already registered: ${tool.definition.name}`);
    }
    this.tools.set(tool.definition.name, tool);
  }

  /**
   * Register multiple tools at once.
   */
  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Unregister a tool by name.
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name.
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool definitions (for LLM tool schemas).
   */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /**
   * Execute a tool by name with the given parameters.
   */
  async execute(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        content: `Unknown tool: ${name}`,
        is_error: true,
      };
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: `Tool execution error (${name}): ${message}`,
        is_error: true,
      };
    }
  }

  /**
   * List all registered tool names.
   */
  list(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Clear all registered tools.
   */
  clear(): void {
    this.tools.clear();
  }
}
