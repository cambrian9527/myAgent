/**
 * Tests for Skills.
 */

import { describe, it, expect } from "vitest";
import { DataAnalysisSkill } from "../src/skills/data-analysis-skill";
import { CodeReviewSkill } from "../src/skills/code-review-skill";
import { KnowledgeBaseSkill } from "../src/skills/knowledge-base-skill";

describe("DataAnalysisSkill", () => {
  const skill = new DataAnalysisSkill();

  it("should have correct metadata", () => {
    expect(skill.name).toBe("data-analysis");
    expect(skill.version).toBe("1.0.0");
    expect(skill.tools.length).toBe(3);
  });

  it("should parse JSON data", async () => {
    const result = await skill.execute("data_parse", {
      data: '[{"name":"Alice","age":30},{"name":"Bob","age":25}]',
      format: "json",
    });
    expect(result.is_error).toBeFalsy();
    const parsed = JSON.parse(result.content);
    expect(parsed.rowCount).toBe(2);
    expect(parsed.columns).toContain("name");
    expect(parsed.columns).toContain("age");
  });

  it("should parse CSV data", async () => {
    const result = await skill.execute("data_parse", {
      data: "name,age\nAlice,30\nBob,25",
      format: "csv",
    });
    expect(result.is_error).toBeFalsy();
    const parsed = JSON.parse(result.content);
    expect(parsed.rowCount).toBe(2);
    expect(parsed.columns).toEqual(["name", "age"]);
  });

  it("should compute statistics", async () => {
    const result = await skill.execute("data_statistics", {
      data: '[{"val":10},{"val":20},{"val":30}]',
      columns: ["val"],
    });
    expect(result.is_error).toBeFalsy();
    const stats = JSON.parse(result.content);
    expect(stats.val.mean).toBe(20);
    expect(stats.val.median).toBe(20);
    expect(stats.val.min).toBe(10);
    expect(stats.val.max).toBe(30);
  });

  it("should generate chart spec", async () => {
    const result = await skill.execute("data_chart", {
      data: '[{"x":"A","y":10},{"x":"B","y":20}]',
      chart_type: "bar",
      x_field: "x",
      y_field: "y",
      title: "Test Chart",
    });
    expect(result.is_error).toBeFalsy();
    const spec = JSON.parse(result.content);
    expect(spec.mark).toBe("bar");
    expect(spec.title).toBe("Test Chart");
  });
});

describe("CodeReviewSkill", () => {
  const skill = new CodeReviewSkill();

  it("should have correct metadata", () => {
    expect(skill.name).toBe("code-review");
    expect(skill.tools.length).toBe(2);
  });

  it("should detect eval usage", async () => {
    const result = await skill.execute("code_review", {
      code: 'const x = eval("1+1")',
      language: "javascript",
      focus: "security",
    });
    expect(result.is_error).toBeFalsy();
    const review = JSON.parse(result.content);
    expect(review.status).toBe("fail");
    expect(review.issues.some((i: { message: string }) => i.message.includes("eval"))).toBe(true);
  });

  it("should detect hardcoded secrets", async () => {
    const result = await skill.execute("code_review", {
      code: 'const password = "mysecret123"',
      language: "javascript",
      focus: "security",
    });
    const review = JSON.parse(result.content);
    expect(review.issues.some((i: { message: string }) => i.message.includes("secret") || i.message.includes("credential"))).toBe(true);
  });

  it("should pass clean code", async () => {
    const result = await skill.execute("code_review", {
      code: "const x = 1 + 2;\nconsole.log(x);",
      language: "typescript",
      focus: "security",
    });
    const review = JSON.parse(result.content);
    expect(review.status).toBe("pass");
  });

  it("should compute code metrics", async () => {
    const result = await skill.execute("code_metrics", {
      code: "function hello() {\n  return 'world';\n}\n",
    });
    expect(result.is_error).toBeFalsy();
    const metrics = JSON.parse(result.content);
    expect(metrics.functionCount).toBeGreaterThanOrEqual(1);
    expect(metrics.totalLines).toBe(4);
  });
});

describe("KnowledgeBaseSkill", () => {
  const skill = new KnowledgeBaseSkill();

  it("should add and retrieve a document", async () => {
    await skill.execute("kb_add", {
      id: "doc1",
      title: "Test Document",
      content: "This is a test document about TypeScript",
      tags: ["test", "typescript"],
    });

    const result = await skill.execute("kb_get", { id: "doc1" });
    expect(result.is_error).toBeFalsy();
    const doc = JSON.parse(result.content);
    expect(doc.title).toBe("Test Document");
  });

  it("should search documents", async () => {
    await skill.execute("kb_add", {
      id: "doc2",
      title: "Python Guide",
      content: "A comprehensive guide to Python programming",
      tags: ["python", "guide"],
    });

    const result = await skill.execute("kb_search", { query: "Python" });
    expect(result.is_error).toBeFalsy();
    const search = JSON.parse(result.content);
    expect(search.totalMatches).toBeGreaterThanOrEqual(1);
  });

  it("should list documents", async () => {
    const result = await skill.execute("kb_list", {});
    expect(result.is_error).toBeFalsy();
    const list = JSON.parse(result.content);
    expect(list.total).toBeGreaterThanOrEqual(2);
  });

  it("should delete a document", async () => {
    const result = await skill.execute("kb_delete", { id: "doc1" });
    expect(result.is_error).toBeFalsy();

    const get = await skill.execute("kb_get", { id: "doc1" });
    expect(get.is_error).toBe(true);
  });
});
