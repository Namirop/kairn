/** Un nombre écrit à la française pour les rapports du banc : 12 345,6. */
export function nombre(valeur: number): string {
  return valeur.toLocaleString("fr-FR");
}
