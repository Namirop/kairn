/**
 * Qui a accès à l'administration (signalements, retours, pilotage) : une liste
 * d'adresses en variable d'environnement, plutôt qu'un rôle sur `User` pour une
 * seule personne.
 *
 * À comparer à l'adresse vérifiée de la session, jamais à une valeur du client.
 * Casse et espaces ignorés : la variable se recopie à la main.
 */
export function administrateurs(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((adresse) => adresse.trim().toLowerCase())
    .filter((adresse) => adresse.length > 0);
}

/** Une liste vide n'autorise personne : une variable oubliée ferme la porte. */
export function estAdministrateur(email: string | null | undefined): boolean {
  if (!email) return false;

  const autorises = administrateurs();

  return autorises.length > 0 && autorises.includes(email.trim().toLowerCase());
}
