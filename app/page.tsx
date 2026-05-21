"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type SkillEntry = {
  owner: string;
  name: string;
  description: string;
  areas: string[];
  upstream_category: string | null;
};

type DashboardData = {
  skills: SkillEntry[];
  areas: { slug: string; label: string; description: string }[];
  pending_updates: number;
  new_available: number;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void loadDashboard().then(setData).catch((e) => {
      console.error(e);
      setData({ skills: [], areas: [], pending_updates: 0, new_available: 0 });
    });
  }, []);

  const filteredBySource = useMemo(() => {
    if (!data) return [];
    return data.skills.filter((s) => {
      if (filterSource !== "all" && s.owner !== filterSource) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [data, filterSource, query]);

  const sources = useMemo(
    () => Array.from(new Set((data?.skills || []).map((s) => s.owner))).sort(),
    [data]
  );

  if (!data) return <div className="text-zinc-500">Carregando…</div>;

  const grouped = new Map<string, SkillEntry[]>();
  const uncategorized: SkillEntry[] = [];
  for (const s of filteredBySource) {
    if (s.areas.length === 0) {
      uncategorized.push(s);
    } else {
      for (const a of s.areas) {
        if (filterArea !== "all" && a !== filterArea) continue;
        if (!grouped.has(a)) grouped.set(a, []);
        grouped.get(a)!.push(s);
      }
    }
  }

  const totalShown = filteredBySource.length;
  const banner = data.pending_updates + data.new_available;

  return (
    <div className="space-y-6">
      {banner > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 text-sm">
          {data.pending_updates > 0 && (
            <span className="mr-3">
              <strong>{data.pending_updates}</strong> skill(s) com updates pendentes.
            </span>
          )}
          {data.new_available > 0 && (
            <span>
              <strong>{data.new_available}</strong> skill(s) nova(s) disponível(is).
            </span>
          )}{" "}
          <Link href="/repos" className="underline ml-1">
            Ver fontes →
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar skill…"
            className="pl-8 pr-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 w-64"
          />
        </div>
        <select
          value={filterArea}
          onChange={(e) => setFilterArea(e.target.value)}
          className="text-sm border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 bg-white dark:bg-zinc-900"
        >
          <option value="all">Todas as áreas</option>
          {data.areas.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.label}
            </option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="text-sm border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 bg-white dark:bg-zinc-900"
        >
          <option value="all">Todas as fontes</option>
          {sources.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-500 ml-auto">{totalShown} skill(s)</span>
      </div>

      {totalShown === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-500">
          Nenhuma skill por aqui ainda.{" "}
          <Link href="/repos" className="underline">
            Cadastre uma fonte
          </Link>{" "}
          e selecione skills para começar.
        </div>
      )}

      {data.areas.map((area) => {
        const list = grouped.get(area.slug);
        if (!list || list.length === 0) return null;
        return (
          <section key={area.slug}>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-lg font-semibold">{area.label}</h2>
              {area.description && (
                <span className="text-xs text-zinc-500">{area.description}</span>
              )}
            </div>
            <SkillGrid skills={list} />
          </section>
        );
      })}

      {filterArea === "all" && uncategorized.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Sem área atribuída</h2>
          <SkillGrid skills={uncategorized} />
        </section>
      )}
    </div>
  );
}

function SkillGrid({ skills }: { skills: SkillEntry[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {skills.map((s) => (
        <Link
          key={`${s.owner}/${s.name}`}
          href={`/skills/${s.owner}/${s.name}`}
          className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium truncate">{s.name}</span>
            <span className="text-xs text-zinc-500 shrink-0">{s.owner}</span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-3">
            {s.description || <em>sem descrição</em>}
          </p>
          {s.areas.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {s.areas.map((a) => (
                <span
                  key={a}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

async function loadDashboard(): Promise<DashboardData> {
  const [reposRes, taxRes] = await Promise.all([
    fetch("/api/repos", { cache: "no-store" }),
    fetch("/api/taxonomy", { cache: "no-store" }),
  ]);
  const reposList = (await reposRes.json()).sources as { owner: string }[];
  const tax = (await taxRes.json()) as { areas: { slug: string; label: string; description: string }[] };

  const skills: SkillEntry[] = [];
  let pending = 0;
  let newAvail = 0;
  try {
    const updRes = await fetch("/api/check-updates", { cache: "no-store" });
    const upd = (await updRes.json()).report as Record<
      string,
      { modified: { name: string }[]; new_available: { name: string }[] }
    >;
    for (const v of Object.values(upd)) {
      pending += v.modified.length;
      newAvail += v.new_available.length;
    }
  } catch {
    /* ignore — dashboard ainda funciona */
  }

  for (const r of reposList) {
    const detailRes = await fetch(`/api/repos/${r.owner}/skills`, { cache: "no-store" });
    if (!detailRes.ok) continue;
    const detail = (await detailRes.json()) as {
      skills: {
        name: string;
        description: string;
        upstream_category: string | null;
        status: string;
        current_areas: string[];
      }[];
    };
    for (const s of detail.skills) {
      if (s.status === "imported-up-to-date" || s.status === "imported-modified") {
        skills.push({
          owner: r.owner,
          name: s.name,
          description: s.description,
          areas: s.current_areas,
          upstream_category: s.upstream_category,
        });
      }
    }
  }

  return { skills, areas: tax.areas, pending_updates: pending, new_available: newAvail };
}
