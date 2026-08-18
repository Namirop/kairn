import type { CouvertureAttendu } from "../attendus";
import type { VerdictsDuDepot } from "../juges/verdicts";
import { PLANCHER_COUVERTURE } from "./seuils";

/**
 * La section « Attendus par dépôt » du rapport.
 *
 * Deux dépôts seulement portent des attendus — les seuls où une référence
 * écrite à la main est légitime (fiche instrument §8). Chaque idée est
 * confrontée aux concepts par proximité d'embedding ; celles qui passent sous
 * le plancher passent au juge de résidu, dont le verdict apparaît sous
 * l'attendu.
 *
 * L'attendu assumé : `22` doit échouer sur plusieurs des siennes tant que le
 * découpage n'est pas repris. Le rapport rend ces trous visibles d'un passage
 * à l'autre — ne pas les adoucir pour les faire passer.
 */

const EXTRAIT = 300;

function extrait(texte: string): string {
  const plat = texte.replace(/\s+/g, " ").trim();

  return plat.length > EXTRAIT ? `${plat.slice(0, EXTRAIT)}…` : plat;
}

function proximite(valeur: number | null): string {
  return valeur === null ? "—" : valeur.toFixed(3);
}

/** Le tag final : couvert par proximité, ou verdict du juge, ou « en doute » si le juge n'a pas tourné. */
function verdictAttendu(couverture: CouvertureAttendu): string {
  if (couverture.couvertParProximite) return "✓ couvert par proximité";
  if (!couverture.verdict) return "· sous plancher, juge non passé";

  return couverture.verdict.manqueReel
    ? `✗ **manque confirmé** — ${couverture.verdict.motif}`
    : `✓ couvert (juge) — ${couverture.verdict.motif}`;
}

function compter(couvertures: CouvertureAttendu[]): { couverts: number; total: number } {
  const total = couvertures.length;
  const couverts = couvertures.filter(
    (c) => c.couvertParProximite || (c.verdict && !c.verdict.manqueReel),
  ).length;

  return { couverts, total };
}

function rendreUnDepot(nom: string, couvertures: CouvertureAttendu[]): string[] {
  if (couvertures.length === 0) return [];

  const { couverts, total } = compter(couvertures);
  const lignes = [`### ${nom} — ${couverts} / ${total} couverts`, ""];

  for (const couverture of couvertures) {
    lignes.push(
      `- ${extrait(couverture.attendu)}`,
      `  ↳ concept le plus proche (${proximite(couverture.proximite)}) : ${extrait(couverture.voisin ?? "—")}`,
      `  → ${verdictAttendu(couverture)}`,
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
    `${totaux.couverts} / ${totaux.total} attendus couverts sur ${avecAttendus.length} dépôts témoins. Un attendu est couvert par proximité si un concept s'en approche au-dessus de ${PLANCHER_COUVERTURE} ; sinon, le juge de résidu tranche. Ces trous restent visibles d'un passage à l'autre par construction — pas d'adoucissement.`,
    "",
    ...avecAttendus.flatMap((v) => rendreUnDepot(v.nom, v.attendus)),
  ];
}
