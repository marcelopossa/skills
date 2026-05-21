import { NextResponse } from "next/server";
import { z } from "zod";
import { classifySkill } from "@/lib/deepseek";
import {
  getCachedAnalysis,
  readTaxonomy,
  updateCachedAnalysis,
  upsertAreas,
} from "@/lib/sources";

const BodySchema = z.object({
  skill_markdown: z.string().min(1),
  accept_new: z.boolean().default(false),
  owner: z.string().optional(),
  skill_name: z.string().optional(),
  skill_sha: z.string().optional(),
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
  const { owner, skill_name, skill_sha } = parsed.data;

  if (owner && skill_name && skill_sha) {
    const cached = await getCachedAnalysis(owner, skill_name, skill_sha);
    if (cached?.areas && cached.areas.length > 0) {
      return NextResponse.json({ assigned: cached.areas, propose_new: [], cached: true });
    }
  }

  const tax = await readTaxonomy();
  try {
    const result = await classifySkill(parsed.data.skill_markdown, tax.areas);
    if (parsed.data.accept_new && result.propose_new.length > 0) {
      await upsertAreas(result.propose_new);
    }
    if (owner && skill_name && skill_sha) {
      const allAreas = [...result.assigned, ...result.propose_new.map((p) => p.slug)];
      await updateCachedAnalysis(owner, skill_name, skill_sha, { areas: allAreas });
    }
    return NextResponse.json({ ...result, cached: false });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
