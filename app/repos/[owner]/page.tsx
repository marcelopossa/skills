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
  const [batchProgress, setBatchProgress] = useState<{
    kind: "classify" | "refine" | "analyze" | "all";
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [areaOverrides, setAreaOverrides] = useState<Record<string, string[]>>({});
  const [descOverrides, setDescOverrides] = useState<Record<string, string>>({});
  const [depsBySkill, setDepsBySkill] = useState<Record<string, { external_refs: string[]; ai?: AnalyzeAIResult }>>({});
  const [expandedDesc, setExpandedDesc] = useState<Set<string>>(new Set());

  function toggleDesc(name: string) {
    setExpandedDesc((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

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
      const map: Record<string, { external_refs: string[]; ai?: AnalyzeAIResult }> = {};
      for (const s of sk.skills) {
        map[s.name] = {
          external_refs: s.external_refs,
          ai: s.cached_deps,
        };
      }
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

  function skillMdSha(name: string): string | undefined {
    if (!data) return undefined;
    const s = data.skills.find((x) => x.name === name);
    return s?.files.find((f) => f.path === `${s.upstream_path}/SKILL.md`)?.sha;
  }

  async function classifySelected(kind: "classify" | "all" = "classify") {
    if (selected.size === 0 || !data) return;
    setBatchProgress({ kind, current: 0, total: selectedList.length });
    try {
      for (let i = 0; i < selectedList.length; i++) {
        const name = selectedList[i];
        const md = await fetchUpstreamMarkdown(name);
        if (md) {
          const res = await fetch("/api/classify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              skill_markdown: md,
              accept_new: true,
              owner,
              skill_name: name,
              skill_sha: skillMdSha(name),
            }),
          });
          if (res.ok) {
            const j = (await res.json()) as {
              assigned: string[];
              propose_new: { slug: string; label: string }[];
            };
            const assigned = [...j.assigned, ...j.propose_new.map((p) => p.slug)];
            setAreaOverrides((prev) => ({ ...prev, [name]: assigned }));
          }
        }
        setBatchProgress({ kind, current: i + 1, total: selectedList.length });
      }
      const taxRes = await fetch("/api/taxonomy", { cache: "no-store" });
      setAreas(((await taxRes.json()) as { areas: Area[] }).areas);
    } finally {
      if (kind === "classify") setBatchProgress(null);
    }
  }

  async function refineSelected(kind: "refine" | "all" = "refine") {
    if (selected.size === 0 || !data) return;
    setBatchProgress({ kind, current: 0, total: selectedList.length });
    try {
      for (let i = 0; i < selectedList.length; i++) {
        const name = selectedList[i];
        const md = await fetchUpstreamMarkdown(name);
        if (md) {
          const current =
            descOverrides[name] || data.skills.find((s) => s.name === name)?.description || "";
          const res = await fetch("/api/refine-description", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              skill_markdown: md,
              current_description: current,
              owner,
              skill_name: name,
              skill_sha: skillMdSha(name),
            }),
          });
          if (res.ok) {
            const j = (await res.json()) as { suggested_description: string };
            if (j.suggested_description) {
              setDescOverrides((prev) => ({ ...prev, [name]: j.suggested_description }));
            }
          }
        }
        setBatchProgress({ kind, current: i + 1, total: selectedList.length });
      }
    } finally {
      if (kind === "refine") setBatchProgress(null);
    }
  }

  async function analyzeSelected(kind: "analyze" | "all" = "analyze") {
    if (selected.size === 0 || !data) return;
    setBatchProgress({ kind, current: 0, total: selectedList.length });
    try {
      for (let i = 0; i < selectedList.length; i++) {
        const name = selectedList[i];
        const md = await fetchUpstreamMarkdown(name);
        if (md) {
          const res = await fetch("/api/analyze-deps", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              skill_markdown: md,
              owner,
              skill_name: name,
              skill_sha: skillMdSha(name),
            }),
          });
          if (res.ok) {
            const ai = (await res.json()) as AnalyzeAIResult;
            setDepsBySkill((prev) => ({
              ...prev,
              [name]: { external_refs: prev[name]?.external_refs || [], ai },
            }));
          }
        }
        setBatchProgress({ kind, current: i + 1, total: selectedList.length });
      }
    } finally {
      if (kind === "analyze") setBatchProgress(null);
    }
  }

  async function runAllSelected() {
    if (selected.size === 0) return;
    try {
      await classifySelected("all");
      await refineSelected("all");
      await analyzeSelected("all");
    } finally {
      setBatchProgress(null);
    }
  }

  async function analyzeOne(name: string) {
    const md = await fetchUpstreamMarkdown(name);
    if (!md) return;
    const res = await fetch("/api/analyze-deps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        skill_markdown: md,
        owner,
        skill_name: name,
        skill_sha: skillMdSha(name),
      }),
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
      body: JSON.stringify({
        skill_markdown: md,
        current_description: current,
        owner,
        skill_name: name,
        skill_sha: skillMdSha(name),
        force: true,
      }),
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

  async function restoreOne(name: string) {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner, import: [], update: [], remove: [], dismiss: [], undismiss: [name] }),
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
  const activeSkills = data.skills.filter((s) => s.status !== "dismissed");
  const archivedSkills = data.skills.filter((s) => s.status === "dismissed");

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
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={() => void classifySelected("classify")}
            disabled={selected.size === 0 || batchProgress !== null}
            className="px-3 py-1.5 rounded border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {batchProgress?.kind === "classify"
              ? `Classificando ${batchProgress.current}/${batchProgress.total}…`
              : `Classificar áreas (${selected.size})`}
          </button>
          <button
            onClick={() => void refineSelected("refine")}
            disabled={selected.size === 0 || batchProgress !== null}
            className="px-3 py-1.5 rounded border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {batchProgress?.kind === "refine"
              ? `Traduzindo ${batchProgress.current}/${batchProgress.total}…`
              : `Traduzir descrições (${selected.size})`}
          </button>
          <button
            onClick={() => void analyzeSelected("analyze")}
            disabled={selected.size === 0 || batchProgress !== null}
            className="px-3 py-1.5 rounded border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {batchProgress?.kind === "analyze"
              ? `Analisando ${batchProgress.current}/${batchProgress.total}…`
              : `Analisar deps (${selected.size})`}
          </button>
          <button
            onClick={() => void runAllSelected()}
            disabled={selected.size === 0 || batchProgress !== null}
            title="Classificar áreas + traduzir descrição + analisar deps em sequência"
            className="px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {batchProgress?.kind === "all"
              ? `IA ${batchProgress.current}/${batchProgress.total}…`
              : `Tudo via IA (${selected.size})`}
          </button>
          <button
            onClick={() => void applySync("selected-import")}
            disabled={selected.size === 0 || syncing || batchProgress !== null}
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
            {activeSkills.map((s) => (
              <tr key={s.name}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(s.name)}
                    onChange={() => toggle(s.name)}
                  />
                </td>
                <td className="px-3 py-2 font-medium align-top">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{s.name}</span>
                    {s.upstream_category && (
                      <span className="text-[10px] text-zinc-500">{s.upstream_category}</span>
                    )}
                    {s.cache_stale && (
                      <span
                        title="O conteúdo da skill mudou upstream desde a última análise via IA. Rode novamente para atualizar o cache."
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                      >
                        cache obsoleto
                      </span>
                    )}
                    {(() => {
                      if (!selected.has(s.name)) return null;
                      const ai = depsBySkill[s.name]?.ai;
                      if (!ai) return null;
                      const knownNames = new Set(data.skills.map((x) => x.name));
                      const importedOrSelected = new Set(
                        data.skills
                          .filter((x) => x.status === "imported-up-to-date" || x.status === "imported-modified")
                          .map((x) => x.name)
                      );
                      for (const n of selected) importedOrSelected.add(n);
                      const missingSkills = ai.referenced_skills.filter(
                        (n) => knownNames.has(n) && !importedOrSelected.has(n) && n !== s.name
                      );
                      const tools = ai.system_requirements.map((r) => r.tool);
                      if (missingSkills.length === 0 && tools.length === 0) return null;
                      const tooltip = [
                        missingSkills.length > 0
                          ? `Skills referenciadas faltando: ${missingSkills.join(", ")}`
                          : null,
                        tools.length > 0 ? `Requer ferramentas: ${tools.join(", ")}` : null,
                      ]
                        .filter(Boolean)
                        .join("\n");
                      return (
                        <span
                          title={tooltip}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 cursor-help"
                        >
                          ⚠ deps {missingSkills.length > 0 ? `(${missingSkills.length})` : "ext"}
                        </span>
                      );
                    })()}
                  </div>
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
                <td className="px-3 py-2 max-w-lg align-top">
                  {(() => {
                    const desc = descOverrides[s.name] || s.description || "";
                    const isLong = desc.length > 140;
                    const isExpanded = expandedDesc.has(s.name);
                    return (
                      <>
                        <div
                          className={`text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap ${
                            isLong && !isExpanded ? "line-clamp-2" : ""
                          }`}
                        >
                          {desc || <em className="text-zinc-400">sem descrição</em>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {isLong && (
                            <button
                              onClick={() => toggleDesc(s.name)}
                              className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:underline"
                            >
                              {isExpanded ? "ver menos" : "ver mais"}
                            </button>
                          )}
                          <button
                            onClick={() => void refineOne(s.name)}
                            className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5"
                          >
                            <Sparkles className="w-3 h-3" /> refinar
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </td>
                <td className="px-3 py-2 text-xs align-top">
                  <div>{s.files.length} arquivo(s)</div>
                  {s.external_refs.length > 0 && (
                    <div
                      className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 mt-0.5 cursor-help"
                      title={s.external_refs.join("\n")}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {s.external_refs.length} externo(s)
                    </div>
                  )}
                  {(() => {
                    const ai = depsBySkill[s.name]?.ai;
                    if (!ai) return null;
                    const knownNames = new Set(data.skills.map((x) => x.name));
                    const importable = ai.referenced_skills.filter((n) => knownNames.has(n) && n !== s.name);
                    return (
                      <div className="mt-1 space-y-0.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                        {ai.referenced_skills.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span>refs:</span>
                            {ai.referenced_skills.map((n) => (
                              <span
                                key={n}
                                className={`px-1 rounded ${
                                  knownNames.has(n)
                                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                }`}
                                title={knownNames.has(n) ? "Disponível neste repo" : "Não encontrada neste repo"}
                              >
                                {n}
                              </span>
                            ))}
                            {importable.length > 0 && (
                              <button
                                onClick={() =>
                                  setSelected((prev) => {
                                    const next = new Set(prev);
                                    for (const n of importable) next.add(n);
                                    return next;
                                  })
                                }
                                className="text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                + marcar {importable.length}
                              </button>
                            )}
                          </div>
                        )}
                        {ai.system_requirements.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span>requer:</span>
                            {ai.system_requirements.map((r, idx) => (
                              <span
                                key={`${r.tool}-${idx}`}
                                className="px-1 rounded bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                              >
                                {r.tool}
                                {r.version ? `@${r.version}` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                        {ai.external_files.length > 0 && (
                          <div
                            className="text-amber-700 dark:text-amber-400"
                            title={ai.external_files.join("\n")}
                          >
                            ext: {ai.external_files.length} arquivo(s) fora do dir
                          </div>
                        )}
                        {ai.implicit_deps_notes && (
                          <div className="italic" title={ai.implicit_deps_notes}>
                            ⓘ {ai.implicit_deps_notes.slice(0, 60)}
                            {ai.implicit_deps_notes.length > 60 && "…"}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => void analyzeOne(s.name)}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5 mt-1"
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

      {archivedSkills.length > 0 && (
        <details className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between">
            <span>
              Skills arquivadas <span className="text-zinc-400">({archivedSkills.length})</span>
            </span>
            <span className="text-[10px] text-zinc-400">não reaparecem em &quot;novas&quot;</span>
          </summary>
          <div className="border-t border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
            {archivedSkills.map((s) => (
              <div
                key={s.name}
                className="flex items-baseline gap-3 px-4 py-2.5 text-sm"
              >
                <div className="font-medium text-zinc-700 dark:text-zinc-300">{s.name}</div>
                {s.upstream_category && (
                  <span className="text-[10px] text-zinc-500">{s.upstream_category}</span>
                )}
                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex-1 truncate">
                  {s.description || <em>sem descrição</em>}
                </div>
                <button
                  onClick={() => void restoreOne(s.name)}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline shrink-0"
                >
                  restaurar
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

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
