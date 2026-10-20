/**
 * Distingue une chaîne qui tourne d'une chaîne coincée. Seulement sur un dépôt
 * qui travaille (`travailEnCours`) : sur une demande qui attend sa date, il
 * promettrait un aboutissement dans la minute.
 */
export function PointDeTravail() {
  return (
    <span
      aria-hidden
      className="point-qui-respire bg-accent inline-block size-1.5 shrink-0 rounded-full"
    />
  );
}
