import { NextResponse } from "next/server";
import { readSources, writeSources } from "@/lib/sources";

export async function DELETE(_req: Request, ctx: { params: Promise<{ owner: string }> }) {
  const { owner } = await ctx.params;
  const sources = await readSources();
  if (!sources.sources[owner]) {
    return NextResponse.json({ error: "Source não encontrada" }, { status: 404 });
  }
  if (Object.keys(sources.sources[owner].imported_skills).length > 0) {
    return NextResponse.json(
      { error: "Source possui skills importadas. Remova-as antes de excluir a source." },
      { status: 409 }
    );
  }
  delete sources.sources[owner];
  await writeSources(sources);
  return NextResponse.json({ ok: true });
}
