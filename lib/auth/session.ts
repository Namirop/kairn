import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./config";

/**
 * La session, côté serveur. Un `userId` vient toujours d'ici, jamais d'un
 * paramètre de requête ou d'un champ de formulaire.
 *
 * Mémoïsée sur le rendu : la mise en page et sa page la demandent toutes deux.
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED";

  constructor() {
    // i18n-ignore — message d'Error interne, destiné au journal
    super("Aucune session valide.");
    this.name = "UnauthenticatedError";
  }
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };
});

/**
 * Pour les route handlers et les Server Actions. Une page préfère
 * `getCurrentUser()` suivi d'une redirection, plutôt qu'un écran d'erreur.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) throw new UnauthenticatedError();

  return user;
}
