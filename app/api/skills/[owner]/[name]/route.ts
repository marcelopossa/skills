import { NextResponse } from "next/server";
import { z } from "zod";
import { readSources, writeSources } from "@/lib/sources";
import { regenerateMarketplaceManifest, regenerateReadme } from "@/lib/manifest";

const PatchBody = z.object({
  areas: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner: sourceKey, name } = await ctx.params;
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
  const skill = sources.sources[sourceKey]?.imported_skills[name];
  if (!skill) return NextResponse.json({ error: "Skill não encontrada" }, { status: 404 });
  if (parsed.data.areas) skill.areas = parsed.data.areas;
  if (parsed.data.description !== undefined) skill.description = parsed.data.description;
  await writeSources(sources);
  await regenerateMarketplaceManifest();
  await regenerateReadme();
  return NextResponse.json({ ok: true });
}
