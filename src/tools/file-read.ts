/**
 * File Read Tool - Read file contents from the local filesystem.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Tool, ToolResult } from "../types/index.js";

export const fileReadTool: Tool = {
  definition: {
    name: "file_read",
    description:
      "Read the contents of a file from the local filesystem. " +
      "Returns the file content as a string. Use this to inspect code, configs, or data files.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The absolute or relative path to the file to read",
        },
        encoding: {
          type: "string",
          description: "File encoding (default: utf-8)",
          enum: ["utf-8", "ascii", "base64", "hex"],
        },
      },
      required: ["path"],
    },
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const filePath = resolve(params.path as string);
    const encoding = (params.encoding as BufferEncoding) ?? "utf-8";

    try {
      const content = await readFile(filePath, encoding);
      return { content };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: `Failed to read file: ${message}`, is_error: true };
    }
  },
};
