/**
 * Agent - Core agent loop implementation.
 *
 * The agent drives the conversation with the LLM, handles tool calls,
 * and manages the iterative reasoning loop until a final answer is
 * produced or the maximum turn count is reached.
 */

import type {
  AgentConfig,
  AgentRunOptions,
  AgentRunResult,
  Message,
  MessageContent,
  ToolCallContent,
  ToolResultContent,
} from "../types/index.js";
import { LLMClient } from "./llm-client.js";
import { ToolRegistry } from "./tool-registry.js";
import { SkillLoader } from "./skill-loader.js";
import { logger } from "../utils/logger.js";

export class Agent {
  private config: AgentConfig;
  private llm: LLMClient;
  private toolRegistry: ToolRegistry;
  private skillLoader: SkillLoader;
  private conversationHistory: Message[] = [];

  constructor(config: AgentConfig, llm: LLMClient) {
    this.config = config;
    this.llm = llm;
    this.toolRegistry = new ToolRegistry();
    this.skillLoader = new SkillLoader(this.toolRegistry);

    // Register config tools
    this.toolRegistry.registerAll(config.tools);

    // Register skill tools
    if (config.skills) {
      for (const skill of config.skills) {
        this.skillLoader.registerSkill(skill);
      }
    }
  }

  /**
   * Get the tool registry for external tool registration.
   */
  get tools(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Get the skill loader for external skill management.
   */
  get skills(): SkillLoader {
    return this.skillLoader;
  }

  /**
   * Run the agent with a user message.
   *
   * This executes the agentic loop:
   * 1. Add user message to history
   * 2. Call LLM with all messages + tool definitions
   * 3. If LLM wants to call tools → execute them, add results, go to step 2
   * 4. If LLM returns text → we're done
   * 5. Repeat until maxTurns is reached
   */
  async run(userMessage: string, options?: AgentRunOptions): Promise<AgentRunResult> {
    const maxTurns = options?.maxTurns ?? this.config.maxTurns;

    // Reset conversation with system prompt
    this.conversationHistory = [
      {
        role: "system",
        content: this.buildSystemPrompt(),
      },
    ];

    // Add user message
    this.conversationHistory.push({ role: "user", content: userMessage });

    let toolCallsCount = 0;
    let turnsUsed = 0;

    for (let turn = 0; turn < maxTurns; turn++) {
      turnsUsed = turn + 1;
      logger.debug(`Turn ${turnsUsed}/${maxTurns}`);

      // Call LLM
      const response = await this.llm.chat(
        this.conversationHistory,
        this.toolRegistry.getDefinitions()
      );

      this.conversationHistory.push(response);
      options?.onMessage?.(response);

      // Check if response contains tool calls
      const toolCalls = this.extractToolCalls(response.content);

      if (toolCalls.length === 0) {
        // No tool calls - agent is done
        logger.debug("Agent completed (no tool calls)");
        break;
      }

      // Execute tool calls
      const toolResults = await this.executeToolCalls(toolCalls, options);

      // Add tool results to conversation
      const resultMessage: Message = {
        role: "tool",
        content: toolResults,
      };
      this.conversationHistory.push(resultMessage);
      options?.onMessage?.(resultMessage);

      toolCallsCount += toolCalls.length;
    }

    const finalText = this.extractFinalText();
    return {
      messages: [...this.conversationHistory],
      finalText,
      toolCallsCount,
      turnsUsed,
    };
  }

  /**
   * Continue an existing conversation with a new user message.
   */
  async continue(userMessage: string, options?: AgentRunOptions): Promise<AgentRunResult> {
    this.conversationHistory.push({ role: "user", content: userMessage });
    const maxTurns = options?.maxTurns ?? this.config.maxTurns;

    let toolCallsCount = 0;
    let turnsUsed = 0;

    for (let turn = 0; turn < maxTurns; turn++) {
      turnsUsed = turn + 1;

      const response = await this.llm.chat(
        this.conversationHistory,
        this.toolRegistry.getDefinitions()
      );

      this.conversationHistory.push(response);
      options?.onMessage?.(response);

      const toolCalls = this.extractToolCalls(response.content);
      if (toolCalls.length === 0) break;

      const toolResults = await this.executeToolCalls(toolCalls, options);
      const resultMessage: Message = { role: "tool", content: toolResults };
      this.conversationHistory.push(resultMessage);
      options?.onMessage?.(resultMessage);

      toolCallsCount += toolCalls.length;
    }

    return {
      messages: [...this.conversationHistory],
      finalText: this.extractFinalText(),
      toolCallsCount,
      turnsUsed,
    };
  }

  /**
   * Get the current conversation history.
   */
  getHistory(): Message[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history.
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  // ─── Private Methods ──────────────────────────────────────────────────

  private buildSystemPrompt(): string {
    const parts: string[] = [this.config.systemPrompt];

    // Add skill system prompts
    const skillPrompt = this.skillLoader.getCombinedSystemPrompt();
    if (skillPrompt) {
      parts.push(skillPrompt);
    }

    // Add tool usage instructions
    const toolNames = this.toolRegistry.list();
    if (toolNames.length > 0) {
      parts.push(
        `You have access to the following tools: ${toolNames.join(", ")}. ` +
          `Use them when needed to accomplish the user's request. ` +
          `Always think step by step before calling a tool.`
      );
    }

    return parts.join("\n\n");
  }

  private extractToolCalls(content: string | MessageContent[]): ToolCallContent[] {
    if (typeof content === "string") return [];

    const calls: ToolCallContent[] = [];
    for (const part of content) {
      if (part.type === "tool_use") {
        calls.push(part as ToolCallContent);
      }
    }
    return calls;
  }

  private async executeToolCalls(
    calls: ToolCallContent[],
    options?: AgentRunOptions
  ): Promise<ToolResultContent[]> {
    const results: ToolResultContent[] = [];

    for (const call of calls) {
      logger.info(`Tool call: ${call.name}(${JSON.stringify(call.input)})`);
      options?.onToolCall?.(call.name, call.input);

      const result = await this.toolRegistry.execute(call.name, call.input);

      logger.info(`Tool result: ${result.is_error ? "ERROR" : "OK"} - ${result.content.slice(0, 200)}`);
      options?.onToolResult?.(call.name, result);

      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: result.content,
        is_error: result.is_error,
      });
    }

    return results;
  }

  private extractFinalText(): string {
    // Walk backwards to find the last assistant text message
    for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
      const msg = this.conversationHistory[i];
      if (msg.role === "assistant" && typeof msg.content === "string") {
        return msg.content;
      }
    }
    return "";
  }
}
