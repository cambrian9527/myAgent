# MyAgent

Production-grade AI Agent framework with MCP Server and Skill System.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Agent                          │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │
│  │ LLM Client│  │ Tool Reg. │  │ Skill Loader│ │
│  └───────────┘  └───────────┘  └─────────────┘ │
│         │              │              │          │
│         └──────────────┼──────────────┘          │
│                        │                         │
│              ┌─────────▼──────────┐              │
│              │  Agentic Loop      │              │
│              │  (reason → act)    │              │
│              └────────────────────┘              │
└─────────────────────────────────────────────────┘
         │                              │
  ┌──────▼──────┐              ┌───────▼───────┐
  │  CLI / API  │              │  MCP Server   │
  │  Interface  │              │  (stdio/SSE)  │
  └─────────────┘              └───────────────┘
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Agent** | Core loop: LLM reasoning → Tool call → Result feedback → Continue reasoning |
| **Tool** | Single callable function with JSON Schema definition + execute implementation |
| **Skill** | Plugin bundling related tools + optional system prompt, extends `SkillBase` |
| **MCP Server** | Exposes tools via Model Context Protocol for Claude Desktop / Cursor etc. |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your LLM API key and settings
```

Required env vars:

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_API_KEY` | Your LLM API key | - |
| `LLM_BASE_URL` | API base URL | `https://api.openai.com/v1` |
| `LLM_MODEL` | Model name | `gpt-4o` |

Supports any OpenAI-compatible API (OpenAI, DeepSeek, ZhiPu GLM, etc.).

### 3. Run

```bash
# Single query
npx tsx src/cli.ts "Your question here"

# Interactive mode
npx tsx src/cli.ts --interactive

# MCP Server mode
npx tsx src/cli.ts --mcp

# Run tests
npx vitest run

# Type check
npx tsc --noEmit
```

## Built-in Tools

| Tool | Description |
|------|-------------|
| `file_read` | Read file contents from local filesystem |
| `file_write` | Write content to a file |
| `directory_list` | List files and directories |
| `shell_execute` | Execute shell commands |
| `web_fetch` | Fetch content from URLs |
| `calculator` | Evaluate mathematical expressions |

## Built-in Skills

### Data Analysis (`data-analysis`)

Parse CSV/JSON data, compute statistics, generate chart specifications.

- `data_parse` - Parse CSV or JSON data
- `data_statistics` - Compute descriptive statistics (mean, median, stddev, etc.)
- `data_chart` - Generate Vega-Lite chart specifications

### Code Review (`code-review`)

Static code analysis with security, performance, and quality checks.

- `code_review` - Review code for issues (eval detection, SQL injection, hardcoded secrets, etc.)
- `code_metrics` - Compute complexity metrics (LOC, cyclomatic complexity, function count)

### Knowledge Base (`knowledge-base`)

In-memory document store with full-text search.

- `kb_add` / `kb_get` / `kb_delete` - CRUD operations
- `kb_search` - Keyword search with relevance ranking
- `kb_list` - List documents with optional tag filter

## Creating Custom Skills

Extend `SkillBase` to create your own skill:

```typescript
import { SkillBase } from "./src/skills/skill-base";
import type { ToolDefinition, ToolResult } from "./src/types/index";

class WeatherSkill extends SkillBase {
  get name() { return "weather"; }
  get version() { return "1.0.0"; }
  get description() { return "Get weather information"; }

  get toolDefinitions(): ToolDefinition[] {
    return [{
      name: "weather_current",
      description: "Get current weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name" },
        },
        required: ["location"],
      },
    }];
  }

  async executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    // Call a weather API and return results
    return this.ok(JSON.stringify({ location: params.location, temp: 22 }));
  }
}
```

See `examples/custom-skill.ts` for a complete example.

## MCP Server Integration

Start the MCP server:

```bash
npx tsx src/cli.ts --mcp
```

Add to Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "myagent": {
      "command": "npx",
      "args": ["tsx", "/path/to/myagent/src/cli.ts", "--mcp"]
    }
  }
}
```

## Project Structure

```
myagent/
├── src/
│   ├── agent/          # Agent core engine
│   │   ├── agent.ts    # Agentic loop (reason → act → observe)
│   │   ├── llm-client.ts    # OpenAI-compatible API client
│   │   ├── tool-registry.ts # Tool registration & execution
│   │   └── skill-loader.ts  # Dynamic skill loading
│   ├── mcp/            # MCP Server
│   │   └── server.ts   # MCP protocol over stdio
│   ├── tools/          # 6 built-in tools
│   ├── skills/         # 3 example skills + SkillBase
│   ├── types/          # Shared type definitions
│   └── utils/          # Logger and helpers
├── skills/             # External skill plugins (filesystem-loaded)
├── examples/           # Usage examples
├── tests/              # Vitest test suite
└── package.json
```

## Tech Stack

- **Runtime**: Node.js (TypeScript, ESM)
- **LLM SDK**: OpenAI-compatible chat completions API
- **MCP**: @modelcontextprotocol/sdk
- **Validation**: Zod (via MCP SDK)
- **Testing**: Vitest

## License

MIT
