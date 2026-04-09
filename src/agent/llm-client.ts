/**
 * LLM Client - Handles communication with the language model API.
 *
 * Supports OpenAI-compatible APIs (OpenAI, Azure, DeepSeek, ZhiPu, etc.)
 * Converts internal message format to the standard OpenAI chat completion format.
 */

import type { LLMConfig, Message, MessageContent, ToolCallContent, ToolDefinition } from "../types/index.js";

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Send a chat completion request to the LLM.
   */
  async chat(
    messages: Message[],
    tools?: ToolDefinition[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<Message> {
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: this.convertMessages(messages),
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
    };

    if (tools && tools.length > 0) {
      body.tools = this.convertTools(tools);
      body.tool_choice = "auto";
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const choice = data.choices[0];
    if (!choice) {
      throw new Error("No response from LLM");
    }

    return this.parseResponse(choice);
  }

  /**
   * Convert internal Message[] to the standard OpenAI chat completion format.
   *
   * Internal format uses structured content arrays (tool_use, tool_result).
   * OpenAI format uses separate message roles:
   *   - tool_use content → role:"assistant" with tool_calls array
   *   - tool_result content → role:"tool" with tool_call_id and string content
   */
  private convertMessages(messages: Message[]): Array<Record<string, unknown>> {
    const result: Array<Record<string, unknown>> = [];

    for (const msg of messages) {
      // Simple string content → direct mapping
      if (typeof msg.content === "string") {
        result.push({ role: msg.role, content: msg.content });
        continue;
      }

      // Structured content → split into OpenAI-format messages
      const parts = msg.content as MessageContent[];
      const toolCalls: ToolCallContent[] = [];
      const toolResults: Array<{ id: string; content: string; isError?: boolean }> = [];
      const textParts: string[] = [];

      for (const part of parts) {
        if (part.type === "text") {
          textParts.push(part.text);
        } else if (part.type === "tool_use") {
          toolCalls.push(part as ToolCallContent);
        } else if (part.type === "tool_result") {
          toolResults.push({
            id: (part as { tool_use_id: string; content: string; is_error?: boolean }).tool_use_id,
            content: (part as { content: string }).content,
            isError: (part as { is_error?: boolean }).is_error,
          });
        }
      }

      // If assistant message with tool_calls
      if (toolCalls.length > 0) {
        result.push({
          role: "assistant",
          content: textParts.length > 0 ? textParts.join("\n") : null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.input),
            },
          })),
        });
      }

      // If tool result messages — each gets its own message with role:"tool"
      for (const tr of toolResults) {
        result.push({
          role: "tool",
          tool_call_id: tr.id,
          content: tr.content,
        });
      }

      // Edge case: only text parts in structured content
      if (toolCalls.length === 0 && toolResults.length === 0 && textParts.length > 0) {
        result.push({ role: msg.role, content: textParts.join("\n") });
      }
    }

    return result;
  }

  private convertTools(tools: ToolDefinition[]): Array<Record<string, unknown>> {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private parseResponse(choice: ChatCompletionResponse["choices"][0]): Message {
    const msg = choice.message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      return {
        role: "assistant",
        content: msg.tool_calls.map((tc) => ({
          type: "tool_use" as const,
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments),
        })),
      };
    }

    return {
      role: "assistant",
      content: msg.content ?? "",
    };
  }
}
