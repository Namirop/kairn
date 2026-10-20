/** Tout ce qui ne vient pas du gabarit (message d'utilisateur, motif d'erreur) y passe. */
export function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
