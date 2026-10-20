/**
 * Ce qui reste d'un dépôt quand sa consigne en écarte une partie : une vue à
 * côté de l'Input, qui n'est jamais modifié. Chaque ligne rendue doit se
 * retrouver mot pour mot dans le dépôt, sinon on retombe sur le texte entier ;
 * les blancs sont normalisés, un modèle qui recopie replie ses lignes autrement.
 */

function normaliser(texte: string): string {
  return texte.replace(/\s+/g, " ").trim();
}

/** `null` quand il n'y a rien de différent ou de fidèle à montrer : l'écran affiche l'original. */
export function texteRetenu(source: string, rendu: string | null | undefined): string | null {
  if (!rendu) return null;

  const garde = rendu.trim();
  if (garde.length === 0) return null;

  const plat = normaliser(source);
  const renduPlat = normaliser(garde);

  if (renduPlat === plat) return null;

  // Plus long que le dépôt : c'est une réécriture, pas un extrait.
  if (renduPlat.length >= plat.length) return null;

  const lignes = garde
    .split("\n")
    .map(normaliser)
    .filter((ligne) => ligne.length > 0);

  if (lignes.length === 0) return null;

  return lignes.every((ligne) => plat.includes(ligne)) ? garde : null;
}
