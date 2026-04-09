/**
 * Hello World Skill - Example of a file-system loaded skill plugin.
 *
 * This demonstrates the structure that the SkillLoader expects
 * when discovering skills from the filesystem.
 *
 * Required exports:
 *   - default.manifest: SkillManifest
 *   - default.execute: (toolName, params) => Promise<ToolResult>
 *   - default.init?: () => Promise<void>     (optional)
 *   - default.destroy?: () => Promise<void>   (optional)
 */

import type { SkillManifest, ToolResult } from "../../src/types/index.js";

const manifest: SkillManifest = {
  name: "hello-world",
  version: "1.0.0",
  description: "A simple example skill that says hello",
  author: "MyAgent",
  tags: ["example", "demo"],
  tools: [
    {
      name: "hello_greet",
      description: "Greet someone by name",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the person to greet",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "hello_time",
      description: "Get the current time with a friendly greeting",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "Timezone (e.g., 'Asia/Shanghai', 'America/New_York')",
          },
        },
      },
    },
  ],
  systemPrompt: "Be friendly and enthusiastic when greeting people.",
};

async function execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
  switch (toolName) {
    case "hello_greet": {
      const name = params.name as string;
      return {
        content: `Hello, ${name}! 👋 Welcome to MyAgent! How can I help you today?`,
      };
    }

    case "hello_time": {
      const now = new Date();
      const hour = now.getHours();
      let greeting: string;

      if (hour < 6) greeting = "Good night";
      else if (hour < 12) greeting = "Good morning";
      else if (hour < 18) greeting = "Good afternoon";
      else greeting = "Good evening";

      return {
        content: `${greeting}! The current time is ${now.toLocaleTimeString()}`,
      };
    }

    default:
      return {
        content: `Unknown tool: ${toolName}`,
        is_error: true,
      };
  }
}

async function init(): Promise<void> {
  console.log(`[hello-world] Skill initialized`);
}

async function destroy(): Promise<void> {
  console.log(`[hello-world] Skill destroyed`);
}

export default { manifest, execute, init, destroy };
