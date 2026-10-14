import { appelerViaOpenRouter } from "./client";
import type { ModeleOpenRouter } from "./modeles";
import {
  CONTRAT_RESIDU,
  decrireInvention,
  decrireManque,
  MOTIF_ABSTENTION_JUGE,
  SYSTEM_RESIDU,
  type SortieResidu,
  type VerdictInvention,
  type VerdictManque,
} from "../juges/residu";
import { TOKENS_DES_JUGES } from "../juges/modele";
import type { Rapproche } from "../mesures/signaux";
import { facturer, type Facture } from "./facture";

/**
 * Le juge du résidu servi via OpenRouter, pendant de `jugerLeResidu` pour la
 * campagne. Prompt, schéma et mise en scène viennent de `juges/residu.ts` :
 * un seul endroit décide de la consigne, quel que soit le fournisseur.
 *
 * Un dépôt sans manque ni invention ne fait pas d'appel.
 */

export async function jugerLeResiduVia(
  modele: ModeleOpenRouter,
  nom: string,
  texte: string,
  manques: Rapproche[],
  inventions: Rapproche[],
  maxTokens: number = TOKENS_DES_JUGES,
  reasoning?: { effort: "low" | "medium" | "high" } | false,
): Promise<{ sortie: SortieResidu; facture: Facture | null }> {
  if (manques.length === 0 && inventions.length === 0) {
    return { sortie: { manques: [], inventions: [] }, facture: null };
  }

  const sections = [
    `Dépôt : ${nom}`,
    "",
    "## Texte du dépôt",
    "",
    texte,
    "",
    `## ${manques.length} phrase(s) signalée(s) au manque — attendus : verdicts #1 à #${manques.length}`,
    "",
    manques.length === 0 ? "(aucune)" : manques.map(decrireManque).join("\n\n"),
    "",
    `## ${inventions.length} concept(s) signalé(s) à l'invention — attendus : verdicts #1 à #${inventions.length}`,
    "",
    inventions.length === 0 ? "(aucun)" : inventions.map(decrireInvention).join("\n\n"),
  ];

  const { valeur, consommation } = await appelerViaOpenRouter({
    contract: CONTRAT_RESIDU,
    system: SYSTEM_RESIDU,
    messages: [{ role: "user", content: sections.join("\n") }],
    model: modele.id,
    maxTokens,
    reasoning,
  });

  const parNumeroManque = new Map(valeur.manques.map((v) => [v.numero, v]));
  const parNumeroInvention = new Map(valeur.inventions.map((v) => [v.numero, v]));

  return {
    sortie: {
      manques: manques.map((_, rang): VerdictManque => {
        const v = parNumeroManque.get(rang + 1);
        return v
          ? { retenir: v.retenir, motif: v.motif.trim() }
          : { retenir: null, motif: MOTIF_ABSTENTION_JUGE };
      }),
      inventions: inventions.map((_, rang): VerdictInvention => {
        const v = parNumeroInvention.get(rang + 1);
        return v
          ? { soutenu: v.soutenu, motif: v.motif.trim() }
          : { soutenu: null, motif: MOTIF_ABSTENTION_JUGE };
      }),
    },
    facture: facturer(modele, consommation),
  };
}
