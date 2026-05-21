import { NextResponse } from "next/server";
import { readSkillMarkdown } from "@/lib/skills-fs";
import { readSources } from "@/lib/sources";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner, name } = await ctx.params;
  const sources = await readSources();
  const src = sources.sources[owner];
  if (!src || !src.imported_skills[name]) {
    return NextResponse.json({ error: "Skill não encontrada" }, { status: 404 });
  }
  const md = await readSkillMarkdown(owner, name);
  if (md === null) return NextResponse.json({ error: "SKILL.md não encontrado" }, { status: 404 });
  return NextResponse.json({
    markdown: md,
    skill: src.imported_skills[name],
    source: {
      owner: src.owner,
      repo: src.repo,
      repo_url: src.repo_url,
      branch: src.branch,
      last_synced_sha: src.last_synced_sha,
    },
  });
}
