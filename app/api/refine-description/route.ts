import { NextResponse } from "next/server";
import { z } from "zod";
import { refineDescription } from "@/lib/deepseek";

const BodySchema = z.object({
  skill_markdown: z.string().min(1),
  current_description: z.string().default(""),
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
  try {
    const result = await refineDescription(
      parsed.data.skill_markdown,
      parsed.data.current_description
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
