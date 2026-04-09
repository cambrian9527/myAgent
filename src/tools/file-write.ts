/**
 * File Write Tool - Write content to a file on the local filesystem.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { Tool, ToolResult } from "../types/index.js";

export const fileWriteTool: Tool = {
  definition: {
    name: "file_write",
    description:
      "Write content to a file on the local filesystem. " +
      "Creates the file and any parent directories if they don't exist. " +
      "Overwrites existing files.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path to the file to write",
        },
        content: {
          type: "string",
          description: "The content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const filePath = resolve(params.path as string);
    const content = params.content as string;

    try {
      // Ensure parent directory exists
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf-8");
      return { content: `Successfully wrote ${content.length} bytes to ${filePath}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: `Failed to write file: ${message}`, is_error: true };
    }
  },
};
