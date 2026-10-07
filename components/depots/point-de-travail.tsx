/**
 * Le point qui bat devant l'étape d'un dépôt.
 *
 * « Lecture de la capture » posé sur une étiquette grise se lit exactement de la
 * même façon quand la chaîne tourne et quand elle est restée coincée. L'écran
 * était donc muet sur la seule chose qu'on venait y chercher, et le réflexe
 * était de recharger la page pour vérifier. Le point est ce qui fait la
 * différence à l'œil, sans une phrase de plus.
 *
 * Il ne se montre que sur un dépôt qui travaille vraiment — voir
 * `travailEnCours`. Sur une demande qui attend sa date, rien ne tourne, et un
 * point qui bat y promettrait un aboutissement dans la minute.
 *
 * Décoratif au sens strict : le libellé de l'étiquette dit déjà tout ce qu'il y
 * a à savoir, et un lecteur d'écran n'a rien à faire d'une pastille.
 */
export function PointDeTravail() {
  return (
    <span
      aria-hidden
      className="point-qui-respire bg-accent inline-block size-1.5 shrink-0 rounded-full"
    />
  );
}
