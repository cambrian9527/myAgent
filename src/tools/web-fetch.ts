/**
 * Web Fetch Tool - Fetch content from URLs.
 */

import type { Tool, ToolResult } from "../types/index.js";

export const webFetchTool: Tool = {
  definition: {
    name: "web_fetch",
    description:
      "Fetch content from a URL. Returns the response body as text. " +
      "Useful for retrieving web pages, API responses, or file downloads.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch",
        },
        method: {
          type: "string",
          description: "HTTP method (default: GET)",
          enum: ["GET", "POST", "PUT", "DELETE"],
        },
        headers: {
          type: "object",
          description: "HTTP headers to send",
          properties: {},
        },
        body: {
          type: "string",
          description: "Request body (for POST/PUT)",
        },
      },
      required: ["url"],
    },
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const url = params.url as string;
    const method = (params.method as string) || "GET";
    const headers = (params.headers as Record<string, string>) ?? {};
    const body = params.body as string | undefined;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "User-Agent": "MyAgent/1.0",
          ...headers,
        },
        body: method !== "GET" ? body : undefined,
      });

      const contentType = response.headers.get("content-type") ?? "";
      const text = await response.text();

      if (!response.ok) {
        return {
          content: `HTTP ${response.status} ${response.statusText}\n${text.slice(0, 2000)}`,
          is_error: true,
        };
      }

      // Truncate very large responses
      const maxLen = 50000;
      const truncated = text.length > maxLen;
      const content = truncated ? text.slice(0, maxLen) + "\n... (truncated)" : text;

      return {
        content: `Status: ${response.status} ${response.statusText}\nContent-Type: ${contentType}\n\n${content}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: `Failed to fetch URL: ${message}`, is_error: true };
    }
  },
};
