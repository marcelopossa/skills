"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ExternalLink, Trash2 } from "lucide-react";

type RepoRow = {
  slug: string;
  owner: string;
  repo: string;
  repo_url: string;
  branch: string;
  last_synced_sha: string | null;
  last_synced_at: string | null;
  license: { spdx: string } | null;
  imported_count: number;
  dismissed_count: number;
  expand_skills: boolean;
};

export default function ReposPage() {
  const [list, setList] = useState<RepoRow[]>([]);
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/repos", { cache: "no-store" });
    setList(((await res.json()).sources) as RepoRow[]);
  }
  useEffect(() => { void load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(typeof j.error === "string" ? j.error : "Falha ao cadastrar");
      }
      setUrl("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleExpand(slug: string, next: boolean) {
    await fetch(`/api/repos/${slug}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expand_skills: next }),
    });
    await load();
  }

  async function remove(slug: string) {
    if (!confirm(`Remover fonte '${slug}' do tracking? (skills locais não são apagadas.)`)) return;
    const res = await fetch(`/api/repos/${slug}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json();
      alert(typeof j.error === "string" ? j.error : "Falha ao remover");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold mb-2">Fontes</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Cadastre repositórios GitHub para curar skills. Depois, abra um para selecionar quais
          importar.
        </p>
        <form onSubmit={add} className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="owner/repo ou https://github.com/owner/repo"
            className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={submitting || !url}
            className="px-4 py-2 text-sm rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Cadastrar
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Cadastradas</h2>
        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-500">
            Nenhuma fonte ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((r) => (
              <div
                key={r.slug}
                className="flex items-center gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <Link
                      href={`/repos/${r.slug}`}
                      className="font-medium hover:underline truncate"
                    >
                      {r.owner}/{r.repo}
                    </Link>
                    {r.expand_skills && (
                      <span
                        title="Modo expandido: root plugin.json/marketplace.json ignorado; cada SKILL.md vira um plugin individual"
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 cursor-help"
                      >
                        ⤴ desdobrado
                      </span>
                    )}
                    <a
                      href={r.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 inline-flex items-center gap-0.5"
                    >
                      <ExternalLink className="w-3 h-3" /> upstream
                    </a>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 space-x-3">
                    <span>branch: {r.branch}</span>
                    <span>licença: {r.license?.spdx || "—"}</span>
                    <span>importadas: {r.imported_count}</span>
                    {r.dismissed_count > 0 && <span>ignoradas: {r.dismissed_count}</span>}
                    <span>
                      última sync:{" "}
                      {r.last_synced_at
                        ? new Date(r.last_synced_at).toLocaleString("pt-BR")
                        : "nunca"}
                    </span>
                  </div>
                  <label className="text-xs text-zinc-500 mt-2 inline-flex items-center gap-1.5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={r.expand_skills}
                      onChange={(e) => void toggleExpand(r.slug, e.target.checked)}
                    />
                    <span>desdobrar skills individuais (ignora plugin.json do root)</span>
                  </label>
                </div>
                <Link
                  href={`/repos/${r.slug}`}
                  className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Explorar
                </Link>
                <button
                  onClick={() => remove(r.slug)}
                  className="text-zinc-400 hover:text-red-600 p-1"
                  title="Remover fonte"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
