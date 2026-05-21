import path from "node:path";

export const REPO_ROOT = process.cwd();
export const SOURCES_FILE = path.join(REPO_ROOT, ".sources", "sources.json");
export const TAXONOMY_FILE = path.join(REPO_ROOT, ".sources", "taxonomy.json");
export const MARKETPLACE_FILE = path.join(REPO_ROOT, ".claude-plugin", "marketplace.json");
export const SKILLS_DIR = path.join(REPO_ROOT, "skills");
export const PLUGINS_DIR = path.join(REPO_ROOT, "plugins");
export const README_FILE = path.join(REPO_ROOT, "README.md");
export const README_TEMPLATE = path.join(REPO_ROOT, "README.template.md");

export function sourceDir(sourceKey: string): string {
  return path.join(SKILLS_DIR, sourceKey);
}

export function skillLocalDir(sourceKey: string, skillName: string): string {
  return path.join(SKILLS_DIR, sourceKey, skillName);
}

export function noticeFile(sourceKey: string): string {
  return path.join(SKILLS_DIR, sourceKey, "NOTICE.md");
}

export function pluginName(sourceKey: string, skillName: string): string {
  return `${sourceKey}-${skillName}`;
}

export function pluginDir(sourceKey: string, skillName: string): string {
  return path.join(PLUGINS_DIR, pluginName(sourceKey, skillName));
}

export function pluginManifestFile(sourceKey: string, skillName: string): string {
  return path.join(pluginDir(sourceKey, skillName), ".claude-plugin", "plugin.json");
}

export function pluginSkillDir(sourceKey: string, skillName: string): string {
  return path.join(pluginDir(sourceKey, skillName), "skills", skillName);
}
