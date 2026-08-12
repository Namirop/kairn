/**
 * Qui a le droit de lire les signalements.
 *
 * Une liste d'adresses en variable d'environnement, et rien de plus : ajouter un
 * rôle au modèle `User` pour une seule personne serait payer une abstraction
 * qu'aucun écran ne demande. Le jour où il y a des rôles, il y aura une raison
 * produit de les avoir, et ce fichier disparaîtra.
 *
 * La comparaison se fait sur l'adresse **vérifiée** de la session, jamais sur
 * une valeur venue du client. La casse est ignorée, les espaces aussi : une
 * variable d'environnement se recopie à la main.
 */
export function administrateurs(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((adresse) => adresse.trim().toLowerCase())
    .filter((adresse) => adresse.length > 0);
}

/**
 * Vrai si cette adresse est autorisée.
 *
 * Une liste vide n'autorise personne. C'est le sens qu'on veut : une variable
 * oubliée en production doit fermer la porte, pas l'ouvrir à tous.
 */
export function estAdministrateur(email: string | null | undefined): boolean {
  if (!email) return false;

  const autorises = administrateurs();

  return autorises.length > 0 && autorises.includes(email.trim().toLowerCase());
}
