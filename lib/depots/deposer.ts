import { z } from "zod";
import { creerDepot, marquerEnCours } from "@/lib/db/ingestion";
import { reserverDepot, rendreDepot } from "@/lib/db/quota-depots";
import {
  CARACTERES_MAXIMUM,
  CONSIGNE_MAXIMUM,
  longueurEnClairAvec,
  TAILLE_MAXIMALE_OCTETS,
  type TraduireLesRefus,
} from "@/lib/depots/bornes-du-depot";
import { refusDeQuota } from "@/lib/depots/refus-de-quota";
import { textesDesRefus } from "@/lib/depots/textes-des-refus";
import { lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";
import { preparerCapture } from "@/lib/images/capture";
import { mettreEnFile } from "@/lib/jobs/queue";

/**
 * Le geste de dépôt, côté serveur : validation, place du jour, image réduite,
 * dépôt écrit, travail mis en file. Aucun appel modèle ici, l'utilisateur ne
 * l'attend jamais dans sa requête.
 *
 * Une place prise pour un dépôt qui n'aboutit pas est rendue : le compteur suit
 * ce qui a été déposé, pas ce qui a été tenté. Les refus sont dans la langue de
 * `t` (français par défaut, pour les scripts).
 */

function schemaDuDepot(t: TraduireLesRefus) {
  const cleIllisible = t("cleIllisible");

  return z.object({
    texte: z.string().max(CARACTERES_MAXIMUM, {
      error: t("depotTropLong", { longueur: longueurEnClairAvec(t, CARACTERES_MAXIMUM) }),
    }),
    // Champ technique rempli par le formulaire. Le message est explicite pour ne
    // pas afficher la phrase brute de Zod, en anglais, sous le bouton.
    cleEnvoi: z.string().min(8, { error: cleIllisible }).max(64, { error: cleIllisible }),
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
    return {
      ok: false,
      motif: capture.refus === "lourde" ? t("imageTropLourde") : t("imageIllisible"),
    };
  }

  const { input, nouveau } = await creerDepot({
    userId,
    texte,
    // Une consigne faite d'espaces vaut absente.
    consigne: valide.data.consigne.trim() || undefined,
    image: capture?.ok ? capture.capture : undefined,
    cleEnvoi: valide.data.cleEnvoi,
  });

  if (!nouveau) {
    // Le même envoi reçu deux fois : la place prise à tort est rendue.
    await rendreDepot(userId, fuseau);
    return { ok: true, inputId: input.id, nouveau: false };
  }

  await marquerEnCours(input.id);
  await mettreEnFile(input.id, capture ? "OCR" : "ATOMS");

  return { ok: true, inputId: input.id, nouveau: true };
}
