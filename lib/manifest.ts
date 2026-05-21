import { promises as fs } from "node:fs";
import { PLUGIN_FILE, README_FILE, README_TEMPLATE } from "./paths";
import { readSources, readTaxonomy } from "./sources";

const AUTO_SKILLS_START = "<!-- AUTO:SKILLS:START -->";
const AUTO_SKILLS_END = "<!-- AUTO:SKILLS:END -->";
const AUTO_CREDITS_START = "<!-- AUTO:CREDITS:START -->";
const AUTO_CREDITS_END = "<!-- AUTO:CREDITS:END -->";

export async function regeneratePluginManifest(): Promise<void> {
  const sources = await readSources();
  const skills: string[] = [];
  for (const [, src] of Object.entries(sources.sources)) {
    for (const [, sk] of Object.entries(src.imported_skills)) {
      skills.push("./" + sk.local_path.replaceAll("\\", "/"));
    }
  }
  skills.sort();
  const current = await readPlugin();
  const updated = { ...current, skills };
  await fs.writeFile(PLUGIN_FILE, JSON.stringify(updated, null, 2) + "\n", "utf8");
}

async function readPlugin(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(PLUGIN_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      name: "marcelopossa-skills",
      description: "Marketplace pessoal de skills curadas por Marcelo Possa",
      version: "0.1.0",
      skills: [],
    };
  }
}

export async function regenerateReadme(): Promise<void> {
  const tax = await readTaxonomy();
  const sources = await readSources();

  const skillsByArea = new Map<string, { owner: string; name: string; description: string }[]>();
  const uncategorized: { owner: string; name: string; description: string }[] = [];

  for (const [owner, src] of Object.entries(sources.sources)) {
    for (const [name, sk] of Object.entries(src.imported_skills)) {
      const entry = { owner, name, description: sk.description };
      if (!sk.areas || sk.areas.length === 0) {
        uncategorized.push(entry);
      } else {
        for (const a of sk.areas) {
          if (!skillsByArea.has(a)) skillsByArea.set(a, []);
          skillsByArea.get(a)!.push(entry);
        }
      }
    }
  }

  let skillsSection = "";
  for (const area of tax.areas) {
    const list = skillsByArea.get(area.slug);
    if (!list || list.length === 0) continue;
    skillsSection += `\n### ${area.label}\n\n`;
    if (area.description) skillsSection += `_${area.description}_\n\n`;
    for (const s of list) {
      skillsSection += `- **${s.name}** (${s.owner}) — ${s.description || "_sem descrição_"}\n`;
    }
  }
  if (uncategorized.length > 0) {
    skillsSection += `\n### Sem área atribuída\n\n`;
    for (const s of uncategorized) {
      skillsSection += `- **${s.name}** (${s.owner}) — ${s.description || "_sem descrição_"}\n`;
    }
  }
  if (!skillsSection) {
    skillsSection = "\n_Nenhuma skill importada ainda._\n";
  }

  let creditsSection = "";
  const ownerNames = Object.keys(sources.sources).sort();
  if (ownerNames.length === 0) {
    creditsSection = "\n_Nenhuma fonte cadastrada ainda._\n";
  } else {
    for (const owner of ownerNames) {
      const src = sources.sources[owner];
      const skillNames = Object.keys(src.imported_skills).sort();
      const spdx = src.license?.spdx || "UNKNOWN";
      const licenseLink = src.license?.url ? ` ([LICENSE](${src.license.url}))` : "";
      creditsSection +=
        `\n### [${src.owner}/${src.repo}](${src.repo_url})\n\n` +
        `- **Licença:** ${spdx}${licenseLink}\n` +
        `- **Skills curadas:** ${skillNames.length > 0 ? skillNames.map((n) => `\`${n}\``).join(", ") : "_nenhuma ainda_"}\n` +
        `- **Agradecimento:** ${src.attribution || `Trabalho original de ${src.owner}.`}\n`;
    }
  }

  const template = await readOrCreateTemplate();
  const final = template
    .replace(
      new RegExp(`${AUTO_SKILLS_START}[\\s\\S]*?${AUTO_SKILLS_END}`),
      `${AUTO_SKILLS_START}${skillsSection}${AUTO_SKILLS_END}`
    )
    .replace(
      new RegExp(`${AUTO_CREDITS_START}[\\s\\S]*?${AUTO_CREDITS_END}`),
      `${AUTO_CREDITS_START}${creditsSection}${AUTO_CREDITS_END}`
    );

  await fs.writeFile(README_FILE, final, "utf8");
}

async function readOrCreateTemplate(): Promise<string> {
  try {
    return await fs.readFile(README_TEMPLATE, "utf8");
  } catch {
    const seed = DEFAULT_TEMPLATE;
    await fs.writeFile(README_TEMPLATE, seed, "utf8");
    return seed;
  }
}

const DEFAULT_TEMPLATE = `# marcelopossa-skills

Marketplace pessoal de skills curadas de outros repositórios do GitHub, mantido por Marcelo Possa.

**Como funciona.** Skills aqui são importadas de fontes externas e mantidas em modo **read-only** — nunca edito manualmente. Quando o upstream muda, sincronizo localmente pelo painel web e republico para o GitHub.

## Como instalar — Claude Code, Claude Cowork ou extensão Claude no VSCode

\`\`\`
/plugin marketplace add marcelopossa/skills
/plugin install marcelopossa-skills@marcelopossa/skills
\`\`\`

O mesmo \`.claude-plugin/plugin.json\` funciona nos três clientes.

## Curadoria local

Para gerenciar fontes e selecionar skills:

\`\`\`bash
npm install
cp .env.example .env.local   # preencher DEEPSEEK_API_KEY (e GITHUB_TOKEN opcional)
npm run dev                  # abrir http://localhost:3000
\`\`\`

## Skills

${AUTO_SKILLS_START}
_Lista regenerada automaticamente pelo painel._
${AUTO_SKILLS_END}

## Credits & Licenses

Skills aqui foram curadas a partir das fontes abaixo. Atribuição e licença são preservadas; \`NOTICE.md\` em cada pasta de fonte traz o LICENSE original.

${AUTO_CREDITS_START}
_Lista regenerada automaticamente pelo painel._
${AUTO_CREDITS_END}
`;
