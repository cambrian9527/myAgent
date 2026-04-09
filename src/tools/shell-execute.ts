/**
 * Shell Execute Tool - Run shell commands safely.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Tool, ToolResult } from "../types/index.js";

const execAsync = promisify(exec);

// Blocked commands for safety
const BLOCKED_COMMANDS = ["rm -rf /", "mkfs", "dd if=/dev/zero", ":(){ :|:& };:"];

export const shellExecuteTool: Tool = {
  definition: {
    name: "shell_execute",
    description:
      "Execute a shell command and return its output. " +
      "Use with caution - only run safe, read-only commands when possible. " +
      "Returns stdout, stderr, and exit code.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute",
        },
        cwd: {
          type: "string",
          description: "Working directory for the command (default: current directory)",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 30000)",
        },
      },
      required: ["command"],
    },
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const command = params.command as string;
    const cwd = (params.cwd as string) || undefined;
    const timeout = (params.timeout as number) ?? 30000;

    // Safety check
    const lowerCommand = command.toLowerCase();
    for (const blocked of BLOCKED_COMMANDS) {
      if (lowerCommand.includes(blocked)) {
        return {
          content: `Command blocked for safety: contains "${blocked}"`,
          is_error: true,
        };
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024, // 1MB
      });

      const parts: string[] = [];
      if (stdout) parts.push(`STDOUT:\n${stdout}`);
      if (stderr) parts.push(`STDERR:\n${stderr}`);

      return { content: parts.join("\n\n") || "Command completed with no output" };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      const parts: string[] = [];

      if (execError.stdout) parts.push(`STDOUT:\n${execError.stdout}`);
      if (execError.stderr) parts.push(`STDERR:\n${execError.stderr}`);
      parts.push(`ERROR: ${execError.message}`);

      return { content: parts.join("\n\n"), is_error: true };
    }
  },
};
