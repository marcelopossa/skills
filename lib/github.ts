import { Octokit } from "octokit";
import matter from "gray-matter";
import { License, UpstreamSkill } from "./types";

let _octokit: Octokit | null = null;
function gh(): Octokit {
  if (!_octokit) {
    _octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || undefined });
  }
  return _octokit;
}

export function parseRepoUrl(input: string): { owner: string; repo: string } {
  const s = input.trim().replace(/\/+$/, "");
  const urlMatch = s.match(/github\.com[/:]([^/\s]+)\/([^/\s.]+)(?:\.git)?$/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const shortMatch = s.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*?)(?:\.git)?$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  throw new Error(
    `Não reconheci um repo GitHub. Use "owner/repo" (ex: nextlevelbuilder/ui-ux-pro-max-skill) ou a URL completa.`
  );
}

export async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const { data } = await gh().rest.repos.get({ owner, repo });
  return data.default_branch;
}

export async function getHeadSha(owner: string, repo: string, branch: string): Promise<string> {
  const { data } = await gh().rest.repos.getBranch({ owner, repo, branch });
  return data.commit.sha;
}

type TreeEntry = { path: string; sha: string; type: string; mode: string };

export async function getTreeRecursive(
  owner: string,
  repo: string,
  sha: string
): Promise<TreeEntry[]> {
  const { data } = await gh().rest.git.getTree({
    owner,
    repo,
    tree_sha: sha,
    recursive: "true",
  });
  return (data.tree as TreeEntry[]).filter((e) => e.type === "blob" || e.type === "tree");
}

