import { NextResponse } from "next/server";
import { z } from "zod";
import { readSources, writeSources } from "@/lib/sources";

export async function DELETE(_req: Request, ctx: { params: Promise<{ owner: string }> }) {
  const { owner: sourceKey } = await ctx.params;
  const sources = await readSources();
  if (!sources.sources[sourceKey]) {
    return NextResponse.json({ error: "Source não encontrada" }, { status: 404 });
  }
  if (Object.keys(sources.sources[sourceKey].imported_skills).length > 0) {
    return NextResponse.json(
      { error: "Source possui skills importadas. Remova-as antes de excluir a source." },
      { status: 409 }
    );
  }
  delete sources.sources[sourceKey];
  await writeSources(sources);
  return NextResponse.json({ ok: true });
}

const PatchBody = z.object({
  expand_skills: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ owner: string }> }) {
  const { owner: sourceKey } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const sources = await readSources();
  const src = sources.sources[sourceKey];
  if (!src) return NextResponse.json({ error: "Source não encontrada" }, { status: 404 });
  if (parsed.data.expand_skills !== undefined) src.expand_skills = parsed.data.expand_skills;
  await writeSources(sources);
  return NextResponse.json({ ok: true, expand_skills: src.expand_skills });
}
