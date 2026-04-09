/**
 * Knowledge Base Skill - Simple document store and search.
 *
 * This skill demonstrates:
 * - Maintaining state across tool calls (in-memory store)
 * - Full-text search implementation
 * - Lifecycle management (init/destroy)
 */

import type { ToolDefinition, ToolResult } from "../types/index.js";
import { SkillBase } from "./skill-base.js";

interface Document {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export class KnowledgeBaseSkill extends SkillBase {
  private documents = new Map<string, Document>();

  get name(): string {
    return "knowledge-base";
  }

  get version(): string {
    return "1.0.0";
  }

  get description(): string {
    return "Store and search documents in a knowledge base";
  }

  get tags(): string[] {
    return ["knowledge", "search", "documents", "rag"];
  }

  get toolDefinitions(): ToolDefinition[] {
    return [
      {
        name: "kb_add",
        description: "Add a document to the knowledge base",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Unique document ID",
            },
            title: {
              type: "string",
              description: "Document title",
            },
            content: {
              type: "string",
              description: "Document content",
            },
            tags: {
              type: "array",
              description: "Tags for categorization",
              items: { type: "string" },
            },
          },
          required: ["id", "title", "content"],
        },
      },
      {
        name: "kb_search",
        description:
          "Search the knowledge base by keywords. " +
          "Returns matching documents ranked by relevance.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (keywords)",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 5)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "kb_get",
        description: "Get a specific document by ID",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Document ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "kb_list",
        description: "List all documents in the knowledge base",
        parameters: {
          type: "object",
          properties: {
            tag: {
              type: "string",
              description: "Filter by tag",
            },
          },
        },
      },
      {
        name: "kb_delete",
        description: "Delete a document from the knowledge base",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Document ID to delete",
            },
          },
          required: ["id"],
        },
      },
    ];
  }

  async executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    switch (name) {
      case "kb_add":
        return this.addDocument(params);
      case "kb_search":
        return this.searchDocuments(params);
      case "kb_get":
        return this.getDocument(params);
      case "kb_list":
        return this.listDocuments(params);
      case "kb_delete":
        return this.deleteDocument(params);
      default:
        return this.err(`Unknown tool in knowledge-base skill: ${name}`);
    }
  }

  private async addDocument(params: Record<string, unknown>): Promise<ToolResult> {
    const id = params.id as string;
    const title = params.title as string;
    const content = params.content as string;
    const tags = (params.tags as string[]) ?? [];

    if (this.documents.has(id)) {
      return this.err(`Document already exists: ${id}`);
    }

    this.documents.set(id, {
      id,
      title,
      content,
      tags,
      createdAt: new Date().toISOString(),
    });

    return this.ok(`Document added: ${id} ("${title}")`);
  }

  private async searchDocuments(params: Record<string, unknown>): Promise<ToolResult> {
    const query = (params.query as string).toLowerCase();
    const limit = (params.limit as number) ?? 5;

    const keywords = query.split(/\s+/).filter(Boolean);
    const results: Array<{ doc: Document; score: number }> = [];

    for (const doc of this.documents.values()) {
      const searchText = `${doc.title} ${doc.content} ${doc.tags.join(" ")}`.toLowerCase();
      let score = 0;

      for (const keyword of keywords) {
        // Count occurrences
        const matches = searchText.split(keyword).length - 1;
        score += matches;

        // Bonus for title match
        if (doc.title.toLowerCase().includes(keyword)) {
          score += 3;
        }

        // Bonus for tag match
        if (doc.tags.some((t) => t.toLowerCase().includes(keyword))) {
          score += 2;
        }
      }

      if (score > 0) {
        results.push({ doc, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, limit);

    return this.ok(
      JSON.stringify(
        {
          query,
          totalMatches: results.length,
          results: topResults.map((r) => ({
            id: r.doc.id,
            title: r.doc.title,
            tags: r.doc.tags,
            score: r.score,
            snippet: r.doc.content.slice(0, 200),
          })),
        },
        null,
        2
      )
    );
  }

  private async getDocument(params: Record<string, unknown>): Promise<ToolResult> {
    const id = params.id as string;
    const doc = this.documents.get(id);

    if (!doc) {
      return this.err(`Document not found: ${id}`);
    }

    return this.ok(JSON.stringify(doc, null, 2));
  }

  private async listDocuments(params: Record<string, unknown>): Promise<ToolResult> {
    const tag = params.tag as string | undefined;

    let docs = Array.from(this.documents.values());
    if (tag) {
      docs = docs.filter((d) => d.tags.includes(tag));
    }

    return this.ok(
      JSON.stringify(
        {
          total: docs.length,
          documents: docs.map((d) => ({
            id: d.id,
            title: d.title,
            tags: d.tags,
            createdAt: d.createdAt,
          })),
        },
        null,
        2
      )
    );
  }

  private async deleteDocument(params: Record<string, unknown>): Promise<ToolResult> {
    const id = params.id as string;

    if (!this.documents.has(id)) {
      return this.err(`Document not found: ${id}`);
    }

    this.documents.delete(id);
    return this.ok(`Document deleted: ${id}`);
  }
}
