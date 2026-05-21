import simpleGit, { SimpleGit } from "simple-git";
import { REPO_ROOT } from "./paths";

function git(): SimpleGit {
  return simpleGit(REPO_ROOT);
}

export async function status(): Promise<{ clean: boolean; files: string[] }> {
  const s = await git().status();
  const files = [
    ...s.not_added,
    ...s.modified,
    ...s.created,
    ...s.deleted,
    ...s.renamed.map((r) => r.to),
  ];
  return { clean: s.isClean(), files };
}

export async function hasRemoteOrigin(): Promise<boolean> {
  const remotes = await git().getRemotes(true);
  return remotes.some((r) => r.name === "origin");
}

export async function currentBranch(): Promise<string | null> {
  try {
    const b = await git().branch();
    return b.current || null;
  } catch {
    return null;
  }
}

export async function addAll(): Promise<void> {
  await git().add(".");
}

export async function commit(message: string): Promise<void> {
  await git().commit(message);
}

export async function push(): Promise<void> {
  await git().push();
}

export async function pushSetUpstream(branch: string): Promise<void> {
  await git().push(["-u", "origin", branch]);
}

export async function addRemote(url: string): Promise<void> {
  await git().addRemote("origin", url);
}

export async function renameBranch(name: string): Promise<void> {
  await git().branch(["-M", name]);
}
