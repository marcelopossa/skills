import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeDeps } from "@/lib/deepseek";
import { getCachedAnalysis, updateCachedAnalysis } from "@/lib/sources";

const BodySchema = z.object({
  skill_markdown: z.string().min(1),
  owner: z.string().optional(),
  skill_name: z.string().optional(),
  skill_sha: z.string().optional(),
  force: z.boolean().default(false),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { owner, skill_name, skill_sha, force } = parsed.data;

  if (!force && owner && skill_name && skill_sha) {
    const cached = await getCachedAnalysis(owner, skill_name, skill_sha);
    if (cached?.deps) {
      return NextResponse.json({ ...cached.deps, cached: true });
    }
  }

  try {
    const result = await analyzeDeps(parsed.data.skill_markdown);
    if (owner && skill_name && skill_sha) {
      await updateCachedAnalysis(owner, skill_name, skill_sha, { deps: result });
    }
    return NextResponse.json({ ...result, cached: false });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
