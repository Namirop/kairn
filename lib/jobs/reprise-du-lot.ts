/**
 * Le signal qu'un job de questions n'a pas tout rendu et repart en file.
 *
 * Ce n'est ni un succès ni un échec, et c'est pour ça qu'il lui faut son propre
 * mot. L'exécuteur ne connaît que deux fins — terminé, ou en échec — et les deux
 * ferment le job : la première laissait les concepts sans questions derrière
 * elle, la seconde condamnait ceux qui étaient déjà écrits à être réécrits.
 *
 * Le job a déjà été rétréci et rendu à la file quand cette erreur est levée. Ce
 * qu'elle demande à l'exécuteur, c'est de **ne pas le refermer** — rien d'autre.
 */
export class LotIncomplet extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LotIncomplet";
  }
}
