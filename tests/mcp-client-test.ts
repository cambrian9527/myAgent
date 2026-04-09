#!/usr/bin/env node
/**
 * MCP Server test client - sends JSON-RPC requests via stdin and reads responses.
 */

import { spawn } from "node:child_process";

const child = spawn("npx", ["tsx", "src/cli.ts", "--mcp"], {
  cwd: "c:/Users/54933/Desktop/www/myagent",
  stdio: ["pipe", "pipe", "pipe"],
  shell: true,
});

let buffer = "";

child.stdout!.on("data", (data: Buffer) => {
  buffer += data.toString();
  // Try to parse complete JSON-RPC messages
  while (buffer.includes("\n")) {
    const idx = buffer.indexOf("\n");
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (line) {
      try {
        const msg = JSON.parse(line);
        console.log("\n=== MCP Response ===");
        console.log(JSON.stringify(msg, null, 2));
      } catch {
        // Ignore non-JSON lines
      }
    }
  }
});

child.stderr!.on("data", (data: Buffer) => {
  // Suppress log noise
});

const requests = [
  // 1. Initialize
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    },
  },
  // 2. Initialized notification
  {
    jsonrpc: "2.0",
    method: "notifications/initialized",
  },
  // 3. List tools
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  },
  // 4. Call calculator tool
  {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "calculator",
      arguments: { expression: "Math.sqrt(256) * 2" },
    },
  },
  // 5. Call directory_list tool
  {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "directory_list",
      arguments: { path: "." },
    },
  },
];

async function run() {
  for (const req of requests) {
    await new Promise((r) => setTimeout(r, 500));
    console.log(`\n>>> Sending: ${req.method || "notification"} (id: ${req.id ?? "none"})`);
    child.stdin!.write(JSON.stringify(req) + "\n");
  }

  // Wait for all responses
  await new Promise((r) => setTimeout(r, 3000));
  child.kill();
  process.exit(0);
}

run();
