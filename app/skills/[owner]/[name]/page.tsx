"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronLeft, ExternalLink, Sparkles, RefreshCw } from "lucide-react";
import type { ImportedSkill, Area } from "@/lib/types";

type SkillDetail = {
  markdown: string;
  skill: ImportedSkill;
  source: {
    owner: string;
    repo: string;
    repo_url: string;
    branch: string;
    last_synced_sha: string | null;
  };
};

export default function SkillDetail({
  params,
}: {
  params: Promise<{ owner: string; name: string }>;
}) {
  const { owner, name } = use(params);
  const [data, setData] = useState<SkillDetail | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [editing, setEditing] = useState(false);
  const [draftAreas, setDraftAreas] = useState<string[]>([]);
  const [draftDescription, setDraftDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [refiningDesc, setRefiningDesc] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  async function load() {
    const [skRes, taxRes] = await Promise.all([
      fetch(`/api/skills/${owner}/${name}/markdown`, { cache: "no-store" }),
      fetch(`/api/taxonomy`, { cache: "no-store" }),
    ]);
    if (!skRes.ok) {
      setData(null);
      return;
    }
    const sk = (await skRes.json()) as SkillDetail;
    const tax = (await taxRes.json()) as { areas: Area[] };
    setData(sk);
    setAreas(tax.areas);
    setDraftAreas(sk.skill.areas);
    setDraftDescription(sk.skill.description);
  }

  useEffect(() => {
    void load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [owner, name]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/skills/${owner}/${name}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ areas: draftAreas, description: draftDescription }),
      });
      if (res.ok) {
        setEditing(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function reclassify() {
    if (!data) return;
    setReclassifying(true);
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skill_markdown: data.markdown, accept_new: true }),
      });
      if (res.ok) {
        const j = (await res.json()) as {
          assigned: string[];
          propose_new: { slug: string }[];
        };
        setDraftAreas([...j.assigned, ...j.propose_new.map((p) => p.slug)]);
        setEditing(true);
        const taxRes = await fetch(`/api/taxonomy`, { cache: "no-store" });
        setAreas(((await taxRes.json()) as { areas: Area[] }).areas);
      }
    } finally {
      setReclassifying(false);
    }
  }

  async function refineDesc() {
    if (!data) return;
    setRefiningDesc(true);
    try {
      const res = await fetch("/api/refine-description", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skill_markdown: data.markdown,
          current_description: draftDescription || data.skill.description,
        }),
      });
      if (res.ok) {
        const j = (await res.json()) as { suggested_description: string };
        setDraftDescription(j.suggested_description);
        setEditing(true);
      }
    } finally {
      setRefiningDesc(false);
    }
  }

  async function resync() {
    if (!confirm(`Re-sincronizar '${name}' do upstream? Arquivos locais serão sobrescritos.`)) return;
    setResyncing(true);
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, import: [], update: [name], remove: [], dismiss: [] }),
      });
      await load();
    } finally {
      setResyncing(false);
    }
  }

  if (!data) return <div className="text-zinc-500">Carregando…</div>;

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center text-sm text-zinc-500 hover:underline">
        <ChevronLeft className="w-4 h-4" /> Skills
      </Link>

      <header className="space-y-2">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-semibold">{name}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => void refineDesc()}
              disabled={refiningDesc}
              className="text-sm px-3 py-1.5 rounded border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {refiningDesc ? "…" : "Traduzir descrição"}
            </button>
            <button
              onClick={() => void reclassify()}
              disabled={reclassifying}
              className="text-sm px-3 py-1.5 rounded border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {reclassifying ? "…" : "Reclassificar"}
            </button>
            <button
              onClick={() => void resync()}
              disabled={resyncing}
              className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {resyncing ? "…" : "Re-sync"}
            </button>
          </div>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {!editing && data.skill.description}
          {editing && (
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              className="w-full mt-1 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900"
              rows={2}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          {!editing &&
            (data.skill.areas.length > 0 ? (
              data.skill.areas.map((a) => (
                <span
                  key={a}
                  className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                >
                  {a}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-400">sem áreas</span>
            ))}
          {editing && (
            <div className="flex flex-wrap gap-1 max-w-xl">
              {areas.map((a) => {
                const sel = draftAreas.includes(a.slug);
                return (
                  <button
                    key={a.slug}
                    onClick={() =>
                      setDraftAreas((prev) =>
                        prev.includes(a.slug) ? prev.filter((x) => x !== a.slug) : [...prev, a.slug]
                      )
                    }
                    className={`text-xs px-2 py-0.5 rounded border ${
                      sel
                        ? "bg-purple-100 dark:bg-purple-900/40 border-purple-300 text-purple-700 dark:text-purple-300"
                        : "border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          )}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-zinc-500 hover:underline ml-2"
            >
              editar
            </button>
          ) : (
            <div className="ml-2 flex gap-2">
              <button
                onClick={() => void save()}
                disabled={saving}
                className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDraftAreas(data.skill.areas);
                  setDraftDescription(data.skill.description);
                }}
                className="text-xs text-zinc-500 hover:underline"
              >
                cancelar
              </button>
            </div>
          )}
        </div>
        <div className="text-xs text-zinc-500">
          Origem:{" "}
          <a
            href={`${data.source.repo_url}/tree/${data.source.last_synced_sha || data.source.branch}/${data.skill.upstream_path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline inline-flex items-center gap-1"
          >
            {data.source.owner}/{data.source.repo}/{data.skill.upstream_path}
            <ExternalLink className="w-3 h-3" />
          </a>
          {data.source.last_synced_sha && (
            <>
              {" "}
              @ <code>{data.source.last_synced_sha.slice(0, 7)}</code>
            </>
          )}
        </div>
        <div className="text-xs text-zinc-500">
          Arquivos: {Object.keys(data.skill.files).join(", ")}
        </div>
      </header>

      <article className="prose dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.markdown}</ReactMarkdown>
      </article>
    </div>
  );
}
