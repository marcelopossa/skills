import { NextResponse } from "next/server";
import { z } from "zod";
import { readSources, writeSources } from "@/lib/sources";
import { getDefaultBranch, parseRepoUrl } from "@/lib/github";

function slugFor(owner: string, repo: string): string {
  return `${owner}-${repo}`;
}

export async function GET() {
  const data = await readSources();
  const list = Object.entries(data.sources).map(([key, s]) => ({
    slug: key,
    owner: s.owner,
    repo: s.repo,
    repo_url: s.repo_url,
    branch: s.branch,
    last_synced_sha: s.last_synced_sha,
    last_synced_at: s.last_synced_at,
    license: s.license,
    imported_count: Object.keys(s.imported_skills).length,
    dismissed_count: s.dismissed_skills.length,
    expand_skills: !!s.expand_skills,
  }));
  return NextResponse.json({ sources: list });
}

const PostBodySchema = z.object({
  url: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  let owner: string, repo: string;
  try {
    ({ owner, repo } = parseRepoUrl(parsed.data.url));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  let branch: string;
  try {
    branch = await getDefaultBranch(owner, repo);
  } catch (e) {
    return NextResponse.json(
      { error: `Falha ao acessar repo: ${(e as Error).message}` },
      { status: 502 }
    );
  }
  const sources = await readSources();
  const slug = slugFor(owner, repo);

  const conflict = Object.entries(sources.sources).find(
    ([, s]) => s.owner === owner && s.repo === repo
  );
  if (conflict) {
    return NextResponse.json(
      { error: `${owner}/${repo} já está cadastrado (slug: ${conflict[0]})` },
      { status: 409 }
    );
  }
  if (sources.sources[slug]) {
    return NextResponse.json(
      { error: `Slug '${slug}' já existe` },
      { status: 409 }
    );
  }
  sources.sources[slug] = {
    repo_url: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    branch,
    last_synced_sha: null,
    last_synced_at: null,
    license: null,
    attribution: `Skills originalmente criadas por ${owner} (https://github.com/${owner}).`,
    imported_skills: {},
    dismissed_skills: [],
    analysis_cache: {},
    expand_skills: false,
  };
  await writeSources(sources);
  return NextResponse.json({ ok: true, slug, owner, repo, branch });
}
