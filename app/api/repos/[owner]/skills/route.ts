import { NextResponse } from "next/server";
import { readSources } from "@/lib/sources";
import { getHeadSha, listUpstreamSkills } from "@/lib/github";
import type { SkillRow, SkillStatus } from "@/lib/types";

export async function GET(_req: Request, ctx: { params: Promise<{ owner: string }> }) {
  const { owner: sourceKey } = await ctx.params;
  const sources = await readSources();
  const src = sources.sources[sourceKey];
  if (!src) return NextResponse.json({ error: "Source não encontrada" }, { status: 404 });

  const headSha = await getHeadSha(src.owner, src.repo, src.branch);
  const upstream = await listUpstreamSkills(src.owner, src.repo, headSha, {
    expandRootPackage: src.expand_skills,
  });

  const dismissed = new Set(src.dismissed_skills);
  const rows: SkillRow[] = upstream.map((u) => {
    const imported = src.imported_skills[u.name];
    const skillMdSha = u.files.find((f) => f.path === `${u.upstream_path}/SKILL.md`)?.sha;
    const cache = skillMdSha ? src.analysis_cache?.[u.name] : undefined;
    const cacheValid = !!(cache && skillMdSha && cache.skill_md_sha === skillMdSha);
    const cacheStale = !!(cache && skillMdSha && cache.skill_md_sha !== skillMdSha);

    let status: SkillStatus;
    let changedFiles: string[] | undefined;
    if (dismissed.has(u.name)) {
      status = "dismissed";
    } else if (!imported) {
      status = src.last_synced_sha ? "new-since-last-sync" : "not-imported";
    } else {
      const current = new Map(u.files.map((f) => [f.path.slice(u.upstream_path.length + 1), f.sha]));
      const stored = new Map(Object.entries(imported.files));
      changedFiles = [];
      for (const [rel, sha] of current) {
        if (stored.get(rel) !== sha) changedFiles.push(rel);
      }
      for (const [rel] of stored) {
        if (!current.has(rel)) changedFiles.push(rel + " (removido)");
      }
      status = changedFiles.length > 0 ? "imported-modified" : "imported-up-to-date";
    }

    const description = imported?.description
      ? imported.description
      : cacheValid && cache?.description_pt
        ? cache.description_pt
        : u.description;
    const currentAreas = imported?.areas?.length
      ? imported.areas
      : cacheValid && cache?.areas
        ? cache.areas
        : [];

    return {
      ...u,
      description,
      status,
      current_areas: currentAreas,
      changed_files: changedFiles,
      cached_deps: cacheValid ? cache?.deps : undefined,
      cache_stale: cacheStale,
    };
  });

  return NextResponse.json({
    slug: sourceKey,
    owner: src.owner,
    repo: src.repo,
    branch: src.branch,
    head_sha: headSha,
    last_synced_sha: src.last_synced_sha,
    skills: rows,
  });
}
