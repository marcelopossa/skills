import { NextResponse } from "next/server";
import { regeneratePluginManifest, regenerateReadme } from "@/lib/manifest";

export async function POST() {
  await regeneratePluginManifest();
  await regenerateReadme();
  return NextResponse.json({ ok: true });
}
