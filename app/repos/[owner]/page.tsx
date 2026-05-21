"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { Sparkles, AlertTriangle, ChevronLeft, RefreshCw, Send } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import type { SkillRow, Area } from "@/lib/types";

type ApiSkills = {
  owner: string;
  repo: string;
  branch: string;
  head_sha: string;
  last_synced_sha: string | null;
  skills: SkillRow[];
};

export default function RepoBrowse({ params }: { params: Promise<{ owner: string }> }) {
  const { owner } = use(params);
  const [data, setData] = useState<ApiSkills | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areaOverrides, setAreaOverrides] = useState<Record<string, string[]>>({});
  const [descOverrides, setDescOverrides] = useState<Record<string, string>>({});
  const [depsBySkill, setDepsBySkill] = useState<Record<string, { external_refs: string[]; ai?: AnalyzeAIResult }>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [skRes, taxRes] = await Promise.all([
        fetch(`/api/repos/${owner}/skills`, { cache: "no-store" }),
        fetch("/api/taxonomy", { cache: "no-store" }),
      ]);
      if (!skRes.ok) {
        const j = await skRes.json();
        throw new Error(typeof j.error === "string" ? j.error : "Falha ao carregar skills");
      }
      const sk = (await skRes.json()) as ApiSkills;
      const tax = (await taxRes.json()) as { areas: Area[] };
      setData(sk);
      setAreas(tax.areas);
      setSelected(new Set());
      setAreaOverrides({});
      setDescOverrides({});
      const map: Record<string, { external_refs: string[] }> = {};
      for (const s of sk.skills) map[s.name] = { external_refs: s.external_refs };
      setDepsBySkill(map);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [owner]);

  const selectedList = useMemo(() => Array.from(selected), [selected]);

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }
  function selectAll(filter: (s: SkillRow) => boolean) {
    if (!data) return;
    setSelected(new Set(data.skills.filter(filter).map((s) => s.name)));
  }

  async function fetchUpstreamMarkdown(name: string): Promise<string | null> {
    if (!data) return null;
    const s = data.skills.find((x) => x.name === name);
    if (!s) return null;
    const path = `${s.upstream_path}/SKILL.md`;
    const url = `https://raw.githubusercontent.com/${owner}/${data.repo}/${data.head_sha}/${path}`;
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await r.text();
    } catch {
      return null;
    }
  }

  async function classifySelected() {
    if (selected.size === 0 || !data) return;
    setClassifying(true);
    try {
      for (const name of selectedList) {
        const md = await fetchUpstreamMarkdown(name);
        if (!md) continue;
        const res = await fetch("/api/classify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ skill_markdown: md, accept_new: true }),
        });
        if (!res.ok) continue;
        const j = (await res.json()) as {
          assigned: string[];
          propose_new: { slug: string; label: string }[];
        };
        const assigned = [...j.assigned, ...j.propose_new.map((p) => p.slug)];
        setAreaOverrides((prev) => ({ ...prev, [name]: assigned }));
      }
      const taxRes = await fetch("/api/taxonomy", { cache: "no-store" });
      setAreas(((await taxRes.json()) as { areas: Area[] }).areas);
    } finally {
      setClassifying(false);
    }
  }

  async function analyzeOne(name: string) {
    const md = await fetchUpstreamMarkdown(name);
    if (!md) return;
    const res = await fetch("/api/analyze-deps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skill_markdown: md }),
    });
    if (!res.ok) return;
    const ai = (await res.json()) as AnalyzeAIResult;
    setDepsBySkill((prev) => ({
      ...prev,
      [name]: { external_refs: prev[name]?.external_refs || [], ai },
    }));
  }

  async function refineOne(name: string) {
    const md = await fetchUpstreamMarkdown(name);
    if (!md) return;
    const current = descOverrides[name] || data?.skills.find((s) => s.name === name)?.description || "";
    const res = await fetch("/api/refine-description", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skill_markdown: md, current_description: current }),
    });
    if (!res.ok) return;
    const j = (await res.json()) as { suggested_description: string };
    setDescOverrides((prev) => ({ ...prev, [name]: j.suggested_description }));
  }

  async function applySync(intent: "selected-import" | "all-updates") {
    if (!data) return;
    setSyncing(true);
    setError(null);
    try {
      const body =
        intent === "selected-import"
          ? {
              owner,
              import: selectedList.filter(
                (n) =>
                  data.skills.find((s) => s.name === n)?.status === "not-imported" ||
                  data.skills.find((s) => s.name === n)?.status === "new-since-last-sync"
              ),
              update: selectedList.filter(
                (n) => data.skills.find((s) => s.name === n)?.status === "imported-modified"
              ),
              remove: [],
              dismiss: [],
              area_overrides: areaOverrides,
              description_overrides: descOverrides,
            }
          : {
              owner,
              import: [],
              update: data.skills.filter((s) => s.status === "imported-modified").map((s) => s.name),
              remove: [],
              dismiss: [],
            };
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(typeof j.error === "string" ? j.error : "Falha no sync");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  async function dismissOne(name: string) {
    if (!confirm(`Marcar '${name}' como ignorada (não reaparecerá em novas)?`)) return;
    await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner, import: [], update: [], remove: [], dismiss: [name] }),
    });
    await load();
  }

  async function removeOne(name: string) {
    if (!confirm(`Remover '${name}' do marketplace local? (Arquivos serão apagados.)`)) return;
    await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner, import: [], update: [], remove: [name], dismiss: [] }),
    });
    await load();
  }

  if (loading) return <div className="text-zinc-500">Carregando…</div>;
  if (error)
    return (
      <div className="space-y-3">
        <Link href="/repos" className="inline-flex items-center text-sm text-zinc-500 hover:underline">
          <ChevronLeft className="w-4 h-4" /> Fontes
        </Link>
        <div className="p-4 rounded border border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  if (!data) return null;

  const importedModifiedCount = data.skills.filter((s) => s.status === "imported-modified").length;

  return (
    <div className="space-y-4">
      <Link href="/repos" className="inline-flex items-center text-sm text-zinc-500 hover:underline">
        <ChevronLeft className="w-4 h-4" /> Fontes
      </Link>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">
            {data.owner}/{data.repo}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            branch <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">{data.branch}</code>{" "}
            • head <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">{data.head_sha.slice(0, 7)}</code>
            {data.last_synced_sha && (
              <>
                {" "}
                • última sync <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">{data.last_synced_sha.slice(0, 7)}</code>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Recarregar
        </button>
      </header>

      <div className="flex flex-wrap gap-2 items-center text-sm">
        <button
          onClick={() => selectAll((s) => s.status === "not-imported" || s.status === "new-since-last-sync")}
          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Selecionar todas não importadas
        </button>
        <button
          onClick={() => selectAll((s) => s.status === "imported-modified")}
          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Selecionar modificadas ({importedModifiedCount})
        </button>
        <button
          onClick={() => setSelected(new Set())}
          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Limpar seleção
        </button>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => void classifySelected()}
            disabled={selected.size === 0 || classifying}
            className="px-3 py-1.5 rounded border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {classifying ? "Classificando…" : `Classificar áreas (${selected.size})`}
          </button>
          <button
            onClick={() => void applySync("selected-import")}
            disabled={selected.size === 0 || syncing}
            className="px-3 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            {syncing ? "Aplicando…" : `Aplicar (${selected.size})`}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-900 text-left text-xs text-zinc-600 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2">Skill</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Áreas</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2">Deps</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
            {data.skills.map((s) => (
              <tr key={s.name}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(s.name)}
                    onChange={() => toggle(s.name)}
                  />
                </td>
                <td className="px-3 py-2 font-medium">
                  {s.name}
                  {s.upstream_category && (
                    <span className="ml-2 text-[10px] text-zinc-500">{s.upstream_category}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={s.status} />
                  {s.changed_files && s.changed_files.length > 0 && (
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {s.changed_files.slice(0, 3).join(", ")}
                      {s.changed_files.length > 3 && ` (+${s.changed_files.length - 3})`}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                    {(areaOverrides[s.name] || s.current_areas).map((a) => (
                      <span
                        key={a}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 max-w-md">
                  <div className="text-zinc-700 dark:text-zinc-300 line-clamp-2">
                    {descOverrides[s.name] || s.description || <em className="text-zinc-400">sem descrição</em>}
                  </div>
                  <button
                    onClick={() => void refineOne(s.name)}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline mt-0.5 inline-flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3" /> refinar
                  </button>
                </td>
                <td className="px-3 py-2 text-xs">
                  <div>{s.files.length} arquivo(s)</div>
                  {s.external_refs.length > 0 && (
                    <div className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      {s.external_refs.length} externo(s)
                    </div>
                  )}
                  {depsBySkill[s.name]?.ai && (
                    <div className="mt-1 text-[10px] text-zinc-600 dark:text-zinc-400">
                      {depsBySkill[s.name].ai!.referenced_skills.length > 0 && (
                        <div>refs: {depsBySkill[s.name].ai!.referenced_skills.join(", ")}</div>
                      )}
                      {depsBySkill[s.name].ai!.system_requirements.length > 0 && (
                        <div>
                          requer:{" "}
                          {depsBySkill[s.name]
                            .ai!.system_requirements.map((r) => r.tool + (r.version ? `@${r.version}` : ""))
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => void analyzeOne(s.name)}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3" /> analisar
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  {s.status === "imported-up-to-date" || s.status === "imported-modified" ? (
                    <button
                      onClick={() => void removeOne(s.name)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      remover
                    </button>
                  ) : s.status === "dismissed" ? (
                    <span className="text-xs text-zinc-400">ignorada</span>
                  ) : (
                    <button
                      onClick={() => void dismissOne(s.name)}
                      className="text-xs text-zinc-500 hover:underline"
                    >
                      ignorar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="text-xs text-zinc-500">
        <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
          Áreas cadastradas ({areas.length})
        </summary>
        <ul className="mt-2 space-y-1">
          {areas.map((a) => (
            <li key={a.slug}>
              <code>{a.slug}</code> — {a.label}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

type AnalyzeAIResult = {
  referenced_skills: string[];
  system_requirements: { tool: string; version?: string }[];
  external_files: string[];
  implicit_deps_notes: string;
};
