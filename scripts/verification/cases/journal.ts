/**
 * Le carnet des scripts de vérification : on y note ce qu'on a constaté, et on
 * conclut à la fin. Rien ne s'affiche en cours de route — une vérification se
 * lit d'un bloc, pas au fil de l'eau.
 */

type Constat = { label: string; ok: boolean; detail: string };

const constats: Constat[] = [];

export function record(label: string, ok: boolean, detail: string): void {
  constats.push({ label, ok, detail });
}

/** Un appel qui doit échouer, et échouer avec le bon code. */
export async function expectFailure(
  label: string,
  expectedCode: string,
  run: () => Promise<unknown>,
): Promise<void> {
  try {
    await run();
    record(label, false, "aucune erreur levée");
  } catch (error) {
    const code =
      error !== null && typeof error === "object" && "code" in error
        ? String(error.code)
        : "inconnu";
    record(label, code === expectedCode, `code levé : ${code}`);
  }
}

/** Affiche le carnet et fixe le code de sortie. */
export function conclure(verdict: string): void {
  for (const constat of constats) {
    console.info(`${constat.ok ? "ok  " : "ÉCHEC"}  ${constat.label} — ${constat.detail}`);
  }

  const echecs = constats.filter((constat) => !constat.ok).length;
  console.info(echecs === 0 ? `\n${verdict}` : `\n${echecs} vérification(s) en échec.`);
  process.exitCode = echecs === 0 ? 0 : 1;
}
