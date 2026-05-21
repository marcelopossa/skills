import { promises as fs } from "node:fs";
import path from "node:path";
import { fetchRawBuffer } from "./github";
import { skillLocalDir, sourceDir, noticeFile } from "./paths";

const TEXT_EXT = new Set([
  ".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".sh", ".ps1", ".bat",
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".rb", ".go", ".rs",
  ".java", ".html", ".css", ".scss", ".xml", ".csv", ".tsv", ".env", ".sql",
]);

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeSkillFile(
  owner: string,
  skillName: string,
  relPathWithinSkill: string,
  data: Buffer
): Promise<void> {
  const target = path.join(skillLocalDir(owner, skillName), relPathWithinSkill);
  await ensureDir(path.dirname(target));
  await fs.writeFile(target, data);
}

export async function downloadSkillFiles(
  owner: string,
  repo: string,
  ref: string,
  upstreamSkillDir: string,
  skillName: string,
  files: { path: string; sha: string }[]
): Promise<Record<string, string>> {
  const filesIndex: Record<string, string> = {};
  for (const f of files) {
    if (!f.path.startsWith(upstreamSkillDir + "/")) continue;
    const rel = f.path.slice(upstreamSkillDir.length + 1);
    const buf = await fetchRawBuffer(owner, repo, ref, f.path);
    await writeSkillFile(owner, skillName, rel, buf);
    filesIndex[rel] = f.sha;
  }
  return filesIndex;
}

export async function removeSkill(owner: string, skillName: string): Promise<void> {
  const dir = skillLocalDir(owner, skillName);
  await fs.rm(dir, { recursive: true, force: true });
}

export async function writeNotice(
  owner: string,
  repoUrl: string,
  spdx: string,
  licenseText: string | null,
  syncedSha: string
): Promise<void> {
  await ensureDir(sourceDir(owner));
  const body =
    `# NOTICE — ${owner}\n\n` +
    `Skills nesta pasta são curadas a partir de [${repoUrl}](${repoUrl}).\n\n` +
    `- **Licença detectada:** ${spdx}\n` +
    `- **Commit de referência da última sync:** \`${syncedSha}\`\n` +
    `- **Atribuição:** Originally authored by ${owner} at ${repoUrl}. ` +
    `Curated here under ${spdx}.\n\n` +
    (licenseText
      ? `## LICENSE (cópia integral do upstream)\n\n\`\`\`\n${licenseText}\n\`\`\`\n`
      : `## LICENSE\n\n_LICENSE não foi encontrada automaticamente no upstream. Verifique manualmente antes de redistribuir._\n`);
  await fs.writeFile(noticeFile(owner), body, "utf8");
}

export async function readSkillMarkdown(owner: string, skillName: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(skillLocalDir(owner, skillName), "SKILL.md"), "utf8");
  } catch {
    return null;
  }
}

export async function listLocalSkillFiles(
  owner: string,
  skillName: string
): Promise<string[]> {
  const root = skillLocalDir(owner, skillName);
  const out: string[] = [];
  async function walk(dir: string, prefix: string) {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(path.join(dir, e.name), rel);
      else out.push(rel);
    }
  }
  await walk(root, "");
  return out;
}

export function isTextFile(relPath: string): boolean {
  const ext = path.extname(relPath).toLowerCase();
  return TEXT_EXT.has(ext) || !ext;
}
