import sharp from "sharp";
import {
  BORD_LONG_CAPTURE,
  IMAGE_TROP_LOURDE,
  TAILLE_MAXIMALE_OCTETS,
} from "@/lib/depots/bornes-du-depot";

/**
 * Ce qu'on accepte d'une capture, et ce qu'on en fait avant de l'envoyer.
 *
 * Le type est décidé par le contenu, jamais par l'extension ni par ce que le
 * navigateur annonce : ces deux-là se falsifient. Ce qui décide, c'est la
 * capacité du décodeur à lire l'image.
 *
 * L'image est ensuite réduite : au-delà de la largeur utile au modèle, chaque
 * pixel coûte des tokens sans rien apporter à la lecture. Le navigateur l'a en
 * principe déjà fait — voir `reduireLaCapture` —, et cette passe-ci ne change
 * alors plus rien : `withoutEnlargement` laisse passer ce qui tient déjà dans
 * la mesure. C'est voulu. Ce qui arrive ici n'a pas forcément vu un navigateur
 * : un partage du système, une reprise, un outil interne. Le serveur décide.
 */

const FORMATS_LISIBLES = new Set(["jpeg", "png", "webp", "gif"]);

export type CaptureLue = { donnees: Uint8Array<ArrayBuffer>; mediaType: "image/webp" };

export type LectureCapture = { ok: true; capture: CaptureLue } | { ok: false; motif: string };

export async function preparerCapture(fichier: File): Promise<LectureCapture> {
  if (fichier.size > TAILLE_MAXIMALE_OCTETS) {
    return { ok: false, motif: IMAGE_TROP_LOURDE };
  }

  const octets = Buffer.from(await fichier.arrayBuffer());
  const image = sharp(octets, { animated: false });
  const format = await image
    .metadata()
    .then((donnees) => donnees.format)
    .catch(() => undefined);

  if (!format || !FORMATS_LISIBLES.has(format)) {
    return {
      ok: false,
      motif:
        "Ce fichier n'est pas une image que l'on sait lire. Dépose une capture en JPEG, PNG, WebP ou GIF.",
    };
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
