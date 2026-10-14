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
 * Le geste d'essai, depuis la landing, sans session. Ce qui la remplace : les
 * deux verrous de `deposerSansCompte` — un dépôt par cookie de visite, une
 * poignée par empreinte d'adresse — et une chaîne qui s'arrête à l'extraction.
 *
 * Un compte connecté est renvoyé vers le dépôt, même si l'écran ne lui propose
 * pas ce champ : son texte serait rattaché à un cookie, et effacé après
 * `JOURS_AVANT_OUBLI` par le cron.
 */

/**
 * `inputId` identifie un essai, pas `sessionId` : un second essai réutilise la
 * même visite, donc la même session.
 */
export type EtatEssai = { erreur?: string; sessionId?: string; inputId?: string };

export async function essayerAction(_precedent: EtatEssai, donnees: FormData): Promise<EtatEssai> {
  if (await lireLUtilisateur()) redirect(`${ROUTES.depots}/nouveau`);

  const texte = (donnees.get("texte") ?? "").toString();
  // Les refus se disent dans la langue de la requête, celle de l'écran qui les montre.
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

/**
 * Où en est l'essai. L'extraction est asynchrone, donc l'écran redemande
 * jusqu'à ce que les concepts soient là.
 */
export async function avancementDeLEssaiAction(): Promise<AvancementDeLEssai | null> {
  return lireLEssaiEnCours();
}
