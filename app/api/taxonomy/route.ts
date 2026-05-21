import { NextResponse } from "next/server";
import { z } from "zod";
import { readTaxonomy, writeTaxonomy } from "@/lib/sources";
import { AreaSchema, TaxonomySchema } from "@/lib/types";

export async function GET() {
  const tax = await readTaxonomy();
  return NextResponse.json(tax);
}

const BodySchema = z.object({ areas: z.array(AreaSchema) });

export async function PUT(req: Request) {
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
  const next = TaxonomySchema.parse({ version: 1, areas: parsed.data.areas });
  await writeTaxonomy(next);
  return NextResponse.json({ ok: true });
}
