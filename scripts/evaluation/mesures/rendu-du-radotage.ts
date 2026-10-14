import type { MesuresDuDepot, PaireDeQuestions } from "./signaux";

/**
 * Les cinquante paires les plus proches, en deux axes séparés : intra-concept
 * (les questions d'un même Atom) et inter-concepts n'ont pas la même queue
 * supérieure (d9 à 0,805 contre 0,633 au figé de référence), donc pas le même
 * plancher.
 *
 * Coût zéro : les vecteurs sont déjà au cache.
 */

const A_LISTER = 50;

type PaireAvecDepot = PaireDeQuestions & { depot: string };

function extrait(texte: string, plafond = 200): string {
  const plat = texte.replace(/\s+/g, " ").trim();
  return plat.length > plafond ? `${plat.slice(0, plafond)}…` : plat;
}

function ligneDePaire(paire: PaireAvecDepot): string[] {
  return [
    `- **${paire.proximite.toFixed(3)}** · \`${paire.depot}\``,
    `  - [${paire.contexteUn.format} · ${paire.contexteUn.facet}] ${extrait(paire.un)}`,
    `  - [${paire.contexteDeux.format} · ${paire.contexteDeux.facet}] ${extrait(paire.deux)}`,
    `  ↳ concepts : « ${extrait(paire.contexteUn.concept, 120)} »${paire.contexteUn.concept === paire.contexteDeux.concept ? " (même concept)" : ` ↔ « ${extrait(paire.contexteDeux.concept, 120)} »`}`,
    "",
  ];
}

function agreger(mesures: MesuresDuDepot[], axe: "intraLot" | "interConcepts"): PaireAvecDepot[] {
  const toutes: PaireAvecDepot[] = [];
  for (const mesure of mesures) {
    if (mesure.radotage === null) continue;
    for (const paire of mesure.radotage[axe]) {
      toutes.push({ ...paire, depot: mesure.nom });
    }
  }
  toutes.sort((un, deux) => deux.proximite - un.proximite);
  return toutes.slice(0, A_LISTER);
}

export function rendreLesListesDuRadotage(mesures: MesuresDuDepot[]): string[] {
  const avecRadotage = mesures.filter((m) => m.radotage !== null);
  if (avecRadotage.length === 0) return [];

  const intra = agreger(mesures, "intraLot");
  const inter = agreger(mesures, "interConcepts");
  if (intra.length === 0 && inter.length === 0) return [];

  return [
    "## Listes du radotage — les 50 plus proches",
    "",
    "Deux distributions distinctes, deux planchers à poser. **Intra-concept** : les questions écrites pour un même Atom, qui tournent exprès — un plancher haut n'y signalera qu'un vrai clone. **Inter-concepts** : les questions qui se rapprochent d'un concept à l'autre, plus tolérant, un plancher plus bas.",
    "",
    "Coût zéro : vecteurs au cache, seules les listes changent.",
    "",
    `### Même concept — ${intra.length} paire(s), triées par proximité décroissante`,
    "",
    ...(intra.length === 0 ? ["_Aucune paire à lister._", ""] : intra.flatMap(ligneDePaire)),
    `### Concepts différents — ${inter.length} paire(s), triées par proximité décroissante`,
    "",
    ...(inter.length === 0 ? ["_Aucune paire à lister._", ""] : inter.flatMap(ligneDePaire)),
  ];
}
