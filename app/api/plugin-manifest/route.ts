import { NextResponse } from "next/server";
import { regenerateMarketplaceManifest, regenerateReadme } from "@/lib/manifest";

export async function POST() {
  await regenerateMarketplaceManifest();
  await regenerateReadme();
  return NextResponse.json({ ok: true });
}
