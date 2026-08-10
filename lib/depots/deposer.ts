import { z } from "zod";
import { creerDepot, marquerEnCours } from "@/lib/db/ingestion";
import { reserverDepot, rendreDepot } from "@/lib/db/quota-depots";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { preparerCapture, TAILLE_MAXIMALE_OCTETS } from "@/lib/images/capture";
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
 */

export const SIGNES_MAXIMUM = 8000;

const depotSchema = z.object({
  texte: z.string().max(SIGNES_MAXIMUM, {
    error: `Ce dépôt dépasse ${SIGNES_MAXIMUM} signes. Coupe-le en deux : deux dépôts valent mieux qu'un tronqué.`,
  }),
  cleEnvoi: z.string().min(8).max(64),
});

export type ResultatDepot =
  { ok: true; inputId: string; nouveau: boolean } | { ok: false; motif: string; quota?: boolean };

export type ChampsDepot = { texte: string; cleEnvoi: string; image: File | null };

function lireChamps(donnees: FormData): ChampsDepot {
  const fichier = donnees.get("image");

  return {
    texte: (donnees.get("texte") ?? "").toString(),
    cleEnvoi: (donnees.get("cleEnvoi") ?? "").toString(),
    image: fichier instanceof File && fichier.size > 0 ? fichier : null,
  };
}

export async function deposer(userId: string, donnees: FormData): Promise<ResultatDepot> {
  const champs = lireChamps(donnees);
  const valide = depotSchema.safeParse({ texte: champs.texte, cleEnvoi: champs.cleEnvoi });

  if (!valide.success) {
    return { ok: false, motif: valide.error.issues[0]?.message ?? "Ce dépôt n'est pas recevable." };
  }

  const texte = valide.data.texte.trim();

  if (texte.length === 0 && !champs.image) {
    return { ok: false, motif: "Il n'y a rien à déposer : colle un texte, ou joins une capture." };
  }

  if (champs.image && champs.image.size > TAILLE_MAXIMALE_OCTETS) {
    return { ok: false, motif: "Cette image dépasse 5 Mo." };
  }

  const fuseau = await lireFuseauUtilisateur(userId);
  const place = await reserverDepot(userId, fuseau);

  if (!place.accorde) {
    return {
      ok: false,
      quota: place.motif === "quota",
      motif:
        place.motif === "quota"
          ? "Tu as déposé tout ce que la journée permet."
          : "Trop de dépôts coup sur coup. Laisse passer une minute.",
    };
  }

  const capture = champs.image ? await preparerCapture(champs.image) : null;

  if (capture && !capture.ok) {
    await rendreDepot(userId, fuseau);
    return { ok: false, motif: capture.motif };
  }

  const { input, nouveau } = await creerDepot({
    userId,
    texte,
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
