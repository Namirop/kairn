/**
 * Le motif d'un échec d'appel, cause d'origine comprise : `AICallFailedError`
 * masque la réponse du fournisseur, le schéma refusé ou le timeout.
 */
export function motifCourt(erreur: unknown): string {
  const cause = erreur instanceof Error && erreur.cause instanceof Error ? erreur.cause : null;
  return erreur instanceof Error
    ? cause
      ? `${erreur.message} — cause : ${cause.message}`
      : erreur.message
    : String(erreur);
}
