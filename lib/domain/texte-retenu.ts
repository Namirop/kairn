/**
 * Ce qui reste d'un dépôt quand sa consigne en écarte une partie.
 *
 * L'Input n'est jamais modifié : ceci est une vue rangée à côté, que l'écran
 * du dépôt montre à la place du texte entier pour ne pas faire relire ce que
 * la consigne a écarté. Une régénération repart du texte d'origine.
 *
 * Le modèle doit recopier, pas réécrire : chaque ligne rendue doit se
 * retrouver mot pour mot dans le dépôt, sinon on retombe sur le texte entier,
 * sans rattrapage. Les blancs sont normalisés, car un modèle qui recopie
 * replie ses lignes autrement.
 */

/** Les blancs, quels qu'ils soient, ramenés à un espace unique. */
function normaliser(texte: string): string {
  return texte.replace(/\s+/g, " ").trim();
}

/**
 * La part du dépôt que la consigne a laissée, ou `null` s'il n'y a rien à
 * montrer de différent.
 *
 * `null` (pas de rendu, rendu vide, rendu égal au dépôt, rendu infidèle) :
 * l'écran affiche le texte d'origine.
 */
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
