import { NextResponse } from "next/server";
import { z } from "zod";
import { refineDescription } from "@/lib/deepseek";
import { getCachedAnalysis, updateCachedAnalysis } from "@/lib/sources";

const BodySchema = z.object({
  skill_markdown: z.string().min(1),
  current_description: z.string().default(""),
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
    if (cached?.description_pt) {
      return NextResponse.json({
        suggested_description: cached.description_pt,
        cached: true,
      });
    }
  }

  try {
    const result = await refineDescription(
      parsed.data.skill_markdown,
      parsed.data.current_description
    );
    if (owner && skill_name && skill_sha && result.suggested_description) {
      await updateCachedAnalysis(owner, skill_name, skill_sha, {
        description_pt: result.suggested_description,
      });
    }
    return NextResponse.json({ ...result, cached: false });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
