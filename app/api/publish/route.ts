import { NextResponse } from "next/server";
import { z } from "zod";
import * as git from "@/lib/git";

const BodySchema = z.object({
  action: z.enum(["status", "commit", "commit-and-push", "init-remote"]),
  message: z.string().optional(),
  remote_url: z.string().optional(),
  branch: z.string().default("main"),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  try {
    if (parsed.data.action === "status") {
      const s = await git.status();
      const hasRemote = await git.hasRemoteOrigin();
      const branch = await git.currentBranch();
      return NextResponse.json({ ...s, has_remote: hasRemote, branch });
    }
    if (parsed.data.action === "commit" || parsed.data.action === "commit-and-push") {
      if (!parsed.data.message) {
        return NextResponse.json({ error: "Mensagem de commit obrigatória" }, { status: 400 });
      }
      await git.addAll();
      await git.commit(parsed.data.message);
      if (parsed.data.action === "commit-and-push") {
        const branch = (await git.currentBranch()) || "main";
        const hasRemote = await git.hasRemoteOrigin();
        if (!hasRemote) {
          return NextResponse.json(
            { error: "Remote 'origin' não configurado. Use action 'init-remote' antes." },
            { status: 409 }
          );
        }
        await git.pushSetUpstream(branch);
      }
      return NextResponse.json({ ok: true });
    }
    if (parsed.data.action === "init-remote") {
      if (!parsed.data.remote_url) {
        return NextResponse.json({ error: "remote_url obrigatório" }, { status: 400 });
      }
      const has = await git.hasRemoteOrigin();
      if (has) {
        return NextResponse.json({ error: "Remote 'origin' já existe" }, { status: 409 });
      }
      await git.addRemote(parsed.data.remote_url);
      await git.renameBranch(parsed.data.branch);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
