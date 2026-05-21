import { promises as fs } from "node:fs";
import { MARKETPLACE_FILE, README_FILE, README_TEMPLATE } from "./paths";
import { readSources, readTaxonomy } from "./sources";

const AUTO_SKILLS_START = "<!-- AUTO:SKILLS:START -->";
const AUTO_SKILLS_END = "<!-- AUTO:SKILLS:END -->";
const AUTO_CREDITS_START = "<!-- AUTO:CREDITS:START -->";
const AUTO_CREDITS_END = "<!-- AUTO:CREDITS:END -->";

const MARKETPLACE_NAME = "marcelopossa-skills";

export async function regenerateMarketplaceManifest(): Promise<void> {
  const sources = await readSources();
  const plugins: unknown[] = [];
  for (const [owner, src] of Object.entries(sources.sources)) {
    for (const [name, sk] of Object.entries(src.imported_skills)) {
      const pluginName = `${owner}-${name}`;
      plugins.push({
        name: pluginName,
        source: `./plugins/${pluginName}`,
        description: sk.description || `Skill ${name} curada de ${owner}`,
        category: sk.upstream_category || "skills",
        keywords: sk.areas?.length ? sk.areas : undefined,
        ...(src.license?.spdx && src.license.spdx !== "UNKNOWN"
          ? { license: src.license.spdx }
          : {}),
      });
    }
  }
  plugins.sort((a, b) => {
    const an = (a as { name: string }).name;
    const bn = (b as { name: string }).name;
    return an.localeCompare(bn);
  });

  const manifest = {
    $schema: "https://code.claude.com/marketplace.schema.json",
    name: MARKETPLACE_NAME,
    description: "Marketplace pessoal de skills curadas por Marcelo Possa",
    owner: { name: "Marcelo Possa" },
    plugins,
  };
  await fs.writeFile(MARKETPLACE_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

export async function regenerateReadme(): Promise<void> {
  const tax = await readTaxonomy();
  const sources = await readSources();

  type Entry = { owner: string; name: string; description: string; pluginName: string };
  const skillsByArea = new Map<string, Entry[]>();
  const uncategorized: Entry[] = [];

  for (const [owner, src] of Object.entries(sources.sources)) {
    for (const [name, sk] of Object.entries(src.imported_skills)) {
      const entry: Entry = {
        owner,
        name,
        description: sk.description,
        pluginName: `${owner}-${name}`,
      };
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
      skillsSection += `- **\`${s.pluginName}\`** — ${s.description || "_sem descrição_"}\n`;
    }
  }
  if (uncategorized.length > 0) {
    skillsSection += `\n### Sem área atribuída\n\n`;
    for (const s of uncategorized) {
      skillsSection += `- **\`${s.pluginName}\`** — ${s.description || "_sem descrição_"}\n`;
    }
  }
  if (!skillsSection) {
    skillsSection = "\n_Nenhuma skill importada ainda._\n";
  } else {
    skillsSection +=
      `\nInstale individualmente: \`/plugin install <nome>@${MARKETPLACE_NAME}\`. ` +
      "Habilite/desabilite por sessão com `/plugin enable <nome>` e `/plugin disable <nome>`.\n";
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

const DEFAULT_TEMPLATE = `# ${MARKETPLACE_NAME}

Marketplace pessoal de skills curadas de outros repositórios do GitHub, mantido por Marcelo Possa.

**Como funciona.** Cada skill curada é exposta como um **plugin independente** neste marketplace. Você instala só as que precisa e pode habilitar/desabilitar conforme o trabalho. Skills aqui são read-only — nunca edito manualmente; quando upstream muda, sincronizo localmente e republico.

## Adicionar o marketplace — Claude Code, Cowork ou extensão Claude no VSCode

\`\`\`
/plugin marketplace add marcelopossa/skills
\`\`\`

## Instalar skills individualmente

\`\`\`
/plugin install <nome-da-skill>@${MARKETPLACE_NAME}
\`\`\`

Veja a lista de skills disponíveis abaixo. Cada uma vira um plugin separado com prefixo do owner upstream (ex: \`mattpocock-diagnose\`).

## Habilitar / desabilitar por sessão

\`\`\`
/plugin enable mattpocock-diagnose
/plugin disable mattpocock-diagnose
\`\`\`

## Curadoria local

\`\`\`bash
npm install
cp .env.example .env.local   # preencher DEEPSEEK_API_KEY (e GITHUB_TOKEN opcional)
npm run dev                  # abrir http://localhost:3000
\`\`\`

## Skills disponíveis

${AUTO_SKILLS_START}
_Lista regenerada automaticamente pelo painel._
${AUTO_SKILLS_END}

## Credits & Licenses

Skills aqui foram curadas a partir das fontes abaixo. Atribuição e licença são preservadas; \`NOTICE.md\` em cada pasta de fonte traz o LICENSE original.

${AUTO_CREDITS_START}
_Lista regenerada automaticamente pelo painel._
${AUTO_CREDITS_END}
`;
