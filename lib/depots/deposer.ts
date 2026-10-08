import { z } from "zod";
import { creerDepot, marquerEnCours } from "@/lib/db/ingestion";
import { reserverDepot, rendreDepot } from "@/lib/db/quota-depots";
import {
  CARACTERES_MAXIMUM,
  CONSIGNE_MAXIMUM,
  IMAGE_TROP_LOURDE,
  longueurEnClairAvec,
  TAILLE_MAXIMALE_OCTETS,
  type TraduireLesRefus,
} from "@/lib/depots/bornes-du-depot";
import { refusDeQuota } from "@/lib/depots/refus-de-quota";
import { textesDesRefus } from "@/lib/depots/textes-des-refus";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { preparerCapture } from "@/lib/images/capture";
import { enqueueJob } from "@/lib/jobs/queue";

/**
 * Le geste de dépôt, côté serveur.
 *
 * Dans l'ordre : validation, place du jour, image lue et réduite, dépôt écrit,
 * travail mis en file. Aucun appel modèle n'a lieu ici — l'utilisateur ne doit
 * jamais attendre le modèle dans sa requête.
 *
 * Une place prise sur un dépôt qui n'aboutit pas est rendue : le compteur suit
 * ce qui a été déposé, pas ce qui a été tenté.
 *
 * Les refus se disent dans la langue que porte `t` — celle de la requête pour
 * l'action, le français par défaut pour les scripts. Le schéma se construit donc
 * à l'appel : ses messages en dépendent.
 */

function schemaDuDepot(t: TraduireLesRefus) {
  const cleIllisible = t("cleIllisible");

  return z.object({
    texte: z.string().max(CARACTERES_MAXIMUM, {
      error: t("depotTropLong", { longueur: longueurEnClairAvec(t, CARACTERES_MAXIMUM) }),
    }),
    // L'utilisateur ne remplit jamais ce champ : s'il ne tient pas, c'est le
    // formulaire qui est en défaut, pas ce qu'on a écrit dedans. Le message reste
    // écrit ici pour les deux bornes — sans lui, c'est la phrase brute de Zod, en
    // anglais, qui s'affiche sous le bouton.
    cleEnvoi: z.string().min(8, { error: cleIllisible }).max(64, { error: cleIllisible }),
    // Facultative, et bornée court : c'est une phrase de cadrage, pas un second
    // dépôt. Le message est écrit ici parce qu'il est le même que celui du champ.
    consigne: z.string().max(CONSIGNE_MAXIMUM, {
      error: (issue) =>
        t("consigneTropLongue", {
          caracteres: String(issue.input).length,
          maximum: CONSIGNE_MAXIMUM,
        }),
    }),
  });
}

export type ResultatDepot =
  { ok: true; inputId: string; nouveau: boolean } | { ok: false; motif: string; quota?: boolean };

export type ChampsDepot = {
  texte: string;
  cleEnvoi: string;
  consigne: string;
  image: File | null;
};

function lireChamps(donnees: FormData): ChampsDepot {
  const fichier = donnees.get("image");

  return {
    texte: (donnees.get("texte") ?? "").toString(),
    cleEnvoi: (donnees.get("cleEnvoi") ?? "").toString(),
    consigne: (donnees.get("consigne") ?? "").toString(),
    image: fichier instanceof File && fichier.size > 0 ? fichier : null,
  };
}

export async function deposer(
  userId: string,
  donnees: FormData,
  t: TraduireLesRefus = textesDesRefus(),
): Promise<ResultatDepot> {
  const champs = lireChamps(donnees);
  const valide = schemaDuDepot(t).safeParse({
    texte: champs.texte,
    cleEnvoi: champs.cleEnvoi,
    consigne: champs.consigne,
  });

  if (!valide.success) {
    return { ok: false, motif: valide.error.issues[0]?.message ?? t("nonRecevable") };
  }

  const texte = valide.data.texte.trim();

  if (texte.length === 0 && !champs.image) {
    return { ok: false, motif: t("rienADeposer") };
  }

  if (champs.image && champs.image.size > TAILLE_MAXIMALE_OCTETS) {
    return { ok: false, motif: t("imageTropLourde") };
  }

  const fuseau = await lireFuseauUtilisateur(userId);
  const place = await reserverDepot(userId, fuseau);

  if (!place.accorde) {
    return { ok: false, ...refusDeQuota(place.motif, place.plafond, t) };
  }

  const capture = champs.image ? await preparerCapture(champs.image) : null;

  if (capture && !capture.ok) {
    await rendreDepot(userId, fuseau);
    // Le lecteur d'images n'est pas de cette zone et dit ses refus en français :
    // ils sont redits ici dans la langue de la personne. Le poids est déjà
    // refusé plus haut, il ne reste en pratique que l'image illisible.
    return {
      ok: false,
      motif: capture.motif === IMAGE_TROP_LOURDE ? t("imageTropLourde") : t("imageIllisible"),
    };
  }

  const { input, nouveau } = await creerDepot({
    userId,
    texte,
    // Vide vaut absente : une consigne faite d'espaces ne cadre rien, et la
    // ranger obligerait le découpage à se demander ce qu'elle veut dire.
    consigne: valide.data.consigne.trim() || undefined,
    image: capture?.ok ? capture.capture : undefined,
    cleEnvoi: valide.data.cleEnvoi,
  });

  if (!nouveau) {
    // Le même geste, envoyé deux fois. La place prise à tort est rendue.
    await rendreDepot(userId, fuseau);
    return { ok: true, inputId: input.id, nouveau: false };
  }

  await marquerEnCours(input.id);
  await enqueueJob(input.id, capture ? "OCR" : "ATOMS");

  return { ok: true, inputId: input.id, nouveau: true };
}
