import { NextResponse } from "next/server";
import { z } from "zod";
import { classifySkill } from "@/lib/deepseek";
import { readTaxonomy, upsertAreas } from "@/lib/sources";

const BodySchema = z.object({
  skill_markdown: z.string().min(1),
  accept_new: z.boolean().default(false),
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
  const tax = await readTaxonomy();
  try {
    const result = await classifySkill(parsed.data.skill_markdown, tax.areas);
    if (parsed.data.accept_new && result.propose_new.length > 0) {
      await upsertAreas(result.propose_new);
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
