/**
 * Code Review Skill - Provides code analysis and review tools.
 *
 * This skill demonstrates a skill that:
 * - Performs complex analysis tasks
 * - Returns structured results
 * - Uses a system prompt to set the agent's review persona
 */

import type { ToolDefinition, ToolResult } from "../types/index.js";
import { SkillBase } from "./skill-base.js";

interface Issue {
  severity: "info" | "warning" | "error";
  line?: number;
  message: string;
  suggestion?: string;
}

export class CodeReviewSkill extends SkillBase {
  get name(): string {
    return "code-review";
  }

  get version(): string {
    return "1.0.0";
  }

  get description(): string {
    return "Static code analysis and review with best-practice checking";
  }

  get tags(): string[] {
    return ["code", "review", "analysis", "quality"];
  }

  get systemPrompt(): string {
    return (
      "When reviewing code, focus on: correctness, security, performance, " +
      "readability, and maintainability. Always provide specific, actionable " +
      "suggestions rather than vague comments. Prioritize security issues " +
      "over style concerns."
    );
  }

  get toolDefinitions(): ToolDefinition[] {
    return [
      {
        name: "code_review",
        description:
          "Perform a static code review on the given source code. " +
          "Checks for common issues like security vulnerabilities, " +
          "performance problems, and code quality concerns.",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "The source code to review",
            },
            language: {
              type: "string",
              description: "Programming language of the code",
              enum: ["javascript", "typescript", "python", "go", "rust", "java"],
            },
            focus: {
              type: "string",
              description: "Review focus area",
              enum: ["security", "performance", "quality", "all"],
            },
          },
          required: ["code", "language"],
        },
      },
      {
        name: "code_metrics",
        description:
          "Compute code complexity metrics: lines of code, cyclomatic complexity estimate, " +
          "function count, and comment ratio.",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "The source code to analyze",
            },
          },
          required: ["code"],
        },
      },
    ];
  }

  async executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    switch (name) {
      case "code_review":
        return this.reviewCode(params);
      case "code_metrics":
        return this.computeMetrics(params);
      default:
        return this.err(`Unknown tool in code-review skill: ${name}`);
    }
  }

  private async reviewCode(params: Record<string, unknown>): Promise<ToolResult> {
    const code = params.code as string;
    const language = params.language as string;
    const focus = (params.focus as string) ?? "all";

    const issues: Issue[] = [];

    // ─── Security checks ────────────────────────────────────────────
    if (focus === "all" || focus === "security") {
      // Check for eval usage
      if (/\beval\s*\(/.test(code)) {
        issues.push({
          severity: "error",
          message: "Use of eval() detected - potential code injection vulnerability",
          suggestion: "Use safer alternatives like JSON.parse() or Function constructor with strict validation",
        });
      }

      // Check for SQL injection patterns
      if (/['"]\s*\+\s*\w+\s*\+\s*['"]/.test(code) && /SELECT|INSERT|UPDATE|DELETE/i.test(code)) {
        issues.push({
          severity: "error",
          message: "Potential SQL injection - string concatenation in SQL query",
          suggestion: "Use parameterized queries / prepared statements",
        });
      }

      // Check for hardcoded secrets
      if (/password\s*=\s*['"][^'"]+['"]/i.test(code) || /api_key\s*=\s*['"][^'"]+['"]/i.test(code)) {
        issues.push({
          severity: "error",
          message: "Hardcoded secret/credential detected",
          suggestion: "Use environment variables or a secrets manager",
        });
      }

      // Check for unsafe innerHTML
      if (/innerHTML\s*=/.test(code) && !/sanitize|escape|DOMPurify/.test(code)) {
        issues.push({
          severity: "warning",
          message: "Direct innerHTML assignment without sanitization",
          suggestion: "Use textContent or sanitize HTML before assignment",
        });
      }
    }

    // ─── Performance checks ─────────────────────────────────────────
    if (focus === "all" || focus === "performance") {
      // Check for sync file operations in Node.js
      if (/readFileSync|writeFileSync|existsSync/.test(code)) {
        issues.push({
          severity: "warning",
          message: "Synchronous file I/O detected - blocks the event loop",
          suggestion: "Use async alternatives (readFile, writeFile, etc.)",
        });
      }

      // Check for nested loops
      const nestedLoopMatch = code.match(/for\s*\(.*\)\s*\{[\s\S]*?for\s*\(/);
      if (nestedLoopMatch) {
        issues.push({
          severity: "info",
          message: "Nested loop detected - potential O(n²) complexity",
          suggestion: "Consider using Map/Set for lookups or algorithmic optimization",
        });
      }
    }

    // ─── Quality checks ─────────────────────────────────────────────
    if (focus === "all" || focus === "quality") {
      // Check for console.log in production code
      const consoleLogCount = (code.match(/console\.log/g) || []).length;
      if (consoleLogCount > 3) {
        issues.push({
          severity: "info",
          message: `Excessive console.log usage (${consoleLogCount} occurrences)`,
          suggestion: "Use a proper logging library with log levels",
        });
      }

      // Check for long functions
      const functionMatches = code.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\(/g);
      if (functionMatches && functionMatches.length > 0) {
        const lines = code.split("\n").length;
        if (lines / functionMatches.length > 50) {
          issues.push({
            severity: "warning",
            message: "Functions appear too long (avg > 50 lines)",
            suggestion: "Break down into smaller, focused functions",
          });
        }
      }

      // Check for missing error handling
      if (/await\s+/.test(code) && !/try\s*\{|\.catch\s*\(/.test(code)) {
        issues.push({
          severity: "warning",
          message: "Async operations without error handling",
          suggestion: "Wrap async operations in try/catch or use .catch()",
        });
      }
    }

    // ─── Language-specific checks ────────────────────────────────────
    if (language === "typescript" || language === "javascript") {
      if (/var\s+/.test(code)) {
        issues.push({
          severity: "info",
          message: "Use of 'var' keyword detected",
          suggestion: "Use 'const' by default, 'let' when reassignment is needed",
        });
      }
    }

    if (issues.length === 0) {
      return this.ok(
        JSON.stringify({
          status: "pass",
          summary: "No issues found - code looks good!",
          language,
          focus,
        })
      );
    }

    const summary = {
      status: issues.some((i) => i.severity === "error") ? "fail" : "review",
      totalIssues: issues.length,
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      info: issues.filter((i) => i.severity === "info").length,
      language,
      focus,
      issues,
    };

    return this.ok(JSON.stringify(summary, null, 2));
  }

  private async computeMetrics(params: Record<string, unknown>): Promise<ToolResult> {
    const code = params.code as string;
    const lines = code.split("\n");

    const totalLines = lines.length;
    const blankLines = lines.filter((l) => l.trim() === "").length;
    const commentLines = lines.filter((l) => l.trim().startsWith("//") || l.trim().startsWith("#") || l.trim().startsWith("/*") || l.trim().startsWith("*")).length;
    const codeLines = totalLines - blankLines - commentLines;

    // Count functions
    const functionPattern = /function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\(|=>\s*\{|def\s+\w+|func\s+\w+|fn\s+\w+/g;
    const functionCount = (code.match(functionPattern) || []).length;

    // Estimate cyclomatic complexity (count decision points)
    const decisionPattern = /\bif\b|\belse\b|\bfor\b|\bwhile\b|\bcase\b|\bcatch\b|\&&|\|\||\?\?/g;
    const complexity = (code.match(decisionPattern) || []).length + 1;

    // Comment ratio
    const commentRatio = totalLines > 0 ? Math.round((commentLines / totalLines) * 100) : 0;

    return this.ok(
      JSON.stringify(
        {
          totalLines,
          codeLines,
          blankLines,
          commentLines,
          commentRatio: `${commentRatio}%`,
          functionCount,
          cyclomaticComplexity: complexity,
          averageFunctionLength: functionCount > 0 ? Math.round(codeLines / functionCount) : codeLines,
        },
        null,
        2
      )
    );
  }
}
