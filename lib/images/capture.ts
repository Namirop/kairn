import sharp from "sharp";
import { BORD_LONG_CAPTURE, TAILLE_MAXIMALE_OCTETS } from "@/lib/depots/bornes-du-depot";

/**
 * Ce qu'on accepte d'une capture, et ce qu'on en fait avant de l'envoyer.
 *
 * Le type se décide par le décodeur, jamais par l'extension ni le type annoncé,
 * qui se falsifient.
 *
 * La réduction double celle du navigateur (`reduireLaCapture`) : ce qui arrive
 * ici n'a pas forcément vu de navigateur (partage du système, outil interne).
 */

const FORMATS_LISIBLES = new Set(["jpeg", "png", "webp", "gif"]);

export type CaptureLue = { donnees: Uint8Array<ArrayBuffer>; mediaType: "image/webp" };

/**
 * Pourquoi une capture est refusée. Un code et non une phrase : l'appelant la
 * dit dans la langue de la personne (`depots.refus.imageTropLourde`,
 * `imageIllisible`).
 */
export type RefusDeCapture = "lourde" | "illisible";

export type LectureCapture =
  { ok: true; capture: CaptureLue } | { ok: false; refus: RefusDeCapture };

export async function preparerCapture(fichier: File): Promise<LectureCapture> {
  if (fichier.size > TAILLE_MAXIMALE_OCTETS) {
    return { ok: false, refus: "lourde" };
  }

  const octets = Buffer.from(await fichier.arrayBuffer());
  const image = sharp(octets, { animated: false });
  const format = await image
    .metadata()
    .then((donnees) => donnees.format)
    .catch(() => undefined);

  if (!format || !FORMATS_LISIBLES.has(format)) {
    return { ok: false, refus: "illisible" };
  }

  const reduite = await image
    .rotate()
    .resize({
      width: BORD_LONG_CAPTURE,
      height: BORD_LONG_CAPTURE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  return { ok: true, capture: { donnees: new Uint8Array(reduite), mediaType: "image/webp" } };
}
