/**
 * Built-in tools registry.
 *
 * All built-in tools are exported from this module and can be
 * registered with the Agent or MCP Server.
 */

import { fileReadTool } from "./file-read.js";
import { fileWriteTool } from "./file-write.js";
import { directoryListTool } from "./directory-list.js";
import { shellExecuteTool } from "./shell-execute.js";
import { webFetchTool } from "./web-fetch.js";
import { calculatorTool } from "./calculator.js";
import type { Tool } from "../types/index.js";

export const allTools: Tool[] = [
  fileReadTool,
  fileWriteTool,
  directoryListTool,
  shellExecuteTool,
  webFetchTool,
  calculatorTool,
];

export {
  fileReadTool,
  fileWriteTool,
  directoryListTool,
  shellExecuteTool,
  webFetchTool,
  calculatorTool,
};
