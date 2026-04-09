/**
 * Core type definitions for the Agent system.
 *
 * This file defines the shared types used across the entire agent framework,
 * including messages, tools, skills, and configuration.
 */

// ─── LLM Types ─────────────────────────────────────────────────────────────

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// ─── Message Types ──────────────────────────────────────────────────────────

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface TextContent {
  type: "text";
  text: string;
}

export interface ToolCallContent {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type MessageContent = TextContent | ToolCallContent | ToolResultContent;

export interface Message {
  role: MessageRole;
  content: string | MessageContent[];
}

// ─── Tool Types ─────────────────────────────────────────────────────────────

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  required?: boolean;
  enum?: string[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolResult {
  content: string;
  is_error?: boolean;
}

export interface Tool {
  definition: ToolDefinition;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

// ─── Skill Types ────────────────────────────────────────────────────────────

export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  tags?: string[];
  tools: ToolDefinition[];
  systemPrompt?: string;
}

export interface Skill extends SkillManifest {
  execute: (toolName: string, params: Record<string, unknown>) => Promise<ToolResult>;
  init?: () => Promise<void>;
  destroy?: () => Promise<void>;
}

// ─── Agent Types ────────────────────────────────────────────────────────────

export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  maxTurns: number;
  tools: Tool[];
  skills?: Skill[];
}

export interface AgentRunOptions {
  maxTurns?: number;
  onToolCall?: (name: string, params: Record<string, unknown>) => void;
  onToolResult?: (name: string, result: ToolResult) => void;
  onMessage?: (message: Message) => void;
}

export interface AgentRunResult {
  messages: Message[];
  finalText: string;
  toolCallsCount: number;
  turnsUsed: number;
}

// ─── MCP Types ──────────────────────────────────────────────────────────────

export interface MCPServerConfig {
  name: string;
  version: string;
  tools: Tool[];
}
