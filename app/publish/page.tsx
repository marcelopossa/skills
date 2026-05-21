"use client";

import { useEffect, useState } from "react";
import { Send, GitBranch, AlertCircle } from "lucide-react";

type Status = {
  clean: boolean;
  files: string[];
  has_remote: boolean;
  branch: string | null;
};

export default function PublishPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("sync: atualização do marketplace");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "status" }),
    });
    if (res.ok) setStatus((await res.json()) as Status);
    else setError("Falha ao ler git status");
  }
  useEffect(() => {
    void load();
  }, []);

  async function call(body: object): Promise<boolean> {
    setWorking(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(typeof j.error === "string" ? j.error : "Falha");
      }
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function initRemote() {
    if (!remoteUrl) return;
    if (await call({ action: "init-remote", remote_url: remoteUrl, branch: "main" })) {
      setOk("Remote 'origin' configurado.");
      await load();
    }
  }

  async function commitOnly() {
    if (!message) return;
    if (await call({ action: "commit", message })) {
      setOk("Commit criado localmente.");
      await load();
    }
  }

  async function commitAndPush() {
    if (!message) return;
    if (await call({ action: "commit-and-push", message })) {
      setOk("Commit + push concluídos.");
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Publicar no GitHub</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Empacote suas mudanças locais e envie para o repositório remoto. Depois pode instalar como
          plugin no Claude Code, Cowork ou na extensão Claude do VSCode.
        </p>
      </header>

      {status && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500 mb-1">Branch</div>
              <div className="font-mono">{status.branch || "—"}</div>
            </div>
            <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500 mb-1">Working tree</div>
              <div>{status.clean ? "limpa" : `${status.files.length} arquivo(s) modificado(s)`}</div>
            </div>
            <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500 mb-1">Remote origin</div>
              <div>{status.has_remote ? "configurado" : "não configurado"}</div>
            </div>
          </div>

          {!status.has_remote && (
            <div className="p-4 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 space-y-2">
              <div className="font-medium inline-flex items-center gap-2">
                <GitBranch className="w-4 h-4" /> Configurar remote
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Crie o repositório no GitHub primeiro (ex: <code>seu-usuario/skills</code>) e cole a URL abaixo.
              </p>
              <div className="flex gap-2">
                <input
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://github.com/seu-usuario/skills.git"
                  className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900"
                />
                <button
                  onClick={() => void initRemote()}
                  disabled={working || !remoteUrl}
                  className="px-4 py-2 text-sm rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
                >
                  Configurar
                </button>
              </div>
            </div>
          )}

          {!status.clean && (
            <div className="space-y-2">
              <details className="text-sm">
                <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                  Ver {status.files.length} arquivo(s) que entrarão no commit
                </summary>
                <ul className="mt-2 max-h-48 overflow-y-auto text-xs font-mono text-zinc-700 dark:text-zinc-300 space-y-0.5">
                  {status.files.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </details>
              <label className="block text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Mensagem de commit</span>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900"
                />
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => void commitOnly()}
                  disabled={working || !message}
                  className="px-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Só commit (push depois)
                </button>
                <button
                  onClick={() => void commitAndPush()}
                  disabled={working || !message || !status.has_remote}
                  className="px-3 py-1.5 text-sm rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Commit + Push
                </button>
              </div>
            </div>
          )}

          {status.clean && (
            <div className="rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-800 dark:text-emerald-300">
              Working tree limpa — nada para publicar agora.
            </div>
          )}
        </section>
      )}

      {error && (
        <div className="rounded border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300 inline-flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {ok && (
        <div className="rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {ok}
        </div>
      )}
    </div>
  );
}
