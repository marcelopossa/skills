import { z } from "zod";

export const LicenseSchema = z.object({
  spdx: z.string(),
  url: z.string().optional(),
  fetched_at: z.string(),
});
export type License = z.infer<typeof LicenseSchema>;

export const ImportedSkillSchema = z.object({
  upstream_path: z.string(),
  local_path: z.string(),
  upstream_category: z.string().nullable(),
  areas: z.array(z.string()).default([]),
  description: z.string().default(""),
  files: z.record(z.string(), z.string()),
});
export type ImportedSkill = z.infer<typeof ImportedSkillSchema>;

export const SourceSchema = z.object({
  repo_url: z.string(),
  owner: z.string(),
  repo: z.string(),
  branch: z.string(),
  last_synced_sha: z.string().nullable(),
  last_synced_at: z.string().nullable(),
  license: LicenseSchema.nullable(),
  attribution: z.string().default(""),
  imported_skills: z.record(z.string(), ImportedSkillSchema).default({}),
  dismissed_skills: z.array(z.string()).default([]),
});
export type Source = z.infer<typeof SourceSchema>;

export const SourcesFileSchema = z.object({
  version: z.literal(1),
  sources: z.record(z.string(), SourceSchema),
});
export type SourcesFile = z.infer<typeof SourcesFileSchema>;

export const AreaSchema = z.object({
  slug: z.string(),
  label: z.string(),
  description: z.string().default(""),
});
export type Area = z.infer<typeof AreaSchema>;

export const TaxonomySchema = z.object({
  version: z.literal(1),
  areas: z.array(AreaSchema),
});
export type Taxonomy = z.infer<typeof TaxonomySchema>;

export type UpstreamSkill = {
  name: string;
  upstream_path: string;
  upstream_category: string | null;
  description: string;
  files: { path: string; sha: string }[];
  external_refs: string[];
};

export type SkillStatus =
  | "not-imported"
  | "imported-up-to-date"
  | "imported-modified"
  | "new-since-last-sync"
  | "dismissed";

export type SkillRow = UpstreamSkill & {
  status: SkillStatus;
  current_areas: string[];
  changed_files?: string[];
};
