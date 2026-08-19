import type { VerdictsDuDepot } from "../juges/verdicts";
import { PLANCHER_COUVERTURE, PLANCHER_DOUBLON, PLANCHER_SOUTIEN } from "./seuils";
import type { Paire, Rapproche } from "./signaux";
import type { SignalementsDuDepot } from "./signalements";

/**
 * Le détail par dépôt de la section « Mesures ».
 *
 * Sorti de `rapport-de-mesures.ts` pour la même raison qu'ailleurs : ce qu'on
 * lit ici (« pour ce dépôt, telles phrases, tels concepts, tels verdicts »)
 * répond à une autre question que ce qu'on lit là (« pour tout le corpus, où
 * en est-on »). Le corps du rapport agrège, ce module isole.
 *
 * Chaque signalement porte ses deux textes en entier, jamais une référence à
 * une ligne, et le verdict du juge tombe juste en dessous. C'est la contrainte
 * qui gouverne la mise en forme.
 */

const EXTRAIT = 300;

function extrait(texte: string): string {
  const plat = texte.replace(/\s+/g, " ").trim();

  return plat.length > EXTRAIT ? `${plat.slice(0, EXTRAIT)}…` : plat;
}

function proximite(valeur: number): string {
  return valeur.toFixed(3);
}

function verdictDeManque(verdict: { retenir: boolean | null; motif: string } | undefined): string {
  if (!verdict) return "";
  if (verdict.retenir === null) return `  → *abstention* — ${verdict.motif}`;
  const decision = verdict.retenir ? "**à retenir**" : "bruit";
  return `  → ${decision} — ${verdict.motif}`;
}

function verdictDInvention(verdict: { soutenu: boolean | null; motif: string } | undefined): string {
  if (!verdict) return "";
  if (verdict.soutenu === null) return `  → *abstention* — ${verdict.motif}`;
  const decision = verdict.soutenu ? "soutenu" : "**invention**";
  return `  → ${decision} — ${verdict.motif}`;
}

function verdictDeDoublon(
  verdict: { independants: boolean | null; sens: string | null; motif: string } | undefined,
): string {
  if (!verdict) return "";
  if (verdict.independants === null) return `  → *abstention* — ${verdict.motif}`;
  if (verdict.independants) return `  → indépendants — ${verdict.motif}`;
  return `  → **non indépendants** (${verdict.sens ?? "?"}) — ${verdict.motif}`;
}

function rendreLesRapprochesDeManque(
  entrees: Rapproche[],
  verdicts: { retenir: boolean | null; motif: string }[],
): string[] {
  return entrees.flatMap((entree, rang) =>
    [
      `- **${proximite(entree.proximite)}** ${extrait(entree.texte)}`,
      `  ↳ concept le plus proche : ${extrait(entree.voisin)}`,
      verdictDeManque(verdicts[rang]),
      "",
    ].filter(Boolean),
  );
}

function rendreLesRapprochesDInvention(
  entrees: Rapproche[],
  verdicts: { soutenu: boolean | null; motif: string }[],
): string[] {
  return entrees.flatMap((entree, rang) =>
    [
      `- **${proximite(entree.proximite)}** ${extrait(entree.texte)}`,
      `  ↳ phrase la plus proche : ${extrait(entree.voisin)}`,
      verdictDInvention(verdicts[rang]),
      "",
    ].filter(Boolean),
  );
}

function rendreLesPaires(
  paires: Paire[],
  verdicts: { independants: boolean | null; sens: string | null; motif: string }[],
): string[] {
  return paires.flatMap((paire, rang) =>
    [
      `- **${proximite(paire.proximite)}**`,
      `  - ${extrait(paire.un)}`,
      `  - ${extrait(paire.deux)}`,
      verdictDeDoublon(verdicts[rang]),
      "",
    ].filter(Boolean),
  );
}

export function rendreLeDepot(
  signalement: SignalementsDuDepot,
  verdict: VerdictsDuDepot | undefined,
): string[] {
  const total =
    signalement.manques.length + signalement.inventions.length + signalement.doublons.length;

  if (total === 0) return [];

  const lignes = [`### ${signalement.nom}`, ""];

  if (signalement.manques.length > 0) {
    lignes.push(
      `**Manque — ${signalement.manques.length} phrase(s) qu'aucun concept ne couvre au-dessus de ${PLANCHER_COUVERTURE}.**`,
      "",
      ...rendreLesRapprochesDeManque(signalement.manques, verdict?.manques ?? []),
    );
  }

  if (signalement.inventions.length > 0) {
    lignes.push(
      `**Invention — ${signalement.inventions.length} concept(s) qu'aucune phrase ne soutient au-dessus de ${PLANCHER_SOUTIEN}.**`,
      "",
      ...rendreLesRapprochesDInvention(signalement.inventions, verdict?.inventions ?? []),
    );
  }

  if (signalement.doublons.length > 0) {
    lignes.push(
      `**Doublon — ${signalement.doublons.length} paire(s) au-dessus de ${PLANCHER_DOUBLON}.**`,
      "",
      ...rendreLesPaires(signalement.doublons, verdict?.doublons ?? []),
    );
  }

  return lignes;
}
