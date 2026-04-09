/**
 * Tests for ToolRegistry.
 */

import { describe, it, expect } from "vitest";
import { ToolRegistry } from "../src/agent/tool-registry";
import type { Tool } from "../src/types/index";

const mockTool: Tool = {
  definition: {
    name: "test_tool",
    description: "A test tool",
    parameters: {
      type: "object",
      properties: {
        input: { type: "string", description: "Test input" },
      },
      required: ["input"],
    },
  },
  execute: async (params) => ({
    content: `Processed: ${params.input}`,
  }),
};

describe("ToolRegistry", () => {
  it("should register a tool", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    expect(registry.has("test_tool")).toBe(true);
  });

  it("should throw on duplicate registration", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    expect(() => registry.register(mockTool)).toThrow("already registered");
  });

  it("should execute a registered tool", async () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    const result = await registry.execute("test_tool", { input: "hello" });
    expect(result.content).toBe("Processed: hello");
    expect(result.is_error).toBeFalsy();
  });

  it("should return error for unknown tool", async () => {
    const registry = new ToolRegistry();
    const result = await registry.execute("nonexistent", {});
    expect(result.is_error).toBe(true);
  });

  it("should list all tool names", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    expect(registry.list()).toEqual(["test_tool"]);
  });

  it("should return all tool definitions", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    const defs = registry.getDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe("test_tool");
  });

  it("should unregister a tool", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    expect(registry.unregister("test_tool")).toBe(true);
    expect(registry.has("test_tool")).toBe(false);
  });
});
