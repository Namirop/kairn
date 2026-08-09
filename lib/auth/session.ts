import { headers } from "next/headers";
import { auth } from "./config";

/**
 * La session, côté serveur. Un `userId` vient toujours d'ici, jamais d'un
 * paramètre de requête ou d'un champ de formulaire.
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
    super("Aucune session valide.");
    this.name = "UnauthenticatedError";
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };
}

/**
 * L'utilisateur de la session, ou une erreur. À utiliser dans les route
 * handlers et les Server Actions. Une page préfère `getCurrentUser()` suivi
 * d'une redirection, pour ne pas afficher un écran d'erreur à qui doit
 * simplement se reconnecter.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) throw new UnauthenticatedError();

  return user;
}
