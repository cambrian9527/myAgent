/**
 * Directory List Tool - List files and directories.
 */

import { readdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { Tool, ToolResult } from "../types/index.js";

export const directoryListTool: Tool = {
  definition: {
    name: "directory_list",
    description:
      "List files and directories at a given path. " +
      "Returns entries with name, type (file/directory), and size.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The directory path to list (default: current directory)",
        },
        recursive: {
          type: "boolean",
          description: "Whether to list recursively (default: false)",
        },
      },
    },
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const dirPath = resolve((params.path as string) || ".");
    const recursive = (params.recursive as boolean) ?? false;

    try {
      const entries = await listDir(dirPath, recursive);
      return { content: JSON.stringify(entries, null, 2) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: `Failed to list directory: ${message}`, is_error: true };
    }
  },
};

interface DirEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: DirEntry[];
}

async function listDir(dirPath: string, recursive: boolean): Promise<DirEntry[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const result: DirEntry[] = [];

  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);
    const dirEntry: DirEntry = {
      name: entry.name,
      path: entryPath,
      type: entry.isDirectory() ? "directory" : "file",
    };

    if (entry.isFile()) {
      try {
        const stats = await stat(entryPath);
        dirEntry.size = stats.size;
      } catch {
        // Skip files we can't stat
      }
    }

    if (recursive && entry.isDirectory()) {
      dirEntry.children = await listDir(entryPath, true);
    }

    result.push(dirEntry);
  }

  return result;
}
