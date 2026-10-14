/**
 * Le carnet des scripts de vérification : on y note ce qu'on a constaté, et on
 * conclut à la fin. Rien ne s'affiche en cours de route — une vérification se
 * lit d'un bloc, pas au fil de l'eau.
 */

type Constat = { libelle: string; ok: boolean; detail: string };

const constats: Constat[] = [];

export function noter(libelle: string, ok: boolean, detail: string): void {
  constats.push({ libelle, ok, detail });
}

/** Un appel qui doit échouer, et échouer avec le bon code. */
export async function noterUnEchecAttendu(
  libelle: string,
  codeAttendu: string,
  lancer: () => Promise<unknown>,
): Promise<void> {
  try {
    await lancer();
    noter(libelle, false, "aucune erreur levée");
  } catch (error) {
    const code =
      error !== null && typeof error === "object" && "code" in error
        ? String(error.code)
        : "inconnu";
    noter(libelle, code === codeAttendu, `code levé : ${code}`);
  }
}

/** Affiche le carnet et fixe le code de sortie. */
export function conclure(verdict: string): void {
  for (const constat of constats) {
    console.info(`${constat.ok ? "ok  " : "ÉCHEC"}  ${constat.libelle} — ${constat.detail}`);
  }

  const echecs = constats.filter((constat) => !constat.ok).length;
  console.info(echecs === 0 ? `\n${verdict}` : `\n${echecs} vérification(s) en échec.`);
  process.exitCode = echecs === 0 ? 0 : 1;
}
