/**
 * Échappe un texte avant de l'insérer dans le HTML d'un email. Tout ce qui vient
 * d'ailleurs que du gabarit (message d'utilisateur, motif d'erreur) y passe.
 */
export function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
