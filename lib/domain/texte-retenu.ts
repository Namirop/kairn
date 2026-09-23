/**
 * Ce qui reste d'un dépôt quand sa consigne en écarte une partie.
 *
 * **Le dépôt n'est jamais modifié, et cette règle ne bouge pas.** L'Input garde
 * le texte tel qu'il a été posé ; ce que cette fonction produit est une **vue**,
 * rangée à côté, que l'écran du dépôt montre à la place du texte entier. La
 * différence compte : un jour où l'on voudra régénérer, c'est le texte d'origine
 * qui repartira au modèle, pas cette vue.
 *
 * **Pourquoi une vue plutôt que le texte entier.** Une consigne dit « laisse de
 * côté la barre latérale », « ne prends que la partie sur les index » — et
 * l'écran montrait quand même tout, y compris ce qu'on venait d'écarter. On y
 * relit un passage dont rien ne sera jamais reposé, en croyant qu'il compte.
 *
 * **Le modèle recopie, il ne réécrit pas — et c'est ici qu'on le vérifie.** Rien
 * n'empêche une sortie de paraphraser, de résumer, ou d'inventer une phrase qui
 * n'était pas dans le dépôt : ce serait alors un texte d'origine réécrit, montré
 * comme s'il était de la personne. La garde est donc stricte — chaque ligne
 * rendue doit se retrouver **mot pour mot** dans le dépôt, aux blancs près — et
 * son échec n'est pas rattrapé : on retombe sur le texte entier, qui est la
 * vérité.
 *
 * La comparaison se fait sur des blancs normalisés. Un modèle qui recopie
 * replie ses lignes autrement, et refuser sur un retour à la ligne déplacé
 * ferait échouer la garde sur des sorties parfaitement fidèles.
 */

/** Les blancs, quels qu'ils soient, ramenés à un espace unique. */
function normaliser(texte: string): string {
  return texte.replace(/\s+/g, " ").trim();
}

/**
 * La part du dépôt que la consigne a laissée, ou `null` s'il n'y a rien à
 * montrer de différent.
 *
 * `null` couvre quatre cas, et ils reviennent au même à l'écran : pas de
 * rendu, un rendu vide, un rendu qui vaut le dépôt entier — la consigne
 * n'écartait rien —, et un rendu infidèle. Dans tous, c'est le texte d'origine
 * qui s'affiche.
 */
export function texteRetenu(source: string, rendu: string | null | undefined): string | null {
  if (!rendu) return null;

  const garde = rendu.trim();
  if (garde.length === 0) return null;

  const plat = normaliser(source);
  const rendupla = normaliser(garde);

  // Rien n'a été écarté : l'écran n'a pas besoin d'une seconde copie du dépôt,
  // ni de la mention qui l'accompagne.
  if (rendupla === plat) return null;

  // Plus long que le dépôt : c'est une réécriture, pas un extrait.
  if (rendupla.length >= plat.length) return null;

  const lignes = garde
    .split("\n")
    .map(normaliser)
    .filter((ligne) => ligne.length > 0);

  if (lignes.length === 0) return null;

  return lignes.every((ligne) => plat.includes(ligne)) ? garde : null;
}
