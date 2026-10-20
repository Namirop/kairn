"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { adresseDuVisiteur, lireLaVisite, poserLaVisite } from "@/lib/auth/visite";
import { deposerSansCompte } from "@/lib/depots/deposer-sans-compte";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";
import { lireLEssaiEnCours, type AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * L'essai sans session : à la place, les deux verrous de `deposerSansCompte`
 * (cookie de visite, empreinte d'adresse) et une chaîne arrêtée à l'extraction.
 * Un compte connecté est renvoyé au dépôt : rattaché à un cookie, son texte
 * serait effacé par le cron.
 */

/** `inputId` identifie l'essai : un second essai réutilise la même session. */
export type EtatEssai = { erreur?: string; sessionId?: string; inputId?: string };

export async function essayerAction(_precedent: EtatEssai, donnees: FormData): Promise<EtatEssai> {
  if (await lireLUtilisateur()) redirect(`${ROUTES.depots}/nouveau`);

  const texte = (donnees.get("texte") ?? "").toString();
  const resultat = await deposerSansCompte(
    texte,
    await adresseDuVisiteur(),
    await lireLaVisite(),
    await getTranslations("depots.refus"),
    await langueDeLaRequete(),
  );

  if (!resultat.ok) return { erreur: resultat.motif };

  await poserLaVisite(resultat.sessionId);

  return { sessionId: resultat.sessionId, inputId: resultat.inputId };
}

/** L'extraction est asynchrone : l'écran redemande jusqu'à ce que les concepts arrivent. */
export async function avancementDeLEssaiAction(): Promise<AvancementDeLEssai | null> {
  return lireLEssaiEnCours();
}
