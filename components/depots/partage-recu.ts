import { composerLePartage, type PartageCompose } from "@/lib/domain/texte-partage";

/**
 * Le partage du système, rangé sur l'appareil par le service worker et repris
 * ici. Rien ne part au serveur avant « Déposer » : qui renonce n'a rien envoyé.
 *
 * Clés recopiées dans `public/sw.js`, servi sans compilation : les deux bougent
 * ensemble. Un champ par clé : rien à analyser ni valider au retour.
 */

export const CACHE_PARTAGE = "kairn-partage";

export const CLES_DU_PARTAGE = {
  titre: "/partage/titre",
  texte: "/partage/texte",
  lien: "/partage/lien",
  capture: "/partage/capture",
} as const;

/** Le nom du fichier ne survit pas au corps d'une réponse : il voyage à côté. */
export const EN_TETE_DU_NOM = "x-nom-du-fichier";

export type PartageRepris = PartageCompose & { capture: File | null };

/** Effacé à la lecture : sinon il remplirait le champ au dépôt suivant. */
export async function reprendreLePartage(): Promise<PartageRepris | null> {
  // `caches` est absent hors contexte sécurisé.
  if (typeof caches === "undefined") return null;
  if (!(await caches.has(CACHE_PARTAGE))) return null;

  const cache = await caches.open(CACHE_PARTAGE);
  const [titre, texte, lien, capture] = await Promise.all([
    cache.match(CLES_DU_PARTAGE.titre),
    cache.match(CLES_DU_PARTAGE.texte),
    cache.match(CLES_DU_PARTAGE.lien),
    cache.match(CLES_DU_PARTAGE.capture),
  ]);

  await caches.delete(CACHE_PARTAGE);

  if (!titre && !texte && !lien && !capture) return null;

  const compose = composerLePartage({
    titre: titre ? await titre.text() : null,
    texte: texte ? await texte.text() : null,
    lien: lien ? await lien.text() : null,
  });

  return { ...compose, capture: capture ? await enFichier(capture) : null };
}

async function enFichier(reponse: Response): Promise<File> {
  const octets = await reponse.blob();
  const nom = reponse.headers.get(EN_TETE_DU_NOM);

  return new File([octets], nom ? decodeURIComponent(nom) : "capture", { type: octets.type });
}
