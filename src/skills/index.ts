/**
 * Skills module public API.
 */

export { SkillBase } from "./skill-base.js";
export { DataAnalysisSkill } from "./data-analysis-skill.js";
export { CodeReviewSkill } from "./code-review-skill.js";
export { KnowledgeBaseSkill } from "./knowledge-base-skill.js";

import { DataAnalysisSkill } from "./data-analysis-skill.js";
import { CodeReviewSkill } from "./code-review-skill.js";
import { KnowledgeBaseSkill } from "./knowledge-base-skill.js";
import type { Skill } from "../types/index.js";

export const allSkills: Skill[] = [
  new DataAnalysisSkill(),
  new CodeReviewSkill(),
  new KnowledgeBaseSkill(),
];
