/**
 * Skill Base - Abstract base class for building skills.
 *
 * A Skill is a self-contained plugin that bundles:
 * - A manifest (name, version, description, tools)
 * - Tool definitions and their execution logic
 * - An optional system prompt that extends the agent's behavior
 * - Lifecycle hooks (init/destroy)
 *
 * To create a skill, extend this class and implement the required methods.
 *
 * Example:
 * ```typescript
 * class MySkill extends SkillBase {
 *   get name() { return "my-skill"; }
 *   get version() { return "1.0.0"; }
 *   get description() { return "Does something useful"; }
 *   get toolDefinitions() { return [...]; }
 *
 *   async executeTool(name: string, params: Record<string, unknown>) {
 *     // handle tool execution
 *   }
 * }
 * ```
 */

import type { Skill, SkillManifest, ToolDefinition, ToolResult } from "../types/index.js";

export abstract class SkillBase implements Skill {
  abstract get name(): string;
  abstract get version(): string;
  abstract get description(): string;
  abstract get toolDefinitions(): ToolDefinition[];

  get author(): string | undefined {
    return undefined;
  }

  get tags(): string[] {
    return [];
  }

  get systemPrompt(): string | undefined {
    return undefined;
  }

  get tools(): ToolDefinition[] {
    return this.toolDefinitions;
  }

  get manifest(): SkillManifest {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: this.author,
      tags: this.tags,
      tools: this.tools,
      systemPrompt: this.systemPrompt,
    };
  }

  abstract executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult>;

  /**
   * Convenience method: delegates to executeTool.
   */
  async execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
    return this.executeTool(toolName, params);
  }

  /**
   * Called when the skill is loaded. Use for initialization (DB connections, etc.)
   */
  async init(): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Called when the skill is unloaded. Use for cleanup.
   */
  async destroy(): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Helper to create a successful tool result.
   */
  protected ok(content: string): ToolResult {
    return { content };
  }

  /**
   * Helper to create an error tool result.
   */
  protected err(content: string): ToolResult {
    return { content, is_error: true };
  }
}
