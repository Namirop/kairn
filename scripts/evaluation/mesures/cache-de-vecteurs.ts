import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MODELE_EMBEDDING, type Vecteur } from "./espace";

/**
 * Le cache de vecteurs, sur disque, à côté des concepts figés.
 *
 * Les vecteurs sont déterministes : le même texte plongé par le même modèle
 * rend toujours le même point. Les garder permet de recalculer des seuils, de
 * rejouer une ablation ou de comparer deux figés sans rappeler l'API — c'est ce
 * qui rend l'étape de calibration gratuite, et donc réellement itérative.
 *
 * **Un fichier par modèle, en JSONL, en ajout seul.** L'ajout seul est le point
 * important : une passe interrompue au milieu laisse derrière elle tout ce
 * qu'elle avait déjà calculé, là où une réécriture complète du fichier aurait
 * tout perdu. Les entrées en double sont sans conséquence — la dernière lue
 * gagne, et elles portent le même vecteur.
 *
 * Le vecteur est stocké en Float32 encodé en base64, pas en tableau de nombres :
 * mille vingt-quatre flottants en JSON pèsent une dizaine de kilo-octets contre
 * cinq et demi ici, et le corpus entier en compte près d'un millier.
 *
 * **Le dossier n'est pas suivi par git.** Rebâtir tout le cache coûte une
 * fraction de centime ; y ajouter quelques mégaoctets d'opaque à chaque passage
 * coûterait plus cher à relire qu'à recalculer. Les figés, eux, restent suivis :
 * ce sont eux la référence, les vecteurs n'en sont qu'une vue.
 */

const DOSSIER = join(import.meta.dirname, "..", "vecteurs");

function chemin(): string {
  return join(DOSSIER, `${MODELE_EMBEDDING}.jsonl`);
}

function encoder(vecteur: Vecteur): string {
  return Buffer.from(new Float32Array(vecteur).buffer).toString("base64");
}

function decoder(encode: string): Vecteur {
  const octets = Buffer.from(encode, "base64");
  const flottants = new Float32Array(
    octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength),
  );

  return Array.from(flottants);
}

/** Ce que le cache connaît déjà, indexé par empreinte. Vide s'il n'existe pas. */
export function lireLeCache(): Map<string, Vecteur> {
  const connus = new Map<string, Vecteur>();
  const fichier = chemin();

  if (!existsSync(fichier)) return connus;

  for (const ligne of readFileSync(fichier, "utf8").split("\n")) {
    if (!ligne.trim()) continue;

    try {
      const lu: unknown = JSON.parse(ligne);

      if (
        typeof lu === "object" &&
        lu !== null &&
        "h" in lu &&
        "v" in lu &&
        typeof lu.h === "string" &&
        typeof lu.v === "string"
      ) {
        connus.set(lu.h, decoder(lu.v));
      }
    } catch (erreur) {
      // Une ligne tronquée par une interruption ne condamne pas le reste du
      // fichier : on la signale et on continue. Le texte qu'elle portait sera
      // simplement recalculé.
      console.warn("Ligne de cache illisible, ignorée :", erreur);
    }
  }

  return connus;
}

export function ecrireAuCache(vecteurs: Map<string, Vecteur>): void {
  if (vecteurs.size === 0) return;

  mkdirSync(DOSSIER, { recursive: true });

  const lignes = [...vecteurs]
    .map(([empreinte, vecteur]) => JSON.stringify({ h: empreinte, v: encoder(vecteur) }))
    .join("\n");

  appendFileSync(chemin(), `${lignes}\n`, "utf8");
}
