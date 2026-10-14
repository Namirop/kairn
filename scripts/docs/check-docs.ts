/**
 * Lists the documents whose covered code changed on this branch.
 *
 *   npm run docs:check           report, for a human
 *   tsx check-docs.ts --hook     Claude Code Stop hook: asks for a reread once
 *                                per changed file, then lets the turn end
 *
 * "Changed" means: committed on the branch since `main`, plus staged, unstaged
 * and untracked files. The map lives in `doc-map.ts`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { DOC_MAP } from "./doc-map";
import {
  findStaleDocs,
  markReported,
  notYetReported,
  type Reported,
  type StaleDoc,
} from "./stale-docs";

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function lines(output: string): string[] {
  return output.split("\n").filter(Boolean);
}

function changedFiles(): string[] {
  return [
    ...new Set([
      ...lines(git("diff", "--name-only", "main...HEAD")),
      ...lines(git("diff", "--name-only", "HEAD")),
      ...lines(git("ls-files", "--others", "--exclude-standard")),
    ]),
  ];
}

function missingMapPaths(): string[] {
  const paths = [...Object.keys(DOC_MAP), ...Object.values(DOC_MAP).flat()];
  return [...new Set(paths)].filter((path) => !existsSync(path));
}

function describe(stale: readonly StaleDoc[]): string {
  return stale.map(({ doc, because }) => `- ${doc}, à cause de : ${because.join(", ")}`).join("\n");
}

function report(): void {
  const stale = findStaleDocs(changedFiles(), DOC_MAP);
  const missing = missingMapPaths();
  if (stale.length === 0) console.log("Aucune doc à relire.");
  else console.log(`Docs à relire :\n${describe(stale)}`);
  if (missing.length > 0)
    console.log(`\nChemins de doc-map.ts introuvables : ${missing.join(", ")}`);
}

/** Reported files, per branch: a new branch starts with a clean slate. */
const ReportedFile = z.record(z.string(), z.record(z.string(), z.array(z.string())));
type ReportedFile = z.infer<typeof ReportedFile>;

const HookInput = z.object({ stop_hook_active: z.boolean().optional() });

function readReportedFile(file: string): ReportedFile {
  if (!existsSync(file)) return {};
  return ReportedFile.parse(JSON.parse(readFileSync(file, "utf8")));
}

function hook(): void {
  // A turn that the hook already stopped once ends freely: no loop.
  if (HookInput.parse(JSON.parse(readFileSync(0, "utf8"))).stop_hook_active) return;

  const branch = git("branch", "--show-current");
  const file = git("rev-parse", "--git-path", "kairn-docs-reported.json");
  const all = readReportedFile(file);
  const reported: Reported = all[branch] ?? {};
  const fresh = notYetReported(findStaleDocs(changedFiles(), DOC_MAP), reported);
  const missing = missingMapPaths();
  if (fresh.length === 0 && missing.length === 0) return;

  writeFileSync(file, JSON.stringify({ ...all, [branch]: markReported(reported, fresh) }, null, 2));
  const parts = [
    fresh.length > 0
      ? `Ces docs couvrent du code modifié sur cette branche et n'ont pas bougé :\n${describe(fresh)}\nRelis les passages concernés et mets-les à jour si ce qu'ils disent n'est plus vrai. Si rien n'a changé pour eux, dis-le en une ligne et termine.`
      : "",
    missing.length > 0
      ? `Chemins de scripts/docs/doc-map.ts qui n'existent plus : ${missing.join(", ")}. Corrige la carte.`
      : "",
  ];
  console.log(JSON.stringify({ decision: "block", reason: parts.filter(Boolean).join("\n\n") }));
}

if (process.argv.includes("--hook")) hook();
else report();
