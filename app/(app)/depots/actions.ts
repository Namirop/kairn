"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
 * Les gestes de l'ingestion.
 *
 * Chacun vérifie la session puis la propriété de la ressource : l'identifiant
 * de l'utilisateur vient de la session, jamais du formulaire. Une ressource qui
 * n'est pas à lui n'est pas trouvée, donc pas touchée.
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
  const resultat = await deposer(userId, donnees);

  if (!resultat.ok) {
    return { erreur: resultat.motif, quota: resultat.quota };
  }

  revalidatePath(ROUTES.depots);
  redirect(ROUTES.depots);
}

/**
 * Lance les questions demandées par un geste, derrière la réponse.
 *
 * En appel direct, comme un dépôt depuis la phase 3.5 : corriger un concept est
 * un geste où l'on attend un résultat, et le chemin groupé rendait le lendemain
 * pour une remise de moitié qu'un lot d'une seule requête ne vaut pas. Un job
 * qui ne part pas reste en attente, et le cron le ramassera.
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

/**
 * Remet dans le cycle un concept que l'utilisateur en avait sorti.
 *
 * Depuis la page du dépôt, où le concept est déjà listé : c'est là qu'on va le
 * chercher quand on s'aperçoit du geste plus tard.
 */
export async function desarchiverConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const atomId = (donnees.get("atomId") ?? "").toString();

  if (await desarchiverConcept(atomId, userId)) {
    revalidatePath(ROUTES.aujourdhui);
    revalidatePath(`${ROUTES.depots}/${(donnees.get("inputId") ?? "").toString()}`);
  }
}

/**
 * Le même geste, défait dans la session, juste après l'avoir fait.
 *
 * Le mauvais clic le plus probable est celui qu'on vient de faire. Rend un
 * booléen parce que l'appelant est un bouton et non un formulaire : il a besoin
 * de savoir si la bande d'annulation peut disparaître.
 */
export async function annulerMaitriseAction(atomId: string): Promise<boolean> {
  const userId = await utilisateurOuRefus();

  // Aucune revalidation ici, volontairement. Elle rafraîchirait la route
  // courante, donc la session : le serveur recomposerait une autre liste de
  // questions, et l'écran changerait de question sous les doigts en plein
  // parcours. Le tableau de bord est rendu à la demande, il sera juste à la
  // prochaine visite.
  return desarchiverConcept(atomId, userId);
}

export async function supprimerConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();

  if (await supprimerConcept((donnees.get("atomId") ?? "").toString(), userId)) {
    revalidatePath(`${ROUTES.depots}/${(donnees.get("inputId") ?? "").toString()}`);
  }
}

/**
 * Efface le dépôt et tout ce qui en découle, puis renvoie à la liste.
 *
 * Distinct de « supprimer ce concept » : l'un corrige un découpage, l'autre dit
 * qu'on ne veut plus de ce texte du tout. Confondre les deux gestes obligerait à
 * vider un dépôt concept par concept pour s'en débarrasser.
 */
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
  const resultat = await redecouper(userId, inputId);

  if (resultat.ok) revalidatePath(`${ROUTES.depots}/${inputId}`);

  return resultat;
}

export async function rejoindreListeDattenteAction(): Promise<void> {
  await inscrireEnListeDattente(await utilisateurOuRefus());
  revalidatePath(`${ROUTES.depots}/nouveau`);
}

/**
 * Où en est le découpage d'un dépôt, pour l'écran qui l'attend.
 *
 * Ne rend pas la page : rend l'état, les travaux ouverts et le nombre de
 * concepts. C'est l'écran qui décide de se recharger quand l'un des trois
 * bouge. La propriété est vérifiée comme partout ailleurs — un dépôt qui n'est
 * pas à lui n'est pas trouvé, et l'appelant reçoit `null` sans savoir s'il
 * s'agit d'un dépôt inexistant ou d'un dépôt qui appartient à un autre.
 */
export async function avancementDuDepotAction(inputId: string): Promise<EtatDepotSuivi | null> {
  const userId = await utilisateurOuRefus();
  const avancement = await lireAvancementDuDepot(inputId, userId);

  if (!avancement) return null;

  return { etat: etatDuDepot(avancement), concepts: avancement.concepts };
}
