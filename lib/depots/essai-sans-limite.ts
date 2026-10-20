/**
 * Lève les verrous de l'essai anonyme pour éprouver la landing en production,
 * seul endroit où le découpage tourne avec la vraie clé. Jamais
 * `AI_DAILY_CALL_CAP` : oubliée, la variable coûte au plus ce plafond.
 */

export const VARIABLE_SANS_LIMITE = "ESSAI_ANONYME_SANS_LIMITE";

/**
 * Seul `true` : sur une page publique, `1` ou `on` laissent la porte fermée, et
 * le journal dit pourquoi rien ne s'ouvre.
 */
export function essaiSansLimite(): boolean {
  const pose = process.env[VARIABLE_SANS_LIMITE]?.trim();

  if (pose === undefined || pose.length === 0) return false;
  if (pose === "true") return true;

  console.warn(
    `[essai] ${VARIABLE_SANS_LIMITE}=${pose} : c'est un interrupteur, seul « true » l'allume — les verrous restent en place.`,
  );

  return false;
}
