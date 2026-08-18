import type { CouvertureAttendu } from "../attendus";
import type { VerdictsDuDepot } from "../juges/verdicts";

/**
 * La section « Attendus par dépôt » du rapport.
 *
 * Deux dépôts seulement portent des attendus — les seuls où une référence
 * écrite à la main est légitime (fiche instrument §8). Chaque attendu passe
 * au juge d'attendus, systématiquement : la géométrie sélectionne les
 * concepts candidats, le juge tranche s'ils couvrent l'idée — chiffres,
 * seuils et conditions inclus.
 *
 * `couvertParProximite` reste indiqué à titre informatif, mais le verdict
 * est ce qui compte. Les attendus qui sortent non couverts restent visibles
 * d'un passage à l'autre par construction — ne pas les adoucir.
 */

const EXTRAIT = 300;

function extrait(texte: string): string {
  const plat = texte.replace(/\s+/g, " ").trim();

  return plat.length > EXTRAIT ? `${plat.slice(0, EXTRAIT)}…` : plat;
}

function proximite(valeur: number): string {
  return valeur.toFixed(3);
}

function verdictLigne(couverture: CouvertureAttendu): string {
  if (!couverture.verdict) return "· juge non passé";
  const indicateur = couverture.couvertParProximite ? "proximité ≥ plancher" : "proximité < plancher";

  return couverture.verdict.couvert
    ? `→ ✓ **couvert** (${indicateur}) — ${couverture.verdict.motif}`
    : `→ ✗ **non couvert** (${indicateur}) — ${couverture.verdict.motif}`;
}

function compter(couvertures: CouvertureAttendu[]): { couverts: number; total: number } {
  const total = couvertures.length;
  const couverts = couvertures.filter((c) => c.verdict?.couvert === true).length;

  return { couverts, total };
}

function rendreLesCandidats(couverture: CouvertureAttendu): string[] {
  if (couverture.candidats.length === 0) return ["  ↳ aucun concept dans le dépôt"];

  return couverture.candidats.map(
    (candidat, rang) =>
      `  ↳ candidat #${rang + 1} (${proximite(candidat.proximite)}) : ${extrait(candidat.concept)}`,
  );
}

function rendreUnDepot(nom: string, couvertures: CouvertureAttendu[]): string[] {
  if (couvertures.length === 0) return [];

  const { couverts, total } = compter(couvertures);
  const lignes = [`### ${nom} — ${couverts} / ${total} couverts`, ""];

  for (const couverture of couvertures) {
    lignes.push(
      `- ${extrait(couverture.attendu)}`,
      ...rendreLesCandidats(couverture),
      `  ${verdictLigne(couverture)}`,
      "",
    );
  }

  return lignes;
}

export function rendreLesAttendus(verdicts: VerdictsDuDepot[]): string[] {
  const avecAttendus = verdicts.filter((v) => v.attendus.length > 0);
  if (avecAttendus.length === 0) return [];

  const totaux = avecAttendus.reduce(
    (cumul, v) => {
      const { couverts, total } = compter(v.attendus);
      return { couverts: cumul.couverts + couverts, total: cumul.total + total };
    },
    { couverts: 0, total: 0 },
  );

  return [
    "## Attendus par dépôt",
    "",
    `${totaux.couverts} / ${totaux.total} attendus couverts sur ${avecAttendus.length} dépôts témoins. La géométrie désigne les concepts candidats les plus proches, le juge tranche si l'un d'eux couvre l'attendu — chiffres, seuils et conditions inclus. Ces trous restent visibles d'un passage à l'autre par construction : pas d'adoucissement.`,
    "",
    ...avecAttendus.flatMap((v) => rendreUnDepot(v.nom, v.attendus)),
  ];
}
