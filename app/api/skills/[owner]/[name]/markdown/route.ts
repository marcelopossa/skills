import { NextResponse } from "next/server";
import { readSkillMarkdown } from "@/lib/skills-fs";
import { readSources } from "@/lib/sources";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner: sourceKey, name } = await ctx.params;
  const sources = await readSources();
  const src = sources.sources[sourceKey];
  if (!src || !src.imported_skills[name]) {
    return NextResponse.json({ error: "Skill não encontrada" }, { status: 404 });
  }
  const skill = src.imported_skills[name];
  let md: string | null = null;
  if (skill.type === "package") {
    const inner = skill.package_skills?.length
      ? skill.package_skills.map((s) => `- \`${s}\``).join("\n")
      : "_(sem skills detectadas)_";
    md =
      `# ${name}\n\n` +
      `**Pacote curado** vindo de \`${skill.upstream_path}\`. Contém múltiplas skills internas:\n\n${inner}\n\n` +
      `Este pacote preserva o \`plugin.json\` original do upstream. Instale e habilite como um único plugin no Claude Code.`;
  } else {
    md = await readSkillMarkdown(sourceKey, name);
    if (md === null)
      return NextResponse.json({ error: "SKILL.md não encontrado" }, { status: 404 });
  }
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
