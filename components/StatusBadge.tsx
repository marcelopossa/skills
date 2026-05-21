import type { SkillStatus } from "@/lib/types";

const LABEL: Record<SkillStatus, { text: string; cls: string }> = {
  "not-imported": { text: "não importada", cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  "imported-up-to-date": { text: "importada", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  "imported-modified": { text: "modificada upstream", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  "new-since-last-sync": { text: "nova", cls: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
  "dismissed": { text: "ignorada", cls: "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500" },
};

export function StatusBadge({ status }: { status: SkillStatus }) {
  const meta = LABEL[status];
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${meta.cls}`}>
      {meta.text}
    </span>
  );
}
