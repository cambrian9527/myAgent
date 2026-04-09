/**
 * Skill Loader - Discovers, loads, and manages skills.
 *
 * Skills are plugin-like modules that bundle related tools and
 * optional system prompts. They can be loaded from the local
 * filesystem or registered programmatically.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Skill, SkillManifest, ToolDefinition, ToolResult } from "../types/index.js";
import { ToolRegistry } from "./tool-registry.js";
import { logger } from "../utils/logger.js";

interface SkillModule {
  manifest: SkillManifest;
  execute: (toolName: string, params: Record<string, unknown>) => Promise<ToolResult>;
  init?: () => Promise<void>;
  destroy?: () => Promise<void>;
}

export class SkillLoader {
  private skills = new Map<string, Skill>();
  private toolRegistry: ToolRegistry;
  private skillPaths: string[];

  constructor(toolRegistry: ToolRegistry, skillPaths: string[] = []) {
    this.toolRegistry = toolRegistry;
    this.skillPaths = skillPaths;
  }

  /**
   * Register a skill programmatically.
   */
  registerSkill(skill: Skill): void {
    if (this.skills.has(skill.name)) {
      throw new Error(`Skill already registered: ${skill.name}`);
    }

    this.skills.set(skill.name, skill);

    // Register all skill tools into the global tool registry
    for (const toolDef of skill.tools) {
      const tool = {
        definition: toolDef,
        execute: (params: Record<string, unknown>) => skill.execute(toolDef.name, params),
      };
      this.toolRegistry.register(tool);
    }

    logger.info(`Skill registered: ${skill.name} v${skill.version} (${skill.tools.length} tools)`);
  }

  /**
   * Discover and load skills from configured paths.
   * Each skill directory should contain a manifest.json or manifest.yaml.
   */
  async discoverAndLoad(): Promise<void> {
    for (const skillPath of this.skillPaths) {
      await this.loadFromDirectory(skillPath);
    }
  }

  private async loadFromDirectory(dirPath: string): Promise<void> {
    const absPath = resolve(dirPath);
    let entries;

    try {
      entries = await readdir(absPath);
    } catch {
      logger.warn(`Skill directory not found: ${absPath}`);
      return;
    }

    for (const entry of entries) {
      const entryPath = join(absPath, entry);
      const entryStat = await stat(entryPath);

      if (entryStat.isDirectory()) {
        await this.loadSkill(entryPath);
      }
    }
  }

  private async loadSkill(skillDir: string): Promise<void> {
    try {
      // Look for manifest.json
      const manifestPath = join(skillDir, "manifest.json");
      const manifestData = await readFile(manifestPath, "utf-8");
      const manifest: SkillManifest = JSON.parse(manifestData);

      // Look for skill implementation
      const implPath = join(skillDir, "index.js");
      const module = await import(implPath) as { default: SkillModule };

      if (!module.default || !module.default.execute) {
        logger.warn(`Skill ${manifest.name}: missing execute function, skipped`);
        return;
      }

      const skill: Skill = {
        ...manifest,
        execute: module.default.execute,
        init: module.default.init,
        destroy: module.default.destroy,
      };

      // Initialize if needed
      if (skill.init) {
        await skill.init();
      }

      this.registerSkill(skill);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to load skill from ${skillDir}: ${message}`);
    }
  }

  /**
   * Get a skill by name.
   */
  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * Get all loaded skills.
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get all tool definitions from all skills.
   */
  getAllToolDefinitions(): ToolDefinition[] {
    const defs: ToolDefinition[] = [];
    for (const skill of this.skills.values()) {
      defs.push(...skill.tools);
    }
    return defs;
  }

  /**
   * Get combined system prompt from all skills.
   */
  getCombinedSystemPrompt(): string {
    const prompts: string[] = [];
    for (const skill of this.skills.values()) {
      if (skill.systemPrompt) {
        prompts.push(skill.systemPrompt);
      }
    }
    return prompts.join("\n\n");
  }

  /**
   * Destroy all skills (cleanup resources).
   */
  async destroyAll(): Promise<void> {
    for (const skill of this.skills.values()) {
      if (skill.destroy) {
        await skill.destroy();
      }
    }
    this.skills.clear();
  }
}
