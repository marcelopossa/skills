import { NextResponse } from "next/server";
import { readSources } from "@/lib/sources";
import { getHeadSha, listUpstreamSkills } from "@/lib/github";

export async function GET() {
  const sources = await readSources();
  const report: Record<
    string,
    {
      up_to_date: boolean;
      head_sha: string;
      last_synced_sha: string | null;
      modified: { name: string; changed_files: string[] }[];
      new_available: { name: string; description: string; upstream_category: string | null }[];
    }
  > = {};

  for (const [owner, src] of Object.entries(sources.sources)) {
    try {
      const headSha = await getHeadSha(src.owner, src.repo, src.branch);
      const upToDate = headSha === src.last_synced_sha;
      if (upToDate) {
        report[owner] = {
          up_to_date: true,
          head_sha: headSha,
          last_synced_sha: src.last_synced_sha,
          modified: [],
          new_available: [],
        };
        continue;
      }
      const upstream = await listUpstreamSkills(src.owner, src.repo, headSha, {
        expandRootPackage: src.expand_skills,
      });
      const dismissed = new Set(src.dismissed_skills);
      const modified: { name: string; changed_files: string[] }[] = [];
      const newAvailable: {
        name: string;
        description: string;
        upstream_category: string | null;
      }[] = [];
      for (const u of upstream) {
        const stored = src.imported_skills[u.name];
        if (!stored) {
          if (!dismissed.has(u.name) && src.last_synced_sha) {
            newAvailable.push({
              name: u.name,
              description: u.description,
              upstream_category: u.upstream_category,
            });
          }
          continue;
        }
        const current = new Map(
          u.files.map((f) => [f.path.slice(u.upstream_path.length + 1), f.sha])
        );
        const changed: string[] = [];
        for (const [rel, sha] of current) {
          if (stored.files[rel] !== sha) changed.push(rel);
        }
        for (const rel of Object.keys(stored.files)) {
          if (!current.has(rel)) changed.push(rel + " (removido)");
        }
        if (changed.length > 0) modified.push({ name: u.name, changed_files: changed });
      }
      report[owner] = {
        up_to_date: false,
        head_sha: headSha,
        last_synced_sha: src.last_synced_sha,
        modified,
        new_available: newAvailable,
      };
    } catch (e) {
      report[owner] = {
        up_to_date: false,
        head_sha: "",
        last_synced_sha: src.last_synced_sha,
        modified: [],
        new_available: [],
      };
      void e;
    }
  }

  return NextResponse.json({ report });
}
