import type { DepotFige, VariantFige } from "../fige";
import type { VerdictFidelite } from "../juges/fidelite";
import type { VerdictsDuDepot } from "../juges/verdicts";
import { PLANCHER_COUVERTURE, PLANCHER_DOUBLON, PLANCHER_SOUTIEN } from "./seuils";
import type { Paire, Rapproche } from "./signaux";
import type { SignalementsDuDepot } from "./signalements";

/**
 * Le détail par dépôt de la section « Mesures » ; `rapport-de-mesures.ts`
 * agrège le corpus.
 *
 * Chaque signalement porte ses deux textes en entier, jamais une référence à
 * une ligne, avec le verdict du juge juste en dessous.
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

function verdictDInvention(
  verdict: { soutenu: boolean | null; motif: string } | undefined,
): string {
  if (!verdict) return "";
  if (verdict.soutenu === null) return `  → *abstention* — ${verdict.motif}`;
  const decision = verdict.soutenu ? "soutenu" : "**invention**";
  return `  → ${decision} — ${verdict.motif}`;
}

function verdictDeDoublon(
  verdict:
    | {
        independants: boolean | null;
        sens: string | null;
        questionSurA: string | null;
        questionSurB: string | null;
      }
    | undefined,
): string {
  if (!verdict) return "";
  if (verdict.independants === null) return `  → *abstention* — non rendu par le juge`;
  const questions: string[] = [];
  if (verdict.questionSurB) questions.push(`sur B — ${verdict.questionSurB}`);
  if (verdict.questionSurA) questions.push(`sur A — ${verdict.questionSurA}`);
  const suite = questions.length > 0 ? questions.join(" · ") : "aucune question restante";
  if (verdict.independants) return `  → indépendants — ${suite}`;
  return `  → **non indépendants** (${verdict.sens ?? "?"}) — ${suite}`;
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
  verdicts: {
    independants: boolean | null;
    sens: string | null;
    questionSurA: string | null;
    questionSurB: string | null;
  }[],
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

function verdictDeFidelite(verdict: VerdictFidelite): string {
  if (verdict.juste === null) return `  → *abstention* — ${verdict.motif}`;
  if (verdict.juste) return `  → soutenu — ${verdict.motif}`;
  return `  → **non soutenu** — ${verdict.motif}`;
}

function rendreLaQuestion(variant: VariantFige, verdict: VerdictFidelite | undefined): string[] {
  const lignes = [
    `- **${variant.format}** — ${extrait(variant.question)}`,
    `  R. ${extrait(variant.answerKey)}`,
  ];
  if (variant.options && variant.options.length > 0) {
    lignes.push(`  Options : ${variant.options.map((o) => `« ${extrait(o)} »`).join(" · ")}`);
  }
  if (verdict) lignes.push(verdictDeFidelite(verdict));
  lignes.push("");
  return lignes;
}

/**
 * Le bloc « Fidélité » d'un dépôt. Seuls les concepts qui portent une question
 * non soutenue ou une abstention sont détaillés : lister les bonnes noierait
 * les quelques cas à regarder.
 */
function rendreLaFidelite(
  fidelite: VerdictsDuDepot["fidelite"],
  concepts: readonly { concept: string; variants?: readonly VariantFige[] }[] | undefined,
): string[] {
  if (fidelite.length === 0) return [];

  const parConcept = new Map(concepts?.map((c) => [c.concept, c.variants ?? []]) ?? []);
  const total = fidelite.reduce((cumul, c) => cumul + c.questions.length, 0);
  const infideles = fidelite.reduce(
    (cumul, c) => cumul + c.questions.filter((v) => v.juste === false).length,
    0,
  );
  const abstenus = fidelite.reduce(
    (cumul, c) => cumul + c.questions.filter((v) => v.juste === null).length,
    0,
  );

  if (total === 0) return [];

  const details = [
    `**Fidélité — ${infideles} question(s) non soutenue(s)${abstenus > 0 ? `, ${abstenus} abstention(s)` : ""} sur ${total} jugée(s).**`,
    "",
  ];

  for (const entree of fidelite) {
    const aRegarder = entree.questions.filter((v) => v.juste !== true);
    if (aRegarder.length === 0) continue;

    details.push(`- concept : ${extrait(entree.concept)}`, "");
    const variants = parConcept.get(entree.concept) ?? [];
    entree.questions.forEach((verdict, rang) => {
      if (verdict.juste === true) return;
      const variant = variants[rang];
      if (!variant) {
        details.push(
          `  - question #${rang + 1} : ${verdictDeFidelite(verdict).trim().replace(/^→\s*/, "")}`,
          "",
        );
        return;
      }
      details.push(...rendreLaQuestion(variant, verdict).map((l) => (l ? `  ${l}` : l)));
    });
  }

  return details;
}

export function rendreLeDepot(
  signalement: SignalementsDuDepot,
  verdict: VerdictsDuDepot | undefined,
  depot: DepotFige | undefined,
): string[] {
  const totalGeometrique =
    signalement.manques.length + signalement.inventions.length + signalement.doublons.length;
  const infideles = verdict
    ? verdict.fidelite.reduce(
        (cumul, c) => cumul + c.questions.filter((v) => v.juste !== true).length,
        0,
      )
    : 0;

  if (totalGeometrique === 0 && infideles === 0) return [];

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

  if (verdict && infideles > 0) {
    lignes.push(...rendreLaFidelite(verdict.fidelite, depot?.concepts));
  }

  return lignes;
}
