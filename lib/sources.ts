import { promises as fs } from "node:fs";
import {
  SourcesFile,
  SourcesFileSchema,
  Taxonomy,
  TaxonomySchema,
  Area,
  SkillAnalysisCache,
} from "./types";
import { SOURCES_FILE, TAXONOMY_FILE } from "./paths";

export async function readSources(): Promise<SourcesFile> {
  const raw = await fs.readFile(SOURCES_FILE, "utf8");
  return SourcesFileSchema.parse(JSON.parse(raw));
}

export async function writeSources(data: SourcesFile): Promise<void> {
  await fs.writeFile(SOURCES_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function readTaxonomy(): Promise<Taxonomy> {
  const raw = await fs.readFile(TAXONOMY_FILE, "utf8");
  return TaxonomySchema.parse(JSON.parse(raw));
}

export async function writeTaxonomy(data: Taxonomy): Promise<void> {
  await fs.writeFile(TAXONOMY_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function getCachedAnalysis(
  owner: string,
  skillName: string,
  expectedSha: string
): Promise<SkillAnalysisCache | null> {
  const data = await readSources();
  const entry = data.sources[owner]?.analysis_cache?.[skillName];
  if (!entry) return null;
  if (entry.skill_md_sha !== expectedSha) return null;
  return entry;
}

export async function updateCachedAnalysis(
  owner: string,
  skillName: string,
  expectedSha: string,
  patch: Partial<Omit<SkillAnalysisCache, "skill_md_sha" | "analyzed_at">>
): Promise<void> {
  const data = await readSources();
  const src = data.sources[owner];
  if (!src) return;
  if (!src.analysis_cache) src.analysis_cache = {};
  const prev = src.analysis_cache[skillName];
  const base: SkillAnalysisCache =
    prev && prev.skill_md_sha === expectedSha
      ? prev
      : { skill_md_sha: expectedSha, analyzed_at: new Date().toISOString() };
  src.analysis_cache[skillName] = {
    ...base,
    ...patch,
    skill_md_sha: expectedSha,
    analyzed_at: new Date().toISOString(),
  };
  await writeSources(data);
}

export async function upsertAreas(newAreas: Area[]): Promise<Taxonomy> {
  const tax = await readTaxonomy();
  const bySlug = new Map(tax.areas.map((a) => [a.slug, a]));
  for (const a of newAreas) {
    if (!bySlug.has(a.slug)) bySlug.set(a.slug, a);
  }
  const updated: Taxonomy = { version: 1, areas: Array.from(bySlug.values()) };
  await writeTaxonomy(updated);
  return updated;
}
