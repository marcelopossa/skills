import { promises as fs } from "node:fs";
import { SourcesFile, SourcesFileSchema, Taxonomy, TaxonomySchema, Area } from "./types";
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
