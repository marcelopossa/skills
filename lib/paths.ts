import path from "node:path";

export const REPO_ROOT = process.cwd();
export const SOURCES_FILE = path.join(REPO_ROOT, ".sources", "sources.json");
export const TAXONOMY_FILE = path.join(REPO_ROOT, ".sources", "taxonomy.json");
export const MARKETPLACE_FILE = path.join(REPO_ROOT, ".claude-plugin", "marketplace.json");
export const SKILLS_DIR = path.join(REPO_ROOT, "skills");
export const PLUGINS_DIR = path.join(REPO_ROOT, "plugins");
export const README_FILE = path.join(REPO_ROOT, "README.md");
export const README_TEMPLATE = path.join(REPO_ROOT, "README.template.md");

export function sourceDir(owner: string): string {
  return path.join(SKILLS_DIR, owner);
}

export function skillLocalDir(owner: string, skillName: string): string {
  return path.join(SKILLS_DIR, owner, skillName);
}

export function noticeFile(owner: string): string {
  return path.join(SKILLS_DIR, owner, "NOTICE.md");
}

export function pluginName(owner: string, skillName: string): string {
  return `${owner}-${skillName}`;
}

export function pluginDir(owner: string, skillName: string): string {
  return path.join(PLUGINS_DIR, pluginName(owner, skillName));
}

export function pluginManifestFile(owner: string, skillName: string): string {
  return path.join(pluginDir(owner, skillName), ".claude-plugin", "plugin.json");
}

export function pluginSkillDir(owner: string, skillName: string): string {
  return path.join(pluginDir(owner, skillName), "skills", skillName);
}
