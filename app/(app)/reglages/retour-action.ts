"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { ecrireUnRetour } from "@/lib/db/retour";
import { signalerUnRetour } from "@/lib/email/signalement-de-retour";
import { LIBELLE_DE_SUJET } from "@/lib/retours/libelle-du-sujet";
import { SujetDeRetour } from "@/lib/db/types";
import { IMAGE_TROP_LOURDE, TAILLE_MAXIMALE_OCTETS } from "@/lib/depots/bornes-du-depot";
import { preparerCapture } from "@/lib/images/capture";
import {
  lireLEcran,
  lireLeMessage,
  MESSAGE_MAX,
  MESSAGE_MIN,
  resumerLeContexte,
  RETOURS_PAR_JOUR,
} from "@/lib/domain/retour-sur-le-produit";
import { redirect } from "next/navigation";

/**
 * L'envoi d'un retour sur le produit.
 *
 * Dans son fichier plutôt que dans `actions.ts` : celui-là porte les gestes des
 * réglages — ce qu'on change de son compte — et celui-ci écrit dans une autre
 * table pour une autre raison. Les mélanger ferait grossir un fichier de gestes
 * irréversibles avec un formulaire qui n'en est pas un.
 *
 * Rien ne vient du client sauf ce que la personne a écrit : l'identifiant du
 * compte est lu dans la session, et le contexte est recomposé ici à partir de
 * deux nombres et d'une chaîne de navigateur — pas d'adresse, pas de contenu
 * déposé, pas d'identifiant.
 */

const CHAMPS = z.object({
  sujet: z.enum(SujetDeRetour),
  message: z.string(),
  ecran: z.string(),
  largeur: z.coerce.number().catch(0),
  hauteur: z.coerce.number().catch(0),
  agent: z.string().catch(""),
});

export type EtatDuRetour = {
  /** L'envoi a abouti : le formulaire se remplace par un mot, il ne se vide pas. */
  envoye?: boolean;
  erreur?: string;
  /** La saisie refusée, rendue telle quelle : on la corrige, on ne la retape pas. */
  message?: string;
};

export async function envoyerUnRetourAction(
  _precedent: EtatDuRetour,
  donnees: FormData,
): Promise<EtatDuRetour> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const t = await getTranslations("compte.retour.erreurs");
  const champs = CHAMPS.safeParse({
    sujet: donnees.get("sujet"),
    message: (donnees.get("message") ?? "").toString(),
    ecran: (donnees.get("ecran") ?? "").toString(),
    largeur: donnees.get("largeur"),
    hauteur: donnees.get("hauteur"),
    agent: donnees.get("agent"),
  });

  if (!champs.success) {
    return { erreur: t("sujet") };
  }

  const message = lireLeMessage(champs.data.message);

  if (message === null) {
    return {
      erreur: t("longueur", { min: MESSAGE_MIN, max: MESSAGE_MAX }),
      message: champs.data.message,
    };
  }

  // La capture est facultative, et son refus n'emporte pas le retour : quelqu'un
  // qui a écrit trois phrases ne doit pas les perdre parce que son image est
  // trop lourde. On le lui dit, et on lui rend son texte.
  const fichier = donnees.get("capture");
  const jointe = fichier instanceof File && fichier.size > 0 ? fichier : null;

  if (jointe && jointe.size > TAILLE_MAXIMALE_OCTETS) {
    return {
      erreur: t("image"),
      message: champs.data.message,
    };
  }

  const capture = jointe ? await preparerCapture(jointe) : null;

  if (capture && !capture.ok) {
    // Le motif de `preparerCapture` est français ; on le redit dans la langue
    // de l'écran, avec les mots du dépôt, qui refuse les mêmes images.
    const refus = await getTranslations("depots.refus");
    const motif =
      capture.motif === IMAGE_TROP_LOURDE ? refus("imageTropLourde") : refus("imageIllisible");

    return { erreur: motif, message: champs.data.message };
  }

  const ecrit = await ecrireUnRetour({
    userId: utilisateur.id,
    sujet: champs.data.sujet,
    message,
    ecran: lireLEcran(champs.data.ecran),
    contexte: resumerLeContexte(champs.data.largeur, champs.data.hauteur, champs.data.agent),
    capture: capture?.ok ? capture.capture : null,
  });

  if (!ecrit.ok) {
    return {
      erreur: t("plafond", { nombre: RETOURS_PAR_JOUR }),
      message: champs.data.message,
    };
  }

  // Après la réponse, jamais avant : quelqu'un qui vient d'écrire trois phrases
  // n'a pas à attendre un aller-retour vers Resend, et un email qui échoue ne
  // doit pas transformer un retour écrit en erreur à l'écran.
  signalerUnRetour({
    sujet: LIBELLE_DE_SUJET[champs.data.sujet],
    ecran: lireLEcran(champs.data.ecran),
    message,
    contexte: resumerLeContexte(champs.data.largeur, champs.data.hauteur, champs.data.agent),
    avecCapture: capture?.ok === true,
  });

  return { envoye: true };
}
