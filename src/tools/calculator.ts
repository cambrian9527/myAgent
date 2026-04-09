/**
 * Calculator Tool - Evaluate mathematical expressions.
 */

import type { Tool, ToolResult } from "../types/index.js";

export const calculatorTool: Tool = {
  definition: {
    name: "calculator",
    description:
      "Evaluate a mathematical expression. Supports basic arithmetic, " +
      "trigonometric functions, logarithms, and constants. " +
      "Example: '2 + 3 * 4', 'Math.sin(Math.PI / 4)', 'Math.log(100)'",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "The mathematical expression to evaluate",
        },
      },
      required: ["expression"],
    },
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const expression = params.expression as string;

    // Safety: only allow safe math characters
    const safePattern = /^[\d\s+\-*/.()%eE,Math.sincotaglqrtpowflorceilabroundminmaxPIE]+$/;
    if (!safePattern.test(expression)) {
      return {
        content: `Unsafe expression rejected: "${expression}". Only math operations are allowed.`,
        is_error: true,
      };
    }

    try {
      // Use Function constructor for safe-ish evaluation
      const fn = new Function(`"use strict"; return (${expression})`);
      const result = fn();

      if (typeof result !== "number" || !isFinite(result)) {
        return {
          content: `Expression result is not a valid number: ${result}`,
          is_error: true,
        };
      }

      return { content: `${expression} = ${result}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: `Failed to evaluate expression: ${message}`, is_error: true };
    }
  },
};
