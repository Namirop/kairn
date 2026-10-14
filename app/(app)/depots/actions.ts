"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import {
  confirmerConcept,
  desarchiverConcept,
  modifierConcept,
  supprimerConcept,
} from "@/lib/db/concepts";
import { lireAvancementDuDepot } from "@/lib/db/depot-detaille";
import { inscrireEnListeDattente } from "@/lib/db/liste-dattente";
import { supprimerDepot } from "@/lib/db/reprise-depot";
import { CARACTERES_MAXIMUM } from "@/lib/depots/bornes-du-depot";
import { deposer } from "@/lib/depots/deposer";
import { redecouper, type ResultatRedecoupage } from "@/lib/depots/redecouper";
import { declencher } from "@/lib/jobs/queue";
import { etatDuDepot, type EtatDepot as EtatDeLaChaine } from "@/lib/domain/etat-depot";

/**
 * Les gestes de l'ingestion. Chacun vérifie la session puis la propriété :
 * l'identifiant vient de la session, jamais du formulaire, et une ressource
 * d'un autre compte n'est pas trouvée, donc pas touchée.
 */

export type EtatDepot = { erreur?: string; quota?: boolean };

/** Ce que l'écran de détail relit à chaque tour : deux valeurs, pas une page. */
export type EtatDepotSuivi = { etat: EtatDeLaChaine; concepts: number };

async function utilisateurOuRefus(): Promise<string> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  return utilisateur.id;
}

export async function deposerAction(_precedent: EtatDepot, donnees: FormData): Promise<EtatDepot> {
  const userId = await utilisateurOuRefus();
  // Les refus reviennent à l'écran : ils se disent dans la langue de la personne.
  const resultat = await deposer(userId, donnees, await getTranslations("depots.refus"));

  if (!resultat.ok) {
    return { erreur: resultat.motif, quota: resultat.quota };
  }

  revalidatePath(ROUTES.depots);

  // Vers le dépôt et non la liste : c'est le seul écran qui se recharge tout
  // seul quand le découpage aboutit ; la liste resterait figée sur « en cours ».
  redirect(`${ROUTES.depots}/${resultat.inputId}`);
}

/**
 * Lance les questions demandées par un geste, après la réponse. Un job qui ne
 * part pas reste en attente, et le cron le ramasse.
 */
function lancer(jobs: string[]): void {
  for (const jobId of jobs) declencher(jobId);
}

export async function modifierConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const atomId = (donnees.get("atomId") ?? "").toString();
  const texte = (donnees.get("concept") ?? "").toString().trim();

  if (texte.length < 20 || texte.length > CARACTERES_MAXIMUM) return;

  const jobs = await modifierConcept(atomId, userId, texte);

  if (jobs) {
    lancer(jobs);
    revalidatePath(`${ROUTES.depots}/${(donnees.get("inputId") ?? "").toString()}`);
  }
}

export async function confirmerConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const jobs = await confirmerConcept((donnees.get("atomId") ?? "").toString(), userId);

  if (jobs) {
    lancer(jobs);
    revalidatePath(`${ROUTES.depots}/${(donnees.get("inputId") ?? "").toString()}`);
  }
}

/** Remet dans le cycle un concept sorti, depuis la page du dépôt. */
export async function desarchiverConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const atomId = (donnees.get("atomId") ?? "").toString();

  if (await desarchiverConcept(atomId, userId)) {
    revalidatePath(ROUTES.aujourdhui);
    revalidatePath(`${ROUTES.depots}/${(donnees.get("inputId") ?? "").toString()}`);
  }
}

/**
 * Le même geste, défait dans la session juste après l'avoir fait. Rend un
 * booléen : l'appelant est un bouton, qui doit savoir si la bande d'annulation
 * peut disparaître.
 */
export async function annulerMaitriseAction(atomId: string): Promise<boolean> {
  const userId = await utilisateurOuRefus();

  // Aucune revalidation, volontairement : elle rafraîchirait la session, le
  // serveur recomposerait une autre liste de questions et l'écran changerait de
  // question sous les doigts. Le tableau de bord est rendu à la demande.
  return desarchiverConcept(atomId, userId);
}

export async function supprimerConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();

  if (await supprimerConcept((donnees.get("atomId") ?? "").toString(), userId)) {
    revalidatePath(`${ROUTES.depots}/${(donnees.get("inputId") ?? "").toString()}`);
  }
}

/** Efface le dépôt et tout ce qui en découle, puis renvoie à la liste. */
export async function supprimerDepotAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const inputId = (donnees.get("inputId") ?? "").toString();

  if (await supprimerDepot(inputId, userId)) {
    revalidatePath(ROUTES.depots);
    revalidatePath(ROUTES.aujourdhui);
  }

  redirect(ROUTES.depots);
}

/** Relance une extraction sur le texte d'un dépôt vidé ou en échec. */
export async function redecouperAction(inputId: string): Promise<ResultatRedecoupage> {
  const userId = await utilisateurOuRefus();
  const resultat = await redecouper(userId, inputId, await getTranslations("depots.refus"));

  if (resultat.ok) revalidatePath(`${ROUTES.depots}/${inputId}`);

  return resultat;
}

export async function rejoindreListeDattenteAction(): Promise<void> {
  await inscrireEnListeDattente(await utilisateurOuRefus());
  revalidatePath(`${ROUTES.depots}/nouveau`);
}

/**
 * Où en est le découpage d'un dépôt, pour l'écran qui l'attend : l'état et le
 * nombre de concepts, et l'écran décide de se recharger quand l'un bouge.
 * `null` ne distingue pas un dépôt inexistant d'un dépôt d'un autre compte.
 */
export async function avancementDuDepotAction(inputId: string): Promise<EtatDepotSuivi | null> {
  const userId = await utilisateurOuRefus();
  const avancement = await lireAvancementDuDepot(inputId, userId);

  if (!avancement) return null;

  return { etat: etatDuDepot(avancement), concepts: avancement.concepts };
}
