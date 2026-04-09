/**
 * Data Analysis Skill - Provides data analysis and visualization tools.
 *
 * This skill demonstrates how to build a skill that:
 * - Provides multiple related tools
 * - Includes a system prompt to guide the agent
 * - Maintains internal state across tool calls
 */

import type { ToolDefinition, ToolResult } from "../types/index.js";
import { SkillBase } from "./skill-base.js";

export class DataAnalysisSkill extends SkillBase {
  get name(): string {
    return "data-analysis";
  }

  get version(): string {
    return "1.0.0";
  }

  get description(): string {
    return "Analyze CSV/JSON data, compute statistics, and generate chart specifications";
  }

  get tags(): string[] {
    return ["data", "analysis", "visualization", "statistics"];
  }

  get systemPrompt(): string {
    return (
      "When analyzing data, always start by understanding the data structure first, " +
      "then compute statistics, and finally suggest visualizations. " +
      "Present results in a clear, structured format with key insights highlighted."
    );
  }

  get toolDefinitions(): ToolDefinition[] {
    return [
      {
        name: "data_parse",
        description:
          "Parse CSV or JSON data string into a structured format. " +
          "Returns column names, row count, and a preview of the data.",
        parameters: {
          type: "object",
          properties: {
            data: {
              type: "string",
              description: "The raw data string (CSV or JSON format)",
            },
            format: {
              type: "string",
              description: "Data format",
              enum: ["csv", "json"],
            },
          },
          required: ["data", "format"],
        },
      },
      {
        name: "data_statistics",
        description:
          "Compute descriptive statistics for numeric columns: " +
          "count, mean, median, min, max, stddev.",
        parameters: {
          type: "object",
          properties: {
            data: {
              type: "string",
              description: "JSON array of objects to analyze",
            },
            columns: {
              type: "array",
              description: "Specific columns to analyze (default: all numeric columns)",
              items: { type: "string" },
            },
          },
          required: ["data"],
        },
      },
      {
        name: "data_chart",
        description:
          "Generate a chart specification (Vega-Lite format) for data visualization. " +
          "Supports bar, line, scatter, and pie charts.",
        parameters: {
          type: "object",
          properties: {
            data: {
              type: "string",
              description: "JSON array of data points",
            },
            chart_type: {
              type: "string",
              description: "Type of chart",
              enum: ["bar", "line", "scatter", "pie"],
            },
            x_field: {
              type: "string",
              description: "Field name for X axis",
            },
            y_field: {
              type: "string",
              description: "Field name for Y axis",
            },
            title: {
              type: "string",
              description: "Chart title",
            },
          },
          required: ["data", "chart_type", "x_field", "y_field"],
        },
      },
    ];
  }

  async executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    switch (name) {
      case "data_parse":
        return this.parseData(params);
      case "data_statistics":
        return this.computeStatistics(params);
      case "data_chart":
        return this.generateChart(params);
      default:
        return this.err(`Unknown tool in data-analysis skill: ${name}`);
    }
  }

  private async parseData(params: Record<string, unknown>): Promise<ToolResult> {
    const data = params.data as string;
    const format = params.format as string;

    try {
      if (format === "json") {
        const parsed = JSON.parse(data);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        const columns = items.length > 0 ? Object.keys(items[0]) : [];

        return this.ok(
          JSON.stringify(
            {
              format: "json",
              rowCount: items.length,
              columns,
              preview: items.slice(0, 5),
            },
            null,
            2
          )
        );
      }

      if (format === "csv") {
        const lines = data.trim().split("\n");
        const headers = lines[0].split(",").map((h) => h.trim());
        const rows = lines
          .slice(1)
          .map((line) =>
            line.split(",").reduce(
              (obj, val, i) => ({ ...obj, [headers[i]]: val.trim() }),
              {} as Record<string, string>
            )
          );

        return this.ok(
          JSON.stringify(
            {
              format: "csv",
              rowCount: rows.length,
              columns: headers,
              preview: rows.slice(0, 5),
            },
            null,
            2
          )
        );
      }

      return this.err(`Unsupported format: ${format}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.err(`Failed to parse data: ${message}`);
    }
  }

  private async computeStatistics(params: Record<string, unknown>): Promise<ToolResult> {
    const data = params.data as string;
    const columns = params.columns as string[] | undefined;

    try {
      const items = JSON.parse(data);
      if (!Array.isArray(items) || items.length === 0) {
        return this.err("Data must be a non-empty JSON array");
      }

      const allKeys = Object.keys(items[0]);
      const numericKeys = allKeys.filter((key) =>
        items.some((item: Record<string, unknown>) => typeof item[key] === "number")
      );

      const targetKeys = columns ?? numericKeys;
      const stats: Record<string, Record<string, number>> = {};

      for (const key of targetKeys) {
        const values = items
          .map((item: Record<string, unknown>) => item[key])
          .filter((v): v is number => typeof v === "number")
          .sort((a, b) => a - b);

        if (values.length === 0) continue;

        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const median =
          values.length % 2 === 0
            ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
            : values[Math.floor(values.length / 2)];
        const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
        const stddev = Math.sqrt(variance);

        stats[key] = {
          count: values.length,
          mean: Math.round(mean * 1000) / 1000,
          median: Math.round(median * 1000) / 1000,
          min: values[0],
          max: values[values.length - 1],
          stddev: Math.round(stddev * 1000) / 1000,
        };
      }

      return this.ok(JSON.stringify(stats, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.err(`Failed to compute statistics: ${message}`);
    }
  }

  private async generateChart(params: Record<string, unknown>): Promise<ToolResult> {
    const data = params.data as string;
    const chartType = params.chart_type as string;
    const xField = params.x_field as string;
    const yField = params.y_field as string;
    const title = (params.title as string) ?? "Chart";

    try {
      JSON.parse(data); // Validate JSON

      // Generate a Vega-Lite specification
      const spec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        title,
        data: { values: data },
        mark: chartType === "pie" ? "arc" : chartType,
        encoding: {
          x: chartType !== "pie" ? { field: xField, type: "nominal" } : undefined,
          y: chartType !== "pie" ? { field: yField, type: "quantitative" } : undefined,
          theta: chartType === "pie" ? { field: yField, type: "quantitative" } : undefined,
          color: chartType === "pie" ? { field: xField, type: "nominal" } : undefined,
        },
      };

      return this.ok(JSON.stringify(spec, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.err(`Failed to generate chart: ${message}`);
    }
  }
}