export async function fetchRawFile(
  owner: string,
  repo: string,
  ref: string,
  path: string
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  const headers: Record<string, string> = { "User-Agent": "luiz-curated-skills" };
  if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Fetch falhou (${res.status}) para ${path}`);
  return await res.text();
}

export async function fetchRawBuffer(
  owner: string,
  repo: string,
  ref: string,
  path: string
): Promise<Buffer> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  const headers: Record<string, string> = { "User-Agent": "luiz-curated-skills" };
  if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Fetch falhou (${res.status}) para ${path}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export async function fetchLicense(owner: string, repo: string): Promise<License | null> {
  try {
    const { data } = await gh().rest.licenses.getForRepo({ owner, repo });
    return {
      spdx: data.license?.spdx_id || "UNKNOWN",
      url: data.html_url || undefined,
      fetched_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function fetchLicenseText(owner: string, repo: string): Promise<string | null> {
  try {
    const { data } = await gh().rest.licenses.getForRepo({ owner, repo });
    if (typeof data.content === "string") {
      const enc = (data.encoding || "base64") as BufferEncoding;
      return Buffer.from(data.content, enc).toString("utf8");
    }
  } catch {
    /* fallthrough */
  }
  for (const name of ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"]) {
    try {
      const txt = await fetchRawFile(owner, repo, "HEAD", name);
      if (txt) return txt;
    } catch {
      /* try next */
    }
  }
  return null;
}

function extractRelativeRefs(content: string): string[] {
  const refs = new Set<string>();
  const mdLink = /\]\(([^)]+)\)/g;
  for (const m of content.matchAll(mdLink)) {
    const p = m[1].trim();
    if (
      p &&
      !p.startsWith("http://") &&
      !p.startsWith("https://") &&
      !p.startsWith("#") &&
      !p.startsWith("mailto:")
    ) {
      refs.add(p.split("#")[0]);
    }
  }
  const inline = /(?<![A-Za-z0-9_./-])(\.{1,2}\/[A-Za-z0-9_./-]+|(?:scripts|references|assets|examples)\/[A-Za-z0-9_./-]+)/g;
  for (const m of content.matchAll(inline)) refs.add(m[1]);
  const out: string[] = [];
  for (const r of refs) {
    const trimmed = r.replace(/[.,;:)]+$/, "");
    if (!trimmed) continue;
    if (!/[./]/.test(trimmed.slice(1))) continue;
    if (/^\/[a-z-]+$/i.test(trimmed) && !trimmed.includes(".")) continue;
    out.push(trimmed);
  }
  return out;
}

export async function listUpstreamSkills(
  owner: string,
  repo: string,
  sha: string,
  opts: { expandRootPackage?: boolean } = {}
): Promise<UpstreamSkill[]> {
  const tree = await getTreeRecursive(owner, repo, sha);

  const hasMarketplace = tree.some(
    (e) => e.type === "blob" && e.path === ".claude-plugin/marketplace.json"
  );

  if (hasMarketplace && !opts.expandRootPackage) {
    let mp: { plugins?: Array<Record<string, unknown>> } = {};
    try {
      const raw = await fetchRawFile(owner, repo, sha, ".claude-plugin/marketplace.json");
      mp = JSON.parse(raw);
    } catch {
      /* fallback to other detection */
    }
    if (Array.isArray(mp.plugins) && mp.plugins.length > 0) {
      const items: UpstreamSkill[] = [];
      for (const p of mp.plugins) {
        const name = String(p.name || "");
        if (!name) continue;
        const src = p.source;
        const baseDescription =
          typeof p.description === "string" ? p.description : "";

        if (typeof src === "string" && src.startsWith("./")) {
          const dir = src === "./" ? "" : src.replace(/^\.\//, "").replace(/\/+$/, "");
          const innerPluginPath = dir
            ? `${dir}/.claude-plugin/plugin.json`
            : ".claude-plugin/plugin.json";
          let description = baseDescription;
          try {
            const innerRaw = await fetchRawFile(owner, repo, sha, innerPluginPath);
            const inner = JSON.parse(innerRaw) as { description?: string };
            if (!description && typeof inner.description === "string") {
              description = inner.description.trim();
            }
          } catch {
            /* sem plugin.json interno */
          }
          const prefix = dir ? `${dir}/` : "";
          const dirFiles = tree.filter(
            (e) => e.type === "blob" && (prefix ? e.path.startsWith(prefix) : true)
          );
          const skillNames = dirFiles
            .filter((f) => f.path.endsWith("/SKILL.md"))
            .map((f) => f.path.slice(0, -"/SKILL.md".length).split("/").pop() || "");
          items.push({
            name,
            upstream_path: dir,
            upstream_category: null,
            description,
            files: dirFiles.map((f) => ({ path: f.path, sha: f.sha })),
            external_refs: [],
            type: "package",
            package_skills: skillNames.filter(Boolean).sort(),
          });
        } else if (src && typeof src === "object" && "source" in src) {
          const obj = src as { source?: string; url?: string; repo?: string; path?: string };
          const kind = String(obj.source || "remote");
          const detail = obj.url || obj.repo
            ? `${obj.url || obj.repo}${obj.path ? "/" + obj.path : ""}`
            : undefined;
          items.push({
            name,
            upstream_path: "",
            upstream_category: null,
            description:
              baseDescription ||
              `Source remoto (${kind}): ${detail || "—"}. Não importável diretamente nesta versão.`,
            files: [],
            external_refs: [],
            type: "package",
            package_skills: [],
            unsupported_source: { kind, detail },
          });
        }
      }
      return items.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  const hasRootPlugin = tree.some(
    (e) => e.type === "blob" && e.path === ".claude-plugin/plugin.json"
  );
  if (hasRootPlugin && !opts.expandRootPackage) {
    let name = repo;
    let description = "";
    try {
      const raw = await fetchRawFile(owner, repo, sha, ".claude-plugin/plugin.json");
      const pj = JSON.parse(raw) as { name?: string; description?: string };
      if (typeof pj.name === "string" && pj.name.trim()) name = pj.name.trim();
      if (typeof pj.description === "string") description = pj.description.trim();
    } catch {
      /* fallback */
    }
    const allFiles = tree.filter((e) => e.type === "blob");
    const skillNames = allFiles
      .filter((f) => f.path.endsWith("/SKILL.md"))
      .map((f) => {
        const parts = f.path.slice(0, -"/SKILL.md".length).split("/");
        return parts[parts.length - 1];
      });
    return [
      {
        name,
        upstream_path: "",
        upstream_category: null,
        description,
        files: allFiles.map((f) => ({ path: f.path, sha: f.sha })),
        external_refs: [],
        type: "package",
        package_skills: skillNames.sort(),
      },
    ];
  }

  const packagePluginPaths = tree.filter(
    (e) => e.type === "blob" && e.path.endsWith("/.claude-plugin/plugin.json")
  );
  const packageDirs: string[] = packagePluginPaths
    .map((p) => p.path.slice(0, -"/.claude-plugin/plugin.json".length))
    .filter((d) => d.length > 0);

  const out: UpstreamSkill[] = [];

  for (const pkgDir of packageDirs) {
    const pkgPluginPath = `${pkgDir}/.claude-plugin/plugin.json`;
    const dirFiles = tree.filter(
      (e) => e.type === "blob" && e.path.startsWith(pkgDir + "/")
    );
    const skillMdInside = dirFiles.filter((f) => f.path.endsWith("/SKILL.md"));
    const skillNames = skillMdInside.map((f) =>
      f.path.slice(pkgDir.length + 1, -"/SKILL.md".length).split("/").pop() || ""
    );
    let name = pkgDir.split("/").pop()!;
    let description = "";
    try {
      const pluginRaw = await fetchRawFile(owner, repo, sha, pkgPluginPath);
      const pluginJson = JSON.parse(pluginRaw) as { name?: string; description?: string };
      if (typeof pluginJson.name === "string" && pluginJson.name.trim()) name = pluginJson.name.trim();
      if (typeof pluginJson.description === "string") description = pluginJson.description.trim();
    } catch {
      /* fallback to dir name */
    }
    out.push({
      name,
      upstream_path: pkgDir,
      upstream_category: pkgDir.split("/").slice(0, -1).join("/") || null,
      description,
      files: dirFiles.map((f) => ({ path: f.path, sha: f.sha })),
      external_refs: [],
      type: "package",
      package_skills: skillNames.filter(Boolean).sort(),
    });
  }

  const skillMdFiles = tree.filter((e) => e.type === "blob" && e.path.endsWith("/SKILL.md"));
  const standaloneSkills = skillMdFiles.filter(
    (s) => !packageDirs.some((pkg) => s.path.startsWith(pkg + "/"))
  );

  for (const entry of standaloneSkills) {
    const dir = entry.path.slice(0, -"/SKILL.md".length);
    const name = dir.split("/").pop()!;
    const segments = dir.split("/");
    const category = segments.length > 2 ? segments[segments.length - 2] : null;

    const dirFiles = tree.filter(
      (e) => e.type === "blob" && (e.path === entry.path || e.path.startsWith(dir + "/"))
    );

    let description = "";
    let externalRefs: string[] = [];
    try {
      const md = await fetchRawFile(owner, repo, sha, entry.path);
      const fm = matter(md);
      description =
        (typeof fm.data?.description === "string" && fm.data.description.trim()) ||
        firstNonEmptyLine(fm.content) ||
        "";
      const refs = extractRelativeRefs(md);
      externalRefs = refs.filter((r) => r.startsWith("../") || r.startsWith("/"));
    } catch {
      /* fallback */
    }
    out.push({
      name,
      upstream_path: dir,
      upstream_category: category,
      description,
      files: dirFiles.map((f) => ({ path: f.path, sha: f.sha })),
      external_refs: externalRefs,
      type: "skill",
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function firstNonEmptyLine(s: string): string {
  for (const line of s.split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#")) return t.slice(0, 200);
  }
  return "";
}
