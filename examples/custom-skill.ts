/**
 * Example: Creating a custom Skill.
 *
 * This example shows how to create your own skill
 * by extending the SkillBase class.
 */

import { SkillBase } from "../src/skills/skill-base";
import type { ToolDefinition, ToolResult } from "../src/types/index";

// ─── Define Your Custom Skill ────────────────────────────────────────────────

class WeatherSkill extends SkillBase {
  get name(): string {
    return "weather";
  }

  get version(): string {
    return "1.0.0";
  }

  get description(): string {
    return "Get weather information for a location";
  }

  get tags(): string[] {
    return ["weather", "forecast"];
  }

  get systemPrompt(): string {
    return "When providing weather information, always include the location, temperature, and conditions.";
  }

  get toolDefinitions(): ToolDefinition[] {
    return [
      {
        name: "weather_current",
        description: "Get current weather for a location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City name or coordinates",
            },
            units: {
              type: "string",
              description: "Temperature units",
              enum: ["celsius", "fahrenheit"],
            },
          },
          required: ["location"],
        },
      },
      {
        name: "weather_forecast",
        description: "Get weather forecast for a location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City name or coordinates",
            },
            days: {
              type: "number",
              description: "Number of days to forecast (1-7)",
            },
          },
          required: ["location"],
        },
      },
    ];
  }

  async executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    switch (name) {
      case "weather_current":
        return this.getCurrentWeather(params);
      case "weather_forecast":
        return this.getForecast(params);
      default:
        return this.err(`Unknown weather tool: ${name}`);
    }
  }

  private async getCurrentWeather(params: Record<string, unknown>): Promise<ToolResult> {
    const location = params.location as string;
    const units = (params.units as string) ?? "celsius";

    // In a real skill, you would call a weather API here
    // This is a mock implementation for demonstration
    const mockData = {
      location,
      temperature: units === "fahrenheit" ? 72 : 22,
      units,
      conditions: "Partly Cloudy",
      humidity: "65%",
      wind: "12 km/h NW",
    };

    return this.ok(JSON.stringify(mockData, null, 2));
  }

  private async getForecast(params: Record<string, unknown>): Promise<ToolResult> {
    const location = params.location as string;
    const days = Math.min((params.days as number) ?? 3, 7);

    const forecast = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      high: 20 + Math.floor(Math.random() * 10),
      low: 10 + Math.floor(Math.random() * 10),
      conditions: ["Sunny", "Cloudy", "Rainy", "Partly Cloudy"][Math.floor(Math.random() * 4)],
    }));

    return this.ok(JSON.stringify({ location, forecast }, null, 2));
  }
}

// ─── Use the Custom Skill ────────────────────────────────────────────────────

async function main() {
  const skill = new WeatherSkill();

  console.log("Skill:", skill.name, "v" + skill.version);
  console.log("Tools:", skill.tools.map((t) => t.name).join(", "));
  console.log("System Prompt:", skill.systemPrompt);

  // Test tool execution
  const result = await skill.execute("weather_current", {
    location: "Beijing",
    units: "celsius",
  });

  console.log("\nWeather Result:");
  console.log(result.content);
}

main().catch(console.error);
