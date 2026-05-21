import { promises as fs } from "node:fs";
import path from "node:path";
import { fetchRawBuffer } from "./github";
import {
  noticeFile,
  pluginDir,
  pluginManifestFile,
  pluginSkillDir,
  skillLocalDir,
  sourceDir,
} from "./paths";

const TEXT_EXT = new Set([
  ".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".sh", ".ps1", ".bat",
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".rb", ".go", ".rs",
  ".java", ".html", ".css", ".scss", ".xml", ".csv", ".tsv", ".env", ".sql",
]);

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeSkillFile(
  sourceKey: string,
  skillName: string,
  relPathWithinSkill: string,
  data: Buffer
): Promise<void> {
  const target = path.join(skillLocalDir(sourceKey, skillName), relPathWithinSkill);
  await ensureDir(path.dirname(target));
  await fs.writeFile(target, data);
}

export async function downloadSkillFiles(
  sourceKey: string,
  ghOwner: string,
  repo: string,
  ref: string,
  upstreamSkillDir: string,
  skillName: string,
  files: { path: string; sha: string }[]
): Promise<Record<string, string>> {
  const filesIndex: Record<string, string> = {};
  const prefix = upstreamSkillDir ? upstreamSkillDir + "/" : "";
  for (const f of files) {
    if (prefix && !f.path.startsWith(prefix)) continue;
    const rel = prefix ? f.path.slice(prefix.length) : f.path;
    const buf = await fetchRawBuffer(ghOwner, repo, ref, f.path);
    await writeSkillFile(sourceKey, skillName, rel, buf);
    filesIndex[rel] = f.sha;
  }
  return filesIndex;
}

export async function removeSkill(sourceKey: string, skillName: string): Promise<void> {
  await fs.rm(skillLocalDir(sourceKey, skillName), { recursive: true, force: true });
  await fs.rm(pluginDir(sourceKey, skillName), { recursive: true, force: true });
}

export async function writePluginFolder(
  sourceKey: string,
  skillName: string,
  meta: {
    description: string;
    licenseSpdx?: string;
    repoUrl: string;
    author: string;
    type?: "skill" | "package";
  }
): Promise<void> {
  const srcDir = skillLocalDir(sourceKey, skillName);
  const dstRoot = pluginDir(sourceKey, skillName);
  await fs.rm(dstRoot, { recursive: true, force: true });

  const pluginNameFull = `${sourceKey}-${skillName}`;

  if (meta.type === "package") {
    await ensureDir(dstRoot);
    await copyDirRecursive(srcDir, dstRoot);
    const pluginPath = path.join(dstRoot, ".claude-plugin", "plugin.json");
    let upstream: Record<string, unknown> = {};
    try {
      upstream = JSON.parse(await fs.readFile(pluginPath, "utf8"));
    } catch {
      /* ignore */
    }
    const manifest = {
      ...upstream,
      name: pluginNameFull,
      description:
        meta.description ||
        (typeof upstream.description === "string" ? upstream.description : "") ||
        `Pacote ${skillName} curado de ${sourceKey}`,
      author: { name: meta.author || sourceKey },
      homepage: meta.repoUrl,
      repository: meta.repoUrl,
      ...(meta.licenseSpdx && meta.licenseSpdx !== "UNKNOWN" ? { license: meta.licenseSpdx } : {}),
    };
    await ensureDir(path.dirname(pluginPath));
    await fs.writeFile(pluginPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
    return;
  }

  const dstSkillDir = pluginSkillDir(sourceKey, skillName);
  await ensureDir(dstSkillDir);
  await copyDirRecursive(srcDir, dstSkillDir);

  const manifest = {
    name: pluginNameFull,
    description: meta.description || `Skill ${skillName} curada de ${sourceKey}`,
    author: { name: meta.author || sourceKey },
    homepage: meta.repoUrl,
    repository: meta.repoUrl,
    ...(meta.licenseSpdx && meta.licenseSpdx !== "UNKNOWN" ? { license: meta.licenseSpdx } : {}),
  };
  const manifestPath = pluginManifestFile(sourceKey, skillName);
  await ensureDir(path.dirname(manifestPath));
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

async function copyDirRecursive(src: string, dst: string): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(src, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await ensureDir(d);
      await copyDirRecursive(s, d);
    } else if (entry.isFile()) {
      await fs.copyFile(s, d);
    }
  }
}

