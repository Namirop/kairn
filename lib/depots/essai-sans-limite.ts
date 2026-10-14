/**
 * L'interrupteur qui lève les verrous de l'essai anonyme (essais par visite,
 * visites par adresse sur 24 h), pour éprouver la landing en production, seul
 * endroit où le découpage tourne avec la vraie clé.
 *
 * Absente, la variable laisse les verrous en place. Elle ne lève jamais
 * `AI_DAILY_CALL_CAP` : une variable oubliée coûte au plus ce plafond, et chaque
 * dépôt qu'elle laisse passer est journalisé.
 */

export const VARIABLE_SANS_LIMITE = "ESSAI_ANONYME_SANS_LIMITE";

/**
 * Seul `true` allume l'interrupteur : sur une page publique, une valeur mal
 * comprise (`1`, `on`…) doit laisser la porte fermée. Elle est journalisée, pour
 * qu'on sache pourquoi rien ne s'ouvre ; une variable absente ne dit rien.
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
