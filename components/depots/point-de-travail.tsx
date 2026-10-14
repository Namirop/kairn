/**
 * Le point qui bat devant l'étape d'un dépôt : il distingue à l'œil une chaîne
 * qui tourne d'une chaîne restée coincée.
 *
 * Il ne se montre que sur un dépôt qui travaille vraiment (voir
 * `travailEnCours`) : sur une demande qui attend sa date, il promettrait un
 * aboutissement dans la minute. Masqué aux lecteurs d'écran : le libellé de
 * l'étiquette dit déjà tout.
 */
export function PointDeTravail() {
  return (
    <span
      aria-hidden
      className="point-qui-respire bg-accent inline-block size-1.5 shrink-0 rounded-full"
    />
  );
}