export async function writeRequirementsIfAny(
  sourceKey: string,
  skillName: string,
  deps: import("./types").DepsAnalysis | undefined
): Promise<boolean> {
  if (!deps) return false;
  const hasContent =
    deps.system_requirements.length > 0 ||
    deps.referenced_skills.length > 0 ||
    deps.external_files.length > 0 ||
    !!deps.implicit_deps_notes.trim();
  if (!hasContent) return false;
  const lines: string[] = [`# Requisitos — ${skillName}`, ""];
  if (deps.system_requirements.length > 0) {
    lines.push("## Ferramentas externas necessárias", "");
    lines.push("Você precisa ter instalado no seu sistema antes de usar esta skill:");
    lines.push("");
    for (const r of deps.system_requirements) {
      lines.push(`- **${r.tool}**${r.version ? ` (versão ${r.version})` : ""}`);
    }
    lines.push("");
  }
  if (deps.referenced_skills.length > 0) {
    lines.push("## Skills relacionadas", "");
    lines.push("Esta skill faz referência a outras skills do mesmo repositório:");
    lines.push("");
    for (const s of deps.referenced_skills) lines.push(`- \`${s}\``);
    lines.push("");
  }
  if (deps.external_files.length > 0) {
    lines.push("## Arquivos externos referenciados", "");
    lines.push(
      "Esta skill referencia arquivos fora do diretório dela. Eles não foram copiados automaticamente:"
    );
    lines.push("");
    for (const f of deps.external_files) lines.push(`- \`${f}\``);
    lines.push("");
  }
  if (deps.implicit_deps_notes.trim()) {
    lines.push("## Observações", "");
    lines.push(deps.implicit_deps_notes.trim());
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("_Arquivo gerado automaticamente pelo painel a partir da análise via IA._");
  const target = path.join(skillLocalDir(sourceKey, skillName), "REQUIREMENTS.md");
  await ensureDir(path.dirname(target));
  await fs.writeFile(target, lines.join("\n"), "utf8");
  return true;
}

export async function writeNotice(
  sourceKey: string,
  ghOwner: string,
  repoUrl: string,
  spdx: string,
  licenseText: string | null,
  syncedSha: string
): Promise<void> {
  await ensureDir(sourceDir(sourceKey));
  const body =
    `# NOTICE — ${ghOwner}\n\n` +
    `Skills nesta pasta são curadas a partir de [${repoUrl}](${repoUrl}).\n\n` +
    `- **Licença detectada:** ${spdx}\n` +
    `- **Commit de referência da última sync:** \`${syncedSha}\`\n` +
    `- **Atribuição:** Originally authored by ${ghOwner} at ${repoUrl}. ` +
    `Curated here under ${spdx}.\n\n` +
    (licenseText
      ? `## LICENSE (cópia integral do upstream)\n\n\`\`\`\n${licenseText}\n\`\`\`\n`
      : `## LICENSE\n\n_LICENSE não foi encontrada automaticamente no upstream. Verifique manualmente antes de redistribuir._\n`);
  await fs.writeFile(noticeFile(sourceKey), body, "utf8");
}

export async function readSkillMarkdown(sourceKey: string, skillName: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(skillLocalDir(sourceKey, skillName), "SKILL.md"), "utf8");
  } catch {
    return null;
  }
}

export async function listLocalSkillFiles(
  sourceKey: string,
  skillName: string
): Promise<string[]> {
  const root = skillLocalDir(sourceKey, skillName);
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
