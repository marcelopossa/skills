import { NextResponse } from "next/server";
import { z } from "zod";
import { readSources, writeSources } from "@/lib/sources";
import {
  fetchLicense,
  fetchLicenseText,
  fetchRawFile,
  getHeadSha,
  listUpstreamSkills,
} from "@/lib/github";
import {
  downloadSkillFiles,
  removeSkill,
  writeNotice,
  writeRequirementsIfAny,
} from "@/lib/skills-fs";
import { regeneratePluginManifest, regenerateReadme } from "@/lib/manifest";
import { refineDescription } from "@/lib/deepseek";
import type { ImportedSkill } from "@/lib/types";

const SyncBodySchema = z.object({
  owner: z.string(),
  import: z.array(z.string()).default([]),
  update: z.array(z.string()).default([]),
  remove: z.array(z.string()).default([]),
  dismiss: z.array(z.string()).default([]),
  undismiss: z.array(z.string()).default([]),
  area_overrides: z.record(z.string(), z.array(z.string())).optional(),
  description_overrides: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = SyncBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { owner, import: toImport, update, remove, dismiss, undismiss, area_overrides, description_overrides } = parsed.data;

  const sources = await readSources();
  const src = sources.sources[owner];
  if (!src) return NextResponse.json({ error: "Source não encontrada" }, { status: 404 });

  const headSha = await getHeadSha(src.owner, src.repo, src.branch);
  const upstream = await listUpstreamSkills(src.owner, src.repo, headSha);
  const upstreamByName = new Map(upstream.map((u) => [u.name, u]));

  const license = await fetchLicense(src.owner, src.repo);
  if (license) src.license = license;
  const licenseText = await fetchLicenseText(src.owner, src.repo);
  await writeNotice(src.owner, src.repo_url, license?.spdx || "UNKNOWN", licenseText, headSha);

  const log: { action: string; skill: string }[] = [];

  for (const skillName of [...toImport, ...update]) {
    const u = upstreamByName.get(skillName);
    if (!u) {
      log.push({ action: `skip(not-found-upstream)`, skill: skillName });
      continue;
    }
    const files = await downloadSkillFiles(
      src.owner,
      src.repo,
      headSha,
      u.upstream_path,
      u.name,
      u.files
    );
    const prev: ImportedSkill | undefined = src.imported_skills[u.name];
    const areas = area_overrides?.[u.name] ?? prev?.areas ?? [];
    let description = description_overrides?.[u.name] ?? prev?.description ?? u.description ?? "";
    if (!description_overrides?.[u.name] && process.env.DEEPSEEK_API_KEY) {
      try {
        const md = await fetchRawFile(src.owner, src.repo, headSha, `${u.upstream_path}/SKILL.md`);
        const refined = await refineDescription(md, u.description || "");
        if (refined.suggested_description) description = refined.suggested_description;
      } catch (e) {
        void e;
      }
    }
    src.imported_skills[u.name] = {
      upstream_path: u.upstream_path,
      local_path: `skills/${src.owner}/${u.name}`,
      upstream_category: u.upstream_category,
      areas,
      description,
      files,
    };
    const skillMdSha = u.files.find((f) => f.path === `${u.upstream_path}/SKILL.md`)?.sha;
    const cached =
      skillMdSha && src.analysis_cache?.[u.name]?.skill_md_sha === skillMdSha
        ? src.analysis_cache[u.name]
        : undefined;
    if (cached?.deps) {
      await writeRequirementsIfAny(src.owner, u.name, cached.deps);
    }
    log.push({ action: toImport.includes(skillName) ? "import" : "update", skill: skillName });
  }

  for (const skillName of remove) {
    await removeSkill(src.owner, skillName);
    delete src.imported_skills[skillName];
    log.push({ action: "remove", skill: skillName });
  }

  for (const skillName of dismiss) {
    if (!src.dismissed_skills.includes(skillName)) src.dismissed_skills.push(skillName);
    log.push({ action: "dismiss", skill: skillName });
  }

  if (undismiss.length > 0) {
    src.dismissed_skills = src.dismissed_skills.filter((n) => !undismiss.includes(n));
    for (const n of undismiss) log.push({ action: "undismiss", skill: n });
  }

  src.last_synced_sha = headSha;
  src.last_synced_at = new Date().toISOString();
  await writeSources(sources);
  await regeneratePluginManifest();
  await regenerateReadme();

  return NextResponse.json({ ok: true, head_sha: headSha, log });
}
