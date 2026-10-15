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

/**
 * Le plafond de pixels d'une image décodée. Quatre mégaoctets de PNG peuvent
 * annoncer 16 384 × 16 384 pixels, soit un gigaoctet une fois décodés. Une
 * capture de téléphone en fait moins de 4 millions, et le navigateur réduit
 * avant l'envoi : 50 millions laisse passer toute photo qui tient sous 4 Mo.
 */
const PIXELS_MAXIMUM = 50_000_000;

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
  // Les métadonnées se lisent dans l'en-tête, sans décoder l'image. Sans la
  // limite de pixels ici : sharp la ferait échouer, et une image trop grande
  // serait dite illisible.
  const entete = await sharp(octets)
    .metadata()
    .catch(() => undefined);

  if (!entete?.format || !FORMATS_LISIBLES.has(entete.format)) {
    return { ok: false, refus: "illisible" };
  }

  if ((entete.width ?? 0) * (entete.height ?? 0) > PIXELS_MAXIMUM) {
    return { ok: false, refus: "lourde" };
  }

  const reduite = await sharp(octets, { animated: false, limitInputPixels: PIXELS_MAXIMUM })
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
