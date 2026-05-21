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

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const m = url.trim().match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?\/?$/);
  if (!m) throw new Error(`Não é uma URL de repo GitHub válida: ${url}`);
  return { owner: m[1], repo: m[2] };
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
  const inline = /(?<![A-Za-z0-9_./-])(\.{0,2}\/[A-Za-z0-9_./-]+|(?:scripts|references|assets|examples)\/[A-Za-z0-9_./-]+)/g;
  for (const m of content.matchAll(inline)) refs.add(m[1]);
  return Array.from(refs);
}

export async function listUpstreamSkills(
  owner: string,
  repo: string,
  sha: string
): Promise<UpstreamSkill[]> {
  const tree = await getTreeRecursive(owner, repo, sha);
  const skillMdFiles = tree.filter((e) => e.type === "blob" && e.path.endsWith("/SKILL.md"));
  const out: UpstreamSkill[] = [];

  for (const entry of skillMdFiles) {
    const dir = entry.path.slice(0, -"/SKILL.md".length);
    const name = dir.split("/").pop()!;
    const segments = dir.split("/");
    const category = segments.length > 2 ? segments[segments.length - 2] : null;

    const dirFiles = tree.filter(
      (e) => e.type === "blob" && (e.path === entry.path || e.path.startsWith(dir + "/"))
    );

    let description = "";
    try {
      const md = await fetchRawFile(owner, repo, sha, entry.path);
      const fm = matter(md);
      description =
        (typeof fm.data?.description === "string" && fm.data.description.trim()) ||
        firstNonEmptyLine(fm.content) ||
        "";

      const refs = extractRelativeRefs(md);
      const externalRefs = refs
        .filter((r) => r.startsWith("../") || r.startsWith("/"))
        .map((r) => r);

      out.push({
        name,
        upstream_path: dir,
        upstream_category: category,
        description,
        files: dirFiles.map((f) => ({ path: f.path, sha: f.sha })),
        external_refs: externalRefs,
      });
    } catch {
      out.push({
        name,
        upstream_path: dir,
        upstream_category: category,
        description: "",
        files: dirFiles.map((f) => ({ path: f.path, sha: f.sha })),
        external_refs: [],
      });
    }
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
